# NGO Team & Volunteer Management

This document describes the volunteer team management system that allows NGOs to recruit, manage, and coordinate delivery agents for their donation pickup and delivery operations.

## Overview

The Team feature enables NGOs to build their own network of trusted delivery volunteers. Instead of relying solely on the public pool of delivery agents, NGOs can:

- Create invite links to recruit specific volunteers
- Review and approve volunteer applications
- Assign volunteers directly to delivery tasks
- Manage volunteer visibility preferences
- Remove volunteers when needed

This creates a more reliable delivery network while maintaining flexibility to use the general volunteer pool when needed.

---

## How It Works

### For NGOs

#### 1. Creating Invite Links

NGOs can create shareable invite links from the **Team** tab in their dashboard.

**To create an invite link:**
1. Go to your NGO Dashboard
2. Click the **Team** tab
3. Click **Create Invite Link**
4. Configure the link options:
   - **Label**: A name to identify this link (e.g., "Summer 2025 Volunteers")
   - **Max Uses** (optional): Limit how many people can use this link
   - **Expiration Date** (optional): Set when the link expires
5. Click **Create**

**Invite link options:**
| Option | Description |
|--------|-------------|
| Label | Internal name for tracking purposes |
| Max Uses | Maximum number of volunteers who can join using this link (leave blank for unlimited) |
| Expiration | Date after which the link stops working |
| Active/Inactive | Toggle to enable or disable the link |

#### 2. Managing Invite Links

Once created, you can:
- Copy the link to share via email, messaging apps, or social media
- Track how many times the link has been used
- Deactivate or reactivate links as needed

**To deactivate an invite link:**
1. Go to **Team** tab
2. Find the invite link in your list
3. Click the toggle switch to set it to **Inactive**
4. The link will immediately stop accepting new volunteers

**To reactivate an invite link:**
1. Find the inactive link in your list
2. Click the toggle switch to set it to **Active**
3. The link will start working again (if not expired or at max uses)

**Invite Link Lifecycle:**
| State | What Happens |
|-------|--------------|
| Active | Volunteers can join using this link |
| Inactive (toggled off) | Link is paused; can be reactivated anytime |
| Expired | Link has passed its expiration date; cannot be used |
| Max Uses Reached | Link has reached its usage limit; no more volunteers can join |

Note: Existing volunteers who joined via a link remain affiliated even after the link expires or is deactivated. Only new sign-ups are affected.

#### 3. Reviewing Volunteer Applications

When a delivery agent joins using your invite link, they appear in your **Team** tab with a "Pending" status.

**To approve a volunteer:**
1. Go to **Team** tab
2. Find the volunteer in the "Pending" section
3. Review their profile (transport type, capacity, operating area)
4. Click **Approve** to add them to your team

**To reject a volunteer:**
1. Click **Reject** on the pending volunteer
2. Optionally add notes explaining the reason (e.g., "Currently only accepting volunteers with vehicles")
3. The volunteer will see your feedback on their dashboard status page

**Rejection Notes:**
- Notes are visible only to the rejected volunteer and your organization
- Use constructive feedback to help volunteers understand the decision
- Volunteers can see the notes immediately on their status page

**Note:** Rejected volunteers can reapply using a new invite link if desired. The rejection does not permanently block them from your organization.

#### 4. Managing Your Team

Approved volunteers appear in your active team list. You can:
- View their transport type and load capacity
- See their operating area
- Check their availability status
- Remove them from your organization if needed

**To remove a volunteer:**
1. Find the volunteer in your team list
2. Click the menu button (three dots)
3. Select **Remove from Team**
4. Confirm the action

When you remove a volunteer:
- Any tasks assigned to them return to the unassigned pool
- Their status resets to allow them to join other organizations
- They can request to rejoin later if desired

#### 5. Assigning Volunteers to Tasks

When accepting a donation, you can optionally pre-assign a specific volunteer:

1. Click **Accept Donation**
2. In the assignment dropdown, select a volunteer from your team
3. Confirm the acceptance

You can also assign volunteers after accepting:
1. Go to the **Tasks** tab
2. Find an unassigned task
3. Click **Assign**
4. Select a volunteer from your available team members

**Assignment Types:**
| Type | Description |
|------|-------------|
| NGO Assigned | You specifically assigned this volunteer to the task |
| Self-Claimed | The volunteer picked up the task from the available pool |
| Unassigned | No volunteer assigned yet; available for claiming |

#### 6. Reassigning Tasks

You can manually reassign tasks at any time from the **Tasks** tab:

**To reassign a task to a different volunteer:**
1. Go to **Tasks** tab
2. Find the task you want to reassign
3. Click **Reassign** (or the assignment dropdown)
4. Select a different volunteer from your team
5. The previous volunteer will no longer see the task

**To unassign a task (return to pool):**
1. Find the assigned task in your Tasks tab
2. Click the menu button (three dots)
3. Select **Unassign**
4. The task returns to the available pool for any qualified volunteer to claim

This is useful when:
- A volunteer becomes unavailable after accepting a task
- You need to prioritize a task to a specific volunteer
- The original assignment was made in error

