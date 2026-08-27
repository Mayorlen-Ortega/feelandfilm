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

from app.agent import agent, soundtrack_agent, sommelier_agent

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

async def fetch_watch_providers_internal(title: str, country: str = "US") -> dict:
    tmdb_key = os.getenv("TMDB_API_KEY")
    if not tmdb_key:
        return {"status": "error", "message": "TMDB_API_KEY not configured", "streaming": [], "rent": [], "buy": []}

    def fetch():
        import urllib.parse
        query = urllib.parse.quote(title)
        search_url = f"https://api.themoviedb.org/3/search/movie?query={query}"
        headers = {"Authorization": f"Bearer {tmdb_key}", "accept": "application/json"}
        req = urllib.request.Request(search_url, headers=headers)
        try:
            with urllib.request.urlopen(req) as response:
                search_data = json.loads(response.read().decode("utf-8"))
                results = search_data.get("results", [])
                if not results:
                    return {"status": "not_found", "message": f"Movie '{title}' not found on TMDB.", "streaming": [], "rent": [], "buy": []}
                
                movie = results[0]
                movie_id = movie.get("id")
                movie_title = movie.get("title", title)
                
                providers_url = f"https://api.themoviedb.org/3/movie/{movie_id}/watch/providers"
                req_prov = urllib.request.Request(providers_url, headers=headers)
                with urllib.request.urlopen(req_prov) as p_resp:
                    p_data = json.loads(p_resp.read().decode("utf-8"))
                    results_map = p_data.get("results", {})
                    
                    target_country = country.strip().upper() if country else "US"
                    c_data = results_map.get(target_country)
                    used_fallback = False
                    
                    if not c_data and target_country != "US" and "US" in results_map:
                        c_data = results_map.get("US")
                        used_fallback = True
                    
                    if not c_data:
                        return {
                            "status": "success",
                            "movie_title": movie_title,
                            "country": target_country,
                            "streaming": [],
                            "rent": [],
                            "buy": [],
                            "link": f"https://www.themoviedb.org/movie/{movie_id}/watch",
                            "message": f"No specific streaming data found for region {target_country}."
                        }
                    
                    def extract_names(items):
                        return [item.get("provider_name") for item in items if item.get("provider_name")]
                    
                    streaming = extract_names(c_data.get("flatrate", []))
                    rent = extract_names(c_data.get("rent", []))
                    buy = extract_names(c_data.get("buy", []))
                    link = c_data.get("link", f"https://www.themoviedb.org/movie/{movie_id}/watch")
                    
                    return {
                        "status": "success",
                        "movie_title": movie_title,
                        "country": "US (Global Reference)" if used_fallback else target_country,
                        "is_fallback_country": used_fallback,
                        "streaming": streaming,
                        "rent": rent,
                        "buy": buy,
                        "link": link
                    }
        except Exception as e:
            print("TMDB Watch Providers Error:", e)
            return {"status": "error", "message": str(e), "streaming": [], "rent": [], "buy": []}

    return await asyncio.to_thread(fetch)

@app.get("/api/watch-providers")
async def get_watch_providers(title: str, country: str = "US"):
    return await fetch_watch_providers_internal(title, country)

class WatchProvidersRequest(BaseModel):
    movie_title: str
    country: str = "US"

@app.post("/api/watch-providers")
async def post_watch_providers(request: WatchProvidersRequest):
    return await fetch_watch_providers_internal(request.movie_title, request.country)

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

VALID_MOODS = ["Stressed", "Bored", "Excited", "Sad", "Curious"]
VALID_ATMOSPHERES = ["Relaxing", "Thrilling", "Uplifting", "Thought-provoking"]
VALID_AGES = ["Kids (0-12)", "Teens (13-17)", "Adults (18+)", "Mixed Family"]

