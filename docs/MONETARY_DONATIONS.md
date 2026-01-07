# Monetary Donations Feature Documentation

## Overview

The Monetary Donations feature enables donors to make financial contributions directly to NGOs through the SurplusFlow platform. Payments are processed via Stripe, with optional direct routing to NGO bank accounts via Stripe Connect.

## Architecture

### Data Model

```typescript
monetaryDonations {
  id: string (UUID, primary key)
  donorProfileId: string (foreign key → userProfiles)
  ngoProfileId: string (foreign key → ngoProfiles)
  amount: integer (in smallest currency unit, e.g., paise for INR)
  currency: string (default: "inr")
  status: "pending" | "completed" | "failed" | "expired" | "refunded"
  stripePaymentIntentId: string | null
  stripeCheckoutSessionId: string | null
  message: string | null (donor's optional message)
  isAnonymous: boolean (default: false)
  createdAt: timestamp
  completedAt: timestamp | null
}
```

### Status Lifecycle

```
                    ┌─────────────┐
                    │   pending   │ ← Checkout initiated
                    └──────┬──────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
           ▼               ▼               ▼
    ┌──────────┐    ┌───────────┐    ┌─────────┐
    │completed │    │  expired  │    │ failed  │
    └──────────┘    └───────────┘    └─────────┘
    (payment ok)    (30 min timeout)  (cancelled/error)
           │
           ▼
    ┌──────────┐
    │ refunded │ (future: manual refund)
    └──────────┘
```

## Stripe Integration

### Payment Flow

1. **Donor selects NGO and enters amount**
2. **Frontend calls** `POST /api/monetary-donations/checkout`
3. **Backend creates donation record** with status "pending"
4. **Backend creates Stripe Checkout Session** with idempotency key
5. **Donor redirected to Stripe hosted checkout page**
6. **Payment outcome**:
   - Success → Stripe webhook updates status to "completed"
   - Cancel → Cancel URL marks status as "failed"
   - Abandon → Session expires, webhook marks as "expired"

### Stripe Connect (NGO Payouts)

NGOs can connect their bank accounts via Stripe Connect Express:

```
┌─────────────────────────────────────────────────────────────┐
│                    Payment Routing Logic                     │
├─────────────────────────────────────────────────────────────┤
│ IF ngo.stripeAccountId AND ngo.stripePayoutsEnabled:        │
│   → Use destination charges                                  │
│   → 100% routed directly to NGO's connected account         │
│ ELSE:                                                        │
│   → Payment goes to platform's Stripe account               │
│   → Held for manual transfer or future connection           │
└─────────────────────────────────────────────────────────────┘
```

**NGO Stripe Connect Fields:**
- `stripeAccountId`: Connected Stripe Express account ID
- `stripeOnboardingComplete`: Whether details_submitted is true
- `stripeChargesEnabled`: Whether account can receive charges
- `stripePayoutsEnabled`: Whether payouts are enabled

## Duplicate Prevention (Two-Layer Protection)

### Layer 1: Application-Level

Before creating a new checkout session, the system:

1. **Queries existing pending donations** for the same donor
2. **Looks for recent match** (same NGO + amount, within 30 minutes)
3. **If found with open session** → Redirects to existing session (no new record)
4. **If session expired/completed** → Updates status accordingly
5. **Expires old pending donations** (>30 min) to clean up database

```typescript
// Matching criteria
const recentMatch = pendingDonations.find(d => 
  d.ngoProfileId === ngoProfileId && 
  d.amount === amount && 
  d.stripeCheckoutSessionId &&
  d.createdAt > thirtyMinutesAgo
);
```

### Layer 2: Stripe Idempotency Key

Even if application-level check fails (race condition), Stripe's idempotency guarantee prevents duplicates:

```typescript
const idempotencyKey = `donation_${donationId}_${ngoProfileId}_${amount}`;
stripe.checkout.sessions.create(sessionOptions, { idempotencyKey });
```

**Stripe caches responses for 24 hours** - retry with same key returns cached result.

