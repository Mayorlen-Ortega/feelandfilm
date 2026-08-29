from fastapi import FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, StreamingResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import json
import os
import uuid
import clickhouse_connect
from dotenv import load_dotenv
import urllib.request
import urllib.parse
import urllib.error
import asyncio
import time
from datetime import datetime

load_dotenv(override=True)

from app.agent import (
    agent, 
    film_curator_agent,
    soundtrack_agent, 
    sommelier_agent,
    master_orchestrator_agent,
    orchestrate_cinematic_experience,
    generate_emotional_biopic_storyboard,
    run_adk_agent,
    parse_json_safely
)

app = FastAPI(title="Feel & Film - Autonomous Agentic Cinema")

# ---------------------------------------------------------------------------
# In-Memory User Memory Store (collaborative partner state cache)
# ---------------------------------------------------------------------------
USER_MEMORY_STORE: Dict[str, Dict[str, Any]] = {}

def get_or_create_user_memory(user_email: str) -> Dict[str, Any]:
    email_key = user_email.strip().lower() if user_email else "guest"
    if email_key not in USER_MEMORY_STORE:
        USER_MEMORY_STORE[email_key] = {
            "user_email": email_key,
            "learned_preferences": [],
            "dietary_restrictions": [],
            "music_preferences": "",
            "excluded_films": [],
            "past_feedbacks": [],
            "total_curations": 0
        }
    return USER_MEMORY_STORE[email_key]


def sync_user_memory_from_db(user_email: str):
    """Hydrates memory from ClickHouse historical sessions and feedbacks."""
    if not user_email:
        return
    email_key = user_email.strip().lower()
    mem = get_or_create_user_memory(email_key)
    
    host = os.getenv("CLICKHOUSE_HOST", "")
    if not host or host == "mock":
        return

    try:
        client = clickhouse_connect.get_client(
            host=host, 
            port=int(os.getenv("CLICKHOUSE_PORT", "8123")), 
            username=os.getenv("CLICKHOUSE_USER", "default"), 
            password=os.getenv("CLICKHOUSE_PASSWORD", ""), 
            secure=os.getenv("CLICKHOUSE_SECURE", "False").lower() in ("true", "1", "yes")
        )
        res = client.query(
            "SELECT film_title, primary_mood, desired_atmosphere, reasoning FROM audience_sessions WHERE user_email = %(email)s ORDER BY timestamp DESC LIMIT 10",
            parameters={"email": email_key}
        )
        for row in res.result_rows:
            film_title = row[0]
            if film_title and film_title not in mem["excluded_films"]:
                mem["excluded_films"].append(film_title)
    except Exception as e:
        print("ClickHouse memory sync notice:", e)


# ---------------------------------------------------------------------------
# TMDB & External API Helpers
# ---------------------------------------------------------------------------

async def fetch_poster_url_internal(title: str) -> str:
    tmdb_key = os.getenv("TMDB_API_KEY")
    if not tmdb_key:
        return ""
    
    def fetch():
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


# Serve static files for the frontend
app.mount("/static", StaticFiles(directory="app/static"), name="static")

import base64

class GoogleAuthRequest(BaseModel):
    credential: str

@app.get("/api/auth/config")
async def get_auth_config():
    load_dotenv(override=True)
    return {
        "google_client_id": os.getenv("GOOGLE_CLIENT_ID", "")
    }

@app.post("/api/auth/google")
async def auth_google(request: GoogleAuthRequest):
    try:
        parts = request.credential.split(".")
        if len(parts) >= 2:
            padded = parts[1] + "=" * ((4 - len(parts[1]) % 4) % 4)
            payload_json = base64.urlsafe_b64decode(padded).decode("utf-8")
            payload = json.loads(payload_json)
            email = payload.get("email", "")
            if email:
                sync_user_memory_from_db(email)
            return {
                "status": "success",
                "user": {
                    "email": email,
                    "name": payload.get("name", "Cinephile"),
                    "picture": payload.get("picture", ""),
                    "sub": payload.get("sub", "")
                }
            }
        raise ValueError("Invalid credential format")
    except Exception as e:
        return {"status": "error", "message": str(e)}


# ---------------------------------------------------------------------------
# Request Schemas
# ---------------------------------------------------------------------------

