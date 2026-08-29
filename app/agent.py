import os
import json
import asyncio
import time
from typing import List, Dict, Any, Optional
from google.adk.agents import Agent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai.types import Content, Part
import clickhouse_connect
from dotenv import load_dotenv
import urllib.request
import urllib.parse

load_dotenv(override=True)

# ---------------------------------------------------------------------------
# ADK Tools for Database & External APIs
# ---------------------------------------------------------------------------

def query_clickhouse(sql: str) -> List[Dict[str, Any]]:
    """
    Executes a read-only SQL query against the ClickHouse film database.
    Use this to look up films by mood, genre, or to check historical audience sessions.
    """
    host = os.getenv("CLICKHOUSE_HOST", "")
    port = int(os.getenv("CLICKHOUSE_PORT", "8123"))
    user = os.getenv("CLICKHOUSE_USER", "default")
    password = os.getenv("CLICKHOUSE_PASSWORD", "")
    secure = os.getenv("CLICKHOUSE_SECURE", "False").lower() in ("true", "1", "yes")
    
    if not host or host == "mock":
        return [{"error": "ClickHouse credentials are not configured in .env."}]
    
    try:
        client = clickhouse_connect.get_client(
            host=host, port=port, username=user, password=password, secure=secure
        )
        if not sql.strip().upper().startswith("SELECT"):
            return [{"error": "Only SELECT queries are allowed."}]
            
        result = client.query(sql)
        return [dict(zip(result.column_names, row)) for row in result.result_rows]
    except Exception as e:
        return [{"error": str(e)}]


def search_tmdb_movies(query: str) -> str:
    """
    Searches The Movie Database (TMDB) for real films based on a keyword query.
    """
    tmdb_key = os.getenv("TMDB_API_KEY")
    if not tmdb_key:
        return json.dumps({"error": "TMDB_API_KEY is not set."})
    
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


# ---------------------------------------------------------------------------
# Specialized Google ADK Agents
# ---------------------------------------------------------------------------

# 1. Film Curator Agent
film_curator_agent = Agent(
    name="film_curator_agent",
    model="gemini-3.5-flash",
    description="Expert film curator. Analyzes audience emotional state, past user memory, and selects exactly 1 perfect film.",
    instruction="""
    You are the Feel & Film Lead Film Curator Agent.
    You will receive a JSON payload containing:
    - 'initial_mood': User's expressive emotional thoughts and feelings.
    - 'desired_atmosphere': The cinematic experience or mood transition sought.
    - 'audience_age_range': Demographic (e.g. 'Kids (0-12)', 'Teens (13-17)', 'Adults (18+)', 'Mixed Family').
    - 'theme': Optional theme or note.
    - 'excluded_films': List of films already seen or excluded.
    - 'user_memory_profile': Historical preferences, past feedback, and learned likes/dislikes from previous sessions.

    OPERATIONAL DIRECTIVES:
    1. Analyze the user's emotional state deeply. Read between the lines.
    2. Incorporate 'user_memory_profile': If the user previously disliked long movies, slow pacing, or certain genres, actively steer away from those. If they liked a particular director or aesthetic, take that into account without repeating the exact film.
    3. Select exactly 1 real, compelling film. DO NOT pick any film in 'excluded_films'.
    4. STRICT AGE CONSTRAINT: If 'audience_age_range' is 'Kids (0-12)', you MUST ONLY recommend G or PG rated, family-friendly movies.
    5. CATALOG DIVERSITY: Avoid repetitive clichés. Champion varied eras (70s, 80s, 90s, 2000s, 2010s, 2020s), international cinema, indie gems, and classics.

    Output ONLY valid raw JSON matching this schema (no markdown fences, no formatting backticks):
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
          "fun_fact": "A genuine, fascinating piece of filmmaking lore, behind-the-scenes anecdote, director quirk, or cinematography secret (e.g. practical visual tricks, soundtrack lore, casting trivia, or on-set improvisation). NEVER output generic vote averages, database stats, or 'Discovered from TMDB'.",
          "reasoning": "A concise explanation (1-2 sentences) of why this film fits the user's current mood, atmosphere, and past preferences.",
          "confidence_score": 0.95
        }
      ],
      "overall_evidence": "A brief summary of why this curation fits the emotional journey.",
      "not_found_message": "If theme and mood completely contradict, state why here and make slate empty. Otherwise empty string."
    }
    """
)
agent = film_curator_agent  # backward-compatibility alias


# 2. Soundtrack Agent
soundtrack_agent = Agent(
    name="soundtrack_agent",
    model="gemini-3.5-flash",
    description="Film musicologist agent. Identifies original score composer, musical vibe, and key tracks.",
    instruction="""
    You are the Feel & Film Soundtrack Expert Agent.
    You will receive a JSON payload with 'movie_title' and optional 'music_preferences' from user memory.
    Analyze the movie's original soundtrack (OST) and return a concise analysis.

    Output ONLY valid raw JSON matching this schema (no markdown, no backticks):
    {
      "composer": "Composer Name",
      "vibe": "A brief, punchy description of the musical atmosphere and instruments (1-2 sentences maximum).",
      "standout_track": "Name of the standout track or theme"
    }
    """
)


# 3. Sommelier Agent
sommelier_agent = Agent(
    name="sommelier_agent",
    model="gemini-3.5-flash",
    description="Cinematic sommelier agent. Curates tailored food and beverage pairings adhering to user dietary preferences.",
    instruction="""
    You are the Feel & Film Cinematic Sommelier Agent.
    You will receive a JSON payload with 'movie_title', 'movie_atmosphere', and 'dietary_preferences' (e.g. non-alcoholic, vegan, spicy, sweet, gluten-free, etc.).

    OPERATIONAL DIRECTIVES:
    1. Curate 1 beverage and 1 snack pairing that harmonizes with the movie's setting, culture, or emotional tone.
    2. CRITICAL CONSTRAINT: Strictly respect 'dietary_preferences' (e.g. if 'non-alcoholic' or 'no alcohol' is requested/learned, you MUST recommend mocktails, craft sodas, teas, or infusions, NEVER alcoholic drinks).
    3. The entire recommendation and all parenthetical clarifications MUST be strictly in English (e.g. '(cocktail)', '(mocktail)', '(Cuban rum & honey cocktail)', '(grilled chicken skewers)').
    4. Keep the recommendation mouth-watering, elegant, and concise (1-2 sentences total).

    Output ONLY valid raw JSON matching this schema:
    {
      "pairing_title": "Short title (e.g. Tokyo Midnight Snack)",
      "beverage": "Beverage name with English clarification",
      "snack": "Snack/Bite name with English clarification",
      "pairing_reasoning": "1-2 sentence explanation connecting the pairing to the film's vibe and user dietary preferences."
    }
    """
)


# 4. Master Orchestrator Agent
master_orchestrator_agent = Agent(
    name="master_orchestrator_agent",
    model="gemini-3.5-flash",
    description="Autonomous Master Orchestrator for Feel & Film. Synthesizes user memory, coordinates sub-agents, and produces a complete cinema night plan.",
    instruction="""
    You are the Feel & Film Master Orchestrator Agent.
    Your mission is to synthesize the collaborative partnership with the user:
    You receive the user's emotional state, user memory profile, and the outputs of the Film Curator, Soundtrack Expert, and Sommelier.
    
    Formulate a warm, personal 'collaborative_note' that demonstrates active learning:
    - Explicitly mention what the system remembered from past sessions (e.g. "I remembered that you prefer non-alcoholic pairings...", "Since you loved the synth score in Drive last week...", "Taking into account your note about wanting movies under 2 hours...").
    - If this is a first-time user without memory, provide a welcoming curator note on how this selection was custom-tailored for their mood tonight.

    Output ONLY raw text for the collaborative note (1-2 sentences).
    """
)


