# Demo Script

Follow these steps to demonstrate the Feel & Film application to the judges.

## Prerequisites
- A Google Cloud Project with Vertex AI enabled.
- Application Default Credentials configured locally (`gcloud auth application-default login`).
- A ClickHouse Cloud instance provisioned.
- `.env` file populated with ClickHouse credentials.

## Step 1: Initialize Data
Run the initialization scripts to prove we are using fresh, original fictional data.
```bash
python scripts/init_db.py
python scripts/seed_data.py
```
*Point out to judges:* We are creating a fictional `film_catalog` and generating synthetic `audience_sessions` to act as our historical analytics memory.

## Step 2: Start the Server
```bash
uvicorn app.main:app --reload
```
Navigate to `http://localhost:8000` in your browser.

## Step 3: Run the Agent
1. **Show the UI**: Point out the modern, dynamic design, meeting the "vibrant colors and glassmorphism" aesthetic.
2. **Input Constraints**:
   - Mood: *Stressed*
   - Atmosphere: *Relaxing*
   - Target: *Adult*
   - Intensity: *4*
3. **Generate**: Click "Generate Slate". Explain that the request is now being sent to the Google ADK Agent.
4. **Agent at Work**: The agent translates the request into ClickHouse SQL, fetches results, and builds the slate.

## Step 4: Review Results
1. **The Slate**: Show the three fictional films recommended. Emphasize that these do *not* exist on TMDB or Netflix.
2. **Evidence**: Read the "Why this slate?" section to show how the agent used ClickHouse data to justify the transition from Stressed to Relaxing.
3. **Audit Trail**: Scroll down to the Agent Audit Trail. Point out the exact tool calls made by the ADK agent, showing the SQL executed against ClickHouse Cloud.

## Step 5: (Optional) Show Code Architecture
Open `app/agent.py` to demonstrate the use of `from google.adk.agents import Agent` and the explicit tool definitions.