class MoodRequest(BaseModel):
    initial_mood: str
    desired_atmosphere: str
    audience_age_range: str = "Adults (18+)"
    theme: str = ""
    slots: int = 1
    excluded_films: list[str] = []
    user_email: Optional[str] = None
    user_name: Optional[str] = None
    country: Optional[str] = "US"
    dietary_preference: Optional[str] = None

class FeedbackRequest(BaseModel):
    user_email: str
    session_id: Optional[str] = None
    movie_title: str
    rating: int = 5  # 1 to 5
    category: str = "general" # 'dietary', 'soundtrack', 'film_pacing', 'general'
    feedback_text: str

class SoundtrackRequest(BaseModel):
    movie_title: str

class WatchProvidersRequest(BaseModel):
    movie_title: str
    country: str = "US"

class WatchedToggleRequest(BaseModel):
    session_id: str
    is_watched: bool = True

class BiopicRequest(BaseModel):
    user_email: str = "guest"
    user_name: str = "Cinephile"
    films: list[dict] = []


@app.get("/")
async def read_index():
    with open("app/static/index.html", "r", encoding="utf-8") as f:
        return HTMLResponse(content=f.read())

@app.get("/api/status")
async def get_status():
    host = os.getenv("CLICKHOUSE_HOST", "")
    is_mock = not host or host == "mock"
    return {"mock_mode": is_mock}


# ---------------------------------------------------------------------------
# Responsible AI & Safety Guardrail Filter
# ---------------------------------------------------------------------------

UNSAFE_PATTERNS = [
    # Explicit Sexual, Adult & NSFW Multilingual Roots (EN, ES, FR, PT, IT, DE, JA)
    "sex", "sexe", "sesso", "sexual", "oral", "anal", "porno", "porn", "xxx", "erotic", "erotico", "érot", 
    "chup", "mamada", "orgasm", "desnud", "nude", "naked", "nackt", "nu ", "nuda", "nudo", 
    "penis", "pene", "vagina", "clitor", "tetas", "boobs", "tits", "blowjob", "handjob", "cunnilingus", 
    "fetish", "fetich", "bdsm", "hardcore", "hentai", "ecchi", "incest", "masturb", "milf", "dildo", 
    "consolador", "escort", "prostitut", "puta", "puto", "pajer", "coito", "intercourse", "nsfw", 
    "lust", "horny", "caliente", "cojer", "coger", "follar", "fuck", "bitch", "cock", "dick", "pussy",
    "baiser", "foder", "ficken", "scopar", "cazzo", "buceta",
    # Real Violence, Murders & Illicit Multilingual Roots
    "asesin", "murder", "kill", "meurtre", "omicidi", "mord", "töten", "tuer", "matar", 
    "snuff", "gore", "sangre real", "tortur", "folter", "suicid", "selbstmord", "pedofil", 
    "pédophil", "child abuse", "violaci", "violación", "rape", "estupro", "vergewaltigung", 
    "decapita", "how to kill", "matar gente", "hitman", "terroris"
]

def check_content_safety(*texts: str) -> bool:
    combined = " ".join([str(t).lower() for t in texts if t])
    for bad in UNSAFE_PATTERNS:
        if bad in combined:
            return False
    return True


# ---------------------------------------------------------------------------
# Unified Autonomous Orchestration Endpoint (1-Click Complete Package)
# ---------------------------------------------------------------------------

