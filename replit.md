# SurplusFlow - Surplus Redistribution Platform

## Overview
SurplusFlow is a transparency-driven surplus redistribution platform designed to connect Donors, NGOs, and Delivery Agents for the efficient redistribution of surplus items. Its primary purpose is to facilitate the donation and distribution of goods like clothing, food, and essentials, ensuring full transparency from listing to final distribution while prioritizing beneficiary dignity and donor privacy. The platform aims to create a robust ecosystem for charitable giving, enhancing logistical efficiency and fostering community support.

## User Preferences
I prefer simple language and clear explanations. I want iterative development, with small, testable changes. Please ask before making any major architectural changes or introducing new dependencies. Do not make changes to the `docs/` folder.

## System Architecture
SurplusFlow utilizes a modern web stack with a clear separation of concerns. The UI/UX emphasizes clarity and ease of use, with role-specific dashboards and intuitive workflows.

**UI/UX Decisions:**
- **Frontend Framework**: React with Vite for a fast development experience.
- **Styling**: TailwindCSS for utility-first styling, complemented by Shadcn/UI for pre-built, accessible components.
- **Privacy-First Design**: Area-level locations are used to protect user privacy, never exact addresses.
- **Transparency**: Donation tracking from listing to distribution is visually represented with photo proofs at each logistical step.
- **Beneficiary Dignity**: Distribution events aggregate donations, avoiding individual tracking of beneficiaries.
- **Recruitment Wizard**: A guided, multi-step wizard assists NGOs in recruiting volunteers.

**Technical Implementations:**
- **Frontend**: Single-page application providing dynamic interfaces for Donors, NGOs, and Delivery Agents.
- **Backend**: Express.js with TypeScript for a robust and scalable API.
- **Database**: PostgreSQL for relational data storage and integrity.
- **Authentication**: A dual system featuring Replit Auth (OpenID Connect) for production and email/password for development flexibility.
- **File Storage**: Google Cloud Storage (GCS) for handling photo proofs, with legacy Replit bucket fallback during migration. Uses industry-standard signed URLs for secure image access.
- **Signed URL Pattern**: Images use temporary signed URLs (via `/api/objects/signed-url`) instead of direct object paths. Frontend components: `SignedImage` (inline display), `ClickableSignedImage` (thumbnails that open in new tab), `SignedProofLink` (text links). Hook: `useSignedUrl` with React Query caching.
- **Location Feature**: Standardized `LocationInput` component using browser geolocation, privacy-safe reverse geocoding, and snapping coordinates to ~1km grid.
- **Monetary Donations**: Integrated Stripe Connect for NGO payouts, allowing NGOs to receive donations directly. Includes an incremental onboarding flow and robust webhook handling for transaction statuses.
- **Donation Lifecycle**: Clearly defined states (Listed, Assigned, Collected, Delivered, In Warehouse, Distributed) with associated actions and proofs.
- **NGO Volunteer Management**: NGOs can invite and manage volunteers, with volunteers choosing their task visibility preference (exclusive/open). Delivery tasks are exclusively NGO-assigned.
- **Distribution Event Workflow**: Two-phase system (scheduled/completed) for managing distribution events, including photo proofs and impact data. When completing an event, NGOs can select which warehouse donations were distributed, linking them to the event for full traceability.

**System Design Choices:**
- **Modular Project Structure**: Organized into `client/`, `server/`, and `shared/` directories for maintainability.
- **Role-Based Access**: Distinct dashboards and API access based on user roles (Donor, NGO, Delivery Agent).
- **Consent-based Data Sharing**: Donors can consent to sharing their details with NGOs after donation acceptance.
- **Simplified Delivery Workflow**: All delivery tasks are NGO-assigned, enhancing control and coordination.

## External Dependencies
- **PostgreSQL**: Primary database for all application data.
- **Replit Auth (OpenID Connect)**: Used for secure user authentication in production environments.
- **Firebase Auth**: Google sign-in via Firebase (Wave 3 complete).
- **Google Cloud Storage**: Primary file storage for photo proofs (Wave 2 complete).
- **Stripe Connect**: Integrated for processing monetary donations, enabling direct payouts to NGOs and managing donor transactions.
- **Browser Geolocation API**: Used by the `LocationInput` component to get user's current location.
- **Google Maps Geocoding API**: Used for privacy-safe reverse geocoding to convert coordinates to area-level locations. Requires `GOOGLE_MAPS_API_KEY` secret.

## GCP Migration Status
The platform is undergoing a phased migration to Google Cloud Platform (GCP). Current status:

