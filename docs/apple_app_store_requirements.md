# Apple App Store Compliance & Review Guidelines Assessment
**Document ID:** VQ-DOC-APPLE-REQ-2026-V1  
**Project:** `E:\VivoQuest Website`  
**Target Applications:**
- `apps/mobile-patient` (Bundle ID: `com.vivoquest.patient`)
- `apps/mobile-caregiver` (Target Bundle ID: `com.vivoquest.caregiver`)  
**Applicable Policy Baseline:** Apple App Store Review Guidelines (2025/2026 Edition)  
**Status:** Completed Architectural Assessment  

---

## 1. Apple App Store Review Guidelines Evaluation

### 1.1 Guideline 1.4 – Physical Harm & Medical Applications
- **Guideline 1.4.1 (Medical Disclaimers & Advice):**  
  > *"Medical apps that could provide inaccurate data or information, or that could be used for diagnosing or treating patients, may be reviewed with greater scrutiny. If your medical app is approved by a regulatory body like the FDA, include a link to that documentation."*
  - **Audit Findings:** VivoQuest acts as an in-home care coordination marketplace and digital record-keeper; it does not generate automated diagnostic conclusions or calculate drug dosages.
  - **Required Remediation:** Prominently display a medical disclaimer on initial sign-up and home screens:  
    *"VivoQuest is a care coordination platform. It does not provide medical diagnoses or emergency response. In an emergency, dial 112 / 108 immediately."*
  - **Classification:** **[Missing on Mobile]**

- **Guideline 1.4.2 (Data Accuracy):**  
  - Vitals recorded by caregivers (BP, SpO2, Pulse, Temp) must clearly identify the recorder (`providerOrSubmitterName`) and recording timestamp to preserve clinical traceability.
  - **Status:** **[Implemented & Verified]** in `apps/api/src/models/FieldVisit.ts` L310 and `apps/mobile-caregiver/App.tsx` L70.

---

### 1.2 Guideline 2.1 – App Completeness
- **Guideline Rule:** Apps that crash, exhibit dead links, display placeholder content ("Lorem ipsum", "Test Button", "Coming Soon"), or lack backend responses will be rejected immediately under Guideline 2.1.
- **Audit Findings in VivoQuest Mobile:**
  1. *Text Stub File:* A 361-byte text stub file exists at `frontend/public/downloads/vivoquest-patient-release.apk`. Ensure this development artifact is never referenced in iOS App Store metadata.
  2. *Empty State Resilience:* Both apps currently render clear empty states when subscriptions or visits are empty.
  3. *App Store Demo Credentials:* Apple review team must be supplied with dedicated, pre-seeded demo accounts for both Patient and Caregiver apps with active subscriptions and pre-populated visit history in **App Store Connect > App Review Information**.
  - **Classification:** **[Requires External Config]**

---

### 1.3 Guideline 3.1 – Payments, IAP & Real-World Services Exemption
This is the single most critical financial policy for iOS submissions.

- **Guideline 3.1.1 (In-App Purchase):** Digital goods, digital subscriptions, or virtual credits consumed *inside* the app must use Apple In-App Purchase (subject to 15% or 30% Apple commission).
- **Guideline 3.1.3(e) & Guideline 3.1.5(a) (Goods and Services Outside the App):**  
  > *"3.1.5(a) Goods and Services Outside the App: If your app enables people to purchase physical goods or services that will be consumed outside the app, you must use purchase methods other than in-app purchase, such as Apple Pay or traditional credit cards."*

#### VivoQuest Commercial Flow Breakdown:
1. **Medical Equipment Commerce (Wheelchairs, Hospital Beds, Monitors):**
   - Physical durable medical equipment shipped via Blue Dart to the patient's home.
   - **Verdict:** **EXCLUDED from Apple IAP**. Permitted and required to use external payment gateways (Razorpay, UPI, credit/debit card, COD).
2. **Real-World Home Caregiver & Nursing Visits:**
   - Physical bedside attendance by certified nurses and caregivers at the patient's residence.
   - **Verdict:** **EXCLUDED from Apple IAP** under Guideline 3.1.3(e). Permitted to use Razorpay / COD.
