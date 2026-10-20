# VivoQuest AI Services Microservice
*Clinical Task Bundling, Intelligent Provider Matching & Routing Engine*

## 1. Overview

`apps/ai-services` is a high-performance Python FastAPI service designed to collapse fragmented preventive home healthcare tasks into unified, coordinated **"Super-Visits"** and match appropriately licensed clinicians and medical equipment depots in India.

### Architectural Principles
1. **Procedural Bundling, Not Clinical Diagnosis:** The engine stacks procedures based on credential licenses, equipment commonality, and scheduling constraints. It **never diagnoses** or overrides physician prescriptions.
2. **Strict Credential Verification Guardrail:** Clinicians with `unverified` or `pending_review` council registrations are strictly filtered from clinical task assignments (`score = 0.0`).
3. **Data Minimization:** Requests are stripped of direct patient PII (names, raw medical histories) before being processed. All calculations use anonymized IDs.
4. **Human-in-the-Loop (HITL):** Matching scores and candidate rankings are presented as decision-support recommendations. A licensed Care Coordinator or Hospital Operator must approve dispatches.

---

## 2. API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Service health status, uptime, and active algorithm modules |
| `POST` | `/api/v1/bundles/evaluate` | Evaluates discrete care gaps and groups them into optimal single-visit bundles |
| `POST` | `/api/v1/matching/rank-providers` | Ranks candidate providers using credential fit, cluster, proximity, and rating |
| `POST` | `/api/v1/routing/estimate` | Deterministic transit and distance calculation based on Haversine formula |
| `GET` | `/docs` | Interactive Swagger / OpenAPI documentation |
| `GET` | `/redoc` | ReDoc API specifications |

---

## 3. Bundling & Matching Rules

### Clinical Bundling Engine
- **Cross-Qualification:** Checks whether a single provider (e.g. Registered Nurse) can execute multiple requirements (e.g. Phlebotomy + Vitals + SDoH Fall Risk Audit).
- **Fasting Protocols:** Any blood glucose or lipid panel requiring fasting is automatically locked to morning slots (07:00–09:30 AM) and scheduled before other non-fasting activities.
- **Fatigue Protection:** Disallows single home visits exceeding 120 minutes to protect senior or post-op patients from clinical exhaustion.

### Provider Matching Weights (0 to 100 Points)
1. **Clinical Specialty & Credential Fit (40 pts):** Direct NMC/State Council license match.
2. **Service Cluster & Area Coverage (25 pts):** Operating radius in target city/micro-cluster (e.g. Pune, Mumbai).
3. **Proximity & Travel Transit (20 pts):** Distance scaling based on road estimate (<5km: 20 pts; 5-12km: 15 pts; 12-20km: 10 pts; >20km: 5 pts).
4. **Clinical Reputation & Experience (10 pts):** Verified rating and years of experience.
5. **Equipment & Transport Readiness (5 pts):** Vehicle and specialized kit availability (e.g. vacutainer cooler, BP monitor).

---

## 4. Setup & Running Locally

### Prerequisites
- Python 3.11+
- Virtualenv or system Python

### Running with Uvicorn
```powershell
# From the apps/ai-services directory
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Running Test Suite
```powershell
# Run all unit tests with pytest
pytest -v
```

---

## 5. Route Optimization Roadmap (OR-Tools)

The current implementation provides a deterministic road-distance estimator with urban winding factors (`1.35x` average detour ratio in Indian metro clusters). In subsequent phases, Google OR-Tools will be integrated to solve the **Vehicle Routing Problem with Time Windows (VRPTW)** across multi-stop clinician shifts.
