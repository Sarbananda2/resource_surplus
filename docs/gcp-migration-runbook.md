# GCP Migration Runbook

This document tracks issues encountered during the migration from Replit infrastructure to Google Cloud Platform (GCP), along with solutions and lessons learned. Use this as a reference when migrating the production environment.

## Migration Overview

| Wave | Service | Source | Target | Status |
|------|---------|--------|--------|--------|
| 1 | Geocoding | Google Maps API | Google Maps API | Complete |
| 2 | Object Storage | Replit Object Storage | Google Cloud Storage | Complete |
| 3 | Authentication | Replit Auth | Firebase Auth | Complete |
| 4 | Database | Replit PostgreSQL | Cloud SQL | Complete |
| 5 | Compute | Replit Hosting | Cloud Run | Planned |

## Wave 2: Object Storage Migration

### Prerequisites
- GCP Project: `surplusflow-dev` (dev), `surplusflow-prod` (prod)
- GCS Bucket: `surplusflow-dev-storage` (dev), `surplusflow-prod-storage` (prod - to create)
- Service Account: `storage-service@surplusflow-dev-483615.iam.gserviceaccount.com`
- Required IAM Roles: `Storage Object Admin` on the bucket

### Required Environment Variables
```
GCS_BUCKET_NAME=surplusflow-dev-storage
GCS_SERVICE_ACCOUNT_KEY=<base64-encoded-service-account-json>
```

### Issues Encountered

#### Issue 1: Legacy Environment Variables Causing Wrong Bucket Lookup
**Symptom:** Files not found even though they existed in the new GCS bucket.

**Root Cause:** The `PRIVATE_OBJECT_DIR` and `PUBLIC_OBJECT_SEARCH_PATHS` secrets from the Replit Object Storage integration still existed and pointed to the old Replit bucket (`replit-objstore-8e9d424d-...`). The code was reading these environment variables and looking in the wrong bucket.

**Error Message:**
```
storage-service@surplusflow-dev-483615.iam.gserviceaccount.com does not have storage.objects.get access to the Google Cloud Storage object
```

**Solution:** Updated `objectStorage.ts` to ignore the legacy environment variables and always construct paths using the new `GCS_BUCKET_NAME`:
```typescript
getPrivateObjectDir(): string {
  const bucketName = this.getDefaultBucketName();
  return `/${bucketName}/.private`;
}

getPublicObjectSearchPaths(): Array<string> {
  const bucketName = this.getDefaultBucketName();
  return [`/${bucketName}/public`];
}
```

**Production Action:** When setting up prod, do NOT set `PRIVATE_OBJECT_DIR` or `PUBLIC_OBJECT_SEARCH_PATHS`. Only set `GCS_BUCKET_NAME` and `GCS_SERVICE_ACCOUNT_KEY`.

---

#### Issue 2: Service Account Permissions
**Symptom:** 403 Forbidden errors when accessing GCS objects.

**Root Cause:** Service account didn't have proper permissions on the GCS bucket.

**Solution:** Grant `Storage Object Admin` role to the service account on the bucket:
```bash
gsutil iam ch serviceAccount:storage-service@PROJECT_ID.iam.gserviceaccount.com:objectAdmin gs://BUCKET_NAME
```

**Production Action:** Create service account and grant permissions before deploying.

---

#### Issue 3: Legacy Fallback Triggering Incorrectly
**Symptom:** Code was attempting to read from old Replit bucket using sidecar credentials, which failed.

**Root Cause:** Legacy fallback code was being triggered because the primary lookup was failing (due to Issue 1).

**Solution:** Once Issue 1 was fixed, files were found in the correct bucket and legacy fallback was not triggered.

**Production Action:** After all files are migrated and verified, the legacy fallback code can be removed entirely.

---

#### Issue 4: Slow Image Loading (Performance)
**Symptom:** Images loading slowly in the browser.

**Root Cause:** Files were being proxied through the Express server with multiple sequential GCS API calls (exists → getMetadata → getAcl → stream). This added latency.

**Solution:** Implemented signed URLs so browsers download directly from GCS. The server now:
1. Verifies file exists and checks ACL policy
2. Generates a signed URL (v4 signing, done locally)
3. Redirects browser to signed URL
4. Browser downloads directly from GCS

