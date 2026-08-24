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
* **Progressive Disclosure UI (Expand Agent):** To maintain a cinematic and punchy UI, initial film data is strictly concise (1-2 sentences). A "Learn more..." button triggers a secondary `expand_agent` on demand to generate a detailed, spoiler-free expansion of the plot.
* **Theme Contradiction Validation:** If a user requests a completely contradictory combination (e.g., Sad Comedy), the AI politely rejects the request rather than hallucinating a non-existent film.
* **Strict Age Filtering:** The AI enforces strict G/PG constraints when the "Kids (0-12)" demographic is selected, blocking mature/R-rated recommendations.
* **Local LLM Fallback (Ollama):** To prevent downtime caused by Gemini free-tier quota limits (429 errors), the backend automatically fails over to a local Ollama instance (`llama3.2:3b`) ensuring seamless availability.
* **Cinematic UI/UX:** The frontend features elegant typography (Cinzel & Playfair Display), responsive Flexbox layouts, asynchronous poster loading with loaders, and custom pure-CSS film strip borders.

## Google ADK Integration
The core logic is orchestrated using the `google-adk` Python framework. The `Agent` is defined with specific instructions and provided with custom Python tools. ADK manages the reasoning loop and autonomous tool execution.

## Tech Stack & Credits
* **Agent Framework:** Google ADK
* **LLM Models:** Gemini 3.5 Flash & Ollama (llama3.2:3b)
* **Database:** ClickHouse Cloud
* **Data Sources:** This product uses the TMDB API but is not endorsed or certified by TMDB.

## ClickHouse Cloud Integration
The backend interacts directly with **ClickHouse Cloud** to persist and aggregate historical audience sessions. When the web app loads, it queries ClickHouse to generate a deterministic analytics chart (zero LLM credits spent).

## Local Setup
1. Clone this repository.
2. Install dependencies: `pip install -r requirements.txt`
3. Copy `.env.example` to `.env` and fill in your credentials (`GEMINI_API_KEY`, `TMDB_API_KEY`, and ClickHouse variables).
4. Ensure Ollama is running locally with the `llama3.2:3b` model installed to handle quota fallbacks.
5. Start the server: `uvicorn app.main:app --reload`
6. Open `http://localhost:8000`

## Deployment (Google Cloud Run)
To satisfy the Google Cloud requirement, this project is fully containerized and ready for Cloud Run.

1. Ensure Docker is installed or use Google Cloud Build.
2. Submit the build: `gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/film-feel-studio`
3. Deploy to Cloud Run:
   ```bash
   gcloud run deploy film-feel-studio \
     --image gcr.io/YOUR_PROJECT_ID/film-feel-studio \
     --platform managed \
     --allow-unauthenticated \
     --set-env-vars="GEMINI_API_KEY=...,TMDB_API_KEY=...,CLICKHOUSE_HOST=...,CLICKHOUSE_PORT=...,CLICKHOUSE_USER=...,CLICKHOUSE_PASSWORD=...,CLICKHOUSE_SECURE=True"
   ```
   *(Alternatively, use Google Secret Manager for production secrets).*