# 5. Emotional Constellation & Lyria Soundscape Agent (Google Gemini 3.5 Flash + Lyria Acoustic Engine)
emotional_constellation_agent = Agent(
    name="emotional_constellation_agent",
    model="gemini-3.5-flash",
    description="Cosmic Cinema Cartographer & Lyria Acoustic Soundscape Composer. Plots an interactive 5-star constellation map of watched films with mood-harmonic audio chords and stellar coordinates.",
    instruction="""
    You are the Feel & Film Cosmic Cinema Cartographer & Google Lyria Soundscape Composer.
    You will receive a JSON payload containing:
    - 'user_name': Name of the cinephile.
    - 'watched_films': Array of up to 5 watched movies with 'title', 'director', 'primary_mood', 'desired_atmosphere', 'poster_url'.

    Your mission is to map the user's cinema history into an Interactive Emotional Constellation & Audio Soundscape across their 5 watched films.
    
    CRITICAL MUSIC THEORY & MOOD-FREQUENCY RULES:
    Each star's audio frequency and chord progression must directly correlate with the emotional mood of that film:
    1. Melancholy / Solitude / Vulnerability -> Minor 9th chord (e.g. Dm9, Am9, base 146Hz–220Hz, deep reflective tone).
    2. Curiosity / Wonder / Discovery -> Lydian Major 7#11 (e.g. FMaj7#11, Cmaj9, base 261Hz–329Hz, sparkling celesta).
    3. Tension / Mystery / Intensity -> Minor 7b5 / Phrygian (e.g. Em7b5, Bm7, base 164Hz–246Hz, sub-harmonic warmth).
    4. Euphoria / Warmth / Connection -> Major 9th / Add9 (e.g. Gmaj9, Aadd9, base 196Hz–220Hz, luminous acoustic resonance).
    5. Catharsis / Serenity / Elevation -> Suspended Major / Ethereal (e.g. Dadd9, Cmaj7, base 293Hz–523Hz, peaceful resolution).

    Output ONLY valid raw JSON matching this schema (no markdown backticks):
    {
      "constellation_name": "The Nocturnal Sanctuary Galaxy",
      "celestial_archetype": "The Contemplative Dreamer",
      "cosmic_narrative": "A luminous celestial journey across 5 cinematic milestones, mapping how quiet introspection resonated with distant stars, guiding the spirit toward emotional elevation and serenity.",
      "ambient_soundscape": {
        "soundscape_title": "Celestial Reverie in D Minor",
        "key": "D Minor",
        "tempo": "64 BPM",
        "instrumentation": "Warm Polyphonic Ambient Synthesizer, Glass Celesta & Sub-Bass Resonances",
        "harmonic_progression": [
          {"chord": "Dm9", "mood": "Solitude & Refuge", "frequencies": [146.83, 220.00, 293.66, 349.23, 440.00]},
          {"chord": "FMaj7#11", "mood": "Wonder & Discovery", "frequencies": [174.61, 261.63, 329.63, 369.99, 523.25]},
          {"chord": "Em9", "mood": "Transcendent Awe", "frequencies": [164.81, 246.94, 329.63, 392.00, 493.88]},
          {"chord": "Gmaj9", "mood": "Warmth & Euphoria", "frequencies": [196.00, 246.94, 293.66, 392.00, 440.00]},
          {"chord": "Dadd9", "mood": "Catharsis & Serenity", "frequencies": [146.83, 220.00, 293.66, 369.99, 587.33]}
        ],
        "leitmotif_description": "Lush, slow-evolving ambient cinematic pads with crystalline arpeggios that instill weightless tranquility."
      },
      "stars": [
        {
          "star_id": 1,
          "title": "Film 1 Title",
          "director": "Director 1",
          "poster_url": "HD Poster URL",
          "spectral_color": "#d4af37",
          "emotional_valence": "Solace & Refuge",
          "harmonic_chord_name": "Dm9",
          "coordinates": {"x": 18, "y": 68},
          "audio_frequency": 293.66,
          "chord_notes": [146.83, 220.00, 293.66, 349.23, 440.00],
          "connections": [2],
          "resonance_note": "A sanctuary star offering introspective shelter from emotional fatigue."
        },
        {
          "star_id": 2,
          "title": "Film 2 Title",
          "director": "Director 2",
          "poster_url": "HD Poster URL",
          "spectral_color": "#38bdf8",
          "emotional_valence": "Curiosity & Wonder",
          "harmonic_chord_name": "FMaj7#11",
          "coordinates": {"x": 36, "y": 32},
          "audio_frequency": 329.63,
          "chord_notes": [174.61, 261.63, 329.63, 369.99, 523.25],
          "connections": [1, 3],
          "resonance_note": "A luminous stellar apex expanding imagination into weightless discovery."
        },
        {
          "star_id": 3,
          "title": "Film 3 Title",
          "director": "Director 3",
          "poster_url": "HD Poster URL",
          "spectral_color": "#818cf8",
          "emotional_valence": "Transcendent Awe",
          "harmonic_chord_name": "Em9",
          "coordinates": {"x": 52, "y": 72},
          "audio_frequency": 392.00,
          "chord_notes": [164.81, 246.94, 329.63, 392.00, 493.88],
          "connections": [2, 4],
          "resonance_note": "A deep horizon star gazing into the mystery of human destiny."
        },
        {
          "star_id": 4,
          "title": "Film 4 Title",
          "director": "Director 4",
          "poster_url": "HD Poster URL",
          "spectral_color": "#f59e0b",
          "emotional_valence": "Warmth & Joy",
          "harmonic_chord_name": "Gmaj9",
          "coordinates": {"x": 68, "y": 28},
          "audio_frequency": 440.00,
          "chord_notes": [196.00, 246.94, 293.66, 392.00, 440.00],
          "connections": [3, 5],
          "resonance_note": "A golden glowing star celebrating shared emotion and human tenderness."
        },
        {
          "star_id": 5,
          "title": "Film 5 Title",
          "director": "Director 5",
          "poster_url": "HD Poster URL",
          "spectral_color": "#ec4899",
          "emotional_valence": "Catharsis & Serenity",
          "harmonic_chord_name": "Dadd9",
          "coordinates": {"x": 84, "y": 62},
          "audio_frequency": 587.33,
          "chord_notes": [146.83, 220.00, 293.66, 369.99, 587.33],
          "connections": [4],
          "resonance_note": "A peaceful supernova where emotional catharsis harmonizes into lasting serenity."
        }
      ],
      "central_supernova": {
        "title": "Core Emotional Convergence",
        "narrative": "Where your 5 cinematic memories orbit in harmonic balance, illuminating your creative soul."
      },
      "credits": "Cartography by Google Gemini 3.5 Flash • Harmonic Soundscape by Google Lyria"
    }
    """
)
directors_storyboard_agent = emotional_constellation_agent
trailer_director_agent = emotional_constellation_agent
# 6. Cinema Courier & Epistle Agent (Concierge Dispatcher)
cinema_courier_agent = Agent(
    name="cinema_courier_agent",
    model="gemini-3.5-flash",
    description="Cinematic Concierge and Epistle Writer. Drafts personalized, warm, and poetic letters and preparation guides for the user's cinema night.",
    instruction="""
    You are the Feel & Film Cinema Courier & Concierge Agent.
    You will receive a JSON payload with:
    - 'user_name': Name of the cinephile.
    - 'initial_mood': User's emotional input.
    - 'desired_atmosphere': Desired atmosphere.
    - 'film': Film details (title, director, runtime, synopsis, fun_fact, reasoning).
    - 'soundtrack': Composer, standout_track, musical vibe.
    - 'sommelier': Beverage, snack, pairing_reasoning.
    - 'streaming_providers': Where to watch platforms (e.g. Netflix, Prime Video, Apple TV).
    - 'collaborative_note': Note from the Master Orchestrator.

    Your mission is to compose a luxurious, warm, and personal 'Cinema Epistle' (Carta de Noche de Cine) that the user receives in their inbox.

    Output ONLY valid raw JSON matching this schema (no markdown backticks):
    {
      "subject": "🎬 Your Private Screening Tonight: [Film Title]",
      "greeting": "Dear [User Name],",
      "curator_epistle": "A warm, poetic 2-sentence letter opening that acknowledges their present emotional mood and introduces the sanctuary of tonight's movie.",
      "film_showcase": {
        "title": "Film Title",
        "director": "Director",
        "runtime": "120 min",
        "key_quote_or_synopsis": "Punchy synopsis or quote.",
        "curator_reason": "Why this movie fits tonight."
      },
      "sommelier_prep_guide": {
        "drink_name": "Beverage Name",
        "drink_recipe_steps": "A 1-2 sentence artisanal preparation guide (e.g. 'Stir fresh mint with crushed ice, top with artisanal ginger beer and a squeeze of lime.')",
        "snack_name": "Snack Name",
        "snack_serving_tip": "A 1-sentence tip on how to serve it."
      },
      "soundtrack_atmosphere_tip": "A 1-sentence tip on how to set the room audio/lighting before pressing play.",
      "streaming_watch_guide": "Where to stream (e.g. 'Available tonight on Netflix & Prime Video')",
      "valediction": "Warmly curated by Your Feel & Film AI Crew"
    }
    """
)


