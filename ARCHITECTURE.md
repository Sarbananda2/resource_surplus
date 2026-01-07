# SurplusFlow - System Architecture

## Table of Contents

1. [High-Level Overview](#high-level-overview)
2. [System Architecture Diagram](#system-architecture-diagram)
3. [Frontend Architecture](#frontend-architecture)
4. [Backend Architecture](#backend-architecture)
5. [Database Schema](#database-schema)
6. [Authentication Flow](#authentication-flow)
7. [File Storage Architecture](#file-storage-architecture)
8. [Payment Processing](#payment-processing)
9. [GCP Infrastructure](#gcp-infrastructure)
10. [Data Flow Diagrams](#data-flow-diagrams)
11. [Security Considerations](#security-considerations)

---

## High-Level Overview

SurplusFlow is a three-tier web application connecting Donors, NGOs, and Delivery Agents for surplus redistribution. The platform prioritizes transparency, privacy, and dignified beneficiary treatment.

### Core Principles

- **Privacy-First**: Area-level locations, never exact addresses
- **Transparency**: Photo proofs at every logistical step
- **Dignity**: Aggregate distribution tracking, no individual beneficiary tracking
- **Role-Based**: Distinct experiences for each user type

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                       │
│  │    Donor     │  │     NGO      │  │   Delivery   │                       │
│  │   Browser    │  │   Browser    │  │    Agent     │                       │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                       │
└─────────┼─────────────────┼─────────────────┼───────────────────────────────┘
          │                 │                 │
          └─────────────────┼─────────────────┘
                            │ HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PRESENTATION LAYER                                   │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                     React SPA (Vite)                                    │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────────┐  │ │
│  │  │   Wouter    │  │  TanStack   │  │  Shadcn/UI  │  │   Firebase    │  │ │
│  │  │   Router    │  │    Query    │  │  Components │  │   Auth SDK    │  │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └───────────────┘  │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                            │ API Calls
                            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         APPLICATION LAYER                                    │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                     Express.js Server                                   │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────────┐  │ │
│  │  │    Auth     │  │   Routes    │  │  Middleware │  │   Webhooks    │  │ │
│  │  │  (Dual)     │  │  (REST API) │  │  (Zod)      │  │  (Stripe)     │  │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └───────────────┘  │ │
│  │  ┌────────────────────────────────────────────────────────────────────┐│ │
│  │  │                    Storage Interface                                ││ │
│  │  │              (Abstraction over Database)                            ││ │
│  │  └────────────────────────────────────────────────────────────────────┘│ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                            │
          ┌─────────────────┼─────────────────┐
          ▼                 ▼                 ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│    Cloud SQL     │ │  Cloud Storage   │ │     Stripe       │
│   (PostgreSQL)   │ │     (GCS)        │ │    Connect       │
│                  │ │                  │ │                  │
│  - users         │ │  - Photo proofs  │ │  - Payments      │
│  - donations     │ │  - Public assets │ │  - Payouts       │
│  - tasks         │ │  - Private files │ │  - Webhooks      │
└──────────────────┘ └──────────────────┘ └──────────────────┘
```

---

## Frontend Architecture

### Technology Stack

| Component | Technology |
|-----------|------------|
| Framework | React 18 |
| Build Tool | Vite |
| Routing | Wouter |
| State Management | TanStack Query v5 |
| UI Components | Shadcn/UI + Radix |
| Styling | TailwindCSS |
| Forms | React Hook Form + Zod |

### Directory Structure

```
client/src/
├── components/
│   ├── ui/              # Shadcn base components
│   ├── SignedImage.tsx  # GCS signed URL image
│   ├── LocationInput.tsx # Privacy-safe location picker
│   └── ...
├── pages/
│   ├── donor/           # Donor dashboard pages
│   ├── ngo/             # NGO dashboard pages
│   ├── agent/           # Delivery agent pages
│   └── ...
├── hooks/
│   ├── use-auth.ts      # Authentication hook
│   ├── use-signed-url.ts # GCS signed URL hook
│   └── ...
├── lib/
│   ├── queryClient.ts   # TanStack Query setup
│   ├── firebase.ts      # Firebase initialization
│   └── ...
└── App.tsx              # Main app with routing
```

### Key Patterns

**Data Fetching**
```typescript
// Queries use server state with TanStack Query
const { data, isLoading } = useQuery({
  queryKey: ['/api/donations'],
});

// Mutations invalidate cache after success
const mutation = useMutation({
  mutationFn: (data) => apiRequest('/api/donations', { method: 'POST', body: data }),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/donations'] }),
});
```

**Signed URL Images**
```typescript
// All GCS images use signed URLs for security
<SignedImage objectPath="private/.../proof.jpg" alt="Pickup proof" />
```

---

## Backend Architecture

### Technology Stack

| Component | Technology |
|-----------|------------|
| Runtime | Node.js |
| Framework | Express.js |
| Language | TypeScript |
| ORM | Drizzle |
| Validation | Zod |
| Sessions | express-session + connect-pg-simple |

### Directory Structure

```
server/
├── routes.ts            # All API endpoints
├── storage.ts           # Database operations interface
├── db.ts                # Database connection
├── auth.ts              # Auth setup (Replit + Firebase)
├── vite.ts              # Vite dev server integration
└── replit_integrations/
    ├── auth/
    │   └── firebaseAuth.ts
    └── object_storage/
        └── objectStorage.ts
```

### Middleware Stack

```
Request → CORS → Body Parser → Session → Auth → Route Handler → Response
                                  │
                                  ├── Replit Auth (OIDC sessions)
                                  └── Firebase Auth (JWT verification)
```

### API Structure

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auth/user` | Get authenticated user |
| POST | `/api/auth/logout` | Logout user |
| GET | `/api/donations` | List donations (filtered by role) |
| POST | `/api/donations` | Create new donation |
| PATCH | `/api/donations/:id` | Update donation |
| GET | `/api/ngos` | List NGOs |
| GET | `/api/tasks` | List delivery tasks |
| POST | `/api/tasks/:id/proof` | Submit task proof |
| GET | `/api/distribution-events` | List distribution events |
| POST | `/api/distribution-events` | Create event |
| POST | `/api/objects/signed-url` | Get signed URL for file |
| POST | `/api/objects/upload-url` | Get upload URL |
| POST | `/api/stripe/webhook` | Stripe webhook handler |

---

## Database Schema

### Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────────┐       ┌─────────────────────┐
│   users     │       │  user_profiles  │       │    ngo_profiles     │
│             │1─────*│                 │1─────1│                     │
│ id (PK)     │       │ id (PK)         │       │ id (PK)             │
│ username    │       │ user_id (FK)    │       │ user_profile_id(FK) │
│ email       │       │ role            │       │ organization_name   │
│ ...         │       │ display_name    │       │ stripe_account_id   │
└─────────────┘       │ area            │       │ ...                 │
                      └─────────────────┘       └─────────────────────┘
                              │                         │
                              │1                        │1
                              ▼*                        ▼*
                      ┌─────────────────┐       ┌─────────────────────┐
                      │   donations     │*─────1│  distribution_events│
                      │                 │       │                     │
                      │ id (PK)         │       │ id (PK)             │
                      │ donor_profile_id│       │ ngo_profile_id (FK) │
                      │ ngo_profile_id  │       │ status              │
                      │ status          │       │ event_date          │
                      │ category        │       │ beneficiary_count   │
                      │ ...             │       │ ...                 │
                      └─────────────────┘       └─────────────────────┘
                              │1
                              ▼*
                      ┌─────────────────┐       ┌─────────────────────┐
                      │ delivery_tasks  │*─────1│delivery_agent_      │
                      │                 │       │     profiles        │
                      │ id (PK)         │       │                     │
                      │ donation_id(FK) │       │ id (PK)             │
                      │ agent_id (FK)   │       │ user_profile_id(FK) │
                      │ status          │       │ affiliated_ngo_id   │
                      │ pickup_proof_url│       │ approval_status     │
                      │ ...             │       │ ...                 │
                      └─────────────────┘       └─────────────────────┘
```

### Core Tables

| Table | Purpose |
|-------|---------|
| `users` | Auth credentials (managed by auth system) |
| `user_profiles` | Role-specific user data |
| `ngo_profiles` | NGO organization details + Stripe |
| `delivery_agent_profiles` | Agent capacity, availability |
| `donations` | Donated items with lifecycle status |
| `delivery_tasks` | Pickup/delivery assignments |
| `distribution_events` | Aggregated distribution records |
| `monetary_donations` | Financial contributions |
| `ngo_consent_requests` | Donor-NGO data sharing consent |
| `ngo_invite_links` | Volunteer recruitment links |
| `areas` | Location catalog for autocomplete |

### Key Enums

```typescript
// Donation lifecycle
type DonationStatus = "listed" | "assigned" | "collected" | 
                      "delivered" | "in_warehouse" | "distributed" | "expired";

// User roles
type UserRole = "donor" | "ngo" | "delivery_agent";

// Task states
type TaskStatus = "pending" | "accepted" | "in_progress" | "completed" | "cancelled";
```

---

## Authentication Flow

### Dual Authentication System

SurplusFlow supports two authentication methods operating in parallel:

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Authentication Layer                             │
│                                                                      │
│  ┌──────────────────────┐      ┌──────────────────────┐             │
│  │    Replit Auth       │      │    Firebase Auth     │             │
│  │    (OpenID Connect)  │      │    (Google Sign-In)  │             │
│  │                      │      │                      │             │
│  │  - Session-based     │      │  - JWT-based         │             │
│  │  - Server cookies    │      │  - Bearer token      │             │
│  │  - Production        │      │  - Dev + Production  │             │
│  └──────────┬───────────┘      └──────────┬───────────┘             │
│             │                              │                         │
│             └──────────────┬───────────────┘                         │
│                            ▼                                         │
│              ┌─────────────────────────┐                             │
│              │   Unified Auth Middleware│                            │
│              │                         │                             │
│              │  1. Check Replit session│                             │
│              │  2. Check Firebase JWT  │                             │
│              │  3. Attach user to req  │                             │
│              └─────────────────────────┘                             │
└─────────────────────────────────────────────────────────────────────┘
```

### Login Flow (Firebase)

```
1. User clicks "Sign in with Google"
2. Firebase popup opens
3. User authenticates with Google
4. Firebase returns ID token
5. Frontend sends token to /api/auth/firebase
6. Backend verifies token with Firebase Admin SDK
7. Backend creates/updates user in database
8. Session created, user redirected to dashboard
```

### Profile Onboarding

After first login, users complete role-specific onboarding:

- **Donor**: Display name, area
- **NGO**: Organization name, description, warehouse location
- **Delivery Agent**: Transport type, capacity, availability

---

## File Storage Architecture

### Google Cloud Storage Setup

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Object Storage Layer                             │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    GCS Service Abstraction                     │  │
│  │                 (objectStorage.ts)                             │  │
│  │                                                                │  │
│  │  Environment Detection:                                        │  │
│  │  - Development: GCS_SERVICE_ACCOUNT_KEY_DEV                   │  │
│  │  - Production:  GCS_SERVICE_ACCOUNT_KEY                       │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                              │                                       │
│         ┌────────────────────┼────────────────────┐                  │
│         ▼                    ▼                    ▼                  │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐          │
│  │   public/   │      │  .private/  │      │   Legacy    │          │
│  │             │      │             │      │  (Replit)   │          │
│  │ Public URLs │      │ Signed URLs │      │  Fallback   │          │
│  └─────────────┘      └─────────────┘      └─────────────┘          │
└─────────────────────────────────────────────────────────────────────┘
```

### Signed URL Flow

```
1. Frontend requests image display
2. Component calls /api/objects/signed-url
3. Server generates time-limited signed URL (15 min)
4. URL returned to frontend
5. Image loaded directly from GCS
6. URL expires, security maintained
```

### Upload Flow

```
1. User selects file in Uppy component
2. Frontend requests /api/objects/upload-url
3. Server generates signed upload URL
4. Frontend uploads directly to GCS
5. Success callback saves path to database
```

### Frontend Components

| Component | Use Case |
|-----------|----------|
| `SignedImage` | Inline image display |
| `ClickableSignedImage` | Thumbnail with full-size view |
| `SignedProofLink` | Text link to image |
| `useSignedUrl` | Hook with React Query caching |

---

## Payment Processing

### Stripe Connect Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Stripe Connect Flow                               │
│                                                                      │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐      │
│  │  Donor   │───▶│ Checkout │───▶│  Stripe  │───▶│   NGO    │      │
│  │          │    │ Session  │    │          │    │  Payout  │      │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘      │
│                                                                      │
│  Onboarding:                                                         │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐                       │
│  │   NGO    │───▶│ Connect  │───▶│ Account  │                       │
│  │ Profile  │    │ Express  │    │ Created  │                       │
│  └──────────┘    └──────────┘    └──────────┘                       │
└─────────────────────────────────────────────────────────────────────┘
```

### NGO Onboarding States

| Field | Description |
|-------|-------------|
| `stripeAccountId` | Connected account ID |
| `stripeOnboardingComplete` | Onboarding finished |
| `stripeChargesEnabled` | Can receive payments |
| `stripePayoutsEnabled` | Can receive payouts |

### Donation Flow

```
1. Donor selects NGO and amount
2. Creates Checkout Session (destination charge)
3. Donor completes payment
4. Webhook: checkout.session.completed
5. Monetary donation marked "completed"
6. Funds transferred to NGO (minus platform fee)
```

### Webhook Events Handled

- `checkout.session.completed`
- `checkout.session.expired`
- `account.updated`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`

---

## GCP Infrastructure

### Environment Separation

```
┌─────────────────────────────────────────────────────────────────────┐
│                        GCP Projects                                  │
│                                                                      │
│  ┌─────────────────────────┐    ┌─────────────────────────┐         │
│  │    DEVELOPMENT          │    │    PRODUCTION           │         │
│  │    surplusflow-dev-     │    │    surplusflow-prod-    │         │
│  │         483615          │    │         483615          │         │
│  │                         │    │                         │         │
│  │  Cloud SQL:             │    │  Cloud SQL:             │         │
│  │  surplusflow-dev-db     │    │  surplusflow-prod-db    │         │
│  │  34.58.52.154           │    │  35.239.51.110          │         │
│  │                         │    │                         │         │
│  │  Storage:               │    │  Storage:               │         │
│  │  surplusflow-dev-       │    │  surplusflow-prod-      │         │
│  │       storage           │    │       storage           │         │
│  │                         │    │                         │         │
│  │  Firebase:              │    │  Firebase:              │         │
│  │  Dev project config     │    │  Prod project config    │         │
│  └─────────────────────────┘    └─────────────────────────┘         │
└─────────────────────────────────────────────────────────────────────┘
```

### Secret Management

| Service | Dev Secret | Prod Secret |
|---------|------------|-------------|
| Database | `CLOUD_SQL_DATABASE_URL_DEV` | `CLOUD_SQL_DATABASE_URL` |
| Storage | `GCS_SERVICE_ACCOUNT_KEY_DEV` | `GCS_SERVICE_ACCOUNT_KEY` |
| Firebase | `*_DEV` variants | Standard names |

### Environment Detection

```typescript
// Backend (server/db.ts)
const isDev = process.env.NODE_ENV !== 'production';
const dbUrl = isDev 
  ? process.env.CLOUD_SQL_DATABASE_URL_DEV 
  : process.env.CLOUD_SQL_DATABASE_URL;

// Frontend (client/src/lib/firebase.ts)
const isDev = import.meta.env.DEV;
const apiKey = isDev 
  ? import.meta.env.VITE_FIREBASE_API_KEY_DEV 
  : import.meta.env.VITE_FIREBASE_API_KEY;
```

---

## Data Flow Diagrams

### Donation Lifecycle

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│ LISTED  │────▶│ASSIGNED │────▶│COLLECTED│────▶│DELIVERED│
└─────────┘     └─────────┘     └─────────┘     └─────────┘
    │               │               │               │
    │ Donor lists   │ NGO accepts   │ Agent picks   │ Agent drops
    │ donation      │ donation      │ up + photo    │ off + photo
    │               │               │               │
    ▼               ▼               ▼               ▼
┌─────────────────────────────────────────────────────────────┐
│                      DATABASE UPDATES                        │
└─────────────────────────────────────────────────────────────┘
                                                    │
                                                    ▼
                            ┌─────────────┐     ┌───────────┐
                            │IN_WAREHOUSE │────▶│DISTRIBUTED│
                            └─────────────┘     └───────────┘
                                  │                   │
                                  │ NGO confirms      │ Linked to
                                  │ receipt + status  │ event
```

### Distribution Event Flow

```
┌────────────────────────────────────────────────────────────────────┐
│                    Distribution Event Flow                          │
│                                                                     │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────────┐ │
│  │  SCHEDULED  │───▶│  EVENT DAY  │───▶│       COMPLETED         │ │
│  │             │    │             │    │                         │ │
│  │ - Set date  │    │ - Conduct   │    │ - Upload photos         │ │
│  │ - Set type  │    │   event     │    │ - Select donations      │ │
│  │ - Set area  │    │             │    │ - Record beneficiaries  │ │
│  │ - Estimate  │    │             │    │ - Mark as published     │ │
│  └─────────────┘    └─────────────┘    └─────────────────────────┘ │
│                                                   │                 │
│                                                   ▼                 │
│                                        ┌─────────────────────┐     │
│                                        │ Donations updated   │     │
│                                        │ status: DISTRIBUTED │     │
│                                        └─────────────────────┘     │
└────────────────────────────────────────────────────────────────────┘
```

---

## Security Considerations

### Implemented Protections

| Category | Implementation |
|----------|----------------|
| Authentication | Dual-mode (Firebase JWT + Replit sessions) |
| Authorization | Role-based access control on all endpoints |
| Data Validation | Zod schemas on all inputs |
| File Access | Signed URLs with 15-minute expiry |
| Secrets | Environment-specific, never in code |
| Database | Parameterized queries via Drizzle ORM |
| CORS | Configured for frontend origin only |
| Sessions | Secure cookies, PostgreSQL store |

### Privacy Measures

- **Location**: Area-level only (~1km grid snapping)
- **Beneficiaries**: Aggregate counts, no individual tracking
- **Donor Details**: Consent-based sharing with NGOs
- **Anonymous Donations**: Supported for monetary contributions

### Recommended Enhancements

- [ ] Rate limiting on API endpoints
- [ ] Request logging and audit trail
- [ ] Penetration testing
- [ ] Automated vulnerability scanning
- [ ] DDoS protection (Cloud Armor)
- [ ] Database encryption at rest verification

---

## Appendix: Technology Versions

| Technology | Version |
|------------|---------|
| Node.js | 20.x |
| React | 18.x |
| Express | 4.x |
| PostgreSQL | 15 |
| TypeScript | 5.x |
| Vite | 5.x |
| Drizzle ORM | Latest |
| TanStack Query | 5.x |
