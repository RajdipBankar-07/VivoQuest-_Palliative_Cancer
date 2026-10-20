# VivoQuest: AI-Enabled Preventive Healthcare Marketplace

> **India-focused, AI-enabled healthcare marketplace connecting patients, families, healthcare professionals, hospitals, and medical equipment suppliers.**

---

## 🏥 Overview

Traditional home healthcare models struggle with chronic nursing shortages, high travel overhead, and fragmented coordination. **VivoQuest** addresses this with an asset-light, closed-loop marketplace:

* **The Providers (Supply)**: Independent non-nurse clinical talent (phlebotomists, social workers / CHWs, dietitians, physical therapists) and local Durable Medical Equipment (DME) depots.
* **The Payers (Demand)**: Hospitals, ACOs, Medicare Advantage plans, insurance providers, and self-pay families seeking preventive care, HEDIS care-gap closures, and readmission reductions.
* **The Matchmaker (AI Logistics & Bundling Engine)**: Proprietary AI engine that collapses multiple care gaps into unified **"Super-Visit Bundles"** dispatched with optimized multi-stop routing.

---

## 🎨 Healthcare Design Foundation

Inspired by the accessible clinical authority of **eSanjeevani (MoHFW)** and the compassionate, dignified care of **Palcare India**:

| Role | Color Name | Hex Code | Visual Meaning |
| :--- | :--- | :--- | :--- |
| **Primary Brand** | Blue | `#1976D2` | Institutional trust, healthcare clarity, primary actions |
| **Vitality & Health** | Green | `#2E9E6F` | Healing, vitality, care-gap closure confirmation |
| **Typography & Structure**| Navy | `#17324D` | Authoritative typography, header navigation, high contrast |
| **Canvas Background** | Light Blue | `#F4F9FC` | Clean, calming healthcare canvas reducing strain |
| **Card & Surfaces** | White | `#FFFFFF` | Sterile, crisp card and modal surfaces |
| **Divider & Outlines** | Border Gray | `#D9E3EA` | Soft structural divider borders |
| **Success** | Success Green | `#28A745` | Positive clinical validations and task completions |
| **Warning** | Warning Amber | `#F4A62A` | Pending verifications, impending SLA deadlines |
| **Error** | Alert Red | `#D9534F` | Critical alerts, abnormal vitals, escalation triggers |

---

## 🛠 Technology Stack

* **Web Dashboards**: Next.js 15, React 19, TypeScript, Tailwind CSS
* **Mobile Client**: React Native, Expo 51, TypeScript (Offline SQLite, GPS, Barcode scan, Camera)
* **Marketplace API**: Node.js, TypeScript, RESTful architecture
* **Primary Database**: **MongoDB** (with **Mongoose ODM** for schema validation; hosted on **MongoDB Atlas**)
* **Object & Image Storage**: **AWS S3** (Direct-to-storage presigned upload URLs; metadata & RBAC in MongoDB)
* **AI Microservices**: Python 3.11, FastAPI, Pydantic, OR-Tools, LangChain
* **Cache & Queues**: Redis (session caching, rate limiting, pub/sub)
* **Cloud & Security**: AWS (ap-south-1 Mumbai for DPDP Act compliance), KMS, Docker, EKS

---

## 🏗 Planned Monorepo Architecture

```
vivoquest/
├── apps/
│   ├── web/                  # Next.js 15+ Web Dashboards (Payer, Hospital, Supplier, Admin)
│   ├── mobile/               # React Native Expo 51+ Provider & Field App
│   ├── api/                  # Node.js + TypeScript REST & Marketplace Engine (Mongoose)
│   └── ai-services/          # Python 3.11 + FastAPI Clinical Bundling & Dispatch Engine
├── packages/
│   ├── shared-types/         # Zod schemas, TypeScript contracts (Files, Patients, Bundles, Tasks)
│   └── design-tokens/        # Tailwind preset, CSS variables, healthcare palette tokens
├── docs/
│   ├── architecture.md       # Complete system architecture specification (MongoDB + S3)
│   └── implementation-plan.md# 8-week phased roadmap & acceptance criteria
├── .env.example              # Sanitized environment template (MongoDB Atlas + AWS S3)
├── .gitignore                # Production-grade gitignore
└── README.md                 # Project orientation and developer runbook
```

---

## 📖 Key Documentation

* [System Architecture Document](docs/architecture.md) — Comprehensive breakdown of application roles, MongoDB/Mongoose schemas, S3 presigned URL flows, and ABDM/HIPAA/DPDP security.
* [Phased Implementation Plan](docs/implementation-plan.md) — 8-week milestone roadmap, acceptance criteria, and risk mitigations.

---

## 🚀 Getting Started (Phase 1 Status)

Phase 1 (Inspection & Setup) is complete. To proceed to **Phase 2 (Monorepo Foundation, Mongoose Schemas & S3 Storage Engine)**, review the Phase 1 completion report and prompt the assistant with the exact start command.
