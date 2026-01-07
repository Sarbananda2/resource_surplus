# Design Guidelines: Transparency-Driven Surplus Redistribution Platform

## Design Approach

**Selected System:** Material Design 3  
**Rationale:** This operational logistics platform requires clear information hierarchy, robust form patterns, and efficient task-oriented interfaces. Material Design provides the structured component system needed for data-dense dashboards across three distinct user roles.

## Core Design Principles

1. **Operational Clarity** - Every interface element serves a functional purpose; no decorative or emotional design
2. **Role-Based Consistency** - Each user type (Donor/NGO/Delivery Agent) has distinct but systematically related interfaces
3. **Information Density** - Maximize useful data visibility while maintaining scanability
4. **Privacy-First** - Visual treatments reinforce privacy (blurred faces, area-level locations)

## Typography

**Font Family:** Roboto (via Google Fonts CDN)
- **Headers:** Roboto Medium (500) - 24px, 20px, 18px
- **Body:** Roboto Regular (400) - 16px for primary text, 14px for secondary
- **Data/Status:** Roboto Mono (400) - 14px for timestamps, IDs, tracking codes
- **Buttons/Labels:** Roboto Medium (500) - 14px

## Layout System

**Spacing Primitives:** Use Tailwind units of **4, 6, 8, 12, 16**
- Component padding: p-4, p-6
- Section spacing: gap-8, space-y-8
- Card margins: m-4
- Dashboard grids: gap-6

**Container Strategy:**
- Dashboard layouts: max-w-7xl with px-4
- Forms/modals: max-w-2xl
- Photo proof displays: max-w-4xl
- Mobile-first responsive breakpoints

## Component Library

### Dashboard Components

**Role-Specific Headers:**
- Persistent top navigation with role identifier, user name, logout
- No search bars or social elements
- Include notification badge for status updates only

**Data Cards:**
- Donation cards show: Category badge, quantity, condition tag, area, time sensitivity indicator
- Task cards (Delivery Agent): Pickup/dropoff areas, item category, time window, accept/decline actions
- Warehouse inventory cards: Status badge, received date, condition assessment

**Status Pipeline:**
- Horizontal stepper for donors showing: Listed → Assigned → Collected → Delivered → In Warehouse → Distribution Event
- Use Material Design stepper pattern with filled circles for completed states
- Include timestamps beneath each completed step

### Forms

**Donation Creation Form:**
- Single-column layout on mobile, two-column on desktop
- Dropdown selects for category, condition
- Number inputs for quantity
- Date/time pickers for availability window
- Area-level location input (not exact address)
- Large, clear submit button at bottom

**Distribution Event Form (NGO):**
- Date picker, distribution type dropdown, area input
- Photo upload zone (1-3 images) with drag-and-drop
- Clear preview of uploaded photos
- Automatic item association list (read-only)

### Photo Proof Display

**Pickup/Delivery Proof:**
- Large image display (max-w-2xl)
- Metadata overlay: timestamp, location (area), agent name
- Face blur indicator badge
- Watermark: "Pickup Proof" or "Delivery Proof"

**Distribution Event Photos:**
- Masonry grid for 1-3 group photos
- Event metadata card: date, type, area, associated item count
- Privacy notice: "No individual beneficiaries identified"

### Lists & Tables

**NGO Available Items List:**
- Filterable by category, area, time sensitivity
- Sort by: newest, expiring soon, priority
- Each row: compact card with key info + Accept/Reject buttons inline

**Delivery Agent Task List:**
- Active tasks at top, available tasks below
- Clear visual separation between assigned and unassigned
- Start/Complete action buttons with proof capture flow

## Navigation Patterns

**Donor Navigation:**
- Bottom tab bar (mobile): Home, My Donations, NGO Directory (optional monetary)
- Sidebar (desktop): Same structure

**NGO Navigation:**
- Tabs: Available Items, Accepted Items, In Transit, Warehouse, Distribution Events
- Operational dashboard as default view

**Delivery Agent Navigation:**
- Single-view focus: Active Tasks, Available Tasks, Completed History
- Minimal navigation switching

## Interactive States

**Buttons:**
- Primary actions: filled Material buttons
- Secondary: outlined Material buttons
- Disabled state clearly indicated with reduced opacity
- Loading states with spinner overlay

**Status Badges:**
- Chip-style badges for item status (Listed, Assigned, etc.)
- Condition tags (Usable, Near-Expiry, Fragile)
- Priority indicators (High, Medium, Low)

## Images

This operational platform does not use marketing hero images. All images are user-generated proof photos:

**User-Uploaded Photos:**
- Pickup proof photos (mandatory, captured by delivery agents)
- Delivery proof photos (mandatory, captured by delivery agents)
- Distribution event group photos (1-3 photos, uploaded by NGOs)

**Image Treatment:**
- All photos displayed at consistent aspect ratio (16:9 or 4:3)
- Face blur overlay applied automatically via backend processing
- Timestamp and location metadata always visible
- No decorative or stock photography used anywhere in the application

## Accessibility & Privacy

**Privacy Indicators:**
- Blur status badge on all photos
- Area-level location labels (never exact addresses)
- "Identity Protected" labels where applicable

**Accessibility:**
- WCAG AA compliant contrast ratios throughout
- Form labels always visible (no placeholder-only inputs)
- Keyboard navigation for all workflows
- Screen reader friendly status updates

## Non-Features (Explicit Exclusions)

- No hero sections or marketing layouts
- No social feeds, like buttons, or sharing
- No gamification elements (points, badges, leaderboards)
- No emotional messaging or performative charity language
- No direct messaging between roles
- No beneficiary photos or individual recipient tracking