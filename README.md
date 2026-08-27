*Read this in [Spanish](README-es.md).*

# Feel & Film
Feel & Film is an autonomous multi-agent emotional cinematic curation platform and personal film archive, built for the **Agentic Cinema: The Blockbuster Hackathon**.

---

## Problem and Target Users
Film programmers and cinephiles often struggle to balance creative intuition with data-driven audience insights. Feel & Film solves this by orchestrating autonomous AI agents powered by **Google ADK** and **Gemini 3.5 Flash** to translate expressive human emotions into bespoke film recommendations, enriched by concession pairings, musical analysis, regional streaming links, and a personal vintage **Cinémathèque Archive** powered by **ClickHouse Cloud**.

---

## Multi-Agent Autonomous Workflow
1. **Google Federated Authentication:** Users sign in seamlessly via Google Identity Services (GIS) to securely unlock their personal film vault and preserved emotional records.
2. **Expressive Audience Input:** The user writes freely about how they are feeling (`initial_mood`), the desired cinematic experience (`desired_atmosphere`), optional thematic nuances (`theme`), and demographic age suitability (`audience_age_range`).
3. **Film Curator Agent (`film_curator_agent`):**
   - Deeply analyzes emotional nuance using **Gemini 3.5 Flash** (via Google ADK).
   - Extracts multi-dimensional emotional tags (`detected_mood_tags`), primary mood, and target shift.
   - Applies strict age-rating constraints (G/PG enforcement for Kids 0-12) and anti-cliché discovery directives.
   - Synthesizes a curated film recommendation with synopsis, curator rationale, and a cinematic fun fact.
4. **Soundtrack Agent (`soundtrack_agent`):**
   - Autonomously analyzes film musicology to extract the OST composer, atmospheric vibe, and standout track.
5. **Sommelier Agent (`sommelier_agent`):**
   - Curates bespoke snack and drink pairings that complement the movie's emotional tone, with concise English parenthetical clarifications.
6. **Where to Watch Integration (TMDB / JustWatch):**
   - Automatically detects user region and queries available streaming platforms, digital rentals, and direct watch links with client-side caching.
7. **The Cinémathèque Archive Persistence (ClickHouse Cloud):**
   - Automatically files the complete curated record, poster art, emotional tags, and user reflection into **ClickHouse Cloud** for private, indexed retrieval across vintage filing drawers.

---

## Intelligent Features & Highlights
* **Google ADK Multi-Agent Trio:** 3 specialized agents (`film_curator_agent`, `soundtrack_agent`, `sommelier_agent`) collaborating autonomously.
* **The Cinémathèque Archive:** Vintage brass filing drawers (`[All Records]`, `[Stressed]`, `[Sad]`, `[Tired]`, `[Excited]`, `[Curious]`) preserving personal curated films and emotional reflection notes in ClickHouse Cloud.
* **Google Federated Authentication:** One-Tap & standard Google Sign-In with JWT verification and Guest Mode notifications.
* **Where to Watch Streaming Finder:** Regional availability lookup across Netflix, Prime Video, HBO Max, Apple TV, etc., with zero redundant API calls through client-side response caching.
* **Expressive Free-Form Inputs:** Replaced rigid dropdowns with natural textareas so users can express complex, multi-layered emotional states.
* **Anti-Cliché Discovery Engine:** Explicit diversity directives and browser session memory (`excluded_films`) preventing repetitive recommendations.
* **Cinematic UI/UX:** Responsive Cinema-Noir design with Glassmorphism, tailored typography (Cinzel & Playfair Display), and vintage archive record cards.

---

## Architecture Diagram

![Feel & Film Architecture Diagram](app/static/architecture_diagram.svg)

For detailed component mappings, see [ARCHITECTURE.md](ARCHITECTURE.md).

---

## Tech Stack & Credits
* **Agent Framework:** Google ADK (`google-adk`)
* **LLM Engine:** Google Gemini 3.5 Flash (via Google Cloud / ADK)
* **Authentication:** Google Identity Services (GIS / OAuth 2.0)
* **Backend:** FastAPI (Python 3.11+)
* **Database:** ClickHouse Cloud (OLAP Analytics & Archival Vault)
* **Data Sources:** The Movie Database (TMDB API) & JustWatch data. *(This product uses the TMDB API but is not endorsed or certified by TMDB).*
* **Frontend:** Vanilla HTML5, CSS3, JavaScript

---

## Local Setup
1. Clone this repository:
   ```bash
   git clone https://github.com/Mayorlen-Ortega/feelandfilm.git
   cd feelandfilm
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   Add your `GEMINI_API_KEY`, `TMDB_API_KEY`, `GOOGLE_CLIENT_ID`, and ClickHouse credentials.
4. Start the application:
   ```bash
   uvicorn app.main:app --reload
   ```
5. Open [http://localhost:8000](http://localhost:8000) in your browser.

---

## Running Tests
Execute the automated test suite covering all API endpoints and archive persistence:
```bash
python test_api.py
```

---

## Deployment (Google Cloud Run)
This project is fully containerized and configured for one-click deployment on **Google Cloud Run**:
1. In the [Google Cloud Console](https://console.cloud.google.com/run), navigate to **Cloud Run** and click **Create Service**.
2. Select **Deploy one revision from an existing repository** and connect your GitHub repo.
3. Select **Dockerfile** (path: `/Dockerfile`).
4. Under Authentication, choose **Allow unauthenticated invocations**.
5. Under **Variables & Secrets**, configure your environment variables from `.env`.
6. Click **Create** to deploy.
