# Feel & Film — Hackathon Demo Script (Collaborative Partner Track)

Follow these steps to deliver a compelling, high-impact demonstration of **Feel & Film** to the hackathon judges.

---

## ⏱️ 5-Minute Demo Walkthrough

### 1. 🌟 Introduction & The Problem (0:00 - 0:45)
- **Say to judges:** *"Welcome to Feel & Film. Most movie recommendation systems are rigid dropdown filters or simple search bars. We built an autonomous Multi-Agent Collaborative Partner that transforms raw human emotions into a complete Cinema Night Experience in a single cycle, and actively learns your preferences across sessions."*
- **Show UI:** Point out the Cinema-Noir aesthetic, responsive typography, and glassmorphic layout at `http://localhost:8000`.

### 2. 🧠 Autonomous Multi-Agent Orchestration (0:45 - 2:00)
- **Input complex emotions:**
  - *How are you feeling tonight?*: `Exhausted after shipping complex code all week`
  - *What kind of cinematic experience do you want?*: `Uplifting, contemplative comfort with great visuals`
  - *Audience Demographic*: `Adults (18+)`
  - *Specific themes, directors, or eras?*: `Studio Ghibli` (or `Alfonso Cuarón`, `años 80`, etc.)
- **Click "Orchestrate Cinema Night":**
  - Point out that in a single autonomous request, the **Master Orchestrator Agent** (Google ADK / Gemini 3.5 Flash) coordinates 3 specialized sub-agents:
    1. **Film Curator Agent**: Searches TMDB global catalog in real-time.
    2. **Soundtrack Maestro Agent**: Analyzes score musicology, composer, and standout track.
    3. **Cinema Sommelier Agent**: Pairs artisanal concessions adhering to user dietary boundaries.
  - Parallel API tasks simultaneously fetch the official HD poster and regional streaming availability (*Netflix, Prime, Apple TV*).

### 3. 🎬 "Behind the Scenes" Agent Crew & Transparency (2:00 - 3:00)
- **Click `[ 🎬 Behind the Scenes: See how your 4 agents collaborated ]`:**
  - Show the 4 visual crew cards (*Master Orchestrator, Film Curator, Soundtrack Maestro, Cinema Sommelier*).
  - Open the **Detailed Google ADK Execution Log** drawer to show judges the exact live timestamps, tool executions, and model parameters.

### 4. 🔄 Active Memory & Collaborative Partner Loop (3:00 - 4:00)
- **Teach the agent:**
  - Click the `[🚫 Non-alcoholic drinks]` chip or `[🌎 Latin American cinema]`, or rate 5 stars.
  - Show the confirmation: the agent instantly commits this feedback into persistent memory.
- **Run a 2nd search:**
  - Show the **Collaborative Partner Note**:
    > *"Collaborative Partner Note: I remembered your preference for (Non-alcoholic pairings only) and tailored tonight's concession pairing to accompany [Film]."*
  - Point out that the Sommelier strictly selected a botanical mocktail/craft soda.

### 5. 🗄️ The Cinémathèque Archive in ClickHouse Cloud (4:00 - 4:45)
- **Show the Archive section:**
  - Browse vintage brass filing drawers (`[All Records]`, `[Stressed]`, `[Sad]`, `[Tired]`, `[Excited]`, `[Curious]`).
  - Demonstrate individual card deletion (`🗑️` button) and pagination collapse (`[Show All Curations (X)]`).
  - Explain that all records are indexed and stored in **ClickHouse Cloud**.

### 6. 🛡️ Responsible AI & Safety Guardrail (4:45 - 5:00)
- **Explain safety:** Show how the system includes a multilingual content safety guardrail protecting against NSFW, gore, or malicious inputs in multiple languages before any API call is made.

---

## 🚀 Quick Commands for Live Testing
```bash
# Start server
uvicorn app.main:app --reload

# Run full agent test suite
python test_orchestrator.py

# Run API test suite
python test_api.py
```