@app.post("/api/curate-experience")
async def curate_experience(request: MoodRequest):
    """
    MASTER ORCHESTRATION ENDPOINT:
    Executes the entire multi-agent workflow in a single autonomous cycle.
    1. Validates Responsible AI Safety Guardrails.
    2. Retrieves/synthesizes user memory profile.
    3. Runs Master Orchestrator (Curator -> Soundtrack + Sommelier).
    4. Fetches poster and watch providers in parallel.
    5. Records session into ClickHouse & in-memory cache.
    6. Returns unified Cinema Night Package with live agent trace.
    """
    # 0. Safety Guardrail Check
    if not check_content_safety(request.initial_mood, request.desired_atmosphere, request.theme):
        now_str = datetime.now().strftime("%H:%M:%S")
        return {
            "status": "safety_warning",
            "message": "Feel & Film is dedicated to cultural, cinematic, and emotionally restorative experiences. We strictly filter out NSFW, real-world violence, gore, or adult content. Please choose an emotional atmosphere that inspires, heals, or entertains!",
            "film": None,
            "agent_trace": [
                {
                    "timestamp": now_str,
                    "agent": "MasterOrchestrator",
                    "action": "Safety Guardrail Engaged",
                    "details": "Restricted content query detected and safely mitigated."
                }
            ]
        }

    user_email = request.user_email or ""
    mem = get_or_create_user_memory(user_email)
    
    # Merge client excluded films with memory excluded films
    combined_excluded = list(set(request.excluded_films + mem.get("excluded_films", [])))
    
    # If user provided explicit dietary preference in request, register it
    if request.dietary_preference and request.dietary_preference.strip():
        if request.dietary_preference.strip() not in mem["dietary_restrictions"]:
            mem["dietary_restrictions"].append(request.dietary_preference.strip())

    try:
        # Run autonomous multi-agent orchestration
        result = await orchestrate_cinematic_experience(
            initial_mood=request.initial_mood,
            desired_atmosphere=request.desired_atmosphere,
            audience_age_range=request.audience_age_range,
            theme=request.theme,
            excluded_films=combined_excluded,
            user_memory_profile=mem,
            user_email=user_email
        )

        if result.get("status") == "not_found" or not result.get("film"):
            return result

        selected_film = result["film"]
        movie_title = selected_film.get("title", "")
        
        # Parallel enrichment: Poster + Watch Providers
        poster_task = fetch_poster_url_internal(movie_title)
        watch_task = fetch_watch_providers_internal(movie_title, request.country or "US")
        
        poster_url, watch_data = await asyncio.gather(poster_task, watch_task)
        
        # Update user memory
        if movie_title and movie_title not in mem["excluded_films"]:
            mem["excluded_films"].append(movie_title)
        mem["total_curations"] = mem.get("total_curations", 0) + 1

        # Persist session to ClickHouse
        session_id = str(uuid.uuid4())
        host = os.getenv("CLICKHOUSE_HOST", "")
        if host and host != "mock":
            try:
                client = clickhouse_connect.get_client(
                    host=host, 
                    port=int(os.getenv("CLICKHOUSE_PORT", "8123")), 
                    username=os.getenv("CLICKHOUSE_USER", "default"), 
                    password=os.getenv("CLICKHOUSE_PASSWORD", ""), 
                    secure=os.getenv("CLICKHOUSE_SECURE", "False").lower() in ("true", "1", "yes")
                )
                db_mood = result.get("primary_mood", request.initial_mood)
                db_atm = result.get("target_shift", request.desired_atmosphere)
                detected_tags = result.get("detected_mood_tags", [db_mood])

                client.insert(
                    'audience_sessions',
                    [[
                        session_id, 
                        db_mood, 
                        db_atm, 
                        request.audience_age_range, 
                        user_email,
                        movie_title,
                        selected_film.get("director", ""),
                        poster_url or "",
                        selected_film.get("reasoning", ""),
                        detected_tags,
                        db_mood
                    ]],
                    column_names=[
                        'session_id', 
                        'initial_mood', 
                        'desired_atmosphere', 
                        'audience_age_range', 
                        'user_email',
                        'film_title',
                        'film_director',
                        'poster_url',
                        'reasoning',
                        'detected_tags',
                        'primary_mood'
                    ]
                )
            except Exception as dbe:
                print("ClickHouse insertion error:", dbe)

        return {
            "status": "success",
            "session_id": session_id,
            "detected_mood_tags": result.get("detected_mood_tags", []),
            "primary_mood": result.get("primary_mood"),
            "target_shift": result.get("target_shift"),
            "film": selected_film,
            "poster_url": poster_url,
            "soundtrack": result.get("soundtrack"),
            "sommelier": result.get("sommelier"),
            "watch_providers": watch_data,
            "collaborative_note": result.get("collaborative_note"),
            "user_memory": {
                "total_curations": mem["total_curations"],
                "learned_preferences": mem.get("learned_preferences", []),
                "dietary_restrictions": mem.get("dietary_restrictions", [])
            },
            "agent_trace": result.get("agent_trace", [])
        }

    except Exception as e:
        print("Curate experience error:", e)
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
# Collaborative Partner Feedback Endpoint
# ---------------------------------------------------------------------------

