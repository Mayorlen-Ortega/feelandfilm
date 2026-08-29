import sys
from fastapi.testclient import TestClient
from app.main import app
import json

client = TestClient(app)

def test_curate_experience_pipeline():
    """Validates the 1-Click Autonomous Multi-Agent Orchestrator pipeline."""
    payload = {
        "initial_mood": "Exhausted after a long week of programming",
        "desired_atmosphere": "Uplifting and warm comfort",
        "audience_age_range": "Adults (18+)",
        "dietary_preference": "Non-alcoholic pairings only",
        "theme": "Feel-good cinema",
        "slots": 1,
        "excluded_films": [],
        "user_email": "test_cinephile@gmail.com"
    }

    response = client.post("/api/curate-experience", json=payload)
    assert response.status_code == 200, f"Error: {response.text}"
    data = response.json()
    assert data["status"] == "success"
    
    # 1. Verify Film Curator selection
    assert "film" in data and data["film"] is not None
    film = data["film"]
    assert "title" in film and len(film["title"]) > 0
    assert "director" in film
    assert "reasoning" in film
    
    # 2. Verify Soundtrack Agent output
    assert "soundtrack" in data and data["soundtrack"] is not None
    assert "composer" in data["soundtrack"]
    assert "vibe" in data["soundtrack"]
    
    # 3. Verify Sommelier Agent output
    assert "sommelier" in data and data["sommelier"] is not None
    assert "beverage" in data["sommelier"]
    assert "snack" in data["sommelier"]
    
    # 4. Verify Collaborative Partner Note
    assert "collaborative_note" in data
    assert len(data["collaborative_note"]) > 0
    
    # 5. Verify Live Agent Execution Trace
    assert "agent_trace" in data
    assert isinstance(data["agent_trace"], list)
    assert len(data["agent_trace"]) >= 4
    agent_names = [t["agent"] for t in data["agent_trace"]]
    assert "MasterOrchestrator" in agent_names
    assert "FilmCuratorAgent" in agent_names
    assert "SoundtrackAgent" in agent_names
    assert "SommelierAgent" in agent_names
    
    print(f"[OK] Master Orchestrator selected film: '{film['title']}' by {film.get('director')}")
    print(f"[OK] Soundtrack: Composer {data['soundtrack'].get('composer')}, Vibe: {data['soundtrack'].get('vibe')[:40]}...")
    print(f"[OK] Sommelier: Beverage '{data['sommelier'].get('beverage')}', Snack '{data['sommelier'].get('snack')}'")
    print(f"[OK] Collaborative Partner Note: {data['collaborative_note']}")
    print(f"[OK] Agent Execution Trace Steps ({len(data['agent_trace'])} steps logged)")


def test_collaborative_feedback_and_memory_loop():
    """Validates the continuous learning feedback loop and memory persistence."""
    user_email = "test_cinephile@gmail.com"
    
    # Submit feedback to agent
    feedback_payload = {
        "user_email": user_email,
        "movie_title": "Past Film",
        "rating": 5,
        "category": "dietary",
        "feedback_text": "I don't drink alcohol, please always give me mocktails and non-alcoholic drinks. Also keep movies under 110 min."
    }
    
    f_res = client.post("/api/feedback", json=feedback_payload)
    assert f_res.status_code == 200
    f_data = f_res.json()
    assert f_data["status"] == "success"
    
    # Check user memory endpoint
    m_res = client.get(f"/api/user-memory?user_email={user_email}")
    assert m_res.status_code == 200
    m_data = m_res.json()
    assert m_data["status"] == "success"
    mem = m_data["memory"]
    assert "Non-alcoholic pairings only" in mem["dietary_restrictions"]
    assert "Prefers films under 110 minutes" in mem["learned_preferences"]
    
    print("[OK] Collaborative feedback submitted and correctly recognized by user memory!")
    print(f"[OK] Active Dietary Restrictions: {mem['dietary_restrictions']}")
    print(f"[OK] Active Learned Preferences: {mem['learned_preferences']}")


if __name__ == "__main__":
    print("--- Running Feel & Film Autonomous Multi-Agent Tests ---")
    test_curate_experience_pipeline()
    print("--- Running Collaborative Partner Memory Loop Tests ---")
    test_collaborative_feedback_and_memory_loop()
    print("\n All Orchestrator & Collaborative Memory tests passed successfully!")
