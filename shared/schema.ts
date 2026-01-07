import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, pgEnum, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Re-export auth models
export * from "./models/auth";
import { users } from "./models/auth";

// Enums
export const userRoleEnum = pgEnum("user_role", ["donor", "ngo", "delivery_agent"]);
export const donationStatusEnum = pgEnum("donation_status", [
  "listed",
  "assigned",
  "collected",
  "delivered",
  "in_warehouse",
  "distributed",
  "expired"
]);
export const itemConditionEnum = pgEnum("item_condition", ["usable", "near_expiry", "fragile"]);
export const itemCategoryEnum = pgEnum("item_category", ["clothing", "food", "essentials", "household", "other"]);
export const taskStatusEnum = pgEnum("task_status", ["pending", "accepted", "in_progress", "completed", "cancelled"]);
export const warehouseReceiptStatusEnum = pgEnum("warehouse_receipt_status", ["received", "partially_usable", "unusable"]);
export const priorityEnum = pgEnum("priority", ["low", "medium", "high"]);
export const assignmentTypeEnum = pgEnum("assignment_type", ["unassigned", "ngo_assigned", "self_claimed"]);
export const agentApprovalStatusEnum = pgEnum("agent_approval_status", ["pending", "approved", "rejected"]);
export const eventStatusEnum = pgEnum("event_status", ["scheduled", "completed"]);

// User Profiles - extends auth users with role-specific data
export const userProfiles = pgTable("user_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  role: userRoleEnum("role").notNull(),
  displayName: varchar("display_name"),
  phone: varchar("phone"),
  area: varchar("area"),
  avatarUrl: varchar("avatar_url"),
  isOnboarded: boolean("is_onboarded").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// NGO Profiles - additional data for NGO users
export const ngoProfiles = pgTable("ngo_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userProfileId: varchar("user_profile_id").notNull().references(() => userProfiles.id),
  organizationName: varchar("organization_name").notNull(),
  description: text("description"),
  warehouseAddress: varchar("warehouse_address"),
  warehouseArea: varchar("warehouse_area"),
  categories: text("categories").array(),
  createdAt: timestamp("created_at").defaultNow(),
  // Stripe Connect fields
  stripeAccountId: varchar("stripe_account_id"),
  stripeOnboardingComplete: boolean("stripe_onboarding_complete").default(false),
  stripeChargesEnabled: boolean("stripe_charges_enabled").default(false),
  stripePayoutsEnabled: boolean("stripe_payouts_enabled").default(false),
});