**Remaining Latency:** There's ~1.5-2 second latency for the redirect due to network distance between Replit and GCS (exists check + metadata fetch). This will improve significantly when the app runs on Cloud Run (Wave 5) since both services will be in the same GCP region.

**Production Action:** 
- Signed URLs implemented and working
- Consider adding Cloud CDN after Wave 5 for frequently accessed assets
- The network latency issue will resolve itself when the app runs on GCP

---

#### Issue 5: Image Authentication - Session Not Populated on Object Storage Routes
**Symptom:** Signed URL requests return 401 Unauthorized even when user is logged in.

**Root Cause:** The object storage routes (`/api/objects/signed-url` and `/objects/*`) were not using authentication middleware. When checking `req.user?.claims?.sub`, it was always undefined because no middleware was populating `req.user` from the session or Firebase token.

**Solution:** Created an `optionalAuth` middleware that:
1. Checks for session-based auth (`req.session.userId`) and populates `req.user`
2. Falls back to Firebase Bearer token (`Authorization: Bearer <token>`)
3. Doesn't block requests (allows public objects to be accessed without auth)

```typescript
const optionalAuth: RequestHandler = async (req: any, res, next) => {
  // Check session-based auth
  if (req.session?.userId) {
    const user = await authStorage.getUser(req.session.userId);
    if (user) {
      req.user = { claims: { sub: user.id } };
    }
  }
  
  // Check for Firebase Bearer token
  if (!req.user) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      // ... verify Firebase token and set req.user
    }
  }
  
  next();
};
```

Applied to routes:
```typescript
app.get("/api/objects/signed-url", optionalAuth, async (req, res) => { ... });
app.get("/objects/:objectPath(*)", optionalAuth, async (req, res) => { ... });
```

**Production Action:** This middleware is already implemented in `server/replit_integrations/object_storage/routes.ts`. Ensure it's deployed with the rest of the application.

---

### Signed URL Frontend Components

After implementing signed URLs on the backend, the frontend was updated to use dedicated components for displaying images stored in GCS.

#### Components Created

| Component | Location | Purpose |
|-----------|----------|---------|
| `SignedImage` | `client/src/components/signed-image.tsx` | Inline image display with loading skeleton |
| `ClickableSignedImage` | `client/src/components/clickable-signed-image.tsx` | Thumbnail that opens full image in new tab |
| `SignedProofLink` | `client/src/components/signed-proof-link.tsx` | Text link that opens image in new tab |

#### Hook

`useSignedUrl` (`client/src/hooks/use-signed-url.ts`) - React Query hook that fetches signed URLs with caching:
- **Cache duration:** 10 minutes (staleTime)
- **Garbage collection:** 15 minutes (gcTime)
- **Retry:** 1 attempt on failure

#### Usage Examples

```tsx
// Inline image (e.g., distribution event thumbnail)
<SignedImage 
  objectPath="/objects/uploads/uuid" 
  alt="Event photo" 
  className="w-full h-full object-cover"
/>

// Clickable thumbnail (e.g., proof photos in timeline)
<ClickableSignedImage
  objectPath={donation.pickupProofUrl}
  alt="Pickup proof"
  className="w-16 h-16 rounded-md"
/>

// Text link (e.g., in data tables)
<SignedProofLink
  objectPath={task.deliveryProofUrl}
  label="View delivery proof"
/>
```

#### Files Updated to Use Signed URL Components

| File | Component | Change |
|------|-----------|--------|
| `ngo-dashboard.tsx` | Distribution event photos | `<img>` → `<SignedImage>` |
| `donation-drawer-base.tsx` | Proof photos in detail view | Uses `<ClickableSignedImage>` |
| `chain-of-custody-timeline.tsx` | Timeline proof photos | Uses `<ClickableSignedImage>` |
| `agent-task-drawer.tsx` | Task proof photos | Uses `<ClickableSignedImage>` |
| `proof-viewer.tsx` | Full-screen proof display | Uses `useSignedUrl` hook |
| `donor-donation-drawer.tsx` | Donor's view of proofs | Uses `<SignedProofLink>` |

#### Important Notes

1. **Object Path Format:** All components expect paths in the format `/objects/uploads/uuid`. This is how paths are stored in the database.

2. **Authentication Required:** Non-public objects require the user to be authenticated. The `optionalAuth` middleware handles this automatically.

3. **Error Handling:** Components show a placeholder icon when image loading fails.