## Webhook Handling

Stripe events are processed via `stripe-replit-sync` with custom handlers:

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Mark donation as "completed", set completedAt |
| `checkout.session.expired` | Mark donation as "expired" |
| `checkout.session.async_payment_failed` | Mark donation as "failed" |

**Webhook Handler Location:** `server/webhookHandlers.ts`

## API Endpoints

### Create Checkout Session
```
POST /api/monetary-donations/checkout
Authorization: Required (authenticated donor)

Request:
{
  "ngoProfileId": "uuid",
  "amount": 10000,        // 100.00 INR in paise
  "message": "optional",
  "isAnonymous": false
}

Response:
{
  "checkoutUrl": "https://checkout.stripe.com/...",
  "donationId": "uuid"
}
```

### Get Donor's Donations
```
GET /api/monetary-donations/my-donations
Authorization: Required

Response: [
  {
    "id": "uuid",
    "amount": 10000,
    "status": "completed",
    "ngoName": "Helping Hands Foundation",
    "createdAt": "2024-01-15T10:30:00Z",
    "completedAt": "2024-01-15T10:32:00Z"
  }
]
```

### Get Donation Summary
```
GET /api/monetary-donations/summary
Authorization: Required

Response:
{
  "totalDonated": 50000,
  "donationCount": 5,
  "currency": "inr"
}
```

### Cancel Pending Donation
```
POST /api/monetary-donations/:id/cancel
Authorization: Required (owner only)

Response: { "success": true }
```

### Verify Pending Donation
```
POST /api/monetary-donations/:id/verify-pending
Authorization: Required (owner only)

// Checks Stripe session status and updates local record
Response: { "status": "completed" | "pending" | "expired" }
```

### NGO Stripe Connect Endpoints
```
POST /api/ngo/stripe-connect/onboard    // Create/get onboarding link
GET  /api/ngo/stripe-connect/status     // Get payout status
POST /api/ngo/stripe-connect/refresh-link // Get new onboarding link
```

## Edge Case Handling

| Scenario | Handling |
|----------|----------|
| User clicks donate twice quickly | Idempotency key → same session returned |
| User abandons checkout, tries again within 30 min | Reuses existing open session |
| User abandons checkout, tries again after 30 min | Old donation expired, new session created |
| Stripe checkout session expires (30 min) | Webhook marks as "expired" |
| User clicks "Back" on checkout page | Cancel URL marks as "failed" |
| Network error during session creation | Orphaned donation record deleted |
| Webhook delivery delayed | Stripe retries for 3 days |
| User wants to verify stuck donation | `verify-pending` endpoint checks Stripe directly |

## Frontend Components

### MonetaryDonationForm
- NGO selector dropdown
- Amount input (converted to paise)
- Optional message textarea
- Anonymous donation toggle
- Submit → redirects to Stripe checkout

### DonorMonetaryDonations (History Tab)
- Lists all donations with status badges
- Shows amount, NGO name, date
- Pending donations show "Verify" action
- Refetches on tab change and window focus

### Post-Payment Confirmation Modal
- Shown on return from successful checkout
- Displays: amount, NGO name, status, date
- "View History" button navigates to history tab

## Testing

**Test Card:** `4242 4242 4242 4242` (any future expiry, any CVC)

**Test Accounts:**
- `donor@test.com` / `password123`

**Minimum Donation:** 100 paise (₹1.00)

## Security Considerations

1. **Owner-only access**: Donors can only view/manage their own donations
2. **Anonymous donations**: Donor identity hidden from NGO when enabled
3. **No sensitive data stored**: Stripe handles all payment details
4. **Webhook signature verification**: Validates events are from Stripe
5. **Idempotency protection**: Prevents duplicate charges

## Future Considerations

- **Refund endpoint**: Currently status exists but no trigger
- **Recurring donations**: One-time only for now
- **Multi-currency support**: Currently INR only
- **Platform fee**: Currently 0% (configurable in sessionOptions.payment_intent_data)
- **Donation receipts**: Email receipts for tax purposes