@app.get("/api/stats")
async def get_stats():
    host = os.getenv("CLICKHOUSE_HOST", "")
    port = int(os.getenv("CLICKHOUSE_PORT", "8123"))
    user = os.getenv("CLICKHOUSE_USER", "default")
    password = os.getenv("CLICKHOUSE_PASSWORD", "")
    secure = os.getenv("CLICKHOUSE_SECURE", "False").lower() in ("true", "1", "yes")

    if not host or host == "mock":
        return {
            "labels": VALID_MOODS,
            "data": [0] * len(VALID_MOODS),
            "moods": {"labels": VALID_MOODS, "data": [0] * len(VALID_MOODS)},
            "atmospheres": {"labels": VALID_ATMOSPHERES, "data": [0] * len(VALID_ATMOSPHERES)},
            "demographics": {"labels": VALID_AGES, "data": [0] * len(VALID_AGES)},
            "matrix": {},
            "kpis": {"top_mood": "N/A", "top_atmosphere": "N/A", "top_demographic": "N/A", "total_sessions": 0}
        }
    
    try:
        client = clickhouse_connect.get_client(
            host=host, port=port, username=user, password=password, secure=secure
        )
        
        # 1. Initial Mood Distribution
        m_res = client.query(
            "SELECT initial_mood, count() as total FROM audience_sessions "
            "WHERE initial_mood IN ('Stressed', 'Bored', 'Excited', 'Sad', 'Curious') "
            "GROUP BY initial_mood"
        )
        m_counts = {row[0]: row[1] for row in m_res.result_rows}
        mood_data = [m_counts.get(m, 0) for m in VALID_MOODS]
        total_sessions = sum(mood_data)
        
        # 2. Desired Atmosphere Distribution
        a_res = client.query(
            "SELECT desired_atmosphere, count() as total FROM audience_sessions "
            "WHERE desired_atmosphere IN ('Relaxing', 'Thrilling', 'Uplifting', 'Thought-provoking') "
            "GROUP BY desired_atmosphere"
        )
        a_counts = {row[0]: row[1] for row in a_res.result_rows}
        atm_data = [a_counts.get(a, 0) for a in VALID_ATMOSPHERES]
        
        # 3. Audience Demographics
        d_res = client.query("SELECT audience_age_range, count() as total FROM audience_sessions GROUP BY audience_age_range")
        d_raw = {row[0]: row[1] for row in d_res.result_rows}
        d_counts = {
            "Kids (0-12)": d_raw.get("Kids (0-12)", 0),
            "Teens (13-17)": d_raw.get("Teens (13-17)", 0) + d_raw.get("Teen", 0),
            "Adults (18+)": d_raw.get("Adults (18+)", 0) + d_raw.get("Adult", 0),
            "Mixed Family": d_raw.get("Mixed Family", 0) + d_raw.get("Family", 0),
        }
        demo_data = [d_counts.get(k, 0) for k in VALID_AGES]
        
        # 4. Emotional Transition Matrix (Initial Mood -> Desired Atmosphere)
        t_res = client.query(
            "SELECT initial_mood, desired_atmosphere, count() FROM audience_sessions "
            "WHERE initial_mood IN ('Stressed', 'Bored', 'Excited', 'Sad', 'Curious') "
            "AND desired_atmosphere IN ('Relaxing', 'Thrilling', 'Uplifting', 'Thought-provoking') "
            "GROUP BY initial_mood, desired_atmosphere"
        )
        matrix = {m: {a: 0 for a in VALID_ATMOSPHERES} for m in VALID_MOODS}
        for m, a, c in t_res.result_rows:
            if m in matrix and a in matrix[m]:
                matrix[m][a] = c
                
        # 5. Executive KPIs
        top_m = max(m_counts.items(), key=lambda x: x[1])[0] if m_counts else "Stressed"
        top_m_pct = round((m_counts.get(top_m, 0) / total_sessions * 100)) if total_sessions else 0
        
        tot_atm = sum(atm_data)
        top_a = max(a_counts.items(), key=lambda x: x[1])[0] if a_counts else "Relaxing"
        top_a_pct = round((a_counts.get(top_a, 0) / tot_atm * 100)) if tot_atm else 0
        
        top_d = max(d_counts.items(), key=lambda x: x[1])[0] if d_counts else "Adults (18+)"
        
        return {
            "labels": VALID_MOODS,
            "data": mood_data,
            "moods": {"labels": VALID_MOODS, "data": mood_data},
            "atmospheres": {"labels": VALID_ATMOSPHERES, "data": atm_data},
            "demographics": {"labels": VALID_AGES, "data": demo_data},
            "matrix": matrix,
            "kpis": {
                "top_mood": f"{top_m} ({top_m_pct}%)",
                "top_atmosphere": f"{top_a} ({top_a_pct}%)",
                "top_demographic": top_d,
                "total_sessions": total_sessions
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from fastapi.responses import HTMLResponse, StreamingResponse

def map_to_canonical_mood(text: str) -> str:
    t = text.lower()
    if any(k in t for k in ["stress", "exhaust", "tired", "burn", "work", "overwhelm", "busy", "ansio", "estrés", "cansad"]):
        return "Stressed"
    if any(k in t for k in ["bore", "dull", "nothing", "routine", "monoton", "aburr"]):
        return "Bored"
    if any(k in t for k in ["excit", "happy", "party", "energy", "hype", "friday", "fun", "alegr", "emocion", "feliz"]):
        return "Excited"
    if any(k in t for k in ["sad", "cry", "depress", "melanchol", "blue", "down", "heartbreak", "trist", "llor"]):
        return "Sad"
    if any(k in t for k in ["curio", "cinephil", "weird", "art", "intellect", "interest", "indie", "cult", "aprender"]):
        return "Curious"
    return "Curious"

def map_to_canonical_atmosphere(text: str) -> str:
    t = text.lower()
    if any(k in t for k in ["relax", "calm", "cozy", "peace", "chill", "unwind", "escap", "tranquil", "desconec"]):
        return "Relaxing"
    if any(k in t for k in ["thrill", "action", "suspense", "scary", "horror", "edge", "adrenalin", "shock", "intense", "misterio"]):
        return "Thrilling"
    if any(k in t for k in ["uplift", "feel-good", "happy", "laugh", "comedy", "inspire", "optimis", "warm", "joy", "reir", "alegr"]):
        return "Uplifting"
    if any(k in t for k in ["thought", "deep", "mind", "twist", "drama", "philosoph", "complex", "mystery", "reflex", "pensar"]):
        return "Thought-provoking"
    return "Relaxing"

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
            db_mood = request.initial_mood if request.initial_mood in VALID_MOODS else map_to_canonical_mood(request.initial_mood)
            db_atm = request.desired_atmosphere if request.desired_atmosphere in VALID_ATMOSPHERES else map_to_canonical_atmosphere(request.desired_atmosphere)

            client.insert(
                'audience_sessions',
                [[session_id, db_mood, db_atm, request.audience_age_range]],
                column_names=['session_id', 'initial_mood', 'desired_atmosphere', 'audience_age_range']
            )

        # Construct the prompt for the ADK Agent (passes the full free-form user thoughts)
        prompt = json.dumps(request.dict())
        
        # Use Ollama locally if enabled via USE_OLLAMA
        if os.getenv("USE_OLLAMA", "false").lower() == "true":
            sys_prompt = """You are a film curator. Return exactly 1 film. Provide detailed text.
CRITICAL: If audience_age_range is 'Kids (0-12)', NEVER recommend R-rated or mature films. Only G or PG.
Output ONLY valid JSON matching:
{
  \"slate\": [{\"title\": \"\", \"director\": \"\", \"runtime\": 0, \"mood_tags\": [], \"intensity\": 0, \"synopsis\": \"a punchy 1-2 sentence introduction\", \"fun_fact\": \"short highly interesting fun fact 1-2 sentences\", \"reasoning\": \"concise 1-2 sentence explanation of why this fits\", \"confidence_score\": 0.0}],
  \"overall_evidence\": \"\",
  \"not_found_message\": \"If theme and mood contradict completely, put error message here and make slate []\"
}"""
            raw_output = await query_ollama_fallback(prompt, sys_prompt)
            try:
                data = json.loads(raw_output.strip())
            except Exception:
                data = {"not_found_message": "Technical error in Ollama fallback.", "slate": []}
            return {"status": "success", "data": data, "agent_audit_trail": ["Ollama Used Directly"]}
        
        # Default path uses Gemini via ADK agent
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

@app.post("/api/sommelier")
async def get_sommelier(request: SoundtrackRequest):
    # If running in a local environment, bypass Gemini and use the local model directly
    if os.getenv("USE_OLLAMA", "false").lower() == "true":
        sys_prompt = """You are a cinematic sommelier. Recommend a snack and drink for this movie in 1-2 sentences. DO NOT output JSON, just plain text."""
        raw_output = await query_ollama_fallback(f"Movie: {request.movie_title}", sys_prompt)
        if raw_output and raw_output.strip() not in ("{}", ""):
            def _clean_output(text: str) -> str:
                txt = text.strip()
                try:
                    data = json.loads(txt)
                    if isinstance(data, dict):
                        return " ".join(str(v) for v in data.values())
                    if isinstance(data, list):
                        return " ".join(str(v) for v in data)
                except Exception:
                    pass
                if txt.startswith("{") and txt.endswith("}"):
                    txt = txt[1:-1].strip()
                txt = txt.strip('"')
                return txt
            cleaned = _clean_output(raw_output)
            return {"status": "success", "recommendation": cleaned}
        # Static fallback if Ollama fails
        static_fallback = "A classic popcorn and a cold soda always make a perfect movie night pairing."
        return {"status": "success", "recommendation": static_fallback}
    # Default path uses Gemini via ADK agent
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
        def _clean_output(text: str) -> str:
            txt = text.strip()
            try:
                data = json.loads(txt)
                if isinstance(data, dict):
                    return " ".join(str(v) for v in data.values())
                if isinstance(data, list):
                    return " ".join(str(v) for v in data)
            except Exception:
                pass
            if txt.startswith("{") and txt.endswith("}"):
                txt = txt[1:-1].strip()
            txt = txt.strip('"')
            return txt
        cleaned = _clean_output(raw_output)
        return {"status": "success", "recommendation": cleaned}
    except Exception as e:
        print("Sommelier Error:", str(e))
        error_detail = str(e)
        if os.getenv("USE_OLLAMA", "false").lower() == "true":
            sys_prompt = "You are a cinematic sommelier. Recommend a snack and drink for this movie in 1-2 sentences. DO NOT output JSON, just plain text."
            raw_output = await query_ollama_fallback(f"Movie: {request.movie_title}", sys_prompt)
            if raw_output and raw_output.strip() not in ("{}", ""):
                cleaned = _clean_output(raw_output)
                return {"status": "success", "recommendation": cleaned, "error_detail": error_detail}
        static_fallback = "A classic popcorn and a cold soda always make a perfect movie night pairing."
        return {"status": "success", "recommendation": static_fallback, "error_detail": error_detail}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