4. **Performance:** Signed URLs are cached client-side, so repeat views of the same image don't make additional API calls.

---

### File Migration Steps

1. **Create the new bucket:**
   ```bash
   gsutil mb -p PROJECT_ID -l us-central1 gs://BUCKET_NAME
   ```

2. **Set up service account:**
   ```bash
   gcloud iam service-accounts create storage-service --display-name="Storage Service"
   gsutil iam ch serviceAccount:storage-service@PROJECT_ID.iam.gserviceaccount.com:objectAdmin gs://BUCKET_NAME
   ```

3. **Generate and encode service account key:**
   ```bash
   gcloud iam service-accounts keys create key.json --iam-account=storage-service@PROJECT_ID.iam.gserviceaccount.com
   base64 -w 0 key.json > key.b64
   ```

4. **Set environment variables:**
   - `GCS_BUCKET_NAME` = bucket name
   - `GCS_SERVICE_ACCOUNT_KEY` = contents of key.b64

5. **Run migration script:**
   ```bash
   npx tsx server/scripts/migrate-storage.ts
   ```

6. **Verify migration:**
   - Check that files are accessible via the app
   - Verify all photo proofs display correctly

### Files Migrated (Dev)
- 12 files from `.private/uploads/` directory
- Migrated on: 2026-01-07

---

## Checklist for Production Migration

### Wave 2: Object Storage
- [ ] Create GCS bucket `surplusflow-prod-storage` in `surplusflow-prod` project
- [ ] Create service account with `Storage Object Admin` role
- [ ] Generate and encode service account key
- [ ] Set `GCS_BUCKET_NAME` and `GCS_SERVICE_ACCOUNT_KEY` in production secrets
- [ ] Do NOT set `PRIVATE_OBJECT_DIR` or `PUBLIC_OBJECT_SEARCH_PATHS`
- [ ] Run migration script to copy files from Replit bucket
- [ ] Verify signed URL endpoint works (`/api/objects/signed-url`)
- [ ] Verify all dashboards display images correctly:
  - [ ] NGO Dashboard: Distribution event photos
  - [ ] Donation drawers: Pickup/delivery proof photos
  - [ ] Chain of custody timeline: Proof photos
  - [ ] Delivery agent dashboard: Task proof photos
- [ ] Monitor for any 401/403/404 errors in logs

---

## Appendix: Useful Commands

### Check bucket contents
```bash
gsutil ls -r gs://BUCKET_NAME/
```

### Copy file to bucket
```bash
gsutil cp LOCAL_FILE gs://BUCKET_NAME/path/to/file
```

### Check service account permissions
```bash
gsutil iam get gs://BUCKET_NAME
```

### Test signed URL generation
```bash
gsutil signurl -d 1h key.json gs://BUCKET_NAME/path/to/file
```

---

## Wave 3: Firebase Authentication Migration

### Overview
Wave 3 migrates authentication from Replit Auth (OpenID Connect) to Firebase Auth (JWT-based). This enables Google sign-in and provides a path to full GCP deployment.

### Prerequisites
- Firebase Project: Enable in existing GCP project (`surplusflow-dev`)
- Firebase Authentication: Enable Google sign-in provider
- Firebase Admin SDK: Generate service account key

### Required Environment Variables

**Backend (Secrets):**
```
FIREBASE_SERVICE_ACCOUNT_KEY=<full-json-content-of-service-account-key>
```

**Frontend (Environment Variables):**
```
VITE_FIREBASE_API_KEY=<from-firebase-console>
VITE_FIREBASE_AUTH_DOMAIN=<project-id>.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=<project-id>
```

### Architecture

The implementation supports three authentication methods simultaneously:
1. **Email/Password** - For development testing
2. **Replit Auth** - Existing OpenID Connect (OIDC) flow
3. **Firebase Auth** - Google sign-in via Firebase (new)

All methods create server-side sessions, providing a consistent user experience.

### Key API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/firebase/status` | GET | Check if Firebase is configured and ready |
| `/api/firebase/session` | POST | Exchange Firebase ID token for server session |
| `/api/firebase/user` | GET | Get user via Firebase Bearer token (stateless) |
| `/api/auth/user` | GET | Get current user (supports all auth methods) |

### Implementation Details