3. **Monthly Care Packages (30-day visit bundles):**
   - Pre-purchased real-world clinical hours.
   - **Verdict:** **EXCLUDED from Apple IAP**. Real-world services consumed outside the app.
- **Status:** **[Implemented & Verified]** — VivoQuest correctly utilizes Razorpay / COD for all payments. No Apple IAP integration is required.

---

### 1.4 Guideline 5.1 – Privacy & Mandatory In-App Account Deletion
- **Guideline 5.1.1(v) – Account Deletion Mandate:**  
  > *"If your app supports account creation, you must also offer account deletion within the app. It must be easy to find in the app's settings or profile. It must delete the account and all associated personal data, or allow the user to choose to keep certain data (e.g. medical or financial records required by law)."*
- **Audit Findings:** Neither mobile app provides an in-app account deletion flow.
- **Remediation Plan:**
  1. Add a **"Delete Account"** option in `Profile` tab.
  2. Display a confirmation dialog explaining that account credentials and profile will be permanently deactivated, and active care subscriptions cancelled.
  3. Under Indian DPDP Act 2023 and clinical compliance, explain that historical clinical visit logs and GST invoices are retained in an immutable audit archive for legal statutory retention.
  4. Call backend self-service endpoint `DELETE /api/v1/auth/delete-account`.
- **Classification:** **[Missing — Critical Blocker]**

---

## 2. Apple Permission Descriptions (`Info.plist`)

Apple App Review immediately rejects any binary where native permissions are accessed without informative, non-generic descriptions.

### Required `ios.infoPlist` Declarations in `app.json`:

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSCameraUsageDescription": "VivoQuest requires camera access to allow you to photograph and upload doctor prescriptions and equipment serial numbers.",
        "NSPhotoLibraryUsageDescription": "VivoQuest requires photo library access to upload medical prescription documents and clinical certificates.",
        "NSLocationWhenInUseUsageDescription": "VivoQuest uses your location to provide accurate route navigation and travel time estimates to assigned patient home visits.",
        "NSMicrophoneUsageDescription": "VivoQuest uses the microphone to allow clinicians to dictate bedside clinical voice notes and observation summaries."
      }
    }
  }
}
```

- **Current Status in `apps/mobile-patient/app.json`:** **[Missing]**
- **Current Status in `apps/mobile-caregiver/app.json`:** **[Missing]**

---

## 3. Apple Health & Medical Data Rules (Guideline 5.1.3)

- **Rule 5.1.3(i):** Apps cannot use or disclose health data gathered from HealthKit, clinical records, or user health tracking to third parties for advertising, marketing, or data mining.
- **Codebase Audit:** VivoQuest does not include any third-party advertising SDKs (e.g. Facebook SDK, Google AdMob, Adjust, AppsFlyer). All data flows strictly to `apps/api` and MongoDB.
- **Status:** **[Implemented & Verified]** (Zero ad tracking SDKs present).

---

## 4. App Store Connect & TestFlight Readiness

### 4.1 Apple Developer Program Organization Enrollment
- **Apple Mandate:** Medical and healthcare applications **cannot** be published under an Individual Apple Developer account. They must be published under an **Organization Account**.
- **Prerequisites for Organization Account:**
  1. Active Legal Entity: **VivoQuest Health Technologies Pvt. Ltd.**
  2. **D-U-N-S Number (Dun & Bradstreet):** Must match the corporate legal entity name and registered office address exactly.
  3. Corporate website with active domain email (`@vivoquest.in`).
  4. Legal binding authority declaration for the account holder.
- **Status:** **[Business/Legal Confirmation Required]**

### 4.2 TestFlight Beta Distribution
- Before public App Store Review, both applications should be deployed to TestFlight:
  - *Internal Testing Track:* Up to 100 internal team members (no Apple review required; immediate distribution).
  - *External Testing Track:* Up to 10,000 public beta testers (requires a lightweight initial Apple Beta Review).
- **Status:** **[Requires External Config]** via EAS Build and App Store Connect API Key.

