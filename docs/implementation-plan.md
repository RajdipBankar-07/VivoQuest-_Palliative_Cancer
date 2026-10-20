# VivoQuest Phased Implementation Plan
*MongoDB & Object Storage Edition*

## 1. Project Roadmap Overview

The VivoQuest implementation roadmap is structured as an **8-Week Rapid MVP Delivery Plan**, transitioning an AI-enabled preventive healthcare marketplace from architecture to a live pilot with an insurance payer or hospital partner.

```mermaid
gantt
    title VivoQuest 8-Week Implementation Timeline
    dateFormat  YYYY-MM-DD
    section Phase 1: Setup & Discovery
    Phase 1: Project Setup, MongoDB & Storage Architecture :done, 2026-10-20, 2026-10-22
    section Phase 2: Monorepo & Models
    Phase 2: Monorepo Foundation, Mongoose Schemas & S3 Engine :active, 2026-10-23, 2026-10-29
    section Phase 3: AI Bundling
    Phase 3: Clinical Bundling Engine (FastAPI)        :2026-10-30, 2026-11-05
    section Phase 4: Dispatch & Routing
    Phase 4: Marketplace Match & Dynamic Routing Engine:2026-11-06, 2026-11-12
    section Phase 5: Provider Mobile App
    Phase 5: Field Provider Mobile App (Expo)          :2026-11-13, 2026-11-19
    section Phase 6: Comms & Credentials
    Phase 6: Omnichannel Comms & Credential Guardrails :2026-11-20, 2026-11-26
    section Phase 7: Web Dashboards & LLM Docs
    Phase 7: Payer/Hospital Dashboards & LLM Coding    :2026-11-27, 2026-12-03
    section Phase 8: Testing & Pilot Launch
    Phase 8: Security Audit, UAT & Pilot Go-Live       :2026-12-04, 2026-12-10
```

---

## 2. Phase-by-Phase Breakdown & Acceptance Criteria

### Phase 1: Project Setup with MongoDB & Image Storage (Current Milestone)
* **Objective**: Full workspace inspection, technology confirmation, Mongoose data modeling, S3 direct-upload architecture, and planning documentation.
* **Prerequisites**: Access to project references (`VivoQuest Tech Focus.pdf`, `VivoQuest_TechStack_Timeline.pptx`).
* **Deliverables**:
  - `docs/architecture.md` (Updated with Mongoose schemas, S3 presigned URL flow, security policies).
  - `docs/implementation-plan.md` (Updated with MongoDB & S3 milestones).
  - `README.md` (Updated with stack and setup instructions).
  - `.gitignore` (Updated to protect credentials and binary cache).
  - `.env.example` (Configured for MongoDB Atlas and AWS S3).
* **Acceptance Criteria**:
  - [x] Workspace inspected and uncommitted Git states evaluated.
  - [x] Development tools diagnosed (Node.js, npm, Python, MongoDB, Git, Docker).
  - [x] MongoDB selected as primary database with Mongoose ODM models documented.
  - [x] Direct-to-storage upload and access control architecture documented (no Base64 in BSON).
  - [x] Design references and healthcare color palette documented.
  - [x] Exact command for Phase 2 provided.

---

### Phase 2: Monorepo Foundation, Mongoose Schemas & S3 Storage Engine
* **Objective**: Scaffold the monorepo structure (`apps/`, `packages/`), establish Mongoose data models in `apps/api`, configure S3 presigned URL endpoints, and build the Patient-Task Ingestion API.
* **Prerequisites**: Approval of Phase 1 report, active Node.js and MongoDB services.
* **Key Tasks**:
  1. Initialize monorepo workspace configuration with npm workspaces.
  2. Create `packages/shared-types` with Zod schemas for Patients, Care Gaps, Tasks, Bundles, and FileMetadata.
  3. Create `packages/design-tokens` with brand color constants, typography, and Tailwind presets.
  4. Scaffold `apps/api` (Node.js + TypeScript + Express/Fastify) connecting to MongoDB via Mongoose.
  5. Implement `FileMetadata` Mongoose schema and S3 Presigned URL service (`/api/v1/storage/upload-intent` and `/confirm-upload`).
  6. Implement CSV and JSON-FHIR Ingestion API for hospital discharge records.
  7. Configure authentication foundation (JWT + phone OTP stub).
* **Acceptance Criteria**:
  - Monorepo packages build without circular dependencies or type errors.
  - MongoDB connects cleanly and seeds test documents for `User`, `ProfessionalProfile`, `PatientProfile`, and `DMEProduct`.
  - Presigned upload endpoint generates valid signed URLs, and test upload records `FileMetadata` without Base64 storage in MongoDB.
  - Ingestion endpoint accepts sample hospital discharge batch and stores structured care tasks.

---

### Phase 3: AI Clinical Bundling Engine
* **Objective**: Build the Python/FastAPI microservice that transforms discrete care gaps into unified "Super-Visit Bundles".
* **Prerequisites**: Phase 2 completed with structured task data in MongoDB.
* **Key Tasks**:
  1. Scaffold `apps/ai-services` with Python 3.11 + FastAPI + Pydantic.
  2. Implement clinical rule engine:
     - Grouping rules (e.g., A1C phlebotomy + SDoH fall risk checklist + DME delivery).
     - Contraindication checks (preventing clashing procedures).
     - Credential requirement tags (Certified Phlebotomist, CHW, Physical Therapist).
  3. Expose REST endpoints connecting `apps/api` to `apps/ai-services`.