**Graceful Initialization:**
- Firebase Admin SDK initializes lazily on first use
- Invalid/missing credentials are handled gracefully
- `isFirebaseReady()` returns `false` if initialization fails
- Frontend checks `/api/firebase/status` before showing Google button

**Dual-Auth Middleware:**
The `isAuthenticated` middleware checks auth in this order:
1. Session-based auth (`req.session.userId`)
2. Firebase Bearer token (`Authorization: Bearer <token>`)
3. Replit Auth (OIDC tokens in session)

**User Sync:**
Firebase users are upserted to the PostgreSQL `users` table using their Firebase UID as the primary key.

### Important Notes

1. **Server Restart Required:** After adding/changing Firebase credentials, restart the server to re-initialize the SDK.

2. **Frontend Status Check:** The Google sign-in button only appears when:
   - Frontend env vars are set (`VITE_FIREBASE_*`)
   - Backend reports `ready: true` from `/api/firebase/status`

3. **Backward Compatibility:** Existing Replit Auth and email/password logins continue to work unchanged.

### Issues Encountered

#### Issue 1: Firebase Admin SDK Import Errors
**Symptom:** Firebase Admin SDK returning undefined errors when trying to verify tokens.

**Error Message:**
```
Cannot read properties of undefined (reading 'credential')
```

**Root Cause:** Using namespace imports (`import admin from 'firebase-admin'`) instead of modular imports. The Firebase Admin SDK v11+ requires modular imports for proper tree-shaking and compatibility.

**Solution:** Use modular imports from specific subpackages:
```typescript
// BAD - causes undefined errors
import admin from 'firebase-admin';
admin.credential.cert(serviceAccount);

// GOOD - modular imports work correctly
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const app = initializeApp({
  credential: cert(serviceAccount)
});
const auth = getAuth(app);
```

**Production Action:** Ensure all Firebase Admin imports use the modular pattern.

---

#### Issue 2: Private Key Parsing from JSON Secret
**Symptom:** Firebase initialization fails with invalid private key error.

**Error Message:**
```
Error: Invalid PEM formatted private key
```

**Root Cause:** When storing the service account JSON as a secret, the private key's newline characters (`\n`) get escaped as literal `\\n` strings. The JSON parser doesn't convert these back to actual newlines.

**Solution:** Manually replace escaped newlines before using the private key:
```typescript
const serviceAccount = JSON.parse(firebaseKeyJson);
if (serviceAccount.private_key) {
  serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
}
```

**Production Action:** Apply the same private key fix when parsing the service account JSON.

---

#### Issue 3: Duplicate Email Constraint Violations
**Symptom:** Google sign-in fails for users who already have an account via email/password.

**Error Message:**
```
duplicate key value violates unique constraint "users_email_unique"
```

**Root Cause:** The upsert logic used `onConflictDoUpdate` with `target: users.id`, but Firebase users have different IDs than email/password users. When a user signs in with Google using an email that already exists, the insert fails because:
1. The Firebase UID doesn't match any existing user ID (no conflict on ID)
2. The email already exists (constraint violation)

**Solution:** Check for existing users by email first, then update that user instead of creating a new one:
```typescript
async upsertUser(userData: UpsertUser): Promise<User> {
  // First check if a user with this email already exists
  if (userData.email) {
    const existingUser = await this.getUserByEmail(userData.email);
    if (existingUser) {
      // Update the existing user with new data (profile image, etc.)
      const [updatedUser] = await db
        .update(users)
        .set({
          firstName: userData.firstName || existingUser.firstName,
          lastName: userData.lastName || existingUser.lastName,
          profileImageUrl: userData.profileImageUrl || existingUser.profileImageUrl,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existingUser.id))
        .returning();
      return updatedUser;
    }
  }
  // No existing user, create new one
  // ...
}
```

**Production Action:** This fix is already in `server/replit_integrations/auth/storage.ts`. Ensure this logic is deployed before enabling Firebase Auth in production.

---

#### Issue 4: Authorized Domains Configuration
**Symptom:** Google sign-in popup fails with "auth/unauthorized-domain" error.

**Root Cause:** The Replit development domain (`*.replit.dev`) was not added to Firebase's authorized domains list.

**Solution:** In Firebase Console:
1. Go to Authentication > Settings > Authorized domains
2. Add your Replit domain (e.g., `your-repl-name.replit.dev`)

**Production Action:** Add the production domain to Firebase authorized domains before deployment.

