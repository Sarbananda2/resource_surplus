# SurplusFlow - Process Flows

This document describes the key user journeys and operational workflows in the SurplusFlow platform.

---

## Table of Contents

1. [User Registration & Onboarding](#1-user-registration--onboarding)
2. [Donation Lifecycle](#2-donation-lifecycle)
3. [Delivery Task Flow](#3-delivery-task-flow)
4. [Distribution Event Flow](#4-distribution-event-flow)
5. [Monetary Donation Flow](#5-monetary-donation-flow)
6. [Volunteer Recruitment Flow](#6-volunteer-recruitment-flow)
7. [Consent Request Flow](#7-consent-request-flow)

---

## 1. User Registration & Onboarding

### 1.1 Account Creation

```
┌─────────────────────────────────────────────────────────────────────┐
│                     USER REGISTRATION FLOW                           │
└─────────────────────────────────────────────────────────────────────┘

  ┌──────────┐     ┌──────────────┐     ┌──────────────┐
  │  Visit   │────▶│  Click       │────▶│  Google      │
  │  Website │     │  "Sign In"   │     │  Popup       │
  └──────────┘     └──────────────┘     └──────────────┘
                                              │
                                              ▼
                                        ┌──────────────┐
                                        │  Authorize   │
                                        │  with Google │
                                        └──────────────┘
                                              │
                                              ▼
                   ┌──────────────────────────────────────┐
                   │           NEW USER?                   │
                   └──────────────────────────────────────┘
                          │                    │
                         YES                   NO
                          │                    │
                          ▼                    ▼
                   ┌──────────────┐     ┌──────────────┐
                   │  Onboarding  │     │  Dashboard   │
                   │  Wizard      │     │  (Role-based)│
                   └──────────────┘     └──────────────┘
```

### 1.2 Role-Specific Onboarding

**Donor Onboarding**
```
Step 1: Select Role "Donor"
    │
    ▼
Step 2: Enter Display Name
    │
    ▼
Step 3: Set Location (Area)
    │
    ▼
Step 4: Complete → Donor Dashboard
```

**NGO Onboarding**
```
Step 1: Select Role "NGO"
    │
    ▼
Step 2: Organization Name
    │
    ▼
Step 3: Description & Mission
    │
    ▼
Step 4: Warehouse Location
    │
    ▼
Step 5: Categories of Interest
    │
    ▼
Step 6: Complete → NGO Dashboard
    │
    ▼
Optional: Stripe Connect Setup (for monetary donations)
```

**Delivery Agent Onboarding**
```
Step 1: Select Role "Delivery Agent"
    │
    ▼
Step 2: Enter Display Name
    │
    ▼
Step 3: Transport Type (Bike/Car/Van)
    │
    ▼
Step 4: Load Capacity
    │
    ▼
Step 5: Operating Area
    │
    ▼
Step 6: Availability Hours
    │
    ▼
Step 7: Join via Invite Link OR Independent
    │
    ▼
Step 8: Await NGO Approval (if affiliated)
    │
    ▼
Step 9: Approved → Agent Dashboard
```

---

## 2. Donation Lifecycle

### 2.1 Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                     DONATION LIFECYCLE                               │
└─────────────────────────────────────────────────────────────────────┘

DONOR                    NGO                      DELIVERY AGENT
  │                       │                             │
  │  CREATE DONATION      │                             │
  │  ───────────────      │                             │
  ├──────────────────────▶│                             │
  │  • Category           │                             │
  │  • Quantity           │                             │
  │  • Condition          │                             │
  │  • Pickup Area        │                             │
  │  • Availability       │                             │
  │                       │                             │
  │    Status: LISTED     │                             │
  │         ▼             │                             │
  │                       │  REVIEW & ACCEPT            │
  │                       │  ──────────────             │
  │◀──────────────────────┤                             │
  │  Notification         │  Assign priority            │
  │                       │                             │
  │   Status: ASSIGNED    │                             │
  │         ▼             │                             │
  │                       │  CREATE DELIVERY TASK       │
  │                       │  ────────────────────       │
  │                       ├────────────────────────────▶│
  │                       │  Assign to agent            │
  │                       │                             │
  │                       │   Task Status: PENDING      │
  │                       │         ▼                   │
  │                       │                             │  ACCEPT TASK
  │                       │                             │  ───────────
  │                       │◀────────────────────────────┤
  │                       │                             │
  │                       │   Task Status: ACCEPTED     │
  │                       │         ▼                   │
  │                       │                             │
  │  PICKUP               │                             │  GO TO PICKUP
  │  ──────               │                             │  ────────────
  │◀────────────────────────────────────────────────────┤
  │  Agent arrives        │                             │
  │                       │                             │
  │                       │                             │  SUBMIT PROOF
  │                       │                             │  ────────────
  │                       │◀────────────────────────────┤
  │                       │  • Photo of items           │
  │                       │  • Timestamp                │
  │                       │  • Location                 │
  │                       │                             │
  │  Status: COLLECTED    │   Task Status: IN_PROGRESS  │
  │         ▼             │         ▼                   │
  │                       │                             │
  │                       │  DELIVERY TO WAREHOUSE      │
  │                       │  ──────────────────────     │
  │                       │◀────────────────────────────┤
  │                       │  • Photo of delivery        │
  │                       │  • Timestamp                │
  │                       │                             │
  │  Status: DELIVERED    │   Task Status: COMPLETED    │
  │         ▼             │         ▼                   │
  │                       │                             │
  │                       │  WAREHOUSE RECEIPT          │
  │                       │  ─────────────────          │
  │                       │  • Confirm receipt          │
  │                       │  • Assess condition         │
  │                       │    - Received               │
  │                       │    - Partially usable       │
  │                       │    - Unusable               │
  │                       │                             │
  │  Status: IN_WAREHOUSE │                             │
  │         ▼             │                             │
  │                       │                             │
  │                       │  DISTRIBUTION EVENT         │
  │                       │  ──────────────────         │
  │                       │  Link to event              │
  │                       │                             │
  │  Status: DISTRIBUTED  │                             │
  │         ▼             │                             │
  │                       │                             │
  │     COMPLETE          │                             │
  └───────────────────────┴─────────────────────────────┘
```

### 2.2 Status Definitions

| Status | Description | Actions Available |
|--------|-------------|-------------------|
| **Listed** | Donor has created donation, awaiting NGO | NGO can accept |
| **Assigned** | NGO accepted, creating pickup task | NGO assigns agent |
| **Collected** | Agent picked up items with photo proof | Agent delivers |
| **Delivered** | Agent delivered to warehouse | NGO confirms |
| **In Warehouse** | NGO confirmed receipt | NGO distributes |
| **Distributed** | Linked to distribution event | Complete |
| **Expired** | Availability window passed | Archive |

### 2.3 Photo Proof Requirements

| Stage | Photo Required | Content |
|-------|----------------|---------|
| Pickup | Yes | Items being collected from donor |
| Delivery | Yes | Items at warehouse/destination |
| Distribution | Yes (Event) | Event photos showing distribution |

---

## 3. Delivery Task Flow

### 3.1 Task Assignment

```
┌─────────────────────────────────────────────────────────────────────┐
│                     DELIVERY TASK FLOW                               │
└─────────────────────────────────────────────────────────────────────┘

NGO DASHBOARD                              AGENT DASHBOARD
     │                                           │
     │  CREATE TASK                              │
     │  ───────────                              │
     │  • Select donation                        │
     │  • Set pickup area                        │
     │  • Set dropoff area                       │
     │  • Set time window                        │
     │                                           │
     │  ASSIGN AGENT                             │
     │  ────────────                             │
     │  • Select from affiliated agents          │
     │  • Or leave unassigned                    │
     │                                           │
     ├──────────────────────────────────────────▶│
     │                                           │
     │                                           │  VIEW TASK
     │                                           │  ─────────
     │                                           │  • See details
     │                                           │  • Accept/Decline
     │                                           │
     │◀──────────────────────────────────────────┤
     │  Status: ACCEPTED                         │
     │                                           │
     │                                           │  START PICKUP
     │                                           │  ────────────
     │                                           │  Navigate to donor
     │                                           │
     │                                           │  SUBMIT PICKUP PROOF
     │                                           │  ──────────────────
     │◀──────────────────────────────────────────┤
     │  • Photo uploaded                         │
     │  • Timestamp recorded                     │
     │  • Location verified                      │
     │                                           │
     │  Status: IN_PROGRESS                      │
     │                                           │
     │                                           │  DELIVER TO WAREHOUSE
     │                                           │  ───────────────────
     │                                           │
     │                                           │  SUBMIT DELIVERY PROOF
     │                                           │  ────────────────────
     │◀──────────────────────────────────────────┤
     │  • Photo uploaded                         │
     │  • Timestamp recorded                     │
     │                                           │
     │  Status: COMPLETED                        │
     │                                           │
     │  VERIFY RECEIPT                           │
     │  ──────────────                           │
     │  Mark donation as                         │
     │  "In Warehouse"                           │
     │                                           │
     └───────────────────────────────────────────┘
```

### 3.2 Task Status Transitions

```
PENDING ──▶ ACCEPTED ──▶ IN_PROGRESS ──▶ COMPLETED
    │                         │
    │                         │
    ▼                         ▼
CANCELLED                 CANCELLED
```

---

## 4. Distribution Event Flow

### 4.1 Two-Phase Process

```
┌─────────────────────────────────────────────────────────────────────┐
│                   DISTRIBUTION EVENT FLOW                            │
└─────────────────────────────────────────────────────────────────────┘

PHASE 1: SCHEDULING                    PHASE 2: COMPLETION
─────────────────────                  ────────────────────

┌────────────────────┐                ┌────────────────────┐
│  CREATE EVENT      │                │  CONDUCT EVENT     │
│  ─────────────     │                │  ─────────────     │
│                    │                │                    │
│  • Event Date      │                │  Physical          │
│  • Distribution    │     TIME       │  distribution      │
│    Type            │────PASSES────▶ │  to beneficiaries  │
│  • Area            │                │                    │
│  • Estimated       │                │                    │
│    Beneficiaries   │                │                    │
└────────────────────┘                └────────────────────┘
         │                                     │
         │                                     │
         ▼                                     ▼
┌────────────────────┐                ┌────────────────────┐
│  Status:           │                │  COMPLETE EVENT    │
│  SCHEDULED         │                │  ──────────────    │
│                    │                │                    │
│  • Visible to      │                │  • Upload photos   │
│    donors          │                │  • Select donated  │
│  • Planning mode   │                │    items used      │
│                    │                │  • Enter actual    │
└────────────────────┘                │    beneficiary     │
                                      │    count           │
                                      │  • Add impact      │
                                      │    description     │
                                      └────────────────────┘
                                               │
                                               │
                                               ▼
                                      ┌────────────────────┐
                                      │  Status:           │
                                      │  COMPLETED         │
                                      │                    │
                                      │  • Donations       │
                                      │    marked as       │
                                      │    "Distributed"   │
                                      │  • Event published │
                                      │    for donors      │
                                      └────────────────────┘
```

### 4.2 Event Completion Details

```
┌─────────────────────────────────────────────────────────────────────┐
│                   COMPLETING A DISTRIBUTION EVENT                    │
└─────────────────────────────────────────────────────────────────────┘

Step 1: Upload Event Photos
        ├── Photo 1: Crowd/venue
        ├── Photo 2: Items being distributed
        └── Photo 3: Volunteers in action

Step 2: Select Warehouse Donations
        ├── View all "In Warehouse" donations
        ├── Check boxes for items distributed
        └── Selected items will be marked "Distributed"

Step 3: Record Impact Data
        ├── Actual beneficiary count
        └── Impact description

Step 4: Publish Event
        ├── Event visible to donors
        └── Donors see their donations in event
```

---

## 5. Monetary Donation Flow

### 5.1 NGO Stripe Onboarding

```
┌─────────────────────────────────────────────────────────────────────┐
│                   NGO STRIPE ONBOARDING                              │
└─────────────────────────────────────────────────────────────────────┘

NGO DASHBOARD                          STRIPE
     │                                    │
     │  CLICK "SETUP PAYMENTS"            │
     │  ──────────────────────            │
     ├───────────────────────────────────▶│
     │                                    │
     │                                    │  STRIPE CONNECT
     │                                    │  EXPRESS FLOW
     │                                    │  ──────────────
     │                                    │  • Business info
     │                                    │  • Bank account
     │                                    │  • Identity verification
     │                                    │
     │◀───────────────────────────────────┤
     │  REDIRECT BACK                     │
     │                                    │
     │  STATUS CHECK                      │
     │  ────────────                      │
     │  • onboarding_complete: true       │
     │  • charges_enabled: true           │
     │  • payouts_enabled: true           │
     │                                    │
     │  READY TO RECEIVE                  │
     │  DONATIONS                         │
     └────────────────────────────────────┘
```

### 5.2 Donor Contribution Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                   MONETARY DONATION FLOW                             │
└─────────────────────────────────────────────────────────────────────┘

DONOR                     PLATFORM                    STRIPE
  │                          │                          │
  │  SELECT NGO              │                          │
  │  ──────────              │                          │
  │  Browse NGOs with        │                          │
  │  Stripe enabled          │                          │
  │                          │                          │
  │  ENTER AMOUNT            │                          │
  │  ────────────            │                          │
  │  • Amount (INR)          │                          │
  │  • Optional message      │                          │
  │  • Anonymous option      │                          │
  │                          │                          │
  │  CLICK "DONATE"          │                          │
  ├─────────────────────────▶│                          │
  │                          │  CREATE CHECKOUT         │
  │                          │  ────────────────        │
  │                          ├─────────────────────────▶│
  │                          │  Session ID              │
  │                          │◀─────────────────────────┤
  │                          │                          │
  │◀─────────────────────────┤  REDIRECT                │
  │  Stripe Checkout         │                          │
  │                          │                          │
  │────────────────────────────────────────────────────▶│
  │  PAYMENT                 │                          │
  │  • Card details          │                          │
  │  • Confirm               │                          │
  │                          │                          │
  │◀────────────────────────────────────────────────────┤
  │  SUCCESS                 │                          │
  │                          │                          │
  │                          │◀─────────────────────────┤
  │                          │  WEBHOOK:                │
  │                          │  checkout.session.       │
  │                          │  completed               │
  │                          │                          │
  │                          │  UPDATE STATUS           │
  │                          │  ──────────────          │
  │                          │  • Mark "completed"      │
  │                          │  • Record timestamp      │
  │                          │                          │
  │  VIEW RECEIPT            │                          │
  │  ────────────            │                          │
  │  Donation history        │                          │
  │  shows contribution      │                          │
  │                          │                          │
  │                          │                          │  PAYOUT TO NGO
  │                          │                          │  ─────────────
  │                          │                          │  Funds transferred
  │                          │                          │  (minus fees)
  └──────────────────────────┴──────────────────────────┘
```

---

## 6. Volunteer Recruitment Flow

### 6.1 Invite Link Creation

```
┌─────────────────────────────────────────────────────────────────────┐
│                   VOLUNTEER RECRUITMENT FLOW                         │
└─────────────────────────────────────────────────────────────────────┘

NGO DASHBOARD
     │
     │  CREATE INVITE LINK
     │  ──────────────────
     │  • Label (e.g., "January Volunteers")
     │  • Max uses (optional)
     │  • Expiry date (optional)
     │
     ▼
┌─────────────────────────────────┐
│  INVITE LINK GENERATED          │
│  ────────────────────           │
│  surplusflow.com/join/ABC123    │
│                                 │
│  Share via:                     │
│  • Copy link                    │
│  • WhatsApp                     │
│  • Email                        │
└─────────────────────────────────┘
     │
     │  SHARE WITH POTENTIAL VOLUNTEERS
     │
     ▼
```

### 6.2 Volunteer Join Process

```
POTENTIAL VOLUNTEER                    NGO DASHBOARD
       │                                     │
       │  CLICK INVITE LINK                  │
       │  ─────────────────                  │
       │                                     │
       │  SIGN IN (Google)                   │
       │  ────────────────                   │
       │                                     │
       │  ONBOARDING                         │
       │  ──────────                         │
       │  • Auto-affiliated to NGO           │
       │  • Enter transport details          │
       │  • Set availability                 │
       │  • Choose visibility:               │
       │    - Exclusive (NGO tasks only)     │
       │    - Open (all tasks visible)       │
       │                                     │
       │  SUBMIT APPLICATION                 │
       ├────────────────────────────────────▶│
       │                                     │
       │  Status: PENDING APPROVAL           │
       │                                     │
       │                                     │  REVIEW APPLICATION
       │                                     │  ──────────────────
       │                                     │  • View profile
       │                                     │  • Check details
       │                                     │
       │                                     │  APPROVE / REJECT
       │                                     │  ────────────────
       │◀────────────────────────────────────┤
       │                                     │
       │  Status: APPROVED                   │
       │  ───────────────                    │
       │  Can now receive                    │
       │  delivery tasks                     │
       │                                     │
       └─────────────────────────────────────┘
```

---

## 7. Consent Request Flow

### 7.1 Donor-NGO Data Sharing

```
┌─────────────────────────────────────────────────────────────────────┐
│                   CONSENT REQUEST FLOW                               │
└─────────────────────────────────────────────────────────────────────┘

Purpose: Allow donors to request NGO contact details after
         their donation has been accepted

DONOR                         NGO
  │                            │
  │  DONATION ACCEPTED         │
  │  ─────────────────         │
  │  Donor sees their          │
  │  donation was accepted     │
  │  by [NGO Name]             │
  │                            │
  │  REQUEST NGO DETAILS       │
  │  ───────────────────       │
  │  "I'd like to know         │
  │  more about this NGO"      │
  │                            │
  ├───────────────────────────▶│
  │                            │
  │  Status: PENDING           │
  │                            │
  │                            │  REVIEW REQUEST
  │                            │  ──────────────
  │                            │  • See donor info
  │                            │  • See donation
  │                            │
  │                            │  APPROVE / DENY
  │                            │  ──────────────
  │◀───────────────────────────┤
  │                            │
  │  IF APPROVED:              │
  │  ────────────              │
  │  • See NGO contact         │
  │  • See warehouse address   │
  │  • See description         │
  │                            │
  │  IF DENIED:                │
  │  ──────────                │
  │  • See rejection note      │
  │  • Request marked closed   │
  │                            │
  └────────────────────────────┘
```

### 7.2 Privacy Principles

| Principle | Implementation |
|-----------|----------------|
| **Donor Privacy** | Donor details only shared if NGO approves |
| **NGO Privacy** | NGO details only shared if NGO approves |
| **Consent-Based** | Both parties must opt-in for data sharing |
| **Time-Limited** | Consent requests can expire |
| **Revocable** | Future: ability to revoke consent |

---

## Summary: Key Process States

### Donation States
```
Listed → Assigned → Collected → Delivered → In Warehouse → Distributed
                                                              ↓
                                                          [COMPLETE]
```

### Task States
```
Pending → Accepted → In Progress → Completed
    ↓         ↓           ↓
Cancelled  Cancelled  Cancelled
```

### Event States
```
Scheduled → Completed (Published)
```

### Consent States
```
Pending → Approved
    ↓
  Denied
    ↓
 Expired
```