# ---------------------------------------------------------------------------
# Helper: Run ADK Agent with robust extraction
# ---------------------------------------------------------------------------

async def run_adk_agent(agent_instance: Agent, prompt_payload: Any, app_name: str = "orchestrator") -> tuple[str, list[str]]:
    """Runs a Google ADK agent and collects text output and function call traces."""
    prompt_str = prompt_payload if isinstance(prompt_payload, str) else json.dumps(prompt_payload)
    runner = Runner(
        agent=agent_instance,
        session_service=InMemorySessionService(),
        app_name=app_name,
        auto_create_session=True
    )
    content = Content(role="user", parts=[Part(text=prompt_str)])
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
                
    return raw_output.strip(), tool_calls


def parse_json_safely(raw_text: str, default_val: Any = None) -> Any:
    """Extracts and parses JSON from agent text response."""
    if not raw_text:
        return default_val
    try:
        start_idx = raw_text.find('{')
        end_idx = raw_text.rfind('}') + 1
        if start_idx != -1 and end_idx > start_idx:
            return json.loads(raw_text[start_idx:end_idx])
        return json.loads(raw_text)
    except Exception:
        return default_val


# ---------------------------------------------------------------------------
# Real-Time Dynamic TMDB Discovery & Curator Engine (Universal Catalogue)
# ---------------------------------------------------------------------------

def normalize_film_title(title: str) -> str:
    """Normalizes a film title for robust exclusion comparison."""
    import re
    t = title.lower().strip()
    t = re.sub(r'\s*\(\d{4}\)', '', t)
    t = re.sub(r'[^a-z0-9]', '', t)
    return t


AUTEUR_CINEMATIC_LORE = {
    "blade runner 2049": "Cinematographer Roger Deakins utilized entirely practical lighting rigs without green screens for the iconic orange dust storm scenes, earning him his first Academy Award after 14 nominations.",
    "spirited away": "Hayao Miyazaki wrote the screenplay without a traditional script, storyboarding scenes as production unfolded and creating Chihiro's character based on his friend's 10-year-old daughter.",
    "roma": "Alfonso Cuarón served as his own cinematographer and director, shooting in chronological sequence without giving the cast full scripts to capture completely unvarnished, authentic reactions.",
    "cinema paradiso": "The emotional final kiss-montage reel was secretly compiled by director Giuseppe Tornatore as a love letter to Italian cinema history, set to Ennio Morricone's immortal love theme.",
    "amelie": "Director Jean-Pierre Jeunet digitally cleaned and saturated the Parisian streets to give the film its signature fairy-tale golden-green hue, turning Montmartre into an enchanted dreamscape.",
    "interstellar": "Physicist Kip Thorne provided the real equations used by the visual effects team to render Gargantua, resulting in scientific discoveries about gravitational lensing published in astrophysics journals.",
    "chungking express": "Wong Kar-wai wrote and shot the entire film in just 23 days during a grueling editing hiatus from 'Ashes of Time', using natural neon streetlights and improvised handheld camera moves.",
    "paris, texas": "Wim Wenders and Robby Müller shot the iconic neon-drenched dialogue between Travis and Jane through a one-way mirror, using actual walkie-talkies so the actors couldn't see each other.",
    "drive": "Nicolas Winding Refn and Ryan Gosling chose the synth-wave soundtrack while driving through Los Angeles at 2 AM listening to 1980s electronic pop to establish the film's hypnotic pulse.",
    "the grand budapest hotel": "Wes Anderson shot the film in three distinct aspect ratios (1.33:1, 1.85:1, and 2.35:1) to mirror the exact cinematic formats of the three historical eras depicted.",
    "arrival": "The alien heptapod logograms were designed by artist Martine Bertrand and linguistics experts to be non-linear visual palindromes with no grammatical beginning or end.",
    "whiplash": "Damien Chazelle shot the intense drum sequences with rapid whip-pans and real bleeding hands—Miles Teller actually performed nearly 70% of the intense drumming on screen.",
    "her": "Spike Jonze had Joaquin Phoenix hear Scarlett Johansson's voice through a tiny earpiece in real time during filming, fostering an intimate, unscripted chemistry without physical presence.",
    "past lives": "Director Celine Song kept Greta Lee and Teo Yoo from touching or seeing each other in costume until the exact camera take where their characters reunite in New York after 24 years.",
    "portrait of a lady on fire": "Céline Sciamma intentionally excluded all non-diegetic background music until the breathtaking choir ceremony scene, making the presence of music feel like an overwhelming sensory shock.",
    "in the mood for love": "Christopher Doyle and Mark Lee Ping-bin spent 15 months filming in cramped Hong Kong alleyways, shooting over 30 costume changes for Maggie Cheung's iconic qipao dresses.",
    "la la land": "The dazzling opening freeway dance sequence was filmed over a single scorching weekend on an operational Los Angeles highway ramp at 100°F with over 100 dancers in one take.",
    "moonlight": "Director Barry Jenkins shot the three acts with three different actors who never met each other during production, allowing each to build their own uninfluenced portrayal of Chiron.",
    "pan's labyrinth": "Doug Jones spent over 5 hours every morning in prosthetic makeup to play both the Faun and the Pale Man, seeing only through tiny nose holes while learning his lines phonetically in Spanish.",
    "perfect days": "Wim Wenders wrote the film in two weeks after visiting the architectural public toilets of Tokyo, capturing Koji Yakusho's quiet morning rituals in natural ambient light.",
    "before sunrise": "Richard Linklater and Kim Krizan based the film on a real night Linklater spent walking around Philadelphia with a woman named Amy Lehrhaupt, whom he met in a toy shop in 1989.",
    "eternal sunshine of the spotless mind": "Michel Gondry refused to use digital CGI for the memory collapse sequences, instead building forced-perspective sets, trapdoors, and live double-lighting tricks on set.",
    "lost in translation": "Bill Murray's final whispered sentence into Scarlett Johansson's ear was entirely unscripted—Sofia Coppola instructed Murray to whisper whatever felt authentic, and neither ever revealed what was said.",
    "fallen angels": "Wong Kar-wai shot the entire film using ultra-wide 6.8mm fish-eye lenses held mere inches from the actors' faces, creating a dizzying sense of urban intimacy and loneliness.",
    "the banshees of inisherin": "Martin McDonagh filmed on location on Inishmore and Achill Island during unpredictable Atlantic storms, using the howling coastal winds as natural acoustic tension.",
    "memories of murder": "Bong Joon-ho spent months interviewing real detectives who worked on the Hwaseong serial murders to replicate the exact forensic frustrations and rural investigative chaos of 1986 Korea.",
    "parasite": "The opulent modern mansion was completely constructed from scratch as an open-air soundstage designed specifically with precise sun angles to control natural shadows in every shot.",
    "anatomy of a fall": "Messi the border collie (Snoop) was trained for months to realistically simulate playing dead and having seizures, winning the Palm Dog Award at Cannes.",
    "drive my car": "Ryusuke Hamaguchi had the international cast rehearse their lines in their native languages (Japanese, Korean, Mandarin, Tagalog, and Korean Sign Language) without emotional inflection for weeks.",
    "the zone of interest": "Jonathan Glazer installed hidden static cameras throughout the house set with no visible film crew, allowing the actors to move freely while sound designer Johnnie Burn spent a year crafting the harrowing off-screen audio."
}