---

### Checklist for Production Migration

#### Firebase Setup
- [ ] Create Firebase project or enable Firebase in existing GCP project
- [ ] Enable Google sign-in provider in Firebase Console
- [ ] Add authorized domains (production URL) in Firebase Console
- [ ] Generate Firebase Admin SDK service account key

#### Environment Configuration
- [ ] Set `FIREBASE_SERVICE_ACCOUNT_KEY` in production secrets
- [ ] Set `VITE_FIREBASE_API_KEY` in production environment
- [ ] Set `VITE_FIREBASE_AUTH_DOMAIN` in production environment
- [ ] Set `VITE_FIREBASE_PROJECT_ID` in production environment

#### Testing
- [ ] Verify `/api/firebase/status` returns `{"ready": true}`
- [ ] Test Google sign-in flow end-to-end
- [ ] Verify user appears in database after first login
- [ ] Test protected routes with Firebase-authenticated user
- [ ] Verify existing Replit Auth users can still log in

#### Post-Migration
- [ ] Monitor Firebase Auth usage in Firebase Console
- [ ] Consider removing Replit Auth after validation period
- [ ] Update user documentation with new sign-in option

---

## Wave 4: Cloud SQL Database Migration

### Overview
Wave 4 migrates the PostgreSQL database from Replit's built-in database to Google Cloud SQL. This provides a managed database service with automatic backups, high availability options, and native GCP integration.

### Prerequisites
- GCP Project: `surplusflow-dev-483615` (dev), `surplusflow-prod` (prod)
- Cloud SQL Admin API enabled
- Network access configured (authorized networks or Cloud SQL Proxy)

### Required Environment Variables

**Development (Replit → Cloud SQL via public IP):**
```
CLOUD_SQL_DATABASE_URL=postgresql://app_user:PASSWORD@PUBLIC_IP:5432/surplusflow
```

**Production (Cloud Run → Cloud SQL via Proxy):**
```
CLOUD_SQL_DATABASE_URL=postgresql://app_user:PASSWORD@/cloudsql/PROJECT:REGION:INSTANCE/surplusflow
```

### Architecture

**Connection Priority:**
The application checks for database connection strings in this order:
1. `CLOUD_SQL_DATABASE_URL` (Cloud SQL - preferred)
2. `DATABASE_URL` (Replit PostgreSQL - fallback)

This allows gradual migration without breaking the existing setup.

**Dev vs Prod Connection:**
| Environment | Connection Method | Why |
|-------------|------------------|-----|
| Development (Replit) | Public IP + Password | Simpler setup, still secure with SSL |
| Production (Cloud Run) | Cloud SQL Proxy | Native IAM auth, no public IP exposure |

### Instance Configuration (Dev)

| Setting | Value |
|---------|-------|
| Instance Name | `surplusflow-dev-db` |
| Database Version | PostgreSQL 15 |
| Region | `us-central1` |
| Tier | `db-f1-micro` (shared vCPU, 0.6GB RAM) |
| Storage | 10GB HDD |
| High Availability | Zonal (single zone) |
| Public IP | Enabled |
| Authorized Networks | `0.0.0.0/0` (for Replit access) |

### Setup Commands

**1. Create Cloud SQL instance:**
```bash
gcloud sql instances create surplusflow-dev-db \
  --project=PROJECT_ID \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --root-password='SECURE_PASSWORD' \
  --storage-type=HDD \
  --storage-size=10GB \
  --availability-type=zonal
```

**2. Create database:**
```bash
gcloud sql databases create surplusflow \
  --instance=surplusflow-dev-db
```

**3. Create application user:**
```bash
gcloud sql users create app_user \
  --instance=surplusflow-dev-db \
  --password='SECURE_APP_PASSWORD'
```

**4. Enable public IP access:**
```bash
gcloud sql instances patch surplusflow-dev-db \
  --authorized-networks=0.0.0.0/0 \
  --quiet
```

**5. Get public IP:**
```bash
gcloud sql instances describe surplusflow-dev-db \
  --format="value(ipAddresses[0].ipAddress)"
```

### Data Migration Steps

**1. Export from Replit PostgreSQL:**
```bash
pg_dump "$DATABASE_URL" --schema-only --no-owner --no-privileges > schema.sql
pg_dump "$DATABASE_URL" --data-only --inserts --no-owner --no-privileges > data.sql
```

