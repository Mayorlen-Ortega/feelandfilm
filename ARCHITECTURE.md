# Architecture

## Overview
Feel & Film is an autonomous multi-tier application relying on Google Cloud and ClickHouse.

```mermaid
flowchart TD
    UI[Web Interface (HTML/JS/CSS)] -->|POST /api/recommend| FastAPI[FastAPI Backend]
    UI -->|GET /api/stats| FastAPI
    FastAPI --> ADK[Google ADK Agent]
    FastAPI <-->|SQL| ClickHouse[(ClickHouse Cloud Database)]
    ADK -->|Uses| Gemini[Gemini 3.5 Flash via Google Cloud]
    ADK <-->|Tool Execution| TMDB[TMDB API]
```

## Components

### 1. Frontend
- Lightweight HTML5/CSS3/JS without heavy build systems (perfect for hackathons).
- Implements glassmorphism, responsive grids, and micro-animations.

### 2. Backend (FastAPI)
- Exposes REST API endpoints.
- Acts as the secure bridge between the unauthenticated frontend and the authenticated Agent/DB.

### 3. Agent Framework (Google ADK)
- We define an `Agent` instructing it to format a 3-film slate.
- The agent handles the multi-step reasoning: Understand Request -> Fetch Data (via TMDB tool) -> Decide -> Format JSON.

### 4. Database & External APIs
- **TMDB API**: The agent autonomously queries TMDB to find real movies matching the mood constraints.
- **ClickHouse Cloud**: The backend saves every audience session here and aggregates the data to render the deterministic chart on the frontend.