* **Acceptance Criteria**:
  - Engine accepts a list of 5 separate patient care gaps and produces an optimal bundled visit object.
  - Unit tests verify bundling constraints, reducing multiple patient appointments to a single visit.

---

### Phase 4: Marketplace Match, Credential Verification & Dynamic Routing
* **Objective**: Connect the bundled visit requests with available local providers and DME supply depots.
* **Prerequisites**: Phase 3 Super-Visit schemas, MongoDB 2dsphere spatial indexes.
* **Key Tasks**:
  1. Build multi-factor matching engine using MongoDB `$near` and `$geoWithin` queries for provider proximity.
  2. Implement route grouping via Google Maps Distance Matrix / Mapbox API / OR-Tools.
  3. Implement DME depot inventory check (confirming nearest equipment depot has required items in stock).
  4. Automated scheduling slot allocator with provider acceptance timeout fallback.
* **Acceptance Criteria**:
  - Provider matching algorithm returns ranked matches within a 15km radius in < 300ms using 2dsphere indexing.
  - System successfully bundles travel route between 3 home visits and 1 equipment pickup stop.

---

### Phase 5: Field Provider Mobile Application
* **Objective**: Deliver the cross-platform React Native (Expo) mobile client for field providers.
* **Prerequisites**: Mobile Expo setup, API endpoints for visit acceptance and completion.
* **Key Tasks**:
  1. Scaffold `apps/mobile` with Expo 51, TypeScript, and React Native Safe Area Context.
  2. Implement Provider views:
     - Daily Route & Map View with navigation links.
     - Super-Visit task checklist (step-by-step guidance for blood draws, checklists, equipment setup).
     - Barcode / QR scanner for specimen tubes and DME asset tags.
     - Direct photo upload for DME delivery proof via presigned URLs.
     - Offline SQLite storage with background sync on network reconnection.
     - Patient digital signature capture.
* **Acceptance Criteria**:
  - Mobile app runs in Expo Go / simulator with zero TypeScript or rendering errors.
  - Offline visit completion writes locally and synchronizes cleanly once online.
  - DME setup photos upload directly to S3 and reflect in visit records.

---

### Phase 6: Omnichannel Communication & Credential Guardrails
* **Objective**: Automate patient scheduling outreach and contractor compliance safety guardrails.
* **Prerequisites**: Twilio / WhatsApp Business (Gupshup) sandbox credentials.
* **Key Tasks**:
  1. Build conversational outreach agent for patients (multilingual confirmation in Hindi, Marathi, English).
  2. Implement WhatsApp interactive message buttons (Confirm, Reschedule, Live Provider Tracking).
  3. Real-time credential guardrails: Validate provider state licenses, background checks, and identity before allowing dispatch.
* **Acceptance Criteria**:
  - Webhook simulation confirms two-way WhatsApp interaction for visit confirmation.
  - System automatically blocks dispatch if provider credentials in MongoDB are unverified or expired.

---

### Phase 7: Web Dashboards (Payer / Hospital) & LLM Documentation
* **Objective**: Build Next.js dashboards for institutional stakeholders and medical LLM clinical note generation.
* **Prerequisites**: `apps/web` setup with design tokens.
* **Key Tasks**:
  1. Implement Next.js 15 App Router pages:
     - **Hospital Operator Dashboard**: Discharge triggers, live visit tracker, completed visit records.
     - **Payer ROI Console**: Care-gap closure rate, readmission reduction metrics, visit unit economics.
     - **DME Supplier Portal**: Equipment catalog management, image uploads, stock tracking.
  2. Integrate LLM Documentation Engine:
     - Ingest structured field notes and generate formatted clinical discharge summary.
     - Suggest relevant ICD-10-CM and CPT codes for claim reimbursement.
* **Acceptance Criteria**:
  - Dashboards render with WCAG 2.1 AA accessibility and responsive layout using VivoQuest brand palette.
  - LLM service produces accurate clinical summary and code recommendations with human-in-the-loop review.

---

### Phase 8: Security Audit, End-to-End Testing & Pilot Go-Live
* **Objective**: Complete security verification, DPDP / HIPAA compliance audit, and prepare production deployment.
* **Prerequisites**: All preceding microservices connected.
* **Key Tasks**:
  1. End-to-end integration testing across Ingestion -> AI Bundling -> Dispatch -> Mobile Visit Completion -> Dashboard Reporting.
  2. Vulnerability assessment, penetration testing, and S3 bucket policy audit (Block Public Access, KMS encryption).
  3. Deployment scripts for AWS (EKS / ECS, MongoDB Atlas VPC peering, CloudFront).
  4. Pilot stakeholder onboarding and training.
* **Acceptance Criteria**:
  - 100% pass rate on end-to-end regression test suite.
  - Zero high or critical security vulnerabilities detected.
  - Pilot launch ready in AWS Mumbai (`ap-south-1`).
