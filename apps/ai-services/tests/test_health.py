from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "vivoquest-ai-services"
    assert data["modules"]["bundling_engine"] == "active"
    assert data["modules"]["provider_matching"] == "active"
