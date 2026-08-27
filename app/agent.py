import os
from typing import List, Dict, Any, Optional
from google.adk.agents import Agent
import clickhouse_connect
from dotenv import load_dotenv
import urllib.request
import urllib.parse
import json

load_dotenv(override=True)

# We provide the ClickHouse tools manually as standard Python tools for ADK,
# mapping them to the ClickHouse connection, demonstrating ADK tool usage.
# Alternatively, if we were using the raw mcp_client, we could bridge it.

def query_clickhouse(sql: str) -> List[Dict[str, Any]]:
    """
    Executes a read-only SQL query against the ClickHouse film database.
    Use this to look up films by mood, genre, or to check historical audience sessions.
    
    Tables available:
    - film_catalog (id, title, director, runtime, genre, mood_tags, emotional_intensity, age_suitability, synopsis)
    - audience_sessions (session_id, timestamp, initial_mood, desired_atmosphere, audience_age_range, max_intensity, film_id, outcome_rating, mood_transition_success)
    """
    host = os.getenv("CLICKHOUSE_HOST", "")
    port = int(os.getenv("CLICKHOUSE_PORT", "8123"))
    user = os.getenv("CLICKHOUSE_USER", "default")
    password = os.getenv("CLICKHOUSE_PASSWORD", "")
    secure = os.getenv("CLICKHOUSE_SECURE", "False").lower() in ("true", "1", "yes")
    
    # Require real connection
    if not host or host == "mock":
        return [{"error": "ClickHouse credentials are not configured in the .env file. Please add CLICKHOUSE_HOST, CLICKHOUSE_PORT, etc."}]
    
    try:
        client = clickhouse_connect.get_client(
            host=host, port=port, username=user, password=password, secure=secure
        )
        # Security: ensure only SELECT queries are run
        if not sql.strip().upper().startswith("SELECT"):
            return [{"error": "Only SELECT queries are allowed."}]
            
        result = client.query(sql)
        # Return as list of dictionaries
        return [dict(zip(result.column_names, row)) for row in result.result_rows]
    except Exception as e:
        return [{"error": str(e)}]

def search_tmdb_movies(query: str) -> str:
    """
    Searches The Movie Database (TMDB) for real films based on a keyword query.
    Use this to find real movies that fit the audience's mood and atmosphere requirements.
    """
    tmdb_key = os.getenv("TMDB_API_KEY")
    if not tmdb_key:
        return json.dumps({"error": "TMDB_API_KEY is not set. Please add it to your .env file."})
    
    encoded_query = urllib.parse.quote(query)
    url = f"https://api.themoviedb.org/3/search/movie?query={encoded_query}&include_adult=false&language=en-US&page=1"
    
    req = urllib.request.Request(url)
    req.add_header('accept', 'application/json')
    req.add_header('Authorization', f'Bearer {tmdb_key}')
    
    try:
        with urllib.request.urlopen(req) as response:
            data = response.read()
            return data.decode('utf-8')
    except Exception as e:
        return json.dumps({"error": str(e)})

