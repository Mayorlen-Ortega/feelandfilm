*Read this in [Spanish](README-es.md).*

# Feel & Film
Feel & Film is an autonomous multi-agent programming assistant for film clubs and cinema enthusiasts, built for the **Agentic Cinema: The Blockbuster Hackathon**.

---

## Problem and Target Users
Film programmers and cinephiles often struggle to balance creative intuition with data-driven audience insights. Feel & Film solves this by orchestrating autonomous AI agents powered by **Google ADK** and **Gemini 3.5 Flash** to generate bespoke film recommendations based on current audience mood, desired emotional atmosphere, thematic keywords, and historical analytics powered by **ClickHouse Cloud**.

---

## Multi-Agent Autonomous Workflow
1. **Audience Input:** The user specifies initial audience mood, desired atmosphere, age range (e.g. Kids, Teens, Adults, Mixed Family), and optional themes.
2. **Film Curator Agent (`film_curator_agent`):**
   - Interprets constraints using **Gemini 3.5 Flash** (via Google ADK).
   - Enforces logical consistency (e.g., politely rejecting contradictory theme/mood pairings like "Sad Comedy").
   - Applies strict age-rating constraints (G/PG enforcement for Kids 0-12).
   - Synthesizes a curated film recommendation with synopsis, reasoning, and a cinematic fun fact.
3. **Soundtrack Agent (`soundtrack_agent`):**
   - Autonomously analyzes film musicology to extract the OST composer, atmospheric vibe, and standout track.
4. **Sommelier Agent (`sommelier_agent`):**
   - Curates custom snack and drink pairings that complement the movie's emotional tone.
5. **Where to Watch Integration (TMDB / JustWatch):**
   - Automatically detects user region and queries available streaming platforms, digital rentals, and direct watch links.
6. **Poster Hydration:**
   - Asynchronously queries the **TMDB API** for high-resolution movie poster art.
7. **Session Persistence (ClickHouse Cloud):**
   - Automatically records session events into **ClickHouse Cloud** for real-time OLAP intelligence.

---

## Intelligent Features & Highlights
* **Google ADK Multi-Agent Trio:** 3 specialized agents (`film_curator_agent`, `soundtrack_agent`, `sommelier_agent`) collaborating seamlessly.
* **Where to Watch Streaming Finder:** Regional availability lookup across Netflix, Prime Video, HBO Max, Apple TV, etc., with zero redundant API calls through client-side response caching.
* **Audience Emotional Intelligence Dashboard:** Real-time ClickHouse OLAP analytics featuring Executive KPI Badges and an **Emotional Transition Matrix** (Stacked Bar Chart illustrating mood-to-atmosphere shifts for business insights).
* **Anti-Cliché Discovery Engine:** Explicit diversity directives and browser session memory (`excluded_films`) preventing repetitive recommendations.
* **Cinematic UI/UX:** Responsive Cinema-Noir design with Glassmorphism, tailored typography (Cinzel & Playfair Display), and Chart.js visualizations.

---

## Tech Stack & Credits
* **Agent Framework:** Google ADK (`google-adk`)
* **LLM Engine:** Google Gemini 3.5 Flash (via Google Cloud / ADK)
* **Backend:** FastAPI (Python 3.11+)
* **Database:** ClickHouse Cloud (OLAP Analytics)
* **Data Sources:** The Movie Database (TMDB API) & JustWatch data. *(This product uses the TMDB API but is not endorsed or certified by TMDB).*
* **Frontend:** Vanilla HTML5, CSS3, JavaScript, Chart.js

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
   Add your `GEMINI_API_KEY`, `TMDB_API_KEY`, and ClickHouse credentials.
4. Start the application:
   ```bash
   uvicorn app.main:app --reload
   ```
5. Open [http://localhost:8000](http://localhost:8000) in your browser.

---

## Running Tests
Execute the automated test suite covering all API endpoints and analytics:
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
