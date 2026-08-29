*Read in [Spanish](README-es.md).*

# Feel & Film — Autonomous Multi-Agent Cinema & Collaborative Partner

> **Agentic Cinema: The Blockbuster Hackathon**  
> **Track:** *Collaborative Partner*  
> **LLM Engine:** Google Gemini 3.5 Flash  
> **Agent Framework:** Google Agent Development Kit (`google-adk`)  
> **Database & Storage:** ClickHouse Cloud (OLAP Archival Vault)  
> **Authentication:** Google Identity Services (OAuth 2.0 / GIS)  
> **Deployment:** Google Cloud Run  

---

## 🎬 Project Overview & The Agentic Solution

Traditional movie recommenders rely on rigid dropdowns or generic collaborative filtering that treats film selection like an e-commerce catalog.

**Feel & Film** functions as a true **Collaborative Partner**. Coordinated by a **Master Orchestrator Agent** powered by **Google ADK** and **Google Gemini 3.5 Flash**, the system translates complex, unstructured human emotions into a complete **Cinema Night Experience Package** in a **single autonomous cycle**:

1. **Emotional Film Curation:** Real-time semantic discovery across 800,000+ movies on TMDB with multi-route intelligence for directors, studios (*Studio Ghibli, A24*), and decades (*80s, 90s*).
2. **Musicological Soundtrack Breakdown:** Deep OST analysis extracting the composer, atmospheric vibe, and key track.
3. **Tailored Concession Pairing:** Artisanal food and beverage curation adhering strictly to user dietary rules (*100% alcohol-free mocktails, botanical sodas, vegan snacks*).
4. **Where to Watch Streaming Finder:** Instant regional streaming availability across Netflix, Prime Video, Apple TV, Max, etc., powered by JustWatch data.
5. **Continuous Memory & Learning Loop:** Actively learns user feedback across sessions, generating explicit collaborative notes (*"I remembered you prefer non-alcoholic pairings..."*).
6. **The Cinémathèque Archive:** Vintage brass drawers indexed by emotional state and persisted in **ClickHouse Cloud**.

---

## 📐 Architecture Diagram & System Design

The architecture illustrates how **Google Gemini 3.5 Flash** connects with the multi-agent backend, ClickHouse Cloud, external APIs, and the frontend presentation layer:

![Feel & Film System Architecture Diagram](app/static/architecture_diagram.svg)

For complete technical mapping and component specifications, see [ARCHITECTURE.md](ARCHITECTURE.md).

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
                           │   • Regional Streaming Providers  │
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
        │   • Collaborative Memory Feedback Loop (Stars + Instant Chips)         │
        └────────────────────────────────────┬───────────────────────────────────┘
                                             │
                                             ▼
                    ┌─────────────────────────────────────────────────┐
                    │    The Cinémathèque Archive (ClickHouse Cloud)  │
                    │    • Indexed Emotional Drawers                  │
                    │    • Individual Card Deletion                   │
                    │    • Top-3 Pagination & Historical Sync         │
                    └─────────────────────────────────────────────────┘
```

---

## 🛠️ Technology Stack & Details

* **Core Agent Framework:** Google Agent Development Kit (`google-adk`)
* **LLM Engine:** Google Gemini 3.5 Flash (`gemini-3.5-flash` via Google GenAI SDK / Vertex AI)
* **Backend API & Web Server:** FastAPI (Python 3.11+) with Uvicorn ASGI
* **Database & OLAP Memory:** ClickHouse Cloud (via `clickhouse-connect` driver)
* **Authentication:** Google Identity Services (GIS / OAuth 2.0 JWT Verification)
* **Live Catalog & Streaming:** The Movie Database (TMDB API v3/v4) & JustWatch data integration
* **Frontend:** Vanilla HTML5, Modern CSS3 (Glassmorphism & Cinema-Noir design system), Vanilla JavaScript ES6+
* **Containerization & Hosting:** Docker, Google Cloud Run

---

## 🚀 Step-by-Step Spin-Up Guide (Local Reproduction)

Follow this exact step-by-step walkthrough to clone, configure, and execute the project from scratch in under 3 minutes.

### 1. Prerequisites
- **Python:** 3.10, 3.11, or 3.12 installed ([python.org](https://www.python.org/downloads/))
- **Git:** Installed on your system
- **API Keys:**
  - **Google Gemini API Key:** Free from [Google AI Studio](https://aistudio.google.com/)
  - **TMDB API Key:** Free from [The Movie Database](https://www.themoviedb.org/settings/api)

---

### 2. Clone the Repository
```bash
git clone https://github.com/Mayorlen-Ortega/feelandfilm.git
cd feelandfilm
```

---

### 3. Create & Activate a Virtual Environment

**On Windows (PowerShell / Command Prompt):**
```powershell
python -m venv .venv
.venv\Scripts\activate
```

**On macOS / Linux (bash / zsh):**
```bash
python3 -m venv .venv
source .venv/bin/activate
```

---

### 4. Install Dependencies
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

---

### 5. Configure Environment Variables (`.env`)
Create your local `.env` file from the provided template:

**Windows:**
```powershell
copy .env.example .env
```

**macOS / Linux:**
```bash
cp .env.example .env
```

Edit `.env` and fill in your keys:
```ini
# 1. Google Gemini API Key (Required)
GEMINI_API_KEY=your_gemini_api_key_from_ai_studio