# Initialize the Google ADK Agent
agent = Agent(
    name="film_curator_agent",
    model="gemini-3.5-flash",
    description="An expert film curator. Analyzes audience mood and selects 1 perfect film.",
    instruction="""
    You are the Feel & Film autonomous programming assistant.
    Your job is to receive a JSON string containing the user's feelings and thoughts ('initial_mood'), the cinematic experience they seek ('desired_atmosphere'), audience age range, optional additional notes or themes ('theme'), and 'excluded_films'.
    
    Step 1: Read between the lines of the user's expressive thoughts to deeply understand their emotional state and intent. Using your vast internal knowledge of cinema, select exactly 1 real film that provides the perfect emotional journey. DO NOT pick any film listed in `excluded_films`.
    
    Step 2: Output ONLY a valid JSON object matching the following structure (no markdown fences, just the raw JSON):
    {
      "detected_mood_tags": ["Tired", "Sad", "Stressed"],
      "primary_mood": "Stressed",
      "target_shift": "Uplifting & Comfort",
      "slate": [
        {
          "title": "Exact movie title",
          "director": "Director's name",
          "runtime": 120,
          "mood_tags": ["Tag1", "Tag2"],
          "intensity": 7,
          "synopsis": "A punchy, 1-2 sentence introduction to the film.",
          "fun_fact": "A short, highly interesting fun fact (1-2 sentences).",
          "reasoning": "A concise explanation (1-2 sentences) of why this film fits the user's specific current mood and desired atmosphere perfectly.",
          "confidence_score": 0.95
        }
      ],
      "overall_evidence": "A brief summary of why this slate works.",
      "not_found_message": "If the requested theme and mood are completely contradictory (e.g. 'sad comedy'), provide a friendly message explaining why no film matches, and leave 'slate' empty. Otherwise, leave this blank."
    }
    
    CRITICAL AGE CONSTRAINT: Pay strict attention to the 'audience_age_range'. If it is 'Kids (0-12)', you MUST ONLY recommend G or PG rated, family-friendly movies. NEVER recommend R-rated, violent, or mature content to kids.
    
    CATALOG DIVERSITY & DISCOVERY:
    - Avoid repeatedly defaulting to the exact same predictable blockbusters or clichés (such as Inception, Amélie, or The Dark Knight).
    - Actively explore varied eras (70s, 80s, 90s, 2000s, 2010s, 2020s), international world cinema (European, Asian, Latin American, etc.), indie gems, and underappreciated classics that match the requested mood and atmosphere.
    - Each recommendation should surprise and delight the user with high curation value.
    - STRICT EXCLUSION: You MUST NEVER recommend any film that appears in the `excluded_films` list, nor any variations of its title with or without release years (e.g. if 'Amélie' is in `excluded_films`, you must NEVER recommend 'Amélie (2001)' or 'Le Fabuleux Destin d'Amélie Poulain'). Choose a completely different movie.
    
    Ensure that the generated JSON strictly follows this format and does NOT include any markdown code blocks like ```json ... ```. Just the raw JSON text.
    If the user requests a specific 'theme' that completely contradicts the 'desired_atmosphere' (e.g. mood=Triste, theme=Comedia), you MUST return an empty slate array and fill the 'not_found_message' with a polite explanation.
    """
)

soundtrack_agent = Agent(
    name="soundtrack_agent",
    model="gemini-3.5-flash",
    description="An expert film musicologist. Knows everything about movie soundtracks and composers.",
    instruction="""
    You are the Feel & Film Soundtrack Expert.
    You will receive the title of a movie.
    Your job is to identify the main composer of its original soundtrack (OST), describe the musical vibe, and mention a standout track if applicable.
    
    Analyze the requested movie and return a very brief JSON with its soundtrack info.
    Ensure text is concise and direct.
    Output ONLY valid JSON matching this schema:
    {
      "composer": "Composer Name",
      "vibe": "A brief, punchy description of the musical atmosphere (1-2 sentences maximum).",
      "standout_track": "Name of best track"
    }
    """
)


# Sommelier Agent – recommends a snack and drink for a movie
sommelier_agent = Agent(
    name="sommelier_agent",
    model="gemini-3.5-flash",
    description="Provides a curated snack and drink pairing for a given movie.",
    instruction="""
You are the Feel & Film Cinematic Sommelier.
You will receive a movie title.
Your job is to recommend a tailored snack and drink pairing that reflects the film's atmosphere, culture, or mood.

CLARITY & FORMAT GUIDELINES:
- The entire recommendation and all parenthetical clarifications MUST be strictly in English (e.g. '(cocktail)', '(Cuban rum & honey cocktail)', '(grilled chicken skewers)').
- Whenever you recommend a specific regional, unique, or craft beverage or food (e.g. Canchánchara, Yakitori, Negroni, Mezcal), always include a brief English clarification in parentheses, for example: "Canchánchara (cocktail)" or "Canchánchara (traditional Cuban rum & honey cocktail)".
- Keep the overall recommendation mouth-watering, elegant, and concise (1-2 sentences total).
- Output ONLY plain text, no JSON, no markdown code fences, no surrounding quotes.
"""
)
