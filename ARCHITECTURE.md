# Architecture & System Design — Feel & Film (Autonomous Multi-Agent Orchestrator)

![Feel & Film Architecture Diagram](app/static/architecture_diagram.svg)

## Overview
**Feel & Film** is an autonomous multi-agent cinematic curation platform and personal vault built with **Google ADK**, **Gemini 3.5 Flash**, **FastAPI**, **Google Identity Services (GIS)**, and **ClickHouse Cloud**.

Designed specifically for the **Collaborative Partner Track**, the platform transforms human emotional states into a comprehensive **Cinema Night Experience Package** in a **single autonomous cycle**, while continuously learning from user feedback and preference memory across sessions.

---

## 🤖 Autonomous Multi-Agent Pipeline & Orchestrator Flow

```text
                           [ User Emotional Input & Constraints ]
                                             │
                                             ▼
                    ┌─────────────────────────────────────────────────┐
                    │  Layer 0: Responsible AI Content Safety Filter  │
                    │  (Multilingual NSFW, Violence & Gore Guardrail) │
                    └────────────────────────┬────────────────────────┘
                                             │ (Safe Request)
                                             ▼
                    ┌─────────────────────────────────────────────────┐
                    │       Master Orchestrator Agent (Brain)         │
                    │       (Google ADK / Gemini 3.5 Flash)           │
                    │  - Retrieves user memory & dietary rules        │
                    │  - Synthesizes collaborative partner note       │
                    │  - Deduplicates (excludes vault movies)         │
                    └────────────────────────┬────────────────────────┘
                                             │
               ┌─────────────────────────────┼─────────────────────────────┐
               ▼                             ▼                             ▼
    [ Film Curator Agent ]          [ Soundtrack Maestro ]       [ Cinema Sommelier ]
   - 100% Live TMDB Discovery     - Musicological OST Analysis  - Gastronomy Pairing
   - Smart 4-way Query Router:    - Original Score Composer     - Enforces diet rules
     • Directors (Official Crew)  - Standout Track               (100% non-alcoholic /
     • Studios (Ghibli, A24)      - Mood Vibe                    vegan snacks)
     • Eras & Decades (80s, 90s)
     • Title / Themes
   - Age Rating Limit (G/PG)
               │                             │                             │
               └─────────────────────────────┼─────────────────────────────┘
                                             │
                                             ▼
                           ┌───────────────────────────────────┐
                           │   Parallel Enrichment Engine      │
                           │   • TMDB HD Poster Art            │
                           │   • Regional Streaming (JustWatch)│
                           └─────────────────┬─────────────────┘
                                             │
                                             ▼
                           ┌───────────────────────────────────┐
                           │  Live Agent Execution Trace       │
                           │  & Behind-the-Scenes Crew Cards   │
                           └─────────────────┬─────────────────┘
                                             │
                                             ▼
        ┌────────────────────────────────────────────────────────────────────────┐
        │                 Complete Cinema Night Experience                       │
        │   • Film + Director + Runtime + Synopsis + Fun Fact + Poster           │
        │   • Where to Watch Regional Streaming (TMDB / JustWatch)               │
        │   • Soundtrack Musicology & Tailored Concession Gastronomy             │
        │   • 🎲 1-Click Re-roll (Same Mood) + AI Battery Safe Mode              │
        │   • ✉️ Cinema Courier Agent (1-Click Email Dispatch)                   │
        │   • Collaborative Memory Feedback Loop (Stars + Instant Chips)         │
        └────────────────────────────────────┬───────────────────────────────────┘
                                             │
                                             ▼
                    ┌─────────────────────────────────────────────────┐
                    │    The Cinémathèque Archive (ClickHouse Cloud)  │
                    │    • Multi-Criteria Sort & Indexed Drawers      │
                    │    • 1-Click "Mark as Watched" & Star Ratings   │
                    │    • 🎬 1-Click Relive Full Package from Vault  │
                    │    • Instant Deletion (🗑️) & Historical Sync   │
                    └────────────────────────┬────────────────────────┘
                                             │ (Watched Milestone Unlocked)
                                             ▼
                    ┌─────────────────────────────────────────────────┐
                    │   3D Emotional Constellation & Lyria Leitmotifs │
                    │   • Irregular Celestial Asterism & Star Nodes   │
                    │   • Z-Depth Cosmic Layering (>5 Watched Films)  │
                    │   • Google Gemini 3.5 Flash Astro-Cartographer  │
                    │   • 5s Original Leitmotifs per Film Star (Lyria)│
                    │   • WebAudio DSP: Cathedral Reverb & Sub-Bass   │
                    └─────────────────────────────────────────────────┘
```

---

## 1:1 System Component Mapping

### 1. Master Orchestrator & Sub-Agent Team (`app/agent.py`)
- **`master_orchestrator_agent`**:
  - **Framework**: `google.adk.agents.Agent` (Google ADK)
  - **Model**: `gemini-3.5-flash`
  - **Function**: Coordinates the sub-agents, analyzes active user memory profiles, generates collaborative partner notes (*"I remembered that you prefer non-alcoholic pairings..."*), eliminates previous vault films to prevent duplicate recommendations, and produces a complete, timestamped **Agent Execution Trace**.