# 2. TMDB API Key (Required for live movie metadata & streaming)
TMDB_API_KEY=your_tmdb_api_key_or_bearer_token

# 3. Google Sign-In Client ID (Optional for OAuth login)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com

# 4. ClickHouse Cloud (Optional - defaults to in-memory vault if empty)
CLICKHOUSE_HOST=
CLICKHOUSE_PORT=8443
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=
CLICKHOUSE_SECURE=True
```

---

### 6. Run the Application
Start the FastAPI server with auto-reload:
```bash
python -m uvicorn app.main:app --reload --port 8000
```

Open your browser and navigate to:  
👉 **`http://localhost:8000`**

---

### 7. Run Automated Tests
Verify that all multi-agent workflows, safety guardrails, and API endpoints pass 100%:

```bash
# 1. Test Autonomous Multi-Agent Orchestrator & Collaborative Memory Loop
python test_orchestrator.py

# 2. Test API Endpoints, Cinémathèque, Posters & Watch Providers
python test_api.py
```

---

## ☁️ Deployment Instructions

### Option A: 1-Click Deployment to Google Cloud Run (Recommended)

Feel & Film is fully containerized with a production-ready `Dockerfile`.

1. Open **[Google Cloud Console](https://console.cloud.google.com/run)** and navigate to **Cloud Run**.
2. Click **Create Service** ➡️ **Continuously deploy from a repository**.
3. Select your GitHub repository (`feelandfilm`) and choose the `feature/agentic-orchestrator` branch.
4. Under **Build Configuration**, choose **Dockerfile** (path: `/Dockerfile`).
5. Under **Authentication**, select **Allow unauthenticated invocations**.
6. Under **Container, Variables & Secrets**, add your environment variables (`GEMINI_API_KEY`, `TMDB_API_KEY`, `GOOGLE_CLIENT_ID`, `CLICKHOUSE_HOST`, etc.).
7. Click **Create** to deploy. Cloud Run will build the container and provide a secure live `https://*.run.app` URL.

### Option B: Deploy using Docker locally
```bash
# 1. Build Docker image
docker build -t feelandfilm .

# 2. Run Docker container
docker run -p 8000:8000 --env-file .env feelandfilm
```

---

## 🌟 Key Features & Innovations

* **1-Click Autonomous Multi-Agent Orchestration:** Complete cinema night plan generated in a single cycle without fragmented requests.
* **100% Dynamic Live TMDB Discovery Engine:** Real-time query engine searching across 800,000+ movies on TMDB with smart multi-routing for:
  - *Directors* (official directing credits)
  - *Studios & Companies* (Studio Ghibli, A24, Pixar, Marvel)
  - *Eras & Decades* (80s, 90s, 70s, 60s)
  - *Thematic Keywords* & international cinema (Latin American, Asian, Nordic, French, etc.)
* **Active Memory & Continuous Learning (*Collaborative Partner Track*):** The agent remembers past ratings and dietary restrictions across sessions, generating explicit collaborative notes (*"I remembered your preference for (Non-alcoholic pairings only)..."*).
* **"Behind the Scenes" Visual AI Crew Pipeline:** Visual 4-agent workflow display with collapsible raw Google ADK execution logs.
* **Responsible AI Multilingual Safety Guardrail:** Intercepts and mitigates NSFW, gore, and extreme violence across Spanish, English, French, Portuguese, Italian, German, and Japanese before execution.
* **The Cinémathèque Archive (ClickHouse Cloud):** Vintage brass drawers (`[All Records]`, `[Stressed]`, `[Sad]`, `[Tired]`, `[Excited]`, `[Curious]`) with individual card deletion and top-3 pagination collapse.
* **Google Federated Authentication (GIS):** Sign in with Google OAuth 2.0 and JWT verification to sync persistent personal memory.
* **Where to Watch Streaming Integration:** Direct regional streaming availability powered by TMDB and JustWatch data.

---

## 📜 Third-Party Code, Disclosures & Credits

In compliance with hackathon transparency guidelines, here is the full disclosure of third-party libraries, services, and assets utilized in this project:

1. **Google Agent Development Kit (`google-adk`):** Multi-agent orchestration, agent state management, and runner execution engine by Google.
2. **Google GenAI SDK (`google-genai`):** Model interface for Google Gemini 3.5 Flash.
3. **The Movie Database (TMDB API):** Live movie metadata, director credits, and HD poster assets. *(This product uses the TMDB API but is not endorsed or certified by TMDB).*
4. **JustWatch Data Integration (via TMDB Watch Providers):** Regional streaming availability detection.
5. **ClickHouse Python Driver (`clickhouse-connect`):** High-performance OLAP database connectivity for the Cinémathèque Archive.
6. **FastAPI & Uvicorn:** Modern Python asynchronous web framework and ASGI server.
7. **Pydantic:** Data validation and schema enforcement.
8. **FontAwesome 6 & Google Fonts (Cinzel, Playfair Display, Outfit, Fira Code):** Typography and UI iconography used under standard open licenses.

---

## 📄 License
This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.