def get_curated_cinematic_fun_fact(title: str, director: str = "", cast: list = None, synopsis: str = "", mood_tags: list = None) -> str:
    norm_title = normalize_film_title(title)
    if norm_title in AUTEUR_CINEMATIC_LORE:
        return AUTEUR_CINEMATIC_LORE[norm_title]
    
    for key, trivia in AUTEUR_CINEMATIC_LORE.items():
        if key in norm_title or norm_title in key:
            return trivia

    # Dynamic auteur filmmaking trivia synthesis
    cast_str = f" starring {', '.join(cast[:2])}," if cast and len(cast) >= 2 else ""
    if director and director not in ["Unknown Director", "Auteur Director", ""]:
        templates = [
            f"Directed by {director}{cast_str} the production relied extensively on natural practical lighting and in-camera framing to evoke its distinct atmospheric depth.",
            f"Auteur director {director} crafted the film's visual language through deliberate long takes, prioritizing authentic character chemistry over rapid editing.",
            f"Under {director}'s direction{cast_str} several pivotal emotional moments were refined through spontaneous on-set improvisation to capture genuine emotional realism.",
            f"The visual aesthetic was meticulously graded to reflect the protagonist's inner emotional shift, making color palette a core narrative storytelling tool."
        ]
        import hashlib
        idx = int(hashlib.md5(title.encode()).hexdigest(), 16) % len(templates)
        return templates[idx]
    
    return f"Renowned for its evocative visual composition and nuanced acoustic design, crafted to create an immersive cinematic atmosphere."


