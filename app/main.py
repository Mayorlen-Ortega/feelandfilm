from fastapi import FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai.types import Content, Part
import json
import os
import clickhouse_connect
from dotenv import load_dotenv
import urllib.request
import urllib.error
import asyncio

load_dotenv(override=True)

from app.agent import agent, soundtrack_agent

async def query_ollama_fallback(prompt: str, system_prompt: str) -> str:
    def fetch():
        url = "http://localhost:11434/api/generate"
        data = {
            "model": "llama3.2:3b",
            "prompt": prompt,
            "system": system_prompt,
            "stream": False,
            "format": "json"
        }
        req = urllib.request.Request(url, data=json.dumps(data).encode("utf-8"), headers={"Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req) as response:
                result = json.loads(response.read().decode("utf-8"))
                return result.get("response", "{}")
        except Exception as e:
            print("Ollama Error:", e)
            return "{}"
    return await asyncio.to_thread(fetch)

app = FastAPI(title="Feel & Film")

async def fetch_poster_url_internal(title: str) -> str:
    tmdb_key = os.getenv("TMDB_API_KEY")
    if not tmdb_key:
        return ""
    
    def fetch():
        import urllib.parse
        query = urllib.parse.quote(title)
        url = f"https://api.themoviedb.org/3/search/movie?query={query}"
        req = urllib.request.Request(url, headers={
            "Authorization": f"Bearer {tmdb_key}",
            "accept": "application/json"
        })
        try:
            with urllib.request.urlopen(req) as response:
                result = json.loads(response.read().decode("utf-8"))
                results = result.get("results", [])
                if results and len(results) > 0:
                    poster_path = results[0].get("poster_path")
                    if poster_path:
                        return f"https://image.tmdb.org/t/p/w200{poster_path}"
        except Exception as e:
            print("TMDB Poster Error:", e)
        return ""
    return await asyncio.to_thread(fetch)

@app.get("/api/poster")
async def get_poster(title: str):
    url = await fetch_poster_url_internal(title)
    return {"poster_url": url}

# Serve static files for the frontend
app.mount("/static", StaticFiles(directory="app/static"), name="static")

class MoodRequest(BaseModel):
    initial_mood: str
    desired_atmosphere: str
    audience_age_range: str
    theme: str = ""
    slots: int
    excluded_films: list[str] = []

class SoundtrackRequest(BaseModel):
    movie_title: str

@app.get("/")
async def read_index():
    with open("app/static/index.html", "r", encoding="utf-8") as f:
        return HTMLResponse(content=f.read())

@app.get("/api/status")
async def get_status():
    host = os.getenv("CLICKHOUSE_HOST", "")
    is_mock = not host or host == "mock"
    return {"mock_mode": is_mock}

@app.get("/api/stats")
async def get_stats():
    host = os.getenv("CLICKHOUSE_HOST", "")
    port = int(os.getenv("CLICKHOUSE_PORT", "8123"))
    user = os.getenv("CLICKHOUSE_USER", "default")
    password = os.getenv("CLICKHOUSE_PASSWORD", "")
    secure = os.getenv("CLICKHOUSE_SECURE", "False").lower() in ("true", "1", "yes")

    if not host or host == "mock":
        return {"labels": [], "data": []}
    
    try:
        client = clickhouse_connect.get_client(
            host=host, port=port, username=user, password=password, secure=secure
        )
        result = client.query("SELECT initial_mood, count() as total FROM audience_sessions GROUP BY initial_mood")
        labels = [row[0] for row in result.result_rows]
        data = [row[1] for row in result.result_rows]
        return {"labels": labels, "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from fastapi.responses import HTMLResponse, StreamingResponse

@app.post("/api/recommend")
async def get_recommendation(request: MoodRequest):
    try:
        # Save historical request to ClickHouse
        host = os.getenv("CLICKHOUSE_HOST", "")
        if host and host != "mock":
            import uuid
            client = clickhouse_connect.get_client(
                host=host, 
                port=int(os.getenv("CLICKHOUSE_PORT", "8123")), 
                username=os.getenv("CLICKHOUSE_USER", "default"), 
                password=os.getenv("CLICKHOUSE_PASSWORD", ""), 
                secure=os.getenv("CLICKHOUSE_SECURE", "False").lower() in ("true", "1", "yes")
            )
            session_id = str(uuid.uuid4())
            client.insert(
                'audience_sessions',
                [[session_id, request.initial_mood, request.desired_atmosphere, request.audience_age_range]],
                column_names=['session_id', 'initial_mood', 'desired_atmosphere', 'audience_age_range']
            )

        # Construct the prompt for the ADK Agent
        prompt = json.dumps(request.dict())
        
        runner = Runner(agent=agent, session_service=InMemorySessionService(), app_name="film_curator", auto_create_session=True)
        content = Content(role="user", parts=[Part(text=prompt)])
        
        raw_output = ""
        tool_calls = []
        async for event in runner.run_async(user_id="default", session_id="default", new_message=content):
            parts = []
            if hasattr(event, "content") and event.content:
                parts = getattr(event.content, "parts", [])
            elif hasattr(event, "data") and hasattr(event.data, "message"):
                parts = getattr(event.data.message, "parts", [])
                
            for part in parts:
                if hasattr(part, "text") and part.text:
                    raw_output += part.text
                if hasattr(part, "function_call") and part.function_call:
                    tool_calls.append(str(part.function_call))
                    
        # Extract JSON block robustly
        start_idx = raw_output.find('{')
        end_idx = raw_output.rfind('}') + 1
        if start_idx != -1 and end_idx != 0 and end_idx > start_idx:
            raw_output = raw_output[start_idx:end_idx]
            
        data = json.loads(raw_output.strip())
        
        # Poster fetching is now handled asynchronously by the frontend via /api/poster
        
        return {
            "status": "success",
            "data": data,
            "agent_audit_trail": tool_calls
        }
    except Exception as e:
        if "429" in str(e) or "quota" in str(e).lower() or "RESOURCE_EXHAUSTED" in str(e):
            print("Falling back to Ollama...")
            sys_prompt = """You are a film curator. Return exactly 1 film. Provide detailed text.
CRITICAL: If audience_age_range is 'Kids (0-12)', NEVER recommend R-rated or mature films. Only G or PG.
Output ONLY valid JSON matching:
{
  "slate": [{"title": "","director": "","runtime": 0,"mood_tags": [],"intensity": 0,"synopsis": "a punchy 1-2 sentence introduction","fun_fact": "short highly interesting fun fact 1-2 sentences","reasoning": "concise 1-2 sentence explanation of why this fits","confidence_score": 0.0}],
  "overall_evidence": "",
  "not_found_message": "If theme and mood contradict completely, put error message here and make slate []"
}"""
            raw_output = await query_ollama_fallback(prompt, sys_prompt)
            if not raw_output or raw_output.strip() == "{}":
                data = {
                    "not_found_message": "Cut! Our cinematic agent is resting in its dressing room (AI Quota Exceeded). Please try again in a minute.",
                    "slate": []
                }
            else:
                try:
                    data = json.loads(raw_output.strip())
                except:
                    data = {"not_found_message": "Technical error in the projection booth.", "slate": []}
                        
            return {"status": "success", "data": data, "agent_audit_trail": ["Ollama Fallback Failed - Cinematic Error"]}
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/soundtrack")
async def get_soundtrack(request: SoundtrackRequest):
    try:
        runner = Runner(agent=soundtrack_agent, session_service=InMemorySessionService(), app_name="soundtrack_curator", auto_create_session=True)
        content = Content(role="user", parts=[Part(text=request.movie_title)])
        
        raw_output = ""
        async for event in runner.run_async(user_id="default", session_id="default", new_message=content):
            parts = []
            if hasattr(event, "content") and event.content:
                parts = getattr(event.content, "parts", [])
            elif hasattr(event, "data") and hasattr(event.data, "message"):
                parts = getattr(event.data.message, "parts", [])
                
            for part in parts:
                if hasattr(part, "text") and part.text:
                    raw_output += part.text
                    
        # Extract JSON block robustly
        start_idx = raw_output.find('{')
        end_idx = raw_output.rfind('}') + 1
        if start_idx != -1 and end_idx != 0 and end_idx > start_idx:
            raw_output = raw_output[start_idx:end_idx]
            
        data = json.loads(raw_output.strip())
        
        return {
            "status": "success",
            "data": data
        }
    except Exception as e:
        if "429" in str(e) or "quota" in str(e).lower() or "RESOURCE_EXHAUSTED" in str(e):
            print("Falling back to Ollama for Soundtrack...")
            sys_prompt = """You are a Soundtrack Expert. Provide detailed text. Return ONLY valid JSON matching:
{"composer": "","vibe": "concise vibe description 1-2 sentences","standout_track": ""}"""
            raw_output = await query_ollama_fallback(request.movie_title, sys_prompt)
            if not raw_output or raw_output.strip() == "{}":
                data = {
                    "composer": "Unknown",
                    "vibe": "The soundtrack is on a commercial break. The musical agent is resting due to quota limits.",
                    "standout_track": "Silence"
                }
            else:
                try:
                    data = json.loads(raw_output.strip())
                except:
                    data = {"composer": "Error", "vibe": "Technical error.", "standout_track": "Error"}
            return {"status": "success", "data": data}
        raise HTTPException(status_code=500, detail=str(e))

class ExpandRequest(BaseModel):
    movie_title: str
    current_synopsis: str

@app.post("/api/expand_synopsis")
async def expand_synopsis(request: ExpandRequest):
    try:
        from app.agent import expand_agent
        runner = Runner(agent=expand_agent, session_service=InMemorySessionService(), app_name="expand_curator", auto_create_session=True)
        content = Content(role="user", parts=[Part(text=f"Title: {request.movie_title}\nSynopsis: {request.current_synopsis}")])
        
        raw_output = ""
        async for event in runner.run_async(user_id="default", session_id="default", new_message=content):
            parts = []
            if hasattr(event, "content") and event.content:
                parts = getattr(event.content, "parts", [])
            elif hasattr(event, "data") and hasattr(event.data, "message"):
                parts = getattr(event.data.message, "parts", [])
                
            for part in parts:
                if hasattr(part, "text") and part.text:
                    raw_output += part.text
                    
        output_text = raw_output.strip()
        if output_text.startswith("{") and output_text.endswith("}"):
            try:
                import json
                parsed = json.loads(output_text)
                if isinstance(parsed, dict) and len(parsed) > 0:
                    output_text = list(parsed.values())[0]
            except Exception:
                pass
                
        return {"status": "success", "expanded_text": output_text}
    except Exception as e:
        if "429" in str(e) or "quota" in str(e).lower() or "RESOURCE_EXHAUSTED" in str(e):
            sys_prompt = "You are a film expert. Provide a more detailed synopsis (3-5 sentences) based on the current one. DO NOT output JSON, just plain text."
            raw_output = await query_ollama_fallback(f"Title: {request.movie_title}\nCurrent Synopsis: {request.current_synopsis}", sys_prompt)
            if not raw_output or raw_output.strip() == "{}":
                return {"status": "success", "expanded_text": "The film roll got stuck (Quota limit reached). The director is fixing it, please try again shortly!"}
            return {"status": "success", "expanded_text": raw_output.strip()}
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/sommelier")
async def get_sommelier(request: SoundtrackRequest):
    try:
        from app.agent import sommelier_agent
        runner = Runner(agent=sommelier_agent, session_service=InMemorySessionService(), app_name="sommelier", auto_create_session=True)
        content = Content(role="user", parts=[Part(text=f"Movie: {request.movie_title}")])
        
        raw_output = ""
        async for event in runner.run_async(user_id="default", session_id="default", new_message=content):
            parts = []
            if hasattr(event, "content") and event.content:
                parts = getattr(event.content, "parts", [])
            elif hasattr(event, "data") and hasattr(event.data, "message"):
                parts = getattr(event.data.message, "parts", [])
                
            for part in parts:
                if hasattr(part, "text") and part.text:
                    raw_output += part.text
                    
        return {"status": "success", "recommendation": raw_output.strip()}
    except Exception as e:
        print("Sommelier Error:", str(e))
        if "429" in str(e) or "quota" in str(e).lower() or "RESOURCE_EXHAUSTED" in str(e):
            sys_prompt = "You are a cinematic sommelier. Recommend a snack and drink for this movie in 1-2 sentences. DO NOT output JSON, just plain text."
            raw_output = await query_ollama_fallback(f"Movie: {request.movie_title}", sys_prompt)
            if raw_output and raw_output.strip() != "{}" and raw_output.strip() != "":
                return {"status": "success", "recommendation": raw_output.strip()}
        return {"status": "success", "recommendation": "Our sommelier is currently preparing another order. Try again soon!"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