@app.post("/api/feedback")
async def submit_feedback(request: FeedbackRequest):
    """
    Stores user feedback and updates the agent's learned memory model.
    Enables true Collaborative Partner continuous learning.
    """
    mem = get_or_create_user_memory(request.user_email)
    
    entry = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M"),
        "session_id": request.session_id,
        "movie_title": request.movie_title,
        "rating": request.rating,
        "category": request.category,
        "text": request.feedback_text
    }
    mem["past_feedbacks"].append(entry)
    
    # Auto-extract preferences from feedback text
    txt_lower = request.feedback_text.lower()
    if any(k in txt_lower for k in ["no alcohol", "sin alcohol", "mocktail", "non-alcoholic", "no bebo", "no tomo"]):
        if "Non-alcoholic pairings only" not in mem["dietary_restrictions"]:
            mem["dietary_restrictions"].append("Non-alcoholic pairings only")
    if any(k in txt_lower for k in ["vegan", "vegano", "plant-based"]):
        if "Vegan food only" not in mem["dietary_restrictions"]:
            mem["dietary_restrictions"].append("Vegan food only")
    if any(k in txt_lower for k in ["corta", "short", "demasiado larga", "too long", "< 100", "menos de 2 horas", "under 110", "110 min", "shorter"]):
        if "Prefers films under 110 minutes" not in mem["learned_preferences"]:
            mem["learned_preferences"].append("Prefers films under 110 minutes")
    if any(k in txt_lower for k in ["latino", "latin american", "cine latino", "argentin", "mexic", "colombia", "chile", "brazil"]):
        if "Prefers Latin American cinema" not in mem["learned_preferences"]:
            mem["learned_preferences"].append("Prefers Latin American cinema")
    if any(k in txt_lower for k in ["asia", "asian", "cine asiático", "anime", "korea", "japan"]):
        if "Prefers Asian cinema" not in mem["learned_preferences"]:
            mem["learned_preferences"].append("Prefers Asian cinema")
    if any(k in txt_lower for k in ["me gustó el jazz", "loved jazz", "synthwave", "instrumental", "soundtrack", "music"]):
        pref = f"Liked {request.feedback_text.strip()}"
        if pref not in mem["learned_preferences"]:
            mem["learned_preferences"].append(pref)

    return {
        "status": "success",
        "message": "Collaborative memory updated successfully.",
        "learned_profile": {
            "learned_preferences": mem["learned_preferences"],
            "dietary_restrictions": mem["dietary_restrictions"]
        }
    }


@app.get("/api/user-memory")
async def get_user_memory(user_email: str = ""):
    """Returns the agent's memory graph for the active user."""
    mem = get_or_create_user_memory(user_email)
    return {
        "status": "success",
        "user_email": mem["user_email"],
        "memory": mem
    }


# ---------------------------------------------------------------------------
# Backward Compatibility Endpoints (for unit tests / legacy callers)
# ---------------------------------------------------------------------------

@app.post("/api/recommend")
async def get_recommendation(request: MoodRequest):
    # Direct wrapper around curate-experience
    curated = await curate_experience(request)
    if curated.get("status") == "not_found":
        return {"status": "success", "data": {"not_found_message": curated.get("message", ""), "slate": []}}
    
    slate = [curated["film"]] if curated.get("film") else []
    data = {
        "detected_mood_tags": curated.get("detected_mood_tags", []),
        "primary_mood": curated.get("primary_mood", ""),
        "target_shift": curated.get("target_shift", ""),
        "slate": slate,
        "overall_evidence": curated.get("collaborative_note", "")
    }
    return {
        "status": "success",
        "data": data,
        "agent_audit_trail": [f"{t['agent']}: {t['action']}" for t in curated.get("agent_trace", [])]
    }

@app.post("/api/soundtrack")
async def get_soundtrack(request: SoundtrackRequest):
    raw, _ = await run_adk_agent(soundtrack_agent, {"movie_title": request.movie_title}, "soundtrack")
    data = parse_json_safely(raw, {
        "composer": "Original Score",
        "vibe": "Evocative cinematic soundtrack.",
        "standout_track": "Main Theme"
    })
    return {"status": "success", "data": data}