| Service | Current State | Target (GCP) | Migration Status |
|---------|---------------|--------------|------------------|
| Geocoding | Google Maps API | Google Maps API | Wave 1 Complete |
| Object Storage | Google Cloud Storage | Cloud Storage | Wave 2 Complete |
| Authentication | Replit Auth + Firebase | Firebase Auth | Wave 3 Complete |
| Database | Cloud SQL | Cloud SQL | Wave 4 Complete |
| Compute | Replit Hosting | Cloud Run | Planned (Wave 5) |

**Wave 2 Details (Object Storage):**
- Dev bucket: `surplusflow-dev-storage`
- Prod bucket: `surplusflow-prod-storage`
- Environment-specific secrets (code auto-detects dev vs prod in `server/replit_integrations/object_storage/objectStorage.ts`):
  - **Development**: `GCS_SERVICE_ACCOUNT_KEY_DEV` → connects to `surplusflow-dev-storage`
  - **Production**: `GCS_SERVICE_ACCOUNT_KEY` → connects to `surplusflow-prod-storage`
- Legacy fallback: Reads from Replit bucket if file not found in GCS (via `DEFAULT_OBJECT_STORAGE_BUCKET_ID`)
- 12 files migrated from legacy bucket on 2026-01-07

**Wave 3 Details (Authentication):**
- Firebase Auth implemented alongside existing Replit Auth
- Google sign-in via Firebase popup flow
- Dual-auth middleware supports both Replit sessions and Firebase JWTs
- Environment-specific secrets (code auto-detects dev vs prod):
  - **Development**: `VITE_FIREBASE_API_KEY_DEV`, `VITE_FIREBASE_AUTH_DOMAIN_DEV`, `VITE_FIREBASE_PROJECT_ID_DEV`, `VITE_FIREBASE_APP_ID_DEV`, `FIREBASE_SERVICE_ACCOUNT_KEY_DEV`
  - **Production**: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`, `FIREBASE_SERVICE_ACCOUNT_KEY`
- Status endpoint: `/api/firebase/status` - checks if Firebase is ready and returns project ID
- Google button only shows when Firebase is properly configured on both frontend and backend
- Dev project: `surplusflow-dev-483615`
- Prod project: `surplusflow-prod-483615`

**Wave 4 Details (Database):**
- Dev instance: `surplusflow-dev-db` (PostgreSQL 15, us-central1, db-f1-micro, IP: 34.58.52.154)
- Prod instance: `surplusflow-prod-db` (PostgreSQL 15, us-central1, db-f1-micro, IP: 35.239.51.110)
- Connection: Public IP with password authentication
- Environment-specific secrets (code auto-detects dev vs prod in `server/db.ts`):
  - **Development**: `CLOUD_SQL_DATABASE_URL_DEV` → connects to `surplusflow-dev-db`
  - **Production**: `CLOUD_SQL_DATABASE_URL` → connects to `surplusflow-prod-db`
- Schema pushed to both dev and prod databases on 2026-01-07 (12 tables each)

**GCP Projects:**
- Development: `surplusflow-dev-483615`
- Production: `surplusflow-prod-483615`

**Environment-Specific Secrets (Replit):**

| Service | Development Secret | Production Secret |
|---------|-------------------|-------------------|
| GCS Storage | `GCS_SERVICE_ACCOUNT_KEY_DEV` | `GCS_SERVICE_ACCOUNT_KEY` |
| Cloud SQL | `CLOUD_SQL_DATABASE_URL_DEV` | `CLOUD_SQL_DATABASE_URL` |
| Firebase (API Key) | `VITE_FIREBASE_API_KEY_DEV` | `VITE_FIREBASE_API_KEY` |
| Firebase (Auth Domain) | `VITE_FIREBASE_AUTH_DOMAIN_DEV` | `VITE_FIREBASE_AUTH_DOMAIN` |
| Firebase (Project ID) | `VITE_FIREBASE_PROJECT_ID_DEV` | `VITE_FIREBASE_PROJECT_ID` |
| Firebase (App ID) | `VITE_FIREBASE_APP_ID_DEV` | `VITE_FIREBASE_APP_ID` |
| Firebase (Service Account) | `FIREBASE_SERVICE_ACCOUNT_KEY_DEV` | `FIREBASE_SERVICE_ACCOUNT_KEY` |

**Shared Secrets (Same for Both Environments):**
- `GOOGLE_MAPS_API_KEY`: Google Maps Geocoding API key