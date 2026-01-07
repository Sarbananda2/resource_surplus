# SurplusFlow

A transparency-driven surplus redistribution platform connecting Donors, NGOs, and Delivery Agents.

## About

SurplusFlow facilitates the donation and distribution of surplus goods (clothing, food, essentials), ensuring full transparency from listing to final distribution while prioritizing beneficiary dignity and donor privacy.

## Features

- **Role-Based Dashboards** - Distinct interfaces for Donors, NGOs, and Delivery Agents
- **Donation Lifecycle Tracking** - States: Listed, Assigned, Collected, Delivered, In Warehouse, Distributed
- **Photo Proof System** - Verified proof at each logistical step
- **Privacy-First Design** - Area-level locations protect user privacy
- **Monetary Donations** - Stripe Connect integration for NGO payouts
- **Volunteer Management** - NGOs can recruit and manage volunteers
- **Distribution Events** - Schedule and track donation distribution with impact data

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React, Vite, TailwindCSS, Shadcn/UI |
| Backend | Express.js, TypeScript |
| Database | PostgreSQL (Cloud SQL) |
| Storage | Google Cloud Storage |
| Auth | Firebase Auth, Replit Auth |
| Payments | Stripe Connect |

## Project Structure

```
surplusflow/
├── client/           # React frontend
│   └── src/
│       ├── components/   # UI components
│       ├── pages/        # Page components
│       ├── hooks/        # Custom hooks
│       └── lib/          # Utilities
├── server/           # Express backend
│   ├── routes.ts         # API routes
│   ├── storage.ts        # Database operations
│   └── replit_integrations/  # GCP integrations
└── shared/           # Shared types and schemas
    └── schema.ts         # Drizzle schema
```

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database
- Google Cloud Platform account
- Stripe account (for payments)

### Installation

```bash
npm install
```

### Environment Variables

Create the following secrets in your environment:

| Variable | Description |
|----------|-------------|
| `CLOUD_SQL_DATABASE_URL` | PostgreSQL connection string |
| `VITE_FIREBASE_API_KEY` | Firebase API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_APP_ID` | Firebase app ID |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Firebase admin SDK key (JSON) |
| `GCS_SERVICE_ACCOUNT_KEY` | Google Cloud Storage service account (JSON) |
| `GOOGLE_MAPS_API_KEY` | Google Maps Geocoding API key |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret |
| `SESSION_SECRET` | Express session secret |

### Database Setup

```bash
npm run db:push
```

### Running the App

```bash
npm run dev
```

The app will be available at `http://localhost:5000`.

## User Roles

### Donor
- List surplus items for donation
- Track donation status
- View donation history
- Make monetary donations to NGOs

### NGO
- Accept/reject donations
- Manage volunteers
- Schedule distribution events
- Receive monetary donations via Stripe

### Delivery Agent
- View assigned pickup tasks
- Submit collection/delivery proofs
- Track active deliveries

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auth/user` | Get current user |
| GET | `/api/donations` | List donations |
| POST | `/api/donations` | Create donation |
| GET | `/api/ngos` | List NGOs |
| GET | `/api/distribution-events` | List distribution events |
| POST | `/api/objects/signed-url` | Get signed URL for file access |

## GCP Infrastructure

The platform uses Google Cloud Platform services:

- **Cloud SQL** - PostgreSQL database
- **Cloud Storage** - Photo proof storage
- **Firebase Auth** - User authentication

### Environment Separation

| Service | Development | Production |
|---------|-------------|------------|
| Project | surplusflow-dev-483615 | surplusflow-prod-483615 |
| Database | surplusflow-dev-db | surplusflow-prod-db |
| Storage | surplusflow-dev-storage | surplusflow-prod-storage |

## License

MIT
