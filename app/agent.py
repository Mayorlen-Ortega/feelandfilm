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
    Your job is to receive a JSON string containing the audience's current mood, desired emotional atmosphere, age range, slots, and excluded_films.
    
    Step 1: Using your vast internal knowledge of cinema, select exactly 1 real film based on the user's constraints. DO NOT pick any film listed in `excluded_films`.
    
    Step 2: Output ONLY a valid JSON object matching the following structure (no markdown fences, just the raw JSON):
    {
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
    description="Provides a snack and drink recommendation for a given movie.",
    instruction="""
You are the Feel & Film Sommelier.
You will receive a movie title.
Your job is to provide a short (1-2 sentence) recommendation of a snack and a drink that pair well with the movie.
Output ONLY plain text, no JSON, no markdown, no surrounding quotes.
"""
)