---

### For Delivery Agents

#### 1. Joining an Organization

If you receive an invite link from an NGO:

1. Click the invite link or paste it in your browser
2. You'll see the organization's details
3. Select your **Visibility Preference**:
   - **Exclusive**: Only see tasks from this NGO
   - **Open**: See tasks from this NGO plus the general pool
4. Complete any required profile information
5. Click **Join**

Your application will be in "Pending" status until the NGO reviews it.

#### 2. Checking Your Status

After applying, you can see your status on your dashboard:

| Status | What It Means |
|--------|---------------|
| Pending | Waiting for NGO review |
| Approved | You're part of the team and can accept tasks |
| Rejected | Application was declined (check for feedback notes) |

#### 3. Visibility Preferences

Your visibility preference controls which tasks you see:

**Exclusive Mode:**
- Only see tasks from your affiliated NGO
- Best if you want to focus on one organization
- Guaranteed to see all available tasks from that NGO

**Open Mode:**
- See tasks from your affiliated NGO
- Also see tasks from the general volunteer pool
- More task variety but may be busier

You can change your preference at any time from your profile settings.

#### 4. Accepting Tasks

**For NGO-Assigned Tasks:**
- These appear in your "Assigned to Me" section
- The NGO specifically selected you for this task
- Click **Accept** to confirm you'll complete it

**For Available Tasks:**
- Browse tasks in the "Available" section
- Self-claim any task that fits your schedule and capacity
- These become "Self-Claimed" in the system

#### 5. Leaving an Organization

If you need to leave an NGO:

1. Go to your Dashboard
2. Find your organization affiliation section
3. Click **Leave Organization**
4. Confirm the action

When you leave:
- Any active tasks assigned to you return to the unassigned pool
- Your status resets to allow joining another organization
- You can rejoin the same organization later via a new invite

---

## Task Reassignment

The system automatically handles task reassignment in these scenarios:

| Event | What Happens |
|-------|--------------|
| Volunteer leaves organization | Their active tasks return to unassigned pool |
| NGO removes volunteer | Their active tasks return to unassigned pool |
| Volunteer is rejected | Their active tasks return to unassigned pool |

This ensures no tasks are left stranded and maintains the chain of custody for all donations.

---

## Privacy & Security

- Volunteer contact information is only visible to the NGO they're affiliated with
- Donors never see volunteer identity details
- Task assignments are logged for transparency and accountability
- Rejection notes are private between the NGO and the volunteer

---

## API Reference

For developers integrating with the platform:

### Invite Link Endpoints
- `POST /api/ngo/invite-links` - Create new invite link
- `GET /api/ngo/invite-links` - List NGO's invite links
- `PATCH /api/ngo/invite-links/:id` - Toggle link active status
- `GET /api/invite/:code` - Validate invite code (public)

### Volunteer Management Endpoints
- `GET /api/ngo/volunteers` - List NGO's volunteers
- `GET /api/ngo/volunteers/available` - List available volunteers for assignment
- `POST /api/ngo/volunteers/:id/approve` - Approve volunteer
- `POST /api/ngo/volunteers/:id/reject` - Reject volunteer with optional notes
- `DELETE /api/ngo/volunteers/:id` - Remove volunteer

### Delivery Agent Endpoints
- `POST /api/delivery-agent/register-with-invite` - Register via invite code
- `POST /api/delivery-agent/join-ngo` - Join using invite link ID
- `PATCH /api/delivery-agent/preferences` - Update visibility preference
- `POST /api/delivery-agent/leave-ngo` - Leave current organization

### Task Assignment Endpoints
- `GET /api/ngo/tasks` - List NGO's delivery tasks
- `POST /api/ngo/tasks/:id/assign` - Assign volunteer to task

---

## Database Schema

Key fields supporting this feature:

**delivery_agent_profiles:**
- `affiliatedNgoId` - ID of the NGO they belong to (null if unaffiliated)
- `approvalStatus` - pending | approved | rejected
- `visibilityPreference` - exclusive | open
- `rejectionNotes` - Feedback from NGO if rejected

**ngo_invite_links:**
- `code` - Unique shareable code
- `label` - Internal name for the link
- `maxUses` - Usage limit (null for unlimited)
- `usedCount` - Current usage count
- `expiresAt` - Expiration timestamp
- `isActive` - Whether link is currently active

**delivery_tasks:**
- `assignmentType` - unassigned | ngo_assigned | self_claimed
- `deliveryAgentProfileId` - Assigned volunteer (null if unassigned)

---

## Best Practices

### For NGOs:
1. Create descriptive labels for invite links to track recruitment sources
2. Set reasonable expiration dates for time-limited recruitment campaigns
3. Review pending volunteers promptly to maintain engagement
4. Provide constructive feedback when rejecting applications
5. Pre-assign critical deliveries to reliable volunteers

### For Delivery Agents:
1. Complete your profile thoroughly before applying
2. Choose visibility preference based on your availability
3. Only accept tasks you can complete within the time window
4. Communicate with the NGO if you need to leave mid-assignment
