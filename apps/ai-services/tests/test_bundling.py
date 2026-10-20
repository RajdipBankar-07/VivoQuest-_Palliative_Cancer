from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

PUNE_LOC = {
    "city": "Pune",
    "pincode": "411004",
    "cluster": "Pune-Deccan",
    "coordinates": {"lat": 18.5167, "lng": 73.8417},
}


def test_bundling_engine_multi_service_grouping():
    # Example from user prompt:
    # Blood sample collection + Nutrition consultation + Home safety assessment
    payload = {
        "tasks": [
            {
                "task_id": "task_phleb_1",
                "service_code": "home-diagnostics",
                "title": "HbA1c & Fasting Glucose Blood Draw",
                "required_profession_type": "phlebotomist",
                "required_credentials": ["Phlebotomy Technician"],
                "estimated_duration_minutes": 20,
                "requires_fasting": True,
                "equipment_needed": ["vacutainer_kit", "centrifuge_cooler"],
                "patient_id": "patient_anon_99",
                "location": PUNE_LOC,
                "priority": "urgent_fasting",
            },
            {
                "task_id": "task_sdoh_2",
                "service_code": "preventive-home-care",
                "title": "Home Safety & Fall Risk Evaluation",
                "required_profession_type": "chw",
                "required_credentials": ["Community Health Worker"],
                "estimated_duration_minutes": 35,
                "requires_fasting": False,
                "equipment_needed": ["bp_cuff", "pulse_oximeter"],
                "patient_id": "patient_anon_99",
                "location": PUNE_LOC,
                "priority": "routine",
            },
            {
                "task_id": "task_nutrition_3",
                "service_code": "nutrition-wellness",
                "title": "Post-Prandial Diabetic Nutrition Review",
                "required_profession_type": "dietitian",
                "required_credentials": ["Clinical Dietitian"],
                "estimated_duration_minutes": 40,
                "requires_fasting": False,
                "equipment_needed": [],
                "patient_id": "patient_anon_99",
                "location": PUNE_LOC,
                "priority": "routine",
            },
        ],
        "max_total_minutes": 120,
    }

    response = client.post("/api/v1/bundles/evaluate", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["is_bundling_recommended"] is True
    assert len(data["suggested_bundles"]) == 1

    bundle = data["suggested_bundles"][0]
    assert len(bundle["task_ids"]) == 3
    assert bundle["total_duration_minutes"] == 95  # 20 + 35 + 40 = 95 <= 120 mins
    assert data["total_efficiency_gain_minutes"] > 0

    # Verify clinical fasting safeguard is attached
    safeguards = " ".join(bundle["clinical_safeguards"])
    assert "Fasting Protocol" in safeguards
    assert "07:00-09:30 AM" in safeguards


def test_bundling_engine_duration_limit_partitioning():
    # 2 lengthy tasks exceeding max 60 minutes
    payload = {
        "tasks": [
            {
                "task_id": "task_physio_1",
                "service_code": "physiotherapy",
                "title": "Post-Op Joint Rehabilitation",
                "required_profession_type": "physiotherapist",
                "estimated_duration_minutes": 50,
                "requires_fasting": False,
                "patient_id": "patient_anon_101",
                "location": PUNE_LOC,
            },
            {
                "task_id": "task_physio_2",
                "service_code": "physiotherapy",
                "title": "Spine & Postural Conditioning",
                "required_profession_type": "physiotherapist",
                "estimated_duration_minutes": 50,
                "requires_fasting": False,
                "patient_id": "patient_anon_101",
                "location": PUNE_LOC,
            },
        ],
        "max_total_minutes": 60,  # 50 + 50 = 100 > 60
    }

    response = client.post("/api/v1/bundles/evaluate", json=payload)
    assert response.status_code == 200
    data = response.json()

    # Should partition so patient is not overexerted
    assert len(data["suggested_bundles"]) == 0
    assert len(data["unbundled_tasks"]) == 2
