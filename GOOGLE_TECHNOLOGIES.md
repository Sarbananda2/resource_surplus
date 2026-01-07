# SurplusFlow - Google Technologies Overview

This document outlines all Google Cloud Platform (GCP) and Google services integrated into the SurplusFlow platform.

---

## Summary

| Service | Purpose | Status |
|---------|---------|--------|
| Cloud SQL (PostgreSQL) | Primary database | Active |
| Cloud Storage (GCS) | File storage for photo proofs | Active |
| Firebase Authentication | User authentication (Google Sign-In) | Active |
| Google Maps Geocoding API | Privacy-safe location resolution | Active |

---

## 1. Google Cloud SQL

### Overview
Cloud SQL provides fully managed PostgreSQL database instances with automatic backups, replication, and failover capabilities.

### Configuration

| Property | Development | Production |
|----------|-------------|------------|
| Instance Name | `surplusflow-dev-db` | `surplusflow-prod-db` |
| PostgreSQL Version | 15 | 15 |
| Region | us-central1 | us-central1 |
| Machine Type | db-f1-micro | db-f1-micro |
| Public IP | 34.58.52.154 | 35.239.51.110 |
| Connection | Public IP + password | Public IP + password |

### Environment Variables

```
Development: CLOUD_SQL_DATABASE_URL_DEV
Production:  CLOUD_SQL_DATABASE_URL
```

### Features Used
- PostgreSQL 15 with full SQL support
- Public IP connectivity
- Automatic storage auto-resize
- Point-in-time recovery capable
- SSL/TLS encryption in transit

### Schema Management
- Drizzle ORM for schema definitions
- `npm run db:push` for schema synchronization
- 12 tables managing users, donations, tasks, and events

---

## 2. Google Cloud Storage (GCS)

### Overview
Cloud Storage provides scalable object storage for photo proofs, supporting direct browser uploads via signed URLs.

### Configuration

| Property | Development | Production |
|----------|-------------|------------|
| Bucket Name | `surplusflow-dev-storage` | `surplusflow-prod-storage` |
| Location | Multi-region | Multi-region |
| Storage Class | Standard | Standard |
| Access Control | Uniform (IAM) | Uniform (IAM) |

### Bucket Structure

```
bucket/
├── public/           # Public assets
│   └── .keep
└── .private/         # Private files (proofs)
    └── .keep
```

### Environment Variables

```
Development: GCS_SERVICE_ACCOUNT_KEY_DEV
Production:  GCS_SERVICE_ACCOUNT_KEY
```

### Features Used

| Feature | Purpose |
|---------|---------|
| Signed URLs | Secure, time-limited file access (15 min expiry) |
| Resumable Uploads | Direct browser-to-GCS uploads |
| CORS Configuration | Cross-origin upload support |
| IAM Permissions | Role-based access control |
| Object Lifecycle | Future: automatic cleanup of old files |

### Service Account Permissions
- `roles/storage.objectAdmin` - Read, write, delete objects
- Minimal permissions following principle of least privilege

### Integration Pattern

```
Frontend                    Backend                     GCS
   │                          │                          │
   ├──Request upload URL──────▶                          │
   │                          ├──Generate signed URL─────▶
   │                          ◀──Return signed URL───────┤
   ◀──Return upload URL───────┤                          │
   │                          │                          │
   ├──Upload file directly────────────────────────────────▶
   │                          │                          │
   ├──Confirm upload path─────▶                          │
   │                          ├──Save path to DB         │
```

---

## 3. Firebase Authentication

### Overview
Firebase Auth provides secure authentication with Google Sign-In, handling user identity, tokens, and session management.

### Configuration

| Property | Development | Production |
|----------|-------------|------------|
| Project ID | `surplusflow-dev-483615` | `surplusflow-prod-483615` |
| Auth Domain | `surplusflow-dev-483615.firebaseapp.com` | `surplusflow-prod-483615.firebaseapp.com` |

### Environment Variables

**Frontend (Vite)**
```
Development:
  VITE_FIREBASE_API_KEY_DEV
  VITE_FIREBASE_AUTH_DOMAIN_DEV
  VITE_FIREBASE_PROJECT_ID_DEV
  VITE_FIREBASE_APP_ID_DEV

Production:
  VITE_FIREBASE_API_KEY
  VITE_FIREBASE_AUTH_DOMAIN
  VITE_FIREBASE_PROJECT_ID
  VITE_FIREBASE_APP_ID
```

**Backend (Node.js)**
```
Development: FIREBASE_SERVICE_ACCOUNT_KEY_DEV
Production:  FIREBASE_SERVICE_ACCOUNT_KEY
```

### Features Used

| Feature | Purpose |
|---------|---------|
| Google Sign-In | Primary authentication method |
| ID Tokens (JWT) | Secure API authentication |
| Firebase Admin SDK | Server-side token verification |
| User Management | Account creation and lookup |