**2. Clean exports (remove Replit-specific commands):**
```bash
grep -v "^\\\\restrict" schema.sql > schema_clean.sql
grep -v "^\\\\restrict" data.sql > data_clean.sql
```

**3. Import to Cloud SQL:**
```bash
PGPASSWORD='APP_PASSWORD' psql -h PUBLIC_IP -U app_user -d surplusflow -f schema_clean.sql
PGPASSWORD='APP_PASSWORD' psql -h PUBLIC_IP -U app_user -d surplusflow -f data_clean.sql
```

**4. Verify data:**
```bash
PGPASSWORD='APP_PASSWORD' psql -h PUBLIC_IP -U app_user -d surplusflow -c "SELECT table_name, (SELECT count(*) FROM information_schema.tables t2 WHERE t2.table_name = t.table_name) FROM information_schema.tables t WHERE table_schema = 'public';"
```

### Issues Encountered

#### Issue 1: Special Characters in Password Causing Bash Errors
**Symptom:** `bash: !3: event not found` when running gcloud commands.

**Root Cause:** The `!` character in passwords triggers bash history expansion.

**Solution:** Wrap passwords in single quotes:
```bash
--password='MyPassword!123'
```

**Production Action:** Use passwords without `!` or ensure single quotes are used consistently.

---

#### Issue 2: Wrong Project ID
**Symptom:** Permission denied errors when creating Cloud SQL instance.

**Root Cause:** Using `surplusflow-dev` instead of the full project ID `surplusflow-dev-483615`.

**Solution:** Always use the full project ID shown in Cloud Console or `gcloud config get-value project`.

**Production Action:** Document the exact production project ID in deployment scripts.

---

#### Issue 3: Cloud SQL Admin API Not Enabled
**Symptom:** API disabled error when running gcloud sql commands.

**Root Cause:** The Cloud SQL Admin API must be enabled before creating instances.

**Solution:** When prompted, type `y` to enable the API, or pre-enable it:
```bash
gcloud services enable sqladmin.googleapis.com --project=PROJECT_ID
```

**Production Action:** Enable required APIs in production project before deployment.

---

#### Issue 4: URL Encoding Required for Special Characters
**Symptom:** Database connection fails with password containing special characters.

**Root Cause:** Special characters in passwords must be URL-encoded in connection strings.

**Solution:** URL-encode special characters:
- `!` → `%21`
- `#` → `%23`
- `@` → `%40`
- `$` → `%24`

Example: `Password!#123` → `Password%21%23123`

**Production Action:** Either avoid special characters in database passwords or document URL encoding requirements.

---

### Code Changes

**server/db.ts** - Updated to support Cloud SQL:
```typescript
const databaseUrl = process.env.CLOUD_SQL_DATABASE_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL or CLOUD_SQL_DATABASE_URL must be set.",
  );
}

if (process.env.CLOUD_SQL_DATABASE_URL) {
  console.log("Using Cloud SQL database");
} else {
  console.log("Using Replit PostgreSQL database");
}

export const pool = new Pool({ connectionString: databaseUrl });
```

### Checklist for Production Migration

#### GCP Setup
- [ ] Create Cloud SQL instance in `surplusflow-prod` project
- [ ] Use appropriate tier (recommend `db-g1-small` or higher for production)
- [ ] Enable high availability (regional) for production
- [ ] Configure automatic backups
- [ ] Create database and application user with strong password

#### Connection Configuration
- [ ] For Cloud Run: Configure Cloud SQL connection in service settings
- [ ] Use Cloud SQL Proxy (no public IP needed)
- [ ] Set `CLOUD_SQL_DATABASE_URL` with Unix socket path format

#### Data Migration
- [ ] Schedule maintenance window for migration
- [ ] Export production data from current database
- [ ] Import to Cloud SQL
- [ ] Verify row counts match
- [ ] Test application with new database

#### Cutover
- [ ] Update `CLOUD_SQL_DATABASE_URL` in production secrets
- [ ] Deploy application
- [ ] Verify all features work correctly
- [ ] Monitor for connection errors in logs

#### Post-Migration
- [ ] Set up Cloud SQL monitoring dashboards
- [ ] Configure alerts for connection issues
- [ ] Document backup/restore procedures
- [ ] Consider removing Replit database after validation period
