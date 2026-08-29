*Read in [Spanish](README-es.md).*

# Feel & Film — Autonomous Multi-Agent Cinema & Collaborative Partner

**Feel & Film** is an autonomous multi-agent film curation platform and personal cinémathèque built for **Agentic Cinema: The Blockbuster Hackathon** (Track: **Collaborative Partner**).

---

## 🎬 Problem & Agentic Solution
Rather than being a simple step-by-step recommendation UI, **Feel & Film** functions as a true **Collaborative Partner**. A **Master Orchestrator Agent** coordinated with **Google ADK** and **Gemini 3.5 Flash** produces a comprehensive *Cinema Night Experience Package* (Curated Film + Musicological Soundtrack + Concession Pairing + Streaming Availability) in a **single autonomous cycle**, and **actively learns** from user feedback across sessions to remember taste, pacing preferences, and dietary restrictions.

---

## 🤖 Autonomous Multi-Agent Architecture (Google ADK)

1. **Master Orchestrator Agent (`master_orchestrator_agent`):**
   - Retrieves active user memory and collaborative feedback history (`user_memory_profile`).
   - Concurrently coordinates specialized sub-agents.
   - Synthesizes the **Collaborative Partner Note** (*"I remembered you prefer non-alcoholic pairings..."*).
   - Generates the **Live Agent Execution Trace (`agent_trace`)** for real-time technical transparency.
2. **Film Curator Agent (`film_curator_agent`):**
   - Analyzes deep emotional states and desired atmosphere transitions.
   - Enforces strict age suitability (G/PG for kids) and anti-cliché discovery directives.
3. **Soundtrack Musicologist Agent (`soundtrack_agent`):**
   - Analyzes original score, composer, musical vibe, and key tracks.
4. **Cinematic Sommelier Agent (`sommelier_agent`):**
   - Curates snack and beverage pairings adhering to learned dietary restrictions (mocktails, vegan, etc.).
5. **Regional Streaming Integration (TMDB / JustWatch):**
   - Detects viewer country region and delivers subscription, rental, and purchase platforms.
6. **The Cinémathèque Archive (ClickHouse Cloud):**
   - Persists every curated experience indexed by emotional drawer in ClickHouse Cloud.

---

## 🌟 Key Features & Innovations

* **1-Click Autonomous Multi-Agent Orchestration:** Complete cinema night plan (Film + Soundtrack + Concession + Streaming) generated in a single cycle without fragmented requests.
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

## 📐 Architecture Diagram

![Feel & Film Architecture Diagram](app/static/architecture_diagram.svg)

For complete technical mapping, see [ARCHITECTURE.md](ARCHITECTURE.md).

---

## 🚀 Local Setup & Quickstart

### 1. Clone repository:
```bash
git clone https://github.com/Mayorlen-Ortega/feelandfilm.git
cd feelandfilm
```

### 2. Configure Environment:
Create a `.env` file based on `.env.example`:
```ini
GEMINI_API_KEY=your_gemini_key
TMDB_API_KEY=your_tmdb_key
GOOGLE_CLIENT_ID=your_google_client_id
# ClickHouse Cloud (optional)
CLICKHOUSE_HOST=...
CLICKHOUSE_PORT=8443
CLICKHOUSE_USER=...
CLICKHOUSE_PASSWORD=...
```

### 3. Install dependencies:
```bash
pip install -r requirements.txt
```

### 4. Run application:
```bash
uvicorn app.main:app --reload
```
Open in browser: **http://localhost:8000**

---

## 🧪 Automated Testing

Run the autonomous multi-agent orchestrator test suite:
```bash
python test_orchestrator.py
```

Run API endpoint tests:
```bash
python test_api.py
```

---

## ☁️ Google Cloud Run Deployment

This project is containerized for 1-click deployment on **Google Cloud Run**:
1. Go to **Cloud Run** in Google Cloud Console and select **Create service**.
2. Connect your GitHub repository and choose the `feature/agentic-orchestrator` branch.
3. Select **Dockerfile** (path: `/Dockerfile`).
4. Add environment variables under **Variables & Secrets**.
5. Click **Create** to deploy.