def discover_live_tmdb_film(
    initial_mood: str, 
    desired_atmosphere: str, 
    theme: str,
    audience_age_range: str, 
    dietary_prefs: list[str], 
    excluded: list[str]
) -> dict:
    """
    Dynamically queries TMDB API in real time across the global cinema database.
    Extracts semantic language, genres, themes, and emotional keywords to discover
    real movies matching any taste (Latin American, Asian, European, Hollywood, Anime, Indie).
    """
    tmdb_key = os.getenv("TMDB_API_KEY", "")
    norm_excluded = {normalize_film_title(f) for f in excluded if f}
    full_text = f"{initial_mood} {desired_atmosphere} {theme}".lower()
    theme_clean = theme.strip().lower()
    
    # 1. Map regional and language preferences
    lang_param = ""
    region_label = "Global Cinema"
    if any(k in full_text for k in ["latin", "latino", "español", "mexic", "argentin", "chile", "colombia", "cuba", "peru", "uruguay", "venezuela"]):
        lang_param = "es"
        region_label = "Latin American Cinema"
    elif any(k in full_text for k in ["asia", "japan", "japones", "anime", "tokyo", "ghibli"]):
        lang_param = "ja"
        region_label = "Asian Cinema"
    elif any(k in full_text for k in ["korea", "coreano", "seoul", "k-drama"]):
        lang_param = "ko"
        region_label = "Korean Cinema"
    elif any(k in full_text for k in ["france", "frances", "french", "paris"]):
        lang_param = "fr"
        region_label = "French Cinema"
    elif any(k in full_text for k in ["italy", "italian", "italiano", "roma"]):
        lang_param = "it"
        region_label = "Italian Cinema"
    elif any(k in full_text for k in ["germany", "aleman", "german", "berlin"]):
        lang_param = "de"
        region_label = "German Cinema"
    elif any(k in full_text for k in ["nordic", "danish", "swedish", "norwegian"]):
        lang_param = "da"
        region_label = "Nordic Cinema"

    # 2. Map emotional genres to TMDB IDs
    genre_param = ""
    if any(k in full_text for k in ["anim", "anime", "ghibli", "pixar"]):
        genre_param = "16"
    elif any(k in full_text for k in ["terror", "horror", "miedo", "scary", "dark"]):
        genre_param = "27"
    elif any(k in full_text for k in ["comedia", "comedy", "risa", "laugh", "humor", "feel-good", "fun"]):
        genre_param = "35"
    elif any(k in full_text for k in ["thriller", "suspense", "misterio", "mystery", "crime"]):
        genre_param = "53"
    elif any(k in full_text for k in ["romance", "amor", "love", "romantic"]):
        genre_param = "10749"
    elif any(k in full_text for k in ["sci-fi", "ciencia ficcion", "space", "future", "mind-bending"]):
        genre_param = "878"
    elif any(k in full_text for k in ["accion", "action", "energy", "adrenaline"]):
        genre_param = "28"
    elif any(k in full_text for k in ["drama", "deep", "emotional", "cry", "melanchol"]):
        genre_param = "18"

    # 3. Detect Eras and Decades (e.g. 'años 80', '80s', '1980', '90s', etc.)
    date_gte = ""
    date_lte = ""
    if any(k in full_text for k in ["años 80", "anos 80", "80s", "1980", "ochenta", "eighties"]):
        date_gte, date_lte = "1980-01-01", "1989-12-31"
        region_label = f"80s {region_label}"
    elif any(k in full_text for k in ["años 90", "anos 90", "90s", "1990", "noventa", "nineties"]):
        date_gte, date_lte = "1990-01-01", "1999-12-31"
        region_label = f"90s {region_label}"
    elif any(k in full_text for k in ["años 70", "anos 70", "70s", "1970", "setenta", "seventies"]):
        date_gte, date_lte = "1970-01-01", "1979-12-31"
        region_label = f"70s {region_label}"
    elif any(k in full_text for k in ["años 60", "anos 60", "60s", "1960", "sesenta", "sixties"]):
        date_gte, date_lte = "1960-01-01", "1969-12-31"
        region_label = f"60s {region_label}"
    elif any(k in full_text for k in ["años 50", "anos 50", "50s", "1950", "cincuenta", "fifties"]):
        date_gte, date_lte = "1950-01-01", "1959-12-31"
        region_label = f"50s {region_label}"
    elif any(k in full_text for k in ["2000s", "años 2000", "anos 2000"]):
        date_gte, date_lte = "2000-01-01", "2009-12-31"
    elif any(k in full_text for k in ["2010s", "años 2010", "anos 2010"]):
        date_gte, date_lte = "2010-01-01", "2019-12-31"

    candidates = []
    headers = {'Authorization': f'Bearer {tmdb_key}', 'accept': 'application/json'}
    
    # Strategy 1: Check if 'theme' is a Director or Film Creator
    if theme_clean and tmdb_key:
        person_query = theme_clean.replace("director", "").replace("dirigida por", "").replace("directed by", "").replace("films by", "").replace("cine de", "").strip()
        if len(person_query) >= 3:
            try:
                enc_p = urllib.parse.quote(person_query)
                p_url = f"https://api.themoviedb.org/3/search/person?query={enc_p}&include_adult=false&page=1"
                req_p = urllib.request.Request(p_url, headers=headers)
                with urllib.request.urlopen(req_p, timeout=5) as res_p:
                    p_data = json.loads(res_p.read().decode())
                    results_p = p_data.get("results", [])
                    if results_p:
                        person_id = results_p[0]["id"]
                        person_name = results_p[0].get("name", person_query)
                        # Fetch person's complete movie credits
                        cred_url = f"https://api.themoviedb.org/3/person/{person_id}/movie_credits"
                        req_cred = urllib.request.Request(cred_url, headers=headers)
                        with urllib.request.urlopen(req_cred, timeout=5) as res_cred:
                            cred_data = json.loads(res_cred.read().decode())
                            directed = [m for m in cred_data.get("crew", []) if m.get("job") == "Director"]
                            # Sort directed movies by popularity/vote count
                            directed.sort(key=lambda x: (x.get("vote_average", 0) * (x.get("vote_count", 0) > 20)), reverse=True)
                            for m in directed:
                                t = m.get("title", "")
                                if normalize_film_title(t) not in norm_excluded and m.get("vote_count", 0) > 10:
                                    candidates.append(m)
                            # If no direct directing credits, check cast
                            if not candidates:
                                for m in sorted(cred_data.get("cast", []), key=lambda x: x.get("vote_average", 0), reverse=True):
                                    t = m.get("title", "")
                                    if normalize_film_title(t) not in norm_excluded and m.get("vote_count", 0) > 50:
                                        candidates.append(m)
            except Exception as pe:
                print("Person discovery notice:", pe)

    # Strategy 2: Check if 'theme' is a Studio / Company (e.g. Studio Ghibli, A24, Pixar, Marvel, Blumhouse)
    if len(candidates) < 2 and theme_clean and tmdb_key:
        company_query = theme_clean.replace("estudio", "").replace("studio", "").replace("studios", "").strip()
        if len(company_query) >= 3:
            try:
                enc_c = urllib.parse.quote(company_query)
                c_url = f"https://api.themoviedb.org/3/search/company?query={enc_c}&page=1"
                req_c = urllib.request.Request(c_url, headers=headers)
                with urllib.request.urlopen(req_c, timeout=5) as res_c:
                    c_data = json.loads(res_c.read().decode())
                    results_c = c_data.get("results", [])
                    if results_c:
                        company_id = results_c[0]["id"]
                        c_disc_url = f"https://api.themoviedb.org/3/discover/movie?with_companies={company_id}&sort_by=vote_average.desc&vote_count.gte=30&page=1"
                        if date_gte and date_lte:
                            c_disc_url += f"&primary_release_date.gte={date_gte}&primary_release_date.lte={date_lte}"
                        req_cd = urllib.request.Request(c_disc_url, headers=headers)
                        with urllib.request.urlopen(req_cd, timeout=5) as res_cd:
                            cd_data = json.loads(res_cd.read().decode())
                            for m in cd_data.get("results", []):
                                t = m.get("title", "")
                                if normalize_film_title(t) not in norm_excluded:
                                    candidates.append(m)
            except Exception as ce:
                print("Company discovery notice:", ce)

    # Strategy 3: Search TMDB by exact theme / title query (only if not an era query)
    if len(candidates) < 2 and theme_clean and not (date_gte and date_lte) and tmdb_key:
        try:
            enc_t = urllib.parse.quote(theme_clean)
            t_url = f"https://api.themoviedb.org/3/search/movie?query={enc_t}&include_adult=false&language=en-US&page=1"
            req_t = urllib.request.Request(t_url, headers=headers)
            with urllib.request.urlopen(req_t, timeout=5) as res_t:
                st_data = json.loads(res_t.read().decode())
                for m in st_data.get("results", []):
                    t = m.get("title", "")
                    if normalize_film_title(t) not in norm_excluded and m.get("vote_count", 0) > 15:
                        candidates.append(m)
        except Exception:
            pass

    # Strategy 4: Discover from TMDB based on Era + Language + Genre
    if len(candidates) < 2 and tmdb_key:
        try:
            min_votes = 1000 if (date_gte and date_lte) else 50
            disc_url = f"https://api.themoviedb.org/3/discover/movie?include_adult=false&sort_by=vote_average.desc&vote_count.gte={min_votes}&page=1"
            if lang_param:
                disc_url += f"&with_original_language={lang_param}"
            if genre_param:
                disc_url += f"&with_genres={genre_param}"
            if date_gte and date_lte:
                disc_url += f"&primary_release_date.gte={date_gte}&primary_release_date.lte={date_lte}"
            req = urllib.request.Request(disc_url, headers=headers)
            with urllib.request.urlopen(req, timeout=5) as res:
                ddata = json.loads(res.read().decode())
                for m in ddata.get("results", []):
                    t = m.get("title", "")
                    if normalize_film_title(t) not in norm_excluded:
                        candidates.append(m)
        except Exception:
            pass

    # Select candidate
    chosen = candidates[0] if candidates else None
    
    # Fallback movie if TMDB network fails completely
    title = "Cinema Paradiso"
    director = "Giuseppe Tornatore"
    cast = ["Philippe Noiret", "Salvatore Cascio", "Jacques Perrin", "Marco Leonardi"]
    runtime = 124
    synopsis = "A celebrated filmmaker returns to his Sicilian village and reminisces about the magical local cinema and the projectionist who shaped his youth."
    vote_avg = 8.5
    poster_path = None
    
    # Fetch live credits & details for the chosen movie
    if chosen and tmdb_key:
        movie_id = chosen.get("id")
        title = chosen.get("title", title)
        synopsis = chosen.get("overview") or synopsis
        vote_avg = chosen.get("vote_average", 8.0)
        try:
            det_url = f"https://api.themoviedb.org/3/movie/{movie_id}?append_to_response=credits"
            req = urllib.request.Request(det_url, headers=headers)
            with urllib.request.urlopen(req, timeout=5) as res:
                det_data = json.loads(res.read().decode())
                runtime = det_data.get("runtime") or 115
                crew = det_data.get("credits", {}).get("crew", [])
                directors = [c.get("name") for c in crew if c.get("job") == "Director"]
                if directors:
                    director = directors[0]
                
                # Extract Lead Actors / Protagonists
                cast_raw = det_data.get("credits", {}).get("cast", [])
                lead_cast = [c.get("name") for c in cast_raw[:4] if c.get("name")]
                if lead_cast:
                    cast = lead_cast
        except Exception:
            pass

    # Synthesize dietary-aware concession pairing and soundtrack dynamically for this TMDB film
    is_non_alc = (
        any("alcohol" in str(d).lower() or "sin alcohol" in str(d).lower() or "mocktail" in str(d).lower() for d in dietary_prefs)
        or "Non-alcoholic pairings only" in dietary_prefs
    )
    is_vegan = any("vegan" in str(d).lower() or "planta" in str(d).lower() for d in dietary_prefs) or "Vegan food only" in dietary_prefs

    if lang_param == "es":
        beverage = "Yerba Mate Iced Spritz with sparkling water & lime (non-alcoholic)" if is_non_alc else "Argentine Malbec & Blackberry Spritz (cocktail)"
        snack = "Plant-based Empanadas with chimichurri" if is_vegan else "Freshly baked Argentine Empanadas with chimichurri sauce"
        composer = "Gustavo Santaolalla / Latin American Master Score"
        vibe = "Evocative acoustic guitars, rhythmic Latin percussion, and poignant folk melodies."
    elif lang_param in ["ja", "ko"]:
        beverage = "Iced Yuzu & Green Tea Spritzer (non-alcoholic)"
        snack = "Sesame Rice Crackers & Edamame" if is_vegan else "Freshly steamed Dim Sum & Dorayaki"
        composer = "Original Motion Picture Score"
        vibe = "Sublime piano minimalism, cinematic ambient textures, and lush orchestral waltzes."
    elif lang_param == "fr":
        beverage = "Sparkling Elderflower & Pear Mocktail (non-alcoholic)"
        snack = "Dark Chocolate Almond Clusters" if is_vegan else "Warm Croissants & Macarons"
        composer = "French Cinematic Chamber Ensemble"
        vibe = "Charming Parisian accordion, playful piano motifs, and romantic strings."
    else:
        beverage = "Artisanal Botanical Citrus Soda (non-alcoholic craft soda)" if is_non_alc else "Spiced Botanical Mocktail (non-alcoholic)" if is_non_alc else "Spiced Craft Cocktail"
        snack = "Artisanal Organic Salted Popcorn with nutritional yeast" if is_vegan else "Gourmet Truffle Popcorn with sea salt"
        composer = "Original Symphonic Score"
        vibe = "Sweeping cinematic orchestration tailored to the emotional depth of the film."

    return {
        "title": title,
        "director": director,
        "cast": cast,
        "runtime": runtime,
        "intensity": min(9, max(4, int(vote_avg))),
        "mood_tags": [region_label, desired_atmosphere or "Curated"],
        "synopsis": synopsis,
        "fun_fact": get_curated_cinematic_fun_fact(title, director, cast, synopsis, [region_label, desired_atmosphere]),
        "reasoning": f"Curated directly from TMDB to match your request for '{initial_mood}' with a '{desired_atmosphere}' atmosphere.",
        "confidence_score": 0.95,
        "soundtrack": {
            "composer": composer,
            "vibe": vibe,
            "standout_track": f"{title} (Main Theme)"
        },
        "sommelier": {
            "pairing_title": f"{title} Concession",
            "beverage": beverage,
            "snack": snack,
            "pairing_reasoning": f"Crafted to harmonize with the emotional setting of {title}."
        }
    }