- **`film_curator_agent` & Dynamic TMDB Engine (`discover_live_tmdb_film`)**:
  - **Function**: Interprets free-form emotional feelings, extracts multi-dimensional mood tags, enforces age constraints (G/PG for Kids 0-12), and discovers matching films in real-time from TMDB's 800,000+ global movie database across 4 specialized routes:
    1. *Director Search*: `/3/search/person` ➡️ `/movie_credits?job=Director`
    2. *Studio Search*: `/3/search/company` ➡️ `with_companies={id}`
    3. *Era / Decade Search*: Detects 80s/90s/70s ➡️ `primary_release_date.gte` & `lte`
    4. *Keyword & Title Search*: `/3/search/movie`
- **`soundtrack_agent` (Soundtrack Maestro)**:
  - **Function**: Analyzes film musicology, identifies composers, acoustic mood vibes, and standout tracks.
- **`sommelier_agent` (Cinema Sommelier)**:
  - **Function**: Curates custom beverage & snack pairings strictly adhering to user dietary restrictions (e.g. non-alcoholic mocktails, botanical craft sodas, vegan snacks).
- **`cinema_courier_agent` (Cinema Courier & Epistle Agent)**:
  - **Function**: Composes elegant, personalized HTML cinema letters with step-by-step concession recipes, audio/lighting tips, and direct streaming links for 1-click email dispatch.
- **`emotional_constellation_agent` (Google Gemini 3.5 Flash & Google Lyria)**:
  - **Function**: Maps the user's cinema history into an organic, irregular 3D celestial asterism. Calculates astronomical coordinates, $Z$-depth factors ($1.0$ foreground down to $0.35$ deep space for $>5$ watched movies), spectral colors, and Google Lyria original 5-second cinematic leitmotifs (*Space Synth, Celesta Bell, Noir Piano, Orchestral Strings, Parisian Waltz*).

### 2. Google Lyria WebAudio Synthesis Engine (`app/static/app.js`)
- **Native Browser `AudioContext` & Real-Time DSP**:
  - **Procedural Cathedral Reverb Convolver**: Simulates acoustic impulse responses with smooth exponential decay for an immersive cinematic concert space.
  - **Analog Sub-Bass & Harmonic Pad Layer**: Multi-oscillator foundation providing warm fifth-interval underpinning below every melody.
  - **Polyphonic Tri-Oscillator Voice Engine**: Real-time ADSR envelopes, analog chorus detuning, and dynamic resonant lowpass/bandpass filters for distinct film score timbres.
  - **Interactive 5-Second Timeline Synchronizer**: Real-time progress bar and note-marker illumination during leitmotif playback.

### 3. Backend Gateway & Memory Management (`app/main.py`)
- **`POST /api/curate-experience`**:
  - Master autonomous orchestration endpoint. Executes safety guardrails, user memory synchronization, multi-agent synthesis, poster/streaming enrichment, ClickHouse persistence, and AI Battery Safe Mode.
- **`GET /api/alignment-matrix`**:
  - AI Alignment & Multi-Constraint Fidelity evaluation engine. Computes quantitative compliance scores (Fidelity %, Hard Constraints %, Mood Resonance %) across the last 10 sessions with Pareto trade-off arbitration notes and 1-click exports (CSV, JSON, Markdown).
- **`POST /api/send-cinema-email`**:
  - Concierge email dispatcher with live `.env` dynamic reload.
- **`POST /api/generate-biopic-trailer`**:
  - Generates the 3D Irregular Emotional Constellation, depth grading, and Google Lyria 5-second cinematic leitmotifs.
- **`POST /api/cinematheque/toggle-watched`**:
  - Synchronizes film watch status for emotional milestone unlocking.
- **`POST /api/feedback` & `GET /api/user-memory`**:
  - Continuous learning loop for the **Collaborative Partner Track**.
- **`GET /api/cinematheque` & `DELETE /api/cinematheque/{session_id}`**:
  - Queries and manages ClickHouse `audience_sessions` with instant deletion and 1-click vault relive restoration.

### 4. Presentation Layer (`app/static/`)
- **Interactive 4-Scene Modal Workflow**: Immersive step-by-step screening setup.
- **Cinema Night Stage**: High-definition film showcase, musicology, gastronomy, streaming links, and instant re-roll.
- **AI Alignment & Fidelity Matrix Modal (`Alt+A`)**: Comprehensive benchmarking dashboard with KPI cards, arbitration breakdown, and multi-format export buttons.
- **The Cinémathèque Vault**: Vintage brass filing drawers with multi-criteria sorting, rating stars, and package relive.
- **3D Irregular Emotional Constellation Modal**: Starfield canvas, radiant star-shaped SVG nodes, $Z$-depth cosmic scaling, and interactive 5-second Lyria leitmotif player.
- **Behind-the-Scenes AI Crew View & Terminal Drawer**: Real-time transparency and execution logs.

### 5. Cloud Persistence & External APIs
- **ClickHouse Cloud (OLAP)**: High-speed analytics storing user screening sessions and tag distributions.
- **TMDB REST API & JustWatch**: Live movie database search and regional streaming availability.
- **Google Identity Services (GIS)**: Cryptographic OAuth 2.0 JWT verification.
