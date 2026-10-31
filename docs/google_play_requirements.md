# Google Play Store Compliance & Submission Requirements
**Document ID:** VQ-DOC-GPLAY-REQ-2026-V1  
**Project:** `E:\VivoQuest Website`  
**Target Applications:**
- `apps/mobile-patient` (Package: `com.vivoquest.patient`)
- `apps/mobile-caregiver` (Target Package: `com.vivoquest.caregiver`)  
**Applicable Policy Baseline:** Google Play Developer Policy (2025/2026 Edition)  
**Status:** Completed Architectural Assessment  

---

## 1. Google Play Health Apps Policy & Health Apps Declaration

Google Play enforces strict requirements on apps that handle health records, medical devices, or clinical management.

### 1.1 Category & Declaration Selection
In Google Play Console under **Policy > App Content > Health Apps Declaration**, VivoQuest must classify each application:

| Application | Designated Primary Category | Applicable Sub-Categories | Justification |
| :--- | :--- | :--- | :--- |
| **VivoQuest Patient App** | **Health Management & Telehealth** | Medical Device Commerce, Health Records, Care Navigation | Enables patients to manage home nursing visits, view clinical vitals reports, and order certified durable medical equipment (DME). |
| **VivoQuest Caregiver App** | **Clinical Records & Healthcare Worker Tools** | Health Services, Patient Management, In-Home Nursing | Enables certified nurses and clinicians to record bedside vitals, execute visit lifecycles, and view assigned clinical schedules. |

### 1.2 Clinical Licensing & Legal Backing
- **Policy Rule:** Apps representing healthcare services must be registered under an **Organization Account** (not a personal individual account).
- **Declaration:** VivoQuest must declare that the service is backed by registered healthcare entity **VivoQuest Health Technologies Pvt. Ltd.** with licensed clinical partners.
- **Status:** **[Business/Legal Confirmation]** — Requires Google Play Console Organization account verification using corporate MCA / CIN documents.

### 1.3 Emergency Medical Disclaimer
- **Policy Rule:** Apps providing clinical information must make clear that the app is not for emergency medical response or diagnostic determination.
- **Status:** **[Missing on Mobile]** — Must add persistent banner to mobile home dashboards:  
  *"Disclaimer: VivoQuest connects users with independent home healthcare providers. It is not an emergency triage service. In case of acute medical emergencies, call 112 or 108 immediately."*

---

## 2. Google Play Data Safety Section Requirements

Google Play mandates accurate and exhaustive disclosures in the **Data Safety** form. Any discrepancy between declared data and actual code behavior leads to rejection or suspension.

### Data Safety Disclosure Matrix (Both Applications):

| Data Type | Collected | Shared with Third Parties | Purpose of Collection | Encrypted in Transit | Deletion Option |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Personal Info (Name, Phone, Email)** | **Yes** | **No** (Strictly first-party) | Account management, service delivery, order confirmation | **Yes (HTTPS/TLS)** | **Must offer deletion** |
| **Health Info (Blood Pressure, SpO2, Pulse, Temp, Blood Sugar)** | **Yes** | **No** | Bedside clinical documentation, patient care tracking | **Yes (HTTPS/TLS)** | **Must offer deletion** |
| **Physical Address & Pincode** | **Yes** | **Yes (Logistics Provider)** | Home nurse visit dispatch & Blue Dart equipment delivery | **Yes (HTTPS/TLS)** | **Must offer deletion** |
| **Financial Info (Payment History, Order Total)** | **Yes** | **Yes (Razorpay Payment Gateway)** | Payment processing, statutory GST tax invoices | **Yes (HTTPS/TLS)** | Regulatory retention (7 yrs statutory) |
| **Precise Location (GPS)** | **No** (Currently not collected) | **No** | N/A (External map opening only) | N/A | N/A |
| **Device & App Identifiers (FCM Token, Secure Store ID)** | **Yes** | **No** | Session authentication and push notifications | **Yes (HTTPS/TLS)** | **Must offer deletion** |

---

## 3. Account Creation & Mandatory Account Deletion Policy