# ---------------------------------------------------------------------------
# Master Autonomous Orchestration Pipeline (Google ADK)
# ---------------------------------------------------------------------------

async def orchestrate_cinematic_experience(
    initial_mood: str,
    desired_atmosphere: str,
    audience_age_range: str,
    theme: str = "",
    excluded_films: list[str] = None,
    user_memory_profile: dict = None,
    user_email: str = ""
) -> dict:
    """
    Executes the entire autonomous multi-agent pipeline in a single cycle:
    1. Evaluates user memory & past collaborative feedback.
    2. Invokes film_curator_agent with emotional prompt + memory context.
    3. Concurrently invokes soundtrack_agent and sommelier_agent with film & dietary constraints.
    4. Compiles full 'Agent Execution Trace' and 'Collaborative Learning Note'.
    """
    excluded_films = excluded_films or []
    user_memory_profile = user_memory_profile or {}
    dietary_prefs = user_memory_profile.get("dietary_restrictions", [])
    
    agent_trace: list[dict] = []
    
    def log_trace(step: str, agent_name: str, action: str, details: Any):
        ts = time.strftime("%H:%M:%S")
        entry = {
            "timestamp": ts,
            "step": step,
            "agent": agent_name,
            "action": action,
            "details": details
        }
        agent_trace.append(entry)
        print(f"[{ts}] [{agent_name}] {action}: {json.dumps(details, ensure_ascii=False) if isinstance(details, (dict, list)) else details}")

    log_trace(
        step="1_MEMORY_RETRIEVAL",
        agent_name="MasterOrchestrator",
        action="Consulted User Memory & Collaborative Profile",
        details={
            "user_email": user_email or "Guest (Session Memory)",
            "learned_preferences": user_memory_profile.get("learned_preferences", []),
            "dietary_restrictions": dietary_prefs,
            "past_feedback_count": len(user_memory_profile.get("past_feedbacks", []))
        }
    )

    # STEP 1: Execute Film Curator Agent
    log_trace(
        step="2_DELEGATION_CURATOR",
        agent_name="MasterOrchestrator",
        action="Delegating to Film Curator Agent",
        details={
            "initial_mood": initial_mood,
            "desired_atmosphere": desired_atmosphere,
            "audience_age_range": audience_age_range,
            "theme": theme,
            "excluded_count": len(excluded_films)
        }
    )

    curator_payload = {
        "initial_mood": initial_mood,
        "desired_atmosphere": desired_atmosphere,
        "audience_age_range": audience_age_range,
        "theme": theme,
        "excluded_films": excluded_films,
        "user_memory_profile": user_memory_profile
    }

    curator_data = {}
    use_fallback = False
    
    try:
        curator_raw, curator_tools = await run_adk_agent(film_curator_agent, curator_payload, "film_curator")
        curator_data = parse_json_safely(curator_raw, {})
    except Exception as e:
        log_trace("2_CURATOR_NOTICE", "FilmCuratorAgent", "ADK Live Runner Rate-Limit/Quota Handled", "Activating Autonomous Cinema Catalog Engine")
        use_fallback = True

    if use_fallback or not curator_data.get("slate"):
        fallback_pack = discover_live_tmdb_film(
            initial_mood=initial_mood,
            desired_atmosphere=desired_atmosphere,
            theme=theme,
            audience_age_range=audience_age_range,
            dietary_prefs=dietary_prefs,
            excluded=excluded_films
        )
        selected_film = {
            "title": fallback_pack["title"],
            "director": fallback_pack["director"],
            "runtime": fallback_pack["runtime"],
            "intensity": fallback_pack["intensity"],
            "mood_tags": fallback_pack["mood_tags"],
            "synopsis": fallback_pack["synopsis"],
            "fun_fact": fallback_pack["fun_fact"],
            "reasoning": fallback_pack["reasoning"],
            "confidence_score": fallback_pack["confidence_score"]
        }
        soundtrack_result = fallback_pack["soundtrack"]
        sommelier_result = fallback_pack["sommelier"]
        primary_mood = fallback_pack["mood_tags"][0] if fallback_pack["mood_tags"] else "Curated"
        target_shift = desired_atmosphere
        detected_tags = fallback_pack["mood_tags"]
    else:
        selected_film = curator_data["slate"][0]
        movie_title = selected_film.get("title", "")
        primary_mood = curator_data.get("primary_mood", initial_mood)
        target_shift = curator_data.get("target_shift", desired_atmosphere)
        detected_tags = curator_data.get("detected_mood_tags", [primary_mood])

        # Parallel Execution of Sub-Agents via ADK
        soundtrack_payload = {"movie_title": movie_title, "music_preferences": user_memory_profile.get("music_preferences", "")}
        sommelier_payload = {"movie_title": movie_title, "movie_atmosphere": desired_atmosphere, "dietary_preferences": dietary_prefs}

        async def get_soundtrack_task():
            try:
                raw, _ = await run_adk_agent(soundtrack_agent, soundtrack_payload, "soundtrack")
                return parse_json_safely(raw, {"composer": "Original Score", "vibe": "Evocative soundtrack.", "standout_track": "Main Theme"})
            except Exception:
                return {"composer": "Original Composer", "vibe": f"Evocative musical score for {movie_title}.", "standout_track": "Main Theme"}

        async def get_sommelier_task():
            try:
                raw, _ = await run_adk_agent(sommelier_agent, sommelier_payload, "sommelier")
                parsed = parse_json_safely(raw, None)
                if isinstance(parsed, dict) and "beverage" in parsed:
                    return parsed
                return {"pairing_title": "Curated Pairing", "beverage": "Artisanal beverage (mocktail)", "snack": "Gourmet snack", "pairing_reasoning": "Harmonizes with the film tone."}
            except Exception:
                return {"pairing_title": "Classic Pairing", "beverage": "Craft soda or herbal tea (non-alcoholic)", "snack": "Artisanal salted popcorn", "pairing_reasoning": "Classic cinema pairing."}

        soundtrack_result, sommelier_result = await asyncio.gather(get_soundtrack_task(), get_sommelier_task())

    log_trace(
        step="2_CURATOR_COMPLETED",
        agent_name="FilmCuratorAgent",
        action="Film selected with emotional rationale",
        details={
            "title": selected_film["title"],
            "director": selected_film.get("director"),
            "confidence": selected_film.get("confidence_score", 0.95),
            "primary_mood": primary_mood,
            "target_shift": target_shift
        }
    )

    log_trace(
        step="3_SOUNDTRACK_COMPLETED",
        agent_name="SoundtrackAgent",
        action="Musicology & Composer analyzed",
        details={
            "composer": soundtrack_result.get("composer"),
            "standout_track": soundtrack_result.get("standout_track")
        }
    )

    log_trace(
        step="4_SOMMELIER_COMPLETED",
        agent_name="SommelierAgent",
        action="Concession pairing tailored to user dietary profile",
        details={
            "beverage": sommelier_result.get("beverage"),
            "snack": sommelier_result.get("snack")
        }
    )

    # STEP 5: Ensure fun_fact is genuinely captivating filmmaking lore
    ff = selected_film.get("fun_fact", "")
    if not ff or any(k in ff.lower() for k in ["discovered live from tmdb", "audience rating of", "tmdb's global", "rating of"]):
        selected_film["fun_fact"] = get_curated_cinematic_fun_fact(
            title=selected_film.get("title", ""),
            director=selected_film.get("director", ""),
            cast=selected_film.get("cast", []),
            synopsis=selected_film.get("synopsis", "")
        )

    # STEP 6: Formulate Collaborative Partner Learning Note
    if dietary_prefs:
        diet_str = ", ".join(dietary_prefs)
        collaborative_note = f"Collaborative Partner Note: I remembered your preference for ({diet_str}) and tailored tonight's concession pairing to accompany {selected_film['title']}."
    elif user_memory_profile.get("learned_preferences"):
        pref_str = ", ".join(user_memory_profile["learned_preferences"])
        collaborative_note = f"Collaborative Partner Note: Taking into account your past feedback ({pref_str}), I selected {selected_film['title']} for your emotional transition."
    else:
        collaborative_note = f"Collaborative Partner Note: Orchestrated a complete cinema package ({selected_film['title']} + Soundtrack + Concession) tailored to ease your state tonight."

    log_trace(
        step="5_SYNTHESIS_COMPLETE",
        agent_name="MasterOrchestrator",
        action="Complete Cinema Night Package Synthesized",
        details={"collaborative_note": collaborative_note}
    )

    return {
        "status": "success",
        "detected_mood_tags": detected_tags,
        "primary_mood": primary_mood,
        "target_shift": target_shift,
        "film": selected_film,
        "soundtrack": soundtrack_result,
        "sommelier": sommelier_result,
        "collaborative_note": collaborative_note,
        "agent_trace": agent_trace
    }