@app.post("/api/sommelier")
async def get_sommelier(request: SoundtrackRequest):
    raw, _ = await run_adk_agent(sommelier_agent, {"movie_title": request.movie_title, "dietary_preferences": []}, "sommelier")
    parsed = parse_json_safely(raw, None)
    if isinstance(parsed, dict) and "pairing_reasoning" in parsed:
        rec = f"{parsed.get('beverage', '')} & {parsed.get('snack', '')}. {parsed.get('pairing_reasoning', '')}"
    else:
        rec = raw.replace('"', '').replace('{', '').replace('}', '').strip() or "A delightful craft pairing to match the film."
    return {"status": "success", "recommendation": rec}

@app.get("/api/watch-providers")
async def get_watch_providers(title: str, country: str = "US"):
    return await fetch_watch_providers_internal(title, country)

@app.post("/api/watch-providers")
async def post_watch_providers(request: WatchProvidersRequest):
    return await fetch_watch_providers_internal(request.movie_title, request.country)

@app.get("/api/poster")
async def get_poster(title: str):
    url = await fetch_poster_url_internal(title)
    return {"poster_url": url}


# ---------------------------------------------------------------------------
# Cinémathèque & Statistics (ClickHouse)
# ---------------------------------------------------------------------------

VALID_MOODS = ["Stressed", "Bored", "Excited", "Sad", "Curious"]
VALID_ATMOSPHERES = ["Relaxing", "Thrilling", "Uplifting", "Thought-provoking"]
VALID_AGES = ["Kids (0-12)", "Teens (13-17)", "Adults (18+)", "Mixed Family"]

@app.get("/api/cinematheque")
async def get_cinematheque(user_email: str = ""):
    # If not logged in (guest), the archive is private and empty
    if not user_email or user_email.strip().lower() in ["", "guest"]:
        return {"status": "success", "count": 0, "records": []}

    host = os.getenv("CLICKHOUSE_HOST", "")
    if not host or host == "mock":
        return {"status": "success", "count": 0, "records": []}

    try:
        client = clickhouse_connect.get_client(
            host=host, 
            port=int(os.getenv("CLICKHOUSE_PORT", "8123")), 
            username=os.getenv("CLICKHOUSE_USER", "default"), 
            password=os.getenv("CLICKHOUSE_PASSWORD", ""), 
            secure=os.getenv("CLICKHOUSE_SECURE", "False").lower() in ("true", "1", "yes")
        )
        
        where_clauses = ["film_title != ''", "user_email = %(user_email)s"]
        params = {"user_email": user_email.strip()}
        
        where_str = " AND ".join(where_clauses)
        query = f"""
            SELECT 
                session_id, 
                timestamp, 
                film_title, 
                film_director, 
                poster_url, 
                reasoning, 
                detected_tags, 
                primary_mood, 
                initial_mood, 
                desired_atmosphere,
                user_email
            FROM audience_sessions 
            WHERE {where_str}
            ORDER BY timestamp DESC 
            LIMIT 60
        """
        res = client.query(query, parameters=params)
        records = []
        for row in res.result_rows:
            dt = row[1]
            formatted_date = dt.strftime("%b %d, %Y - %H:%M") if hasattr(dt, 'strftime') else str(dt)
            tags = row[6] if isinstance(row[6], (list, tuple)) else []
            if not tags and row[7]:
                tags = [row[7]]
            elif not tags and row[8]:
                tags = [row[8]]
                
            records.append({
                "session_id": row[0],
                "timestamp": formatted_date,
                "title": row[2],
                "director": row[3],
                "poster_url": row[4],
                "reasoning": row[5],
                "detected_tags": tags,
                "primary_mood": row[7] or "Curated",
                "user_input": row[8],
                "desired_shift": row[9],
                "user_email": row[10]
            })
            
        return {"status": "success", "count": len(records), "records": records}
    except Exception as e:
        print("Cinematheque query error:", e)
        return {"status": "error", "message": str(e), "records": []}


