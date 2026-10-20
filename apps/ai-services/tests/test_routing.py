from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_routing_estimate_deterministic_haversine():
    payload = {
        "origin": {"lat": 18.5204, "lng": 73.8567},  # Pune Station
        "destination": {"lat": 18.5074, "lng": 73.8077},  # Kothrud
    }

    response = client.post("/api/v1/routing/estimate", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["distance_km"] > 0
    assert 5.0 <= data["distance_km"] <= 12.0
    assert data["estimated_transit_minutes"] > 10
    assert data["calculation_method"] == "deterministic_haversine"
    assert data["is_estimated"] is True


def test_routing_zero_distance():
    coord = {"lat": 18.5204, "lng": 73.8567}
    payload = {"origin": coord, "destination": coord}

    response = client.post("/api/v1/routing/estimate", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["distance_km"] == 0.0
    assert data["estimated_transit_minutes"] == 5  # 5 min base access/parking buffer