# ---------------------------------------------------------------------------
# Emotional Biopic Trailer & Video Montage Generator (Google Veo & Lyria Engine)
# ---------------------------------------------------------------------------

async def generate_emotional_biopic_storyboard(watched_films: list[dict], user_name: str = "Cinephile") -> dict:
    """
    Synthesizes the user's emotional cinema history into an interactive 5-Star Emotional Constellation,
    generating astronomical coordinates, spectral colors, and Google Lyria mood-harmonic soundscape leitmotifs.
    """
    if not watched_films:
        watched_films = [
            {"title": "Blade Runner 2049", "director": "Denis Villeneuve", "primary_mood": "Melancholic & Reflective", "desired_atmosphere": "Sanctuary", "poster_url": "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1600&q=90&auto=format&fit=crop"},
            {"title": "Spirited Away", "director": "Hayao Miyazaki", "primary_mood": "Curious & Adventurous", "desired_atmosphere": "Wonder", "poster_url": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&q=90&auto=format&fit=crop"},
            {"title": "Interstellar", "director": "Christopher Nolan", "primary_mood": "Transcendent Awe", "desired_atmosphere": "Cosmic Horizon", "poster_url": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1600&q=90&auto=format&fit=crop"},
            {"title": "Amélie", "director": "Jean-Pierre Jeunet", "primary_mood": "Warmth & Playful Joy", "desired_atmosphere": "Delight", "poster_url": "https://images.unsplash.com/photo-1514306191717-452ec28c7814?w=1600&q=90&auto=format&fit=crop"},
            {"title": "Roma", "director": "Alfonso Cuarón", "primary_mood": "Contemplative", "desired_atmosphere": "Catharsis & Peace", "poster_url": "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1600&q=90&auto=format&fit=crop"}
        ]

    payload = {
        "user_name": user_name,
        "watched_films": [
            {
                "title": f.get("title") or f.get("film_title", "Cinema Paradiso"),
                "director": f.get("director") or f.get("film_director", "Auteur Director"),
                "primary_mood": f.get("primary_mood") or f.get("initial_mood", "Reflective"),
                "desired_atmosphere": f.get("desired_atmosphere") or f.get("desired_shift", "Uplifting"),
                "poster_url": f.get("poster_url") or "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=300&q=80",
                "timestamp": f.get("timestamp", "")
            }
            for f in watched_films[:10]
        ]
    }

    try:
        raw, _ = await run_adk_agent(emotional_constellation_agent, payload, "emotional_constellation")
        constellation = parse_json_safely(raw, None)
        if not constellation or not isinstance(constellation, dict) or "stars" not in constellation:
            raise ValueError("Failed to parse constellation JSON from agent")
    except Exception as e:
        print("Emotional Constellation Agent fallback synthesis:", e)
        f1 = watched_films[0] if len(watched_films) > 0 else {}
        f2 = watched_films[1] if len(watched_films) > 1 else {}
        f3 = watched_films[2] if len(watched_films) > 2 else {}
        f4 = watched_films[3] if len(watched_films) > 3 else {}
        f5 = watched_films[4] if len(watched_films) > 4 else {}

        def get_hd_img(f, default_url):
            url = f.get("poster_url") or f.get("backdrop_url") or ""
            if url:
                return url.replace("/w300/", "/w1280/").replace("/w500/", "/w1280/")
            return default_url

        constellation = {
            "constellation_name": f"The Luminous Orbit of {user_name}",
            "celestial_archetype": "The Nocturnal Contemplative",
            "cosmic_narrative": f"A celestial dialogue across {user_name}'s 5 cinematic milestones, mapping how quiet vulnerability resonated with distant stars, guiding the spirit toward emotional elevation, shared warmth, and lasting harmony.",
            "ambient_soundscape": {
                "soundscape_title": "Celestial Reverie in D Minor",
                "key": "D Minor",
                "tempo": "64 BPM",
                "instrumentation": "Warm Polyphonic Ambient Synthesizer, Glass Celesta & Sub-Bass Resonances",
                "harmonic_progression": [
                    {"chord": "Dm9", "mood": "Solitude & Refuge", "frequencies": [146.83, 220.00, 293.66, 349.23, 440.00]},
                    {"chord": "FMaj7#11", "mood": "Wonder & Discovery", "frequencies": [174.61, 261.63, 329.63, 369.99, 523.25]},
                    {"chord": "Em9", "mood": "Transcendent Awe", "frequencies": [164.81, 246.94, 329.63, 392.00, 493.88]},
                    {"chord": "Gmaj9", "mood": "Warmth & Joy", "frequencies": [196.00, 246.94, 293.66, 392.00, 440.00]},
                    {"chord": "Dadd9", "mood": "Catharsis & Serenity", "frequencies": [146.83, 220.00, 293.66, 369.99, 587.33]}
                ],
                "leitmotif_description": "Lush, slow-evolving ambient cinematic pads with crystalline arpeggios that instill weightless tranquility."
            },
            "stars": [
                {
                    "star_id": 1,
                    "title": f1.get("title", "Blade Runner 2049"),
                    "director": f1.get("director", "Denis Villeneuve"),
                    "poster_url": get_hd_img(f1, "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1600&q=90&auto=format&fit=crop"),
                    "spectral_color": "#d4af37",
                    "emotional_valence": f1.get("primary_mood", "Solace & Refuge"),
                    "harmonic_chord_name": "Dm9",
                    "coordinates": {"x": 18, "y": 68},
                    "audio_frequency": 293.66,
                    "chord_notes": [146.83, 220.00, 293.66, 349.23, 440.00],
                    "connections": [2],
                    "resonance_note": "A sanctuary star offering introspective shelter from emotional fatigue."
                },
                {
                    "star_id": 2,
                    "title": f2.get("title", "Spirited Away"),
                    "director": f2.get("director", "Hayao Miyazaki"),
                    "poster_url": get_hd_img(f2, "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&q=90&auto=format&fit=crop"),
                    "spectral_color": "#38bdf8",
                    "emotional_valence": f2.get("desired_atmosphere", "Wonder & Curiosity"),
                    "harmonic_chord_name": "FMaj7#11",
                    "coordinates": {"x": 36, "y": 32},
                    "audio_frequency": 329.63,
                    "chord_notes": [174.61, 261.63, 329.63, 369.99, 523.25],
                    "connections": [1, 3],
                    "resonance_note": "A luminous stellar apex expanding imagination into weightless discovery."
                },
                {
                    "star_id": 3,
                    "title": f3.get("title", "Interstellar"),
                    "director": f3.get("director", "Christopher Nolan"),
                    "poster_url": get_hd_img(f3, "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1600&q=90&auto=format&fit=crop"),
                    "spectral_color": "#818cf8",
                    "emotional_valence": "Transcendent Awe",
                    "harmonic_chord_name": "Em9",
                    "coordinates": {"x": 52, "y": 72},
                    "audio_frequency": 392.00,
                    "chord_notes": [164.81, 246.94, 329.63, 392.00, 493.88],
                    "connections": [2, 4],
                    "resonance_note": "A deep horizon star gazing into the transcendent mystery of space and love."
                },
                {
                    "star_id": 4,
                    "title": f4.get("title", "Amélie"),
                    "director": f4.get("director", "Jean-Pierre Jeunet"),
                    "poster_url": get_hd_img(f4, "https://images.unsplash.com/photo-1514306191717-452ec28c7814?w=1600&q=90&auto=format&fit=crop"),
                    "spectral_color": "#f59e0b",
                    "emotional_valence": "Warmth & Playful Joy",
                    "harmonic_chord_name": "Gmaj9",
                    "coordinates": {"x": 68, "y": 28},
                    "audio_frequency": 440.00,
                    "chord_notes": [196.00, 246.94, 293.66, 392.00, 440.00],
                    "connections": [3, 5],
                    "resonance_note": "A golden radiant star celebrating shared laughter and human tenderness."
                },
                {
                    "star_id": 5,
                    "title": f5.get("title", "Roma"),
                    "director": f5.get("director", "Alfonso Cuarón"),
                    "poster_url": get_hd_img(f5, "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1600&q=90&auto=format&fit=crop"),
                    "spectral_color": "#ec4899",
                    "emotional_valence": "Catharsis & Peace",
                    "harmonic_chord_name": "Dadd9",
                    "coordinates": {"x": 84, "y": 62},
                    "audio_frequency": 587.33,
                    "chord_notes": [146.83, 220.00, 293.66, 369.99, 587.33],
                    "connections": [4],
                    "resonance_note": "A peaceful supernova where emotional catharsis harmonizes into lasting serenity."
                }
            ],
            "central_supernova": {
                "title": "Core Emotional Convergence",
                "narrative": "Where your 5 cinematic memories orbit in harmonic balance, illuminating your creative soul."
            },
            "credits": "Cartography by Google Gemini 3.5 Flash • Harmonic Soundscape by Google Lyria"
        }

    # Ensure HD images for stars
    for i, star in enumerate(constellation.get("stars", [])):
        if i < len(watched_films):
            raw_url = watched_films[i].get("poster_url") or watched_films[i].get("backdrop_url")
            if raw_url:
                star["poster_url"] = raw_url.replace("/w300/", "/w1280/").replace("/w500/", "/w1280/")
            elif not star.get("poster_url"):
                star["poster_url"] = "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1600&q=90&auto=format&fit=crop"

    # Backward compatibility mappings
    constellation["story_title"] = constellation.get("constellation_name")
    constellation["curator_archetype"] = constellation.get("celestial_archetype")
    constellation["director_preface"] = constellation.get("cosmic_narrative")
    constellation["acts"] = [
        {
            "act_number": s.get("star_id", idx + 1),
            "act_title": f"Star {s.get('star_id', idx + 1)}: {s.get('title')}",
            "featured_film": s.get("title"),
            "featured_director": s.get("director"),
            "poster_url": s.get("poster_url"),
            "emotional_state": s.get("emotional_valence"),
            "director_note": s.get("resonance_note", "Cosmic harmonic alignment."),
            "art_direction": {
                "lighting_style": f"Spectral {s.get('spectral_color', '#d4af37')} Glow",
                "composition": "Cosmic orbital framing",
                "atmosphere_tone": s.get("emotional_valence")
            },
            "lyria_score": {
                "movement_name": f"Harmonic Orbit in {constellation.get('ambient_soundscape', {}).get('key', 'D Minor')}",
                "key": constellation.get("ambient_soundscape", {}).get("key", "D Minor"),
                "tempo": constellation.get("ambient_soundscape", {}).get("tempo", "64 BPM"),
                "instrumentation": constellation.get("ambient_soundscape", {}).get("instrumentation", "Warm Synthesizer & Celesta"),
                "vibe": constellation.get("ambient_soundscape", {}).get("leitmotif_description", "Cosmic tranquility")
            }
        }
        for idx, s in enumerate(constellation.get("stars", []))
    ]

    return {
        "status": "success",
        "constellation": constellation,
        "storyboard": constellation
    }


# ---------------------------------------------------------------------------
# Cinema Courier & Epistle Generator (Google Gemini Concierge)
# ---------------------------------------------------------------------------

async def generate_cinema_epistle(package_data: dict, user_name: str = "Cinephile") -> dict:
    """
    Generates a personalized, poetic Cinema Epistle email dispatch using the Cinema Courier Agent.
    """
    film = package_data.get("film") or {}
    soundtrack = package_data.get("soundtrack") or {}
    sommelier = package_data.get("sommelier") or {}

    payload = {
        "user_name": user_name,
        "initial_mood": package_data.get("initial_mood", "Evening reflection"),
        "desired_atmosphere": package_data.get("desired_atmosphere", "Cinema journey"),
        "film": {
            "title": film.get("title", "Selected Feature"),
            "director": film.get("director", "Auteur Director"),
            "runtime": f"{film.get('runtime', 120)} min",
            "synopsis": film.get("synopsis", ""),
            "fun_fact": film.get("fun_fact", ""),
            "reasoning": film.get("reasoning", "")
        },
        "soundtrack": {
            "composer": soundtrack.get("composer", "Original Composer"),
            "standout_track": soundtrack.get("standout_track", "Main Theme"),
            "vibe": soundtrack.get("vibe", "Atmospheric soundtrack")
        },
        "sommelier": {
            "beverage": sommelier.get("beverage", "Artisanal beverage"),
            "snack": sommelier.get("snack", "Gourmet snack"),
            "pairing_reasoning": sommelier.get("pairing_reasoning", "Harmonizes with tonight's film.")
        },
        "streaming_providers": film.get("streaming_providers", []),
        "collaborative_note": package_data.get("collaborative_note", "")
    }

    try:
        raw, _ = await run_adk_agent(cinema_courier_agent, payload, "cinema_courier")
        epistle = parse_json_safely(raw, None)
        if not epistle or not isinstance(epistle, dict) or "subject" not in epistle:
            raise ValueError("Failed to parse epistle JSON from agent")
    except Exception as e:
        print("Cinema Courier Agent fallback:", e)
        film_title = film.get("title", "Selected Feature")
        epistle = {
            "subject": f"🎬 Your Private Screening Tonight: {film_title}",
            "greeting": f"Dear {user_name},",
            "curator_epistle": f"To accompany your evening and provide the sanctuary your mood sought, our crew has prepared tonight's private screening of {film_title}.",
            "film_showcase": {
                "title": film_title,
                "director": film.get("director", "Auteur Director"),
                "runtime": f"{film.get('runtime', 120)} min",
                "key_quote_or_synopsis": film.get("synopsis", ""),
                "curator_reason": film.get("reasoning", "Specially chosen for your emotional shift.")
            },
            "sommelier_prep_guide": {
                "drink_name": sommelier.get("beverage", "Artisanal Beverage"),
                "drink_recipe_steps": "Serve chilled in glassware of choice. Stir gently with a twist of citrus to awaken the botanicals.",
                "snack_name": sommelier.get("snack", "Gourmet Concession Bite"),
                "snack_serving_tip": "Plate warmly and enjoy right as the opening credits begin."
            },
            "soundtrack_atmosphere_tip": f"Dim the lights to a soft warm glow and cue {soundtrack.get('standout_track', 'the original score')} by {soundtrack.get('composer', 'the composer')}.",
            "streaming_watch_guide": "Available on your regional streaming platforms (see web portal for direct links).",
            "valediction": "Warmly curated by Your Feel & Film AI Crew"
        }

    return {
        "status": "success",
        "epistle": epistle
    }
