from fastapi.testclient import TestClient
from app.main import app
import json

client = TestClient(app)

def test_status_endpoint():
    """Test that the status endpoint returns 200 OK"""
    response = client.get("/api/status")
    assert response.status_code == 200
    assert "mock_mode" in response.json()

def test_recommendation_empty_theme():
    """Test the recommendation endpoint structure (Note: In a real CI/CD pipeline, you would mock the ADK Runner to avoid hitting the real Gemini API)"""
    

    # (if Gemini hits quota) or runs Gemini normally.
    payload = {
        "initial_mood": "Stressed",
        "desired_atmosphere": "Relaxed",
        "audience_age_range": "Kids (0-12)",
        "theme": "",
        "slots": 1,
        "excluded_films": []
    }
    
    response = client.post("/api/recommend", json=payload)
    
    # The API should always return a 200 success if the fallback works
    assert response.status_code == 200
    
    data = response.json()
    assert data["status"] == "success"
    
    # Check if the JSON structure respects our schema
    assert "data" in data
    
    # If there is a slate, ensure it has the required fields
    if "slate" in data["data"] and len(data["data"]["slate"]) > 0:
        film = data["data"]["slate"][0]
        assert "title" in film
        assert "director" in film
        # Ensure age restriction worked (we can't assert strict PG here without parsing TMDB, 
        # but we can ensure the agent didn't return an error)
    else:
        # If it returned empty, it should have a not_found_message
        assert "not_found_message" in data["data"]
