*Read this in [Spanish](README-es.md).*

# Feel & Film
Feel & Film is an autonomous programming assistant for film clubs and enthusiasts, built for the Agentic Cinema: The Blockbuster Hackathon. 

## Problem and Target Users
Film programmers often struggle to balance creative intuition with data-driven audience insights. Feel & Film solves this by using an autonomous AI agent to generate a highly curated film recommendation based on current audience mood, desired emotional atmosphere, specific thematic requests, and historical performance analytics.

## Autonomous Agent Workflow
1. The user inputs audience constraints (e.g., Stressed, wanting Thrills, Theme: Zombies, for Kids).
2. The agent interprets this request using **Gemini 3.5 Flash** (via Google ADK).
3. The agent validates logical consistency (e.g., preventing contradictory Theme + Mood requests) and strictly enforces age ratings.
4. It synthesizes a single perfect film recommendation, explaining its reasoning, providing a synopsis, and a cinematic fun fact.
5. The backend automatically injects the official movie poster by calling the **TMDB API**.
6. The result is returned to an elegant, cinema-themed web interface.
7. The backend automatically stores the requested mood in **ClickHouse Cloud** for live data tracking.

## Intelligent Features & Fallbacks
* **Sommelier Agent (Multi-Agent Orchestration):** A secondary ADK agent that acts as a cinematic sommelier, providing tailored snack and drink pairings that perfectly match the recommended movie's vibe.
* **Theme Contradiction Validation:** If a user requests a completely contradictory combination (e.g., Sad Comedy), the AI politely rejects the request rather than hallucinating a non-existent film.
* **Strict Age Filtering:** The AI enforces strict G/PG constraints when the "Kids (0-12)" demographic is selected, blocking mature/R-rated recommendations.
* **Cinematic UI/UX:** The frontend features elegant typography (Cinzel & Playfair Display), responsive Flexbox layouts, asynchronous poster loading with loaders, and custom pure-CSS film strip borders.

## Google ADK Integration
The core logic is orchestrated using the `google-adk` Python framework. The `Agent` is defined with specific instructions and provided with custom Python tools. ADK manages the reasoning loop and autonomous tool execution.

## Tech Stack & Credits
* **Agent Framework:** Google ADK
* **LLM Models:** Gemini 3.5 Flash
* **Database:** ClickHouse Cloud
* **Data Sources:** This product uses the TMDB API but is not endorsed or certified by TMDB.

## ClickHouse Cloud Integration
The backend interacts directly with **ClickHouse Cloud** to persist and aggregate historical audience sessions. When the web app loads, it queries ClickHouse to generate a deterministic analytics chart (zero LLM credits spent).

## Local Setup
1. Clone this repository.
2. Install dependencies: `pip install -r requirements.txt`
3. Copy `.env.example` to `.env` and fill in your credentials (`GEMINI_API_KEY`, `TMDB_API_KEY`, and ClickHouse variables).
4. Start the server: `uvicorn app.main:app --reload`
5. Open `http://localhost:8000`

## Deployment (Google Cloud Run)
To satisfy the Google Cloud requirement, this project is fully containerized and ready for Cloud Run.

The easiest way to deploy is via **Continuous Deployment with Cloud Build**:
1. Go to the [Google Cloud Console](https://console.cloud.google.com/run) and navigate to **Cloud Run**.
2. Click **Create Service**.
3. Select **Deploy one revision from an existing repository**.
4. Connect your GitHub account and select this repository.
5. In the Build Configuration, select **Dockerfile** (path: `/Dockerfile`).
6. Under Authentication, select **Allow unauthenticated invocations**.
7. Expand the **Variables & Secrets** section and add all your `.env` variables (`GEMINI_API_KEY`, `TMDB_API_KEY`, `CLICKHOUSE_...`).
8. Click **Create**. Cloud Run will automatically build and deploy your app.
