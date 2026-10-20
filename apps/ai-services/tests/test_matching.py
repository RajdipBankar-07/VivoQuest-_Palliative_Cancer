from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

PUNE_LOC = {
    "city": "Pune",
    "pincode": "411004",
    "cluster": "Pune-Deccan",
    "coordinates": {"lat": 18.5167, "lng": 73.8417},
}


def test_matching_engine_filters_unverified_providers():
    payload = {
        "single_task": {
            "task_id": "task_pt_1",
            "service_code": "physiotherapy",
            "title": "Geriatric Mobility Therapy",
            "required_profession_type": "physiotherapist",
            "estimated_duration_minutes": 45,
            "patient_id": "patient_anon_88",
            "location": PUNE_LOC,
        },
        "patient_location": PUNE_LOC,
        "candidate_providers": [
            {
                "provider_id": "cand_unverified_1",
                "full_name": "Rohan Deshmukh",
                "profession_type": "physiotherapist",
                "registration_number": "PENDING-001",
                "verification_status": "pending_review",  # NOT VERIFIED
                "service_clusters": ["Pune"],
                "rating": 5.0,
                "years_of_experience": 4,
            },
            {
                "provider_id": "cand_verified_1",
                "full_name": "Dr. Sneha Joshi",
                "profession_type": "physiotherapist",
                "registration_number": "MMC-PT-45012",
                "verification_status": "verified",  # VERIFIED
                "service_clusters": ["Pune"],
                "rating": 4.9,
                "years_of_experience": 6,
                "current_location": {"lat": 18.5204, "lng": 73.8567},
            },
        ],
    }

    response = client.post("/api/v1/matching/rank-providers", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["total_evaluated"] == 2
    assert data["total_eligible"] == 1  # Only 1 verified provider

    ranked = data["ranked_providers"]
    # Verified provider must be top
    assert ranked[0]["provider_id"] == "cand_verified_1"
    assert ranked[0]["is_eligible"] is True
    assert ranked[0]["match_score"] > 80.0

    # Unverified provider must be marked ineligible with score 0
    assert ranked[1]["provider_id"] == "cand_unverified_1"
    assert ranked[1]["is_eligible"] is False
    assert ranked[1]["match_score"] == 0.0
    assert any("Credential verification" in r for r in ranked[1]["reasons"])


def test_matching_engine_ranks_closer_provider_higher():
    payload = {
        "single_task": {
            "task_id": "task_phleb_1",
            "service_code": "home-diagnostics",
            "title": "Home Blood Draw",
            "required_profession_type": "phlebotomist",
            "equipment_needed": ["vacutainer_kit"],
            "patient_id": "patient_anon_88",
            "location": PUNE_LOC,
        },
        "patient_location": PUNE_LOC,
        "candidate_providers": [
            {
                "provider_id": "cand_distant",
                "full_name": "Phleb Distant",
                "profession_type": "phlebotomist",
                "registration_number": "MMC-PL-110",
                "verification_status": "verified",
                "service_clusters": ["Pune"],
                "rating": 4.8,
                "years_of_experience": 3,
                "current_location": {"lat": 18.7000, "lng": 73.9500},  # ~25 km away
                "carries_equipment": ["vacutainer_kit"],
            },
            {
                "provider_id": "cand_close",
                "full_name": "Phleb Nearby",
                "profession_type": "phlebotomist",
                "registration_number": "MMC-PL-111",
                "verification_status": "verified",
                "service_clusters": ["Pune"],
                "rating": 4.8,
                "years_of_experience": 3,
                "current_location": {"lat": 18.5200, "lng": 73.8450},  # ~1.5 km away
                "carries_equipment": ["vacutainer_kit"],
            },
        ],
    }

    response = client.post("/api/v1/matching/rank-providers", json=payload)
    assert response.status_code == 200
    data = response.json()

    ranked = data["ranked_providers"]
    assert ranked[0]["provider_id"] == "cand_close"
    assert ranked[0]["match_score"] > ranked[1]["match_score"]
    assert ranked[0]["estimated_distance_km"] < ranked[1]["estimated_distance_km"]