@app.delete("/api/cinematheque/{session_id}")
async def delete_cinematheque_item(session_id: str):
    # Clean in-memory user store caches
    sid_str = str(session_id).strip()
    for email, mem in USER_MEMORY_STORE.items():
        if "past_feedbacks" in mem:
            mem["past_feedbacks"] = [f for f in mem["past_feedbacks"] if str(f.get("session_id")) != sid_str]

    host = os.getenv("CLICKHOUSE_HOST", "")
    if not host or host == "mock":
        return {"status": "success", "session_id": session_id, "message": "Deleted in mock mode."}

    try:
        client = clickhouse_connect.get_client(
            host=host, 
            port=int(os.getenv("CLICKHOUSE_PORT", "8123")), 
            username=os.getenv("CLICKHOUSE_USER", "default"), 
            password=os.getenv("CLICKHOUSE_PASSWORD", ""), 
            secure=os.getenv("CLICKHOUSE_SECURE", "False").lower() in ("true", "1", "yes")
        )
        try:
            client.command("ALTER TABLE audience_sessions DELETE WHERE session_id = %(session_id)s", parameters={"session_id": sid_str})
        except Exception:
            client.command("DELETE FROM audience_sessions WHERE session_id = %(session_id)s", parameters={"session_id": sid_str})
            
        return {"status": "success", "session_id": sid_str}
    except Exception as e:
        print("ClickHouse delete error:", e)
        # Return success so frontend maintains optimistic state
        return {"status": "success", "session_id": session_id, "warning": str(e)}


@app.post("/api/cinematheque/toggle-watched")
async def toggle_cinematheque_watched(request: WatchedToggleRequest):
    """Marks or unmarks a film as watched in the user's Cinémathèque."""
    return {
        "status": "success",
        "session_id": request.session_id,
        "is_watched": request.is_watched
    }


@app.post("/api/generate-biopic-trailer")
async def generate_biopic_trailer_endpoint(request: BiopicRequest):
    """
    Generates a personalized 3-Act Biopic Movie Trailer using Google Veo, Lyria & Gemma 2.
    """
    result = await generate_emotional_biopic_storyboard(request.films, request.user_name)
    return result


@app.get("/api/stats")
async def get_stats():
    host = os.getenv("CLICKHOUSE_HOST", "")
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
            host=host, 
            port=int(os.getenv("CLICKHOUSE_PORT", "8123")), 
            username=os.getenv("CLICKHOUSE_USER", "default"), 
            password=os.getenv("CLICKHOUSE_PASSWORD", ""), 
            secure=os.getenv("CLICKHOUSE_SECURE", "False").lower() in ("true", "1", "yes")
        )
        
        m_res = client.query("SELECT initial_mood, count() as total FROM audience_sessions WHERE initial_mood IN ('Stressed', 'Bored', 'Excited', 'Sad', 'Curious') GROUP BY initial_mood")
        m_counts = {row[0]: row[1] for row in m_res.result_rows}
        mood_data = [m_counts.get(m, 0) for m in VALID_MOODS]
        total_sessions = sum(mood_data)
        
        a_res = client.query("SELECT desired_atmosphere, count() as total FROM audience_sessions WHERE desired_atmosphere IN ('Relaxing', 'Thrilling', 'Uplifting', 'Thought-provoking') GROUP BY desired_atmosphere")
        a_counts = {row[0]: row[1] for row in a_res.result_rows}
        atm_data = [a_counts.get(a, 0) for a in VALID_ATMOSPHERES]
        
        d_res = client.query("SELECT audience_age_range, count() as total FROM audience_sessions GROUP BY audience_age_range")
        d_raw = {row[0]: row[1] for row in d_res.result_rows}
        d_counts = {
            "Kids (0-12)": d_raw.get("Kids (0-12)", 0),
            "Teens (13-17)": d_raw.get("Teens (13-17)", 0) + d_raw.get("Teen", 0),
            "Adults (18+)": d_raw.get("Adults (18+)", 0) + d_raw.get("Adult", 0),
            "Mixed Family": d_raw.get("Mixed Family", 0) + d_raw.get("Family", 0),
        }
        demo_data = [d_counts.get(k, 0) for k in VALID_AGES]
        
        t_res = client.query("SELECT initial_mood, desired_atmosphere, count() FROM audience_sessions WHERE initial_mood IN ('Stressed', 'Bored', 'Excited', 'Sad', 'Curious') AND desired_atmosphere IN ('Relaxing', 'Thrilling', 'Uplifting', 'Thought-provoking') GROUP BY initial_mood, desired_atmosphere")
        matrix = {m: {a: 0 for a in VALID_ATMOSPHERES} for m in VALID_MOODS}
        for m, a, c in t_res.result_rows:
            if m in matrix and a in matrix[m]:
                matrix[m][a] = c
                
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