// Delivery Agent Profiles - additional data for delivery agents
export const deliveryAgentProfiles = pgTable("delivery_agent_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userProfileId: varchar("user_profile_id").notNull().references(() => userProfiles.id),
  affiliatedNgoId: varchar("affiliated_ngo_id").references(() => ngoProfiles.id),
  approvalStatus: agentApprovalStatusEnum("approval_status").default("pending").notNull(),
  rejectionNotes: text("rejection_notes"),
  transportType: varchar("transport_type"),
  loadCapacity: varchar("load_capacity"),
  operatingArea: varchar("operating_area"),
  availabilityStart: varchar("availability_start"),
  availabilityEnd: varchar("availability_end"),
  isAvailable: boolean("is_available").default(true),
  visibilityPreference: varchar("visibility_preference").default("open"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Donations - items declared by donors
export const donations = pgTable("donations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  donorProfileId: varchar("donor_profile_id").notNull().references(() => userProfiles.id),
  category: itemCategoryEnum("category").notNull(),
  quantity: integer("quantity").notNull(),
  condition: itemConditionEnum("condition").notNull(),
  description: text("description"),
  area: varchar("area").notNull(),
  availabilityStart: timestamp("availability_start").notNull(),
  availabilityEnd: timestamp("availability_end").notNull(),
  status: donationStatusEnum("status").default("listed").notNull(),
  priority: priorityEnum("priority").default("medium"),
  ngoProfileId: varchar("ngo_profile_id").references(() => ngoProfiles.id),
  pickupProofUrl: varchar("pickup_proof_url"),
  deliveryProofUrl: varchar("delivery_proof_url"),
  warehouseReceiptStatus: warehouseReceiptStatusEnum("warehouse_receipt_status"),
  distributionEventId: varchar("distribution_event_id"),
  acceptedAt: timestamp("accepted_at"),
  warehouseReceivedAt: timestamp("warehouse_received_at"),
  distributedAt: timestamp("distributed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Delivery Tasks - assignments for delivery agents
export const deliveryTasks = pgTable("delivery_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  donationId: varchar("donation_id").notNull().references(() => donations.id),
  deliveryAgentProfileId: varchar("delivery_agent_profile_id").references(() => deliveryAgentProfiles.id),
  pickupArea: varchar("pickup_area").notNull(),
  dropoffArea: varchar("dropoff_area").notNull(),
  ngoProfileId: varchar("ngo_profile_id").notNull().references(() => ngoProfiles.id),
  status: taskStatusEnum("status").default("pending").notNull(),
  assignmentType: assignmentTypeEnum("assignment_type").default("unassigned").notNull(),
  timeWindowStart: timestamp("time_window_start"),
  timeWindowEnd: timestamp("time_window_end"),
  pickupProofUrl: varchar("pickup_proof_url"),
  pickupTimestamp: timestamp("pickup_timestamp"),
  pickupLocation: varchar("pickup_location"),
  deliveryProofUrl: varchar("delivery_proof_url"),
  deliveryTimestamp: timestamp("delivery_timestamp"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Distribution Events - aggregated proof of distribution by NGOs
export const distributionEvents = pgTable("distribution_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ngoProfileId: varchar("ngo_profile_id").notNull().references(() => ngoProfiles.id),
  status: eventStatusEnum("status").default("scheduled").notNull(),
  eventDate: timestamp("event_date").notNull(),
  distributionType: varchar("distribution_type").notNull(),
  area: varchar("area").notNull(),
  photoUrls: text("photo_urls").array(),
  itemCount: integer("item_count").default(0),
  impactDescription: text("impact_description"),
  beneficiaryCount: integer("beneficiary_count"),
  estimatedBeneficiaryCount: integer("estimated_beneficiary_count"),
  isPublished: boolean("is_published").default(false),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Areas - catalog of validated area names for autocomplete
export const areas = pgTable("areas", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  displayName: varchar("display_name").notNull(),
  region: varchar("region"),
  country: varchar("country"),
  usageCount: integer("usage_count").default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

// Consent request status enum
export const consentRequestStatusEnum = pgEnum("consent_request_status", ["pending", "approved", "denied", "expired"]);


// NGO Consent Requests - tracks donor requests to view NGO details
export const ngoConsentRequests = pgTable("ngo_consent_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  donationId: varchar("donation_id").notNull().references(() => donations.id),
  donorProfileId: varchar("donor_profile_id").notNull().references(() => userProfiles.id),
  ngoProfileId: varchar("ngo_profile_id").notNull().references(() => ngoProfiles.id),
  status: consentRequestStatusEnum("status").default("pending").notNull(),
  ngoNote: text("ngo_note"),
  requestedAt: timestamp("requested_at").defaultNow(),
  respondedAt: timestamp("responded_at"),
  expiresAt: timestamp("expires_at"),
});

// NGO Volunteer Invite Links - for inviting delivery agents
export const ngoInviteLinks = pgTable("ngo_invite_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ngoProfileId: varchar("ngo_profile_id").notNull().references(() => ngoProfiles.id),
  code: varchar("code").notNull().unique(),
  label: varchar("label"),
  maxUses: integer("max_uses"),
  usedCount: integer("used_count").default(0),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Monetary donation status enum
export const monetaryDonationStatusEnum = pgEnum("monetary_donation_status", ["pending", "completed", "failed", "expired", "refunded"]);

// Monetary Donations - financial contributions from donors to NGOs
export const monetaryDonations = pgTable("monetary_donations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  donorProfileId: varchar("donor_profile_id").notNull().references(() => userProfiles.id),
  ngoProfileId: varchar("ngo_profile_id").notNull().references(() => ngoProfiles.id),
  amount: integer("amount").notNull(),
  currency: varchar("currency").default("inr").notNull(),
  status: monetaryDonationStatusEnum("status").default("pending").notNull(),
  stripePaymentIntentId: varchar("stripe_payment_intent_id"),
  stripeCheckoutSessionId: varchar("stripe_checkout_session_id"),
  message: text("message"),
  isAnonymous: boolean("is_anonymous").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Relations
export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
  user: one(users, {
    fields: [userProfiles.userId],
    references: [users.id],
  }),
}));

export const ngoProfilesRelations = relations(ngoProfiles, ({ one, many }) => ({
  userProfile: one(userProfiles, {
    fields: [ngoProfiles.userProfileId],
    references: [userProfiles.id],
  }),
  donations: many(donations),
  distributionEvents: many(distributionEvents),
}));

export const deliveryAgentProfilesRelations = relations(deliveryAgentProfiles, ({ one, many }) => ({
  userProfile: one(userProfiles, {
    fields: [deliveryAgentProfiles.userProfileId],
    references: [userProfiles.id],
  }),
  tasks: many(deliveryTasks),
}));

export const donationsRelations = relations(donations, ({ one }) => ({
  donorProfile: one(userProfiles, {
    fields: [donations.donorProfileId],
    references: [userProfiles.id],
  }),
  ngoProfile: one(ngoProfiles, {
    fields: [donations.ngoProfileId],
    references: [ngoProfiles.id],
  }),
}));

export const deliveryTasksRelations = relations(deliveryTasks, ({ one }) => ({
  donation: one(donations, {
    fields: [deliveryTasks.donationId],
    references: [donations.id],
  }),
  deliveryAgentProfile: one(deliveryAgentProfiles, {
    fields: [deliveryTasks.deliveryAgentProfileId],
    references: [deliveryAgentProfiles.id],
  }),
  ngoProfile: one(ngoProfiles, {
    fields: [deliveryTasks.ngoProfileId],
    references: [ngoProfiles.id],
  }),
}));

export const distributionEventsRelations = relations(distributionEvents, ({ one }) => ({
  ngoProfile: one(ngoProfiles, {
    fields: [distributionEvents.ngoProfileId],
    references: [ngoProfiles.id],
  }),
}));

export const ngoConsentRequestsRelations = relations(ngoConsentRequests, ({ one }) => ({
  donation: one(donations, {
    fields: [ngoConsentRequests.donationId],
    references: [donations.id],
  }),
  donorProfile: one(userProfiles, {
    fields: [ngoConsentRequests.donorProfileId],
    references: [userProfiles.id],
  }),
  ngoProfile: one(ngoProfiles, {
    fields: [ngoConsentRequests.ngoProfileId],
    references: [ngoProfiles.id],
  }),
}));

// Zod Schemas for validation
export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({ id: true, createdAt: true });
export const insertNgoProfileSchema = createInsertSchema(ngoProfiles).omit({ id: true, createdAt: true });
export const insertDeliveryAgentProfileSchema = createInsertSchema(deliveryAgentProfiles).omit({ id: true, createdAt: true });
export const insertDonationSchema = createInsertSchema(donations).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDeliveryTaskSchema = createInsertSchema(deliveryTasks).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDistributionEventSchema = createInsertSchema(distributionEvents).omit({ id: true, createdAt: true });
export const insertAreaSchema = createInsertSchema(areas).omit({ id: true, createdAt: true });
export const insertNgoConsentRequestSchema = createInsertSchema(ngoConsentRequests).omit({ id: true, requestedAt: true });
export const insertNgoInviteLinkSchema = createInsertSchema(ngoInviteLinks).omit({ id: true, createdAt: true, usedCount: true });
export const insertMonetaryDonationSchema = createInsertSchema(monetaryDonations).omit({ id: true, createdAt: true });

// Types
export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type NgoProfile = typeof ngoProfiles.$inferSelect;
export type InsertNgoProfile = z.infer<typeof insertNgoProfileSchema>;
export type DeliveryAgentProfile = typeof deliveryAgentProfiles.$inferSelect;
export type InsertDeliveryAgentProfile = z.infer<typeof insertDeliveryAgentProfileSchema>;
export type Donation = typeof donations.$inferSelect;
export type InsertDonation = z.infer<typeof insertDonationSchema>;
export type DeliveryTask = typeof deliveryTasks.$inferSelect;
export type InsertDeliveryTask = z.infer<typeof insertDeliveryTaskSchema>;
export type DistributionEvent = typeof distributionEvents.$inferSelect;
export type InsertDistributionEvent = z.infer<typeof insertDistributionEventSchema>;
export type Area = typeof areas.$inferSelect;
export type InsertArea = z.infer<typeof insertAreaSchema>;
export type NgoConsentRequest = typeof ngoConsentRequests.$inferSelect;
export type InsertNgoConsentRequest = z.infer<typeof insertNgoConsentRequestSchema>;
export type ConsentRequestStatus = "pending" | "approved" | "denied" | "expired";
export type NgoInviteLink = typeof ngoInviteLinks.$inferSelect;
export type InsertNgoInviteLink = z.infer<typeof insertNgoInviteLinkSchema>;
export type VolunteerVisibility = "exclusive" | "open";
export type MonetaryDonation = typeof monetaryDonations.$inferSelect;
export type InsertMonetaryDonation = z.infer<typeof insertMonetaryDonationSchema>;
export type MonetaryDonationStatus = "pending" | "completed" | "failed" | "expired" | "refunded";

// Enum types for frontend
export type UserRole = "donor" | "ngo" | "delivery_agent";
export type DonationStatus = "listed" | "assigned" | "collected" | "delivered" | "in_warehouse" | "distributed" | "expired";
export type ItemCondition = "usable" | "near_expiry" | "fragile";
export type ItemCategory = "clothing" | "food" | "essentials" | "household" | "other";
export type TaskStatus = "pending" | "accepted" | "in_progress" | "completed" | "cancelled";
export type WarehouseReceiptStatus = "received" | "partially_usable" | "unusable";
export type Priority = "low" | "medium" | "high";
export type AssignmentType = "unassigned" | "ngo_assigned" | "self_claimed";
export type EventStatus = "scheduled" | "completed";
