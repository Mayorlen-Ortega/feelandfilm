from fastapi.testclient import TestClient
from app.main import app
import json

client = TestClient(app)

def test_status_endpoint():
    """Test that the status endpoint returns 200 OK"""
    response = client.get("/api/status")
    assert response.status_code == 200
    assert "mock_mode" in response.json()

def test_stats_endpoint():
    """Test that the stats endpoint returns 200 OK and multi-metric analytics structure"""
    response = client.get("/api/stats")
    assert response.status_code == 200
    data = response.json()
    assert "labels" in data
    assert "data" in data
    assert "moods" in data
    assert "atmospheres" in data
    assert "demographics" in data
    assert "matrix" in data
    assert "kpis" in data
    assert "total_sessions" in data["kpis"]

def test_watch_providers_endpoint():
    """Test the location-based watch providers endpoint"""
    response = client.get("/api/watch-providers?title=Inception&country=CL")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "streaming" in data
    assert "rent" in data
    assert "buy" in data

def test_poster_endpoint():
    """Test the poster search endpoint"""
    response = client.get("/api/poster?title=Inception")
    assert response.status_code == 200
    data = response.json()
    assert "poster_url" in data

def test_recommendation_empty_theme():
    """Test the recommendation endpoint structure"""
    payload = {
        "initial_mood": "Stressed",
        "desired_atmosphere": "Relaxing",
        "audience_age_range": "Adults (18+)",
        "theme": "",
        "slots": 1,
        "excluded_films": []
    }
    
    response = client.post("/api/recommend", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "data" in data
    
    if "slate" in data["data"] and len(data["data"]["slate"]) > 0:
        film = data["data"]["slate"][0]
        assert "title" in film
        assert "director" in film
    else:
        assert "not_found_message" in data["data"]

if __name__ == "__main__":
    print("Running tests...")
    test_status_endpoint()
    print("[OK] test_status_endpoint passed")
    test_stats_endpoint()
    print("[OK] test_stats_endpoint passed")
    test_watch_providers_endpoint()
    print("[OK] test_watch_providers_endpoint passed")
    test_poster_endpoint()
    print("[OK] test_poster_endpoint passed")
    print("All endpoint tests completed successfully!")
