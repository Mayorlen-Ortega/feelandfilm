# Architecture & System Design — Feel & Film (Autonomous Multi-Agent Orchestrator)

![Feel & Film Architecture Diagram](app/static/architecture_diagram.svg)

## Overview
**Feel & Film** is an autonomous multi-agent cinematic curation platform built with **Google ADK**, **Gemini 3.5 Flash**, **FastAPI**, **Google Identity Services (GIS)**, and **ClickHouse Cloud**.

Designed specifically for the **Collaborative Partner Track**, the platform transforms human emotional states into a comprehensive **Cinema Night Experience Package** in a **single autonomous cycle**, while continuously learning from user feedback across sessions.

---

## Autonomous Multi-Agent Pipeline & Orchestrator Flow

```text
                                 [ User Emotional Input ]
                                            │
                                            ▼
                           ┌───────────────────────────────────┐
                           │   Master Orchestrator Agent       │
                           │   (Google ADK / Gemini 3.5 Flash) │
                           └─────────────────┬─────────────────┘
                                             │
               ┌─────────────────────────────┼─────────────────────────────┐
               ▼                             ▼                             ▼
    [ Film Curator Agent ]          [ Soundtrack Agent ]         [ Sommelier Agent ]
   - Analyzes mood & memory       - Musicological OST         - Dietary & drink pairing
   - Enforces age limits (G/PG)   - Composer & key tracks     - English parenthetical tags
   - Selects 1 perfect movie                 │                             │
               │                             │                             │
               └─────────────────────────────┼─────────────────────────────┘
                                             │
                                             ▼
                          ┌─────────────────────────────────────┐
                          │   Live Agent Execution Trace        │
                          │   & Collaborative Learning Note     │
                          └──────────────────┬──────────────────┘
                                             │
                                             ▼
               ┌─────────────────────────────────────────────────────────┐
               │         Complete Cinema Night Package (1-Click)         │
               │   • Selected Film + Synopsis + Fun Fact + Poster        │
               │   • Where to Watch Streaming (TMDB / JustWatch)         │
               │   • Soundtrack Breakdown & Concession Gastronomy        │
               │   • Collaborative Memory Feedback Loop                  │
               └─────────────────────────────────────────────────────────┘
```

---

## 1:1 System Component Mapping

### 1. Master Orchestrator & Sub-Agent Team (`app/agent.py`)
- **`master_orchestrator_agent`**:
  - **Framework**: `google.adk.agents.Agent` (Google ADK)
  - **Model**: `gemini-3.5-flash`
  - **Function**: Coordinates the sub-agents, analyzes active user memory profiles, generates collaborative partner notes (*"I remembered that..."*), and produces a complete, timestamped **Agent Execution Trace**.
- **`film_curator_agent`**:
  - **Function**: Interprets free-form emotional feelings, extracts multi-dimensional mood tags, enforces age constraints (G/PG for Kids 0-12), and selects high-value indie gems and classics avoiding clichés.
- **`soundtrack_agent`**:
  - **Function**: Analyzes film musicology, identifies composers, mood vibe, and standout tracks.
- **`sommelier_agent`**:
  - **Function**: Curates custom beverage & snack pairings strictly adhering to user dietary restrictions (e.g. non-alcoholic mocktails, vegan snacks).

### 2. Backend Gateway & Memory Management (`app/main.py`)
- **`POST /api/curate-experience`**:
  - Main autonomous orchestration endpoint. Executes the complete multi-agent pipeline in 1 cycle, enriches with TMDB posters and regional streaming availability, saves to ClickHouse Cloud, and returns the package with execution trace.
- **`POST /api/feedback`**:
  - Continuous learning endpoint for the **Collaborative Partner Track**. Allows users to rate screenings and teach the agent (*"No alcohol in pairings"*, *"Prefer shorter films"*, *"Loved the jazz score"*).
- **`GET /api/user-memory`**:
  - Inspects active memory graph, learned preferences, and dietary restrictions for the active user.
- **`GET /api/cinematheque`**:
  - Queries ClickHouse `audience_sessions` filtered by authenticated `user_email`.
- **`GET /api/auth/config` & `POST /api/auth/google`**:
  - Google Identity Services (GIS) configuration and JWT credential decoding.
- **`GET /api/watch-providers`**:
  - Auto-detects client country and queries TMDB / JustWatch streaming availability.

### 3. Presentation Layer & Real-Time Transparency (`app/static/`)
- **`index.html` & `app.js`**:
  - **One-Click Cinema Night Presentation**: Displays the complete package immediately without multi-step manual requests.
  - **Live Agent Trace Terminal**: Real-time cinema-noir terminal displaying timestamped sub-agent communication, tool calls, and decision steps.
  - **Collaborative Feedback Chips**: Interactive tags enabling users to teach the agent in real time.
  - **The Cinémathèque Archive**: Vintage brass filing cabinet preserving curated films by emotional drawer in ClickHouse Cloud.

### 4. Cloud Persistence Layer
- **ClickHouse Cloud (OLAP)**:
  - Stores emotional sessions, detected tags, director metadata, and historical curations.
- **In-Memory & Storage Collaborative Profile Cache**:
  - Hydrates and maintains active user memory and preference vectors across sessions.