Google Play User Data Policy explicitly mandates:
> *"If your app enables users to create an account from within the app, it must also provide an in-app path for users to delete their account and associated data. You must also provide a web link resource where users can request app account deletion and associated data deletion."*

### Current Codebase Assessment:
- **In-App Account Creation:** Present in both apps (`patientApi.register()` and `caregiverApi.register()`).
- **In-App Account Deletion Flow:** **[MISSING]** — Neither app has an account deletion UI.
- **Backend Self-Service Deletion Endpoint:** **[MISSING]** — Backend only has admin-level deletion (`DELETE /api/v1/admin/users/:id`), no patient/caregiver self-service route.
- **Web-Based Account Deletion Request Page:** **[MISSING]** — Google Play Console requires a public URL (e.g. `https://vivoquest.in/account-deletion`).

### Required Action Items for Compliance:
1. Create `DELETE /api/v1/auth/delete-account` endpoint in `apps/api` with mandatory password/OTP re-verification.
2. For healthcare regulatory compliance, soft-delete or anonymize patient PII while retaining audit-locked clinical/tax records as permitted under DPDP Act 2023 Section 8(7).
3. Add a "Delete Account" button in both mobile Profile tabs with a 2-step confirmation modal.
4. Deploy a public web page `https://vivoquest.in/account-deletion` explaining the data deletion process and providing a deletion request form.

---

## 4. Permissions & Sensitive Hardware Access

### 4.1 Notification Permission (`POST_NOTIFICATIONS`)
- **Android Policy:** Since Android 13 (API 33), notifications require runtime opt-in.
- **Current State:** **[Missing]** — Neither app declares or requests notification permissions.
- **Remediation:** Add `expo-notifications` and configure runtime permission request with prominent pre-prompt explaining clinical and order alerts.

### 4.2 Camera & Storage Permissions
- **Android Policy:** Google Play severely restricts `READ_EXTERNAL_STORAGE` and `MANAGE_EXTERNAL_STORAGE`. Apps must use Android Photo Picker or `expo-image-picker` without broad file access.
- **Current State:** **[Missing]** — No camera module installed yet.
- **Remediation:** When adding camera capabilities in Phase 2, use `expo-image-picker` with scoped media permissions only (`android.permission.CAMERA`).

### 4.3 Location Permissions
- **Android Policy:** Google Play requires prominent disclosure for background location.
- **Current State:** **[Compliant by Absence]** — VivoQuest does not request background location. Navigation opens addresses in external Google Maps via `Linking.openURL('https://maps.google.com/?q=...')`.

---

## 5. Build, Target API & Release Requirements

### 5.1 Target API Level (Android 14 / API 34+ Mandate)
- **Policy:** As of August 2024, all new apps submitted to Google Play must target Android 14 (API level 34) or higher.
- **Current Expo SDK:** Expo SDK 58 defaults to **Target SDK 34 / 35**.
- **Status:** **[Implemented & Verified]** via `package.json` Expo SDK version.

### 5.2 Android App Bundle (AAB) & Play App Signing
- **Policy:** Google Play strictly requires the **`.aab`** format. Standard `.apk` uploads are rejected for production tracks.
- **Play App Signing:** Google manages the release signing key; developers sign uploads with an upload key.
- **Status:** **[Requires External Config]** — Requires creating `eas.json` with build profile:
  ```json
  {
    "build": {
      "production": {
        "android": {
          "buildType": "app-bundle"
        }
      }
    }
  }
  ```

### 5.3 20-Tester Closed Testing Requirement
- **Policy Rule:** For **personal developer accounts** created after November 13, 2023, Google Play mandates a **Closed Testing track with at least 20 opted-in testers for 14 continuous days** before applying for production access.
- **Strategic Recommendation:** **Register VivoQuest as an Organization Account (D-U-N-S verified)**. Organization developer accounts are **EXEMPT** from the 20-tester 14-day mandatory waiting period and have significantly higher trust for medical applications.
- **Status:** **[Business/Legal Confirmation]**.