### Authentication Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Browser   │     │  Firebase   │     │   Backend   │
│             │     │             │     │             │
│  Click      │     │             │     │             │
│  "Sign In"  │────▶│  Popup      │     │             │
│             │     │  Google     │     │             │
│             │◀────│  Auth       │     │             │
│  Receive    │     │             │     │             │
│  ID Token   │─────────────────────────▶  Verify    │
│             │     │             │     │  Token      │
│             │◀─────────────────────────  Create    │
│  Logged In  │     │             │     │  Session    │
└─────────────┘     └─────────────┘     └─────────────┘
```

### Security Features
- JWT token verification on every API request
- Automatic token refresh handling
- Secure session management
- Cross-platform compatibility

---

## 4. Google Maps Geocoding API

### Overview
The Geocoding API converts geographic coordinates to human-readable addresses, enabling privacy-safe location handling.

### Configuration

| Property | Value |
|----------|-------|
| API | Geocoding API |
| Billing | Pay-as-you-go |
| Region | Global |

### Environment Variables

```
Shared: GOOGLE_MAPS_API_KEY
```

### Features Used

| Feature | Purpose |
|---------|---------|
| Reverse Geocoding | Convert coordinates to area names |
| Address Components | Extract city, district, region |
| Result Types | Filter to locality/sublocality level |

### Privacy-Safe Implementation

```
User Location          Geocoding API           Stored Data
      │                      │                      │
      │  Coordinates         │                      │
      │  (exact)             │                      │
      ├─────────────────────▶│                      │
      │                      │  Reverse geocode     │
      │                      │  to area name        │
      │◀─────────────────────┤                      │
      │  Area name           │                      │
      │  (e.g., "Koramangala")                      │
      │                      │                      │
      │  Grid snapping       │                      │
      │  (~1km precision)    │                      │
      ├──────────────────────────────────────────────▶
      │                      │                      │  Store area
      │                      │                      │  name only
```

### Privacy Guarantees
- Exact coordinates never stored in database
- Coordinates snapped to ~1km grid before processing
- Only area-level names saved (neighborhood/district)
- User location privacy preserved

---

## 5. GCP Project Organization

### Project Structure

```
Google Cloud Organization
│
├── surplusflow-dev-483615 (Development)
│   ├── Cloud SQL: surplusflow-dev-db
│   ├── Cloud Storage: surplusflow-dev-storage
│   └── Firebase: Development app
│
└── surplusflow-prod-483615 (Production)
    ├── Cloud SQL: surplusflow-prod-db
    ├── Cloud Storage: surplusflow-prod-storage
    └── Firebase: Production app
```

### IAM & Service Accounts

| Service Account | Purpose | Permissions |
|-----------------|---------|-------------|
| GCS Dev | Object storage access | Storage Object Admin |
| GCS Prod | Object storage access | Storage Object Admin |
| Firebase Dev | Auth token verification | Firebase Admin |
| Firebase Prod | Auth token verification | Firebase Admin |

### Security Best Practices Implemented

1. **Separate Projects** - Dev and prod completely isolated
2. **Minimal Permissions** - Service accounts have least required access
3. **Secret Management** - Keys stored in Replit Secrets, never in code
4. **Environment Detection** - Automatic dev/prod switching
5. **No Cross-Environment Access** - Dev keys can't access prod resources

---

## 6. Future Google Technologies (Planned)

### Wave 5: Compute Migration

| Current | Target |
|---------|--------|
| Replit Hosting | Cloud Run |
| Manual Deploys | Cloud Build CI/CD |
| Basic Monitoring | Cloud Monitoring |
| - | Cloud Logging |

### Potential Additions

| Technology | Use Case |
|------------|----------|
| Cloud CDN | Static asset delivery |
| Cloud Armor | DDoS protection |
| Secret Manager | Centralized secret management |
| Cloud Tasks | Background job processing |
| Pub/Sub | Event-driven notifications |
| BigQuery | Analytics and reporting |
| Vertex AI | Donation-NGO matching optimization |

---

## 7. API Usage & Costs

### Current API Usage

| API | Usage Pattern | Estimated Cost |
|-----|---------------|----------------|
| Cloud SQL | Always-on db-f1-micro | ~$10/month per instance |
| Cloud Storage | Per-operation + storage | ~$0.02/GB/month |
| Firebase Auth | Per verification | Free tier (10K/month) |
| Geocoding API | Per request | $0.005/request |

### Cost Optimization Tips

1. **Cloud SQL**: Use db-f1-micro for dev, scale prod as needed
2. **Storage**: Implement lifecycle rules to delete old proofs
3. **Geocoding**: Cache area names to reduce API calls
4. **Firebase**: Free tier covers most small-medium apps

---

## 8. Quick Reference

### Environment Variable Checklist

```bash
# Database
CLOUD_SQL_DATABASE_URL_DEV=postgresql://...  # Dev
CLOUD_SQL_DATABASE_URL=postgresql://...       # Prod

# Storage
GCS_SERVICE_ACCOUNT_KEY_DEV={...}            # Dev (JSON)
GCS_SERVICE_ACCOUNT_KEY={...}                 # Prod (JSON)

# Firebase Frontend
VITE_FIREBASE_API_KEY_DEV=...                # Dev
VITE_FIREBASE_API_KEY=...                     # Prod
VITE_FIREBASE_AUTH_DOMAIN_DEV=...            # Dev
VITE_FIREBASE_AUTH_DOMAIN=...                 # Prod
VITE_FIREBASE_PROJECT_ID_DEV=...             # Dev
VITE_FIREBASE_PROJECT_ID=...                  # Prod
VITE_FIREBASE_APP_ID_DEV=...                 # Dev
VITE_FIREBASE_APP_ID=...                      # Prod

# Firebase Backend
FIREBASE_SERVICE_ACCOUNT_KEY_DEV={...}       # Dev (JSON)
FIREBASE_SERVICE_ACCOUNT_KEY={...}            # Prod (JSON)

# Maps
GOOGLE_MAPS_API_KEY=...                       # Shared
```

### GCP Console Links

- Cloud SQL: `console.cloud.google.com/sql/instances`
- Cloud Storage: `console.cloud.google.com/storage/browser`
- Firebase: `console.firebase.google.com`
- APIs & Services: `console.cloud.google.com/apis`
- IAM: `console.cloud.google.com/iam-admin`
