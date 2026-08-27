# Architecture & System Design — Feel & Film

![Feel & Film Architecture Diagram](app/static/architecture_diagram.svg)

## Overview
**Feel & Film** is an autonomous multi-agent cinematic curation platform built with **FastAPI**, **Google ADK** (powered by **Gemini 3.5 Flash**), **Google Identity Services (GIS)**, and **ClickHouse Cloud**.

---

## 1:1 System Component Mapping

### 1. Presentation Layer (`app/static/`)
- **`index.html` & `app.js`**:
  - **Google Federated Auth (`#auth-bar`)**: Integrates official Google Identity Services (GIS), One-Tap prompt, JWT credential verification, profile avatar badge, and Guest Mode notifications.
  - **Expressive Audience Textareas**: Free-form textareas for `#initial_mood`, `#desired_atmosphere`, and `#theme` allowing rich emotional nuance, with an age suitability dropdown (`#audience_age_range`).
  - **Dynamic Film Slate (`#slate-container`)**: Renders the curated film's title, director, runtime, synopsis, mood tags, curator reasoning, and cinematic fun fact.
  - **Asynchronous Artwork Loader**: Queries the TMDB API via `GET /api/poster` for high-resolution movie poster art.
  - **Interactive Action Triggers (with Zero-Redundancy Caching)**:
    - **`soundtrack-btn`**: Calls `POST /api/soundtrack` to load composer, musicological vibe, and standout track.
    - **`sommelier-btn`**: Calls `POST /api/sommelier` to load custom concession pairings with English parenthetical clarifications.
    - **`watch-btn`**: Calls `GET /api/watch-providers` with client timezone/country detection for live streaming availability.
    - **`another-option-btn`**: Dynamically tracks `excluded_films` to guarantee anti-cliché, non-repetitive discovery.
  - **The Cinémathèque Archive (`#cinematheque-section`)**:
    - Vintage brass filing cabinet drawer tabs (`[All Records]`, `[Stressed & Overworked]`, `[Melancholic & Sad]`, `[Tired & Seeking Rest]`, `[Excited & Energetic]`, `[Curious & Cinephile]`).
    - Archival library cards rendering mini poster, director, timestamp, multi-dimensional emotional badges (`#Tags`), user feeling notes, and curator rationale.

### 2. Backend Gateway (`app/main.py`)
- **`POST /api/recommend`**:
  - Executes `film_curator_agent` via Google ADK `Runner` with `InMemorySessionService`.
  - Extracts multi-label emotional tags (`detected_mood_tags`), primary mood, and target shift.
  - Asynchronously fetches poster artwork and inserts the complete record (`session_id, user_email, film_title, film_director, poster_url, reasoning, detected_tags, primary_mood, initial_mood, desired_atmosphere, timestamp`) into ClickHouse Cloud.
  - Returns structured 1-film slate JSON.
- **`GET /api/cinematheque`**:
  - Queries ClickHouse `audience_sessions` filtered by authenticated `user_email` (or public records for demo).
  - Returns preserved film records with metadata and emotional tags.
- **`GET /api/auth/config` & `POST /api/auth/google`**:
  - Serves `GOOGLE_CLIENT_ID` configuration and decodes Google JWT credentials.
- **`POST /api/soundtrack`**:
  - Runs `soundtrack_agent` via `Runner` with the target `movie_title`.
  - Returns composer, musical atmosphere vibe, and standout track.
- **`POST /api/sommelier`**:
  - Runs `sommelier_agent` via `Runner` with the target `movie_title`.
  - Returns plain-text concession pairing with English parenthetical descriptions.
- **`GET /api/watch-providers`**:
  - Queries TMDB / JustWatch API (`/3/movie/{id}/watch/providers`) based on the user's detected country region.
  - Returns available streaming subscriptions, rentals, purchases, and direct watch links.
- **`GET /api/poster`**:
  - Searches TMDB API (`/3/search/movie`) for movie poster art.
- **`GET /api/status`**:
  - Verifies ClickHouse Cloud connection status.

### 3. Google ADK Multi-Agent Trio (`app/agent.py`)
- **`film_curator_agent`**:
  - Framework: `google.adk.agents.Agent`
  - Model: `gemini-3.5-flash`
  - Function: Deeply interprets free-form emotional inputs, extracts multi-dimensional mood tags, enforces age constraints (G/PG for Kids 0-12), and selects high-value indie gems and classics.
- **`soundtrack_agent`**:
  - Framework: `google.adk.agents.Agent`
  - Model: `gemini-3.5-flash`
  - Function: Analyzes film musicology and returns structured OST details.
- **`sommelier_agent`**:
  - Framework: `google.adk.agents.Agent`
  - Model: `gemini-3.5-flash`
  - Function: Recommends curated snack & drink concession pairings with English parenthetical clarifications.

### 4. Persistence & External Cloud Services
- **ClickHouse Cloud (OLAP)**:
  - **`audience_sessions`**: Stores session ID, timestamp, `user_email`, `film_title`, `film_director`, `poster_url`, `reasoning`, `detected_tags Array(String)`, `primary_mood`, `initial_mood`, `desired_atmosphere`, and `audience_age_range`.
- **Google Identity Services (GIS)**:
  - Federated Google Sign-In with OAuth 2.0 and JWT token verification.
- **The Movie Database (TMDB) & JustWatch**:
  - Poster art discovery and global streaming availability.
- **Google Cloud Vertex AI / Gemini**:
  - `gemini-3.5-flash` model powering autonomous agents via Google ADK.
