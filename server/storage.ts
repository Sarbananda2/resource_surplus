import { 
  users, 
  userProfiles, 
  ngoProfiles, 
  deliveryAgentProfiles,
  donations,
  deliveryTasks,
  distributionEvents,
  areas,
  ngoConsentRequests,
  ngoInviteLinks,
  monetaryDonations,
  type User, 
  type UpsertUser,
  type UserProfile,
  type InsertUserProfile,
  type NgoProfile,
  type InsertNgoProfile,
  type DeliveryAgentProfile,
  type InsertDeliveryAgentProfile,
  type Donation,
  type InsertDonation,
  type DeliveryTask,
  type InsertDeliveryTask,
  type DistributionEvent,
  type InsertDistributionEvent,
  type Area,
  type InsertArea,
  type NgoConsentRequest,
  type InsertNgoConsentRequest,
  type ConsentRequestStatus,
  type NgoInviteLink,
  type InsertNgoInviteLink,
  type MonetaryDonation,
  type InsertMonetaryDonation,
  type AssignmentType
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, isNull, ne, desc, inArray, ilike, sql } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // User Profiles
  getUserProfile(userId: string): Promise<UserProfile | undefined>;
  getUserProfileById(id: string): Promise<UserProfile | undefined>;
  createUserProfile(profile: InsertUserProfile): Promise<UserProfile>;
  updateUserProfile(id: string, updates: Partial<UserProfile>): Promise<UserProfile | undefined>;
  
  // NGO Profiles
  getNgoProfile(userProfileId: string): Promise<NgoProfile | undefined>;
  createNgoProfile(profile: InsertNgoProfile): Promise<NgoProfile>;
  updateNgoProfile(id: string, updates: Partial<NgoProfile>): Promise<NgoProfile | undefined>;
  getAllNgoProfiles(): Promise<NgoProfile[]>;
  
  // Delivery Agent Profiles
  getDeliveryAgentProfile(userProfileId: string): Promise<DeliveryAgentProfile | undefined>;
  getDeliveryAgentProfileById(id: string): Promise<DeliveryAgentProfile | undefined>;
  createDeliveryAgentProfile(profile: InsertDeliveryAgentProfile): Promise<DeliveryAgentProfile>;
  
  // Donations
  getDonation(id: string): Promise<Donation | undefined>;
  getDonationsByDonor(donorProfileId: string): Promise<Donation[]>;
  getAvailableDonations(): Promise<Donation[]>;
  getDonationsByNgo(ngoProfileId: string, statuses?: string[]): Promise<Donation[]>;
  getWarehouseDonations(ngoProfileId: string): Promise<Donation[]>;
  getDistributedDonations(ngoProfileId: string): Promise<Donation[]>;
  createDonation(donation: InsertDonation): Promise<Donation>;
  updateDonation(id: string, updates: Partial<Donation>): Promise<Donation | undefined>;
  
  // Delivery Tasks
  getDeliveryTask(id: string): Promise<DeliveryTask | undefined>;
  getDeliveryTaskByDonationId(donationId: string): Promise<DeliveryTask | undefined>;
  getAvailableTasks(): Promise<DeliveryTask[]>;
  getTasksByAgent(agentProfileId: string, statuses?: string[]): Promise<DeliveryTask[]>;
  getCompletedTasksByAgent(agentProfileId: string): Promise<DeliveryTask[]>;
  createDeliveryTask(task: InsertDeliveryTask): Promise<DeliveryTask>;
  updateDeliveryTask(id: string, updates: Partial<DeliveryTask>): Promise<DeliveryTask | undefined>;
  
  // Distribution Events
  getDistributionEventsByNgo(ngoProfileId: string): Promise<DistributionEvent[]>;
  createDistributionEvent(event: InsertDistributionEvent): Promise<DistributionEvent>;
  updateDistributionEvent(id: string, updates: Partial<DistributionEvent>): Promise<DistributionEvent | undefined>;
  
  // Areas
  searchAreas(query: string): Promise<Area[]>;
  getAreaByName(name: string): Promise<Area | undefined>;
  upsertArea(area: InsertArea): Promise<Area>;
  
  // NGO Consent Requests
  getConsentRequest(id: string): Promise<NgoConsentRequest | undefined>;
  getConsentRequestByDonation(donationId: string, donorProfileId: string): Promise<NgoConsentRequest | undefined>;
  getConsentRequestsByNgo(ngoProfileId: string, status?: ConsentRequestStatus): Promise<NgoConsentRequest[]>;
  getConsentRequestsByDonor(donorProfileId: string): Promise<NgoConsentRequest[]>;
  createConsentRequest(request: InsertNgoConsentRequest): Promise<NgoConsentRequest>;
  updateConsentRequest(id: string, updates: Partial<NgoConsentRequest>): Promise<NgoConsentRequest | undefined>;
  
  // Extended queries for detailed views
  getNgoProfileById(id: string): Promise<NgoProfile | undefined>;
  getDistributionEvent(id: string): Promise<DistributionEvent | undefined>;
  
  // NGO Invite Links
  getInviteLink(id: string): Promise<NgoInviteLink | undefined>;
  getInviteLinkByCode(code: string): Promise<NgoInviteLink | undefined>;
  getInviteLinksByNgo(ngoProfileId: string): Promise<NgoInviteLink[]>;
  createInviteLink(link: InsertNgoInviteLink): Promise<NgoInviteLink>;
  updateInviteLink(id: string, updates: Partial<NgoInviteLink>): Promise<NgoInviteLink | undefined>;
  incrementInviteLinkUsage(id: string): Promise<void>;
  
  // Volunteer management
  getVolunteersByNgo(ngoProfileId: string): Promise<DeliveryAgentProfile[]>;
  getAvailableVolunteersForNgo(ngoProfileId: string): Promise<DeliveryAgentProfile[]>;
  getAvailableTasksForAgent(agentProfile: DeliveryAgentProfile): Promise<DeliveryTask[]>;
  updateDeliveryAgentProfile(id: string, updates: Partial<DeliveryAgentProfile>): Promise<DeliveryAgentProfile | undefined>;
  assignAgentToTask(taskId: string, agentProfileId: string, assignmentType: AssignmentType): Promise<DeliveryTask | undefined>;
  getTasksByNgo(ngoProfileId: string): Promise<DeliveryTask[]>;
  unassignAgentFromActiveTasks(agentProfileId: string): Promise<number>;
  getActiveTasksForAgent(agentProfileId: string): Promise<DeliveryTask[]>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // User Profiles
  async getUserProfile(userId: string): Promise<UserProfile | undefined> {
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
    return profile;
  }

  async getUserProfileById(id: string): Promise<UserProfile | undefined> {
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.id, id));
    return profile;
  }

  async createUserProfile(profile: InsertUserProfile): Promise<UserProfile> {
    const [created] = await db.insert(userProfiles).values(profile).returning();
    return created;
  }

  async updateUserProfile(id: string, updates: Partial<UserProfile>): Promise<UserProfile | undefined> {
    const [updated] = await db
      .update(userProfiles)
      .set(updates)
      .where(eq(userProfiles.id, id))
      .returning();
    return updated;
  }

  // NGO Profiles
  async getNgoProfile(userProfileId: string): Promise<NgoProfile | undefined> {
    const [profile] = await db.select().from(ngoProfiles).where(eq(ngoProfiles.userProfileId, userProfileId));
    return profile;
  }

  async createNgoProfile(profile: InsertNgoProfile): Promise<NgoProfile> {
    const [created] = await db.insert(ngoProfiles).values(profile).returning();
    return created;
  }

  async updateNgoProfile(id: string, updates: Partial<NgoProfile>): Promise<NgoProfile | undefined> {
    const [updated] = await db
      .update(ngoProfiles)
      .set(updates)
      .where(eq(ngoProfiles.id, id))
      .returning();
    return updated;
  }

  async getAllNgoProfiles(): Promise<NgoProfile[]> {
    return db.select().from(ngoProfiles);
  }

  // Delivery Agent Profiles
  async getDeliveryAgentProfile(userProfileId: string): Promise<DeliveryAgentProfile | undefined> {
    const [profile] = await db.select().from(deliveryAgentProfiles).where(eq(deliveryAgentProfiles.userProfileId, userProfileId));
    return profile;
  }

  async getDeliveryAgentProfileById(id: string): Promise<DeliveryAgentProfile | undefined> {
    const [profile] = await db.select().from(deliveryAgentProfiles).where(eq(deliveryAgentProfiles.id, id));
    return profile;
  }

  async createDeliveryAgentProfile(profile: InsertDeliveryAgentProfile): Promise<DeliveryAgentProfile> {
    const [created] = await db.insert(deliveryAgentProfiles).values(profile).returning();
    return created;
  }

  // Donations
  async getDonation(id: string): Promise<Donation | undefined> {
    const [donation] = await db.select().from(donations).where(eq(donations.id, id));
    return donation;
  }

  async getDonationsByDonor(donorProfileId: string): Promise<Donation[]> {
    return db
      .select()
      .from(donations)
      .where(eq(donations.donorProfileId, donorProfileId))
      .orderBy(desc(donations.createdAt));
  }

  async getAvailableDonations(): Promise<Donation[]> {
    return db
      .select()
      .from(donations)
      .where(eq(donations.status, "listed"))
      .orderBy(desc(donations.createdAt));
  }

  async getDonationsByNgo(ngoProfileId: string, statuses?: string[]): Promise<Donation[]> {
    if (statuses && statuses.length > 0) {
      return db
        .select()
        .from(donations)
        .where(and(
          eq(donations.ngoProfileId, ngoProfileId),
          inArray(donations.status, statuses as any)
        ))
        .orderBy(desc(donations.createdAt));
    }
    return db
      .select()
      .from(donations)
      .where(eq(donations.ngoProfileId, ngoProfileId))
      .orderBy(desc(donations.createdAt));
  }

  async getWarehouseDonations(ngoProfileId: string): Promise<Donation[]> {
    return db
      .select()
      .from(donations)
      .where(and(
        eq(donations.ngoProfileId, ngoProfileId),
        eq(donations.status, "in_warehouse")
      ))
      .orderBy(desc(donations.createdAt));
  }

  async getDistributedDonations(ngoProfileId: string): Promise<Donation[]> {
    return db
      .select()
      .from(donations)
      .where(and(
        eq(donations.ngoProfileId, ngoProfileId),
        eq(donations.status, "distributed")
      ))
      .orderBy(desc(donations.distributedAt));
  }

  async createDonation(donation: InsertDonation): Promise<Donation> {
    const [created] = await db.insert(donations).values(donation).returning();
    return created;
  }

  async updateDonation(id: string, updates: Partial<Donation>): Promise<Donation | undefined> {
    const [updated] = await db
      .update(donations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(donations.id, id))
      .returning();
    return updated;
  }

  // Delivery Tasks
  async getDeliveryTask(id: string): Promise<DeliveryTask | undefined> {
    const [task] = await db.select().from(deliveryTasks).where(eq(deliveryTasks.id, id));
    return task;
  }

  async getDeliveryTaskByDonationId(donationId: string): Promise<DeliveryTask | undefined> {
    const [task] = await db
      .select()
      .from(deliveryTasks)
      .where(eq(deliveryTasks.donationId, donationId))
      .orderBy(desc(deliveryTasks.createdAt))
      .limit(1);
    return task;
  }

  async getAvailableTasks(): Promise<DeliveryTask[]> {
    return db
      .select()
      .from(deliveryTasks)
      .where(eq(deliveryTasks.status, "pending"))
      .orderBy(desc(deliveryTasks.createdAt));
  }

  async getTasksByAgent(agentProfileId: string, statuses?: string[]): Promise<DeliveryTask[]> {
    if (statuses && statuses.length > 0) {
      return db
        .select()
        .from(deliveryTasks)
        .where(and(
          eq(deliveryTasks.deliveryAgentProfileId, agentProfileId),
          inArray(deliveryTasks.status, statuses as any)
        ))
        .orderBy(desc(deliveryTasks.createdAt));
    }
    return db
      .select()
      .from(deliveryTasks)
      .where(eq(deliveryTasks.deliveryAgentProfileId, agentProfileId))
      .orderBy(desc(deliveryTasks.createdAt));
  }

  async getCompletedTasksByAgent(agentProfileId: string): Promise<DeliveryTask[]> {
    return db
      .select()
      .from(deliveryTasks)
      .where(and(
        eq(deliveryTasks.deliveryAgentProfileId, agentProfileId),
        eq(deliveryTasks.status, "completed")
      ))
      .orderBy(desc(deliveryTasks.createdAt));
  }

  async createDeliveryTask(task: InsertDeliveryTask): Promise<DeliveryTask> {
    const [created] = await db.insert(deliveryTasks).values(task).returning();
    return created;
  }

  async updateDeliveryTask(id: string, updates: Partial<DeliveryTask>): Promise<DeliveryTask | undefined> {
    const [updated] = await db
      .update(deliveryTasks)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(deliveryTasks.id, id))
      .returning();
    return updated;
  }

  // Distribution Events
  async getDistributionEventsByNgo(ngoProfileId: string): Promise<DistributionEvent[]> {
    return db
      .select()
      .from(distributionEvents)
      .where(eq(distributionEvents.ngoProfileId, ngoProfileId))
      .orderBy(desc(distributionEvents.createdAt));
  }

  async createDistributionEvent(event: InsertDistributionEvent): Promise<DistributionEvent> {
    const [created] = await db.insert(distributionEvents).values(event).returning();
    return created;
  }

  async updateDistributionEvent(id: string, updates: Partial<DistributionEvent>): Promise<DistributionEvent | undefined> {
    const [updated] = await db
      .update(distributionEvents)
      .set(updates)
      .where(eq(distributionEvents.id, id))
      .returning();
    return updated;
  }

  // Areas
  async searchAreas(query: string): Promise<Area[]> {
    if (!query || query.length < 2) return [];
    return db
      .select()
      .from(areas)
      .where(ilike(areas.displayName, `%${query}%`))
      .orderBy(desc(areas.usageCount))
      .limit(10);
  }

  async getAreaByName(name: string): Promise<Area | undefined> {
    const normalized = name.toLowerCase().trim();
    const [area] = await db
      .select()
      .from(areas)
      .where(ilike(areas.name, normalized));
    return area;
  }

  async upsertArea(areaData: InsertArea): Promise<Area> {
    const normalized = areaData.name.toLowerCase().trim();
    const existing = await this.getAreaByName(normalized);
    
    if (existing) {
      const [updated] = await db
        .update(areas)
        .set({ usageCount: sql`${areas.usageCount} + 1` })
        .where(eq(areas.id, existing.id))
        .returning();
      return updated;
    }
    
    const [created] = await db
      .insert(areas)
      .values({ ...areaData, name: normalized })
      .returning();
    return created;
  }

  // NGO Consent Requests
  async getConsentRequest(id: string): Promise<NgoConsentRequest | undefined> {
    const [request] = await db.select().from(ngoConsentRequests).where(eq(ngoConsentRequests.id, id));
    return request;
  }

  async getConsentRequestByDonation(donationId: string, donorProfileId: string): Promise<NgoConsentRequest | undefined> {
    const [request] = await db
      .select()
      .from(ngoConsentRequests)
      .where(and(
        eq(ngoConsentRequests.donationId, donationId),
        eq(ngoConsentRequests.donorProfileId, donorProfileId)
      ))
      .orderBy(desc(ngoConsentRequests.requestedAt))
      .limit(1);
    return request;
  }

  async getConsentRequestsByNgo(ngoProfileId: string, status?: ConsentRequestStatus): Promise<NgoConsentRequest[]> {
    if (status) {
      return db
        .select()
        .from(ngoConsentRequests)
        .where(and(
          eq(ngoConsentRequests.ngoProfileId, ngoProfileId),
          eq(ngoConsentRequests.status, status)
        ))
        .orderBy(desc(ngoConsentRequests.requestedAt));
    }
    return db
      .select()
      .from(ngoConsentRequests)
      .where(eq(ngoConsentRequests.ngoProfileId, ngoProfileId))
      .orderBy(desc(ngoConsentRequests.requestedAt));
  }

  async getConsentRequestsByDonor(donorProfileId: string): Promise<NgoConsentRequest[]> {
    return db
      .select()
      .from(ngoConsentRequests)
      .where(eq(ngoConsentRequests.donorProfileId, donorProfileId))
      .orderBy(desc(ngoConsentRequests.requestedAt));
  }

  async createConsentRequest(request: InsertNgoConsentRequest): Promise<NgoConsentRequest> {
    const [created] = await db.insert(ngoConsentRequests).values(request).returning();
    return created;
  }

  async updateConsentRequest(id: string, updates: Partial<NgoConsentRequest>): Promise<NgoConsentRequest | undefined> {
    const [updated] = await db
      .update(ngoConsentRequests)
      .set(updates)
      .where(eq(ngoConsentRequests.id, id))
      .returning();
    return updated;
  }

  // Extended queries
  async getNgoProfileById(id: string): Promise<NgoProfile | undefined> {
    const [profile] = await db.select().from(ngoProfiles).where(eq(ngoProfiles.id, id));
    return profile;
  }

  async getDistributionEvent(id: string): Promise<DistributionEvent | undefined> {
    const [event] = await db.select().from(distributionEvents).where(eq(distributionEvents.id, id));
    return event;
  }

  // NGO Invite Links
  async getInviteLink(id: string): Promise<NgoInviteLink | undefined> {
    const [link] = await db.select().from(ngoInviteLinks).where(eq(ngoInviteLinks.id, id));
    return link;
  }

  async getInviteLinkByCode(code: string): Promise<NgoInviteLink | undefined> {
    const [link] = await db.select().from(ngoInviteLinks).where(eq(ngoInviteLinks.code, code));
    return link;
  }

  async getInviteLinksByNgo(ngoProfileId: string): Promise<NgoInviteLink[]> {
    return db
      .select()
      .from(ngoInviteLinks)
      .where(eq(ngoInviteLinks.ngoProfileId, ngoProfileId))
      .orderBy(desc(ngoInviteLinks.createdAt));
  }

  async createInviteLink(link: InsertNgoInviteLink): Promise<NgoInviteLink> {
    const [created] = await db.insert(ngoInviteLinks).values(link).returning();
    return created;
  }

  async updateInviteLink(id: string, updates: Partial<NgoInviteLink>): Promise<NgoInviteLink | undefined> {
    const [updated] = await db
      .update(ngoInviteLinks)
      .set(updates)
      .where(eq(ngoInviteLinks.id, id))
      .returning();
    return updated;
  }

  async incrementInviteLinkUsage(id: string): Promise<void> {
    await db
      .update(ngoInviteLinks)
      .set({ usedCount: sql`${ngoInviteLinks.usedCount} + 1` })
      .where(eq(ngoInviteLinks.id, id));
  }

  // Volunteer management
  async getVolunteersByNgo(ngoProfileId: string): Promise<DeliveryAgentProfile[]> {
    return db
      .select()
      .from(deliveryAgentProfiles)
      .where(eq(deliveryAgentProfiles.affiliatedNgoId, ngoProfileId))
      .orderBy(desc(deliveryAgentProfiles.createdAt));
  }

  async getAvailableTasksForAgent(agentProfile: DeliveryAgentProfile): Promise<DeliveryTask[]> {
    // Agents must be approved and affiliated with an NGO to see any tasks
    if (agentProfile.approvalStatus !== "approved" || !agentProfile.affiliatedNgoId) {
      return [];
    }
    
    // Show only tasks from their affiliated NGO that are either:
    // - Unassigned tasks from their NGO
    // - Tasks specifically assigned to this agent
    return db
      .select()
      .from(deliveryTasks)
      .where(and(
        eq(deliveryTasks.status, "pending"),
        eq(deliveryTasks.ngoProfileId, agentProfile.affiliatedNgoId),
        or(
          // Unassigned tasks from their NGO
          and(
            isNull(deliveryTasks.deliveryAgentProfileId),
            eq(deliveryTasks.assignmentType, "unassigned")
          ),
          // Tasks specifically assigned to this agent
          eq(deliveryTasks.deliveryAgentProfileId, agentProfile.id)
        )
      ))
      .orderBy(desc(deliveryTasks.createdAt));
  }

  async updateDeliveryAgentProfile(id: string, updates: Partial<DeliveryAgentProfile>): Promise<DeliveryAgentProfile | undefined> {
    const [updated] = await db
      .update(deliveryAgentProfiles)
      .set(updates)
      .where(eq(deliveryAgentProfiles.id, id))
      .returning();
    return updated;
  }

  async getAvailableVolunteersForNgo(ngoProfileId: string): Promise<DeliveryAgentProfile[]> {
    return db
      .select()
      .from(deliveryAgentProfiles)
      .where(and(
        eq(deliveryAgentProfiles.affiliatedNgoId, ngoProfileId),
        eq(deliveryAgentProfiles.approvalStatus, "approved"),
        eq(deliveryAgentProfiles.isAvailable, true)
      ))
      .orderBy(desc(deliveryAgentProfiles.createdAt));
  }

  async assignAgentToTask(taskId: string, agentProfileId: string, assignmentType: AssignmentType): Promise<DeliveryTask | undefined> {
    const [updated] = await db
      .update(deliveryTasks)
      .set({
        deliveryAgentProfileId: agentProfileId,
        assignmentType,
        status: "accepted",
        updatedAt: new Date(),
      })
      .where(eq(deliveryTasks.id, taskId))
      .returning();
    return updated;
  }

  async getTasksByNgo(ngoProfileId: string): Promise<DeliveryTask[]> {
    return db
      .select()
      .from(deliveryTasks)
      .where(eq(deliveryTasks.ngoProfileId, ngoProfileId))
      .orderBy(desc(deliveryTasks.createdAt));
  }

  async unassignAgentFromActiveTasks(agentProfileId: string): Promise<number> {
    const result = await db
      .update(deliveryTasks)
      .set({
        deliveryAgentProfileId: null,
        assignmentType: "unassigned",
        status: "pending",
        updatedAt: new Date(),
      })
      .where(and(
        eq(deliveryTasks.deliveryAgentProfileId, agentProfileId),
        or(
          eq(deliveryTasks.status, "pending"),
          eq(deliveryTasks.status, "accepted")
        )
      ))
      .returning();
    return result.length;
  }

  async getActiveTasksForAgent(agentProfileId: string): Promise<DeliveryTask[]> {
    return db
      .select()
      .from(deliveryTasks)
      .where(and(
        eq(deliveryTasks.deliveryAgentProfileId, agentProfileId),
        or(
          eq(deliveryTasks.status, "pending"),
          eq(deliveryTasks.status, "accepted")
        )
      ))
      .orderBy(desc(deliveryTasks.createdAt));
  }

  // Monetary donations
  async createMonetaryDonation(donation: InsertMonetaryDonation): Promise<MonetaryDonation> {
    const [created] = await db.insert(monetaryDonations).values(donation).returning();
    return created;
  }

  async getMonetaryDonation(id: string): Promise<MonetaryDonation | undefined> {
    const [donation] = await db.select().from(monetaryDonations).where(eq(monetaryDonations.id, id));
    return donation;
  }

  async getMonetaryDonationByCheckoutSession(sessionId: string): Promise<MonetaryDonation | undefined> {
    const [donation] = await db.select().from(monetaryDonations)
      .where(eq(monetaryDonations.stripeCheckoutSessionId, sessionId));
    return donation;
  }

  async updateMonetaryDonation(id: string, updates: Partial<MonetaryDonation>): Promise<MonetaryDonation | undefined> {
    const [updated] = await db.update(monetaryDonations).set(updates).where(eq(monetaryDonations.id, id)).returning();
    return updated;
  }

  async getMonetaryDonationsByDonor(donorProfileId: string): Promise<MonetaryDonation[]> {
    return db.select().from(monetaryDonations)
      .where(eq(monetaryDonations.donorProfileId, donorProfileId))
      .orderBy(desc(monetaryDonations.createdAt));
  }

  async getMonetaryDonationsByNgo(ngoProfileId: string): Promise<MonetaryDonation[]> {
    return db.select().from(monetaryDonations)
      .where(eq(monetaryDonations.ngoProfileId, ngoProfileId))
      .orderBy(desc(monetaryDonations.createdAt));
  }

  async getTotalMonetaryDonationsByNgo(ngoProfileId: string): Promise<number> {
    const result = await db.select({ total: sql<number>`COALESCE(SUM(amount), 0)` })
      .from(monetaryDonations)
      .where(and(
        eq(monetaryDonations.ngoProfileId, ngoProfileId),
        eq(monetaryDonations.status, "completed")
      ));
    return result[0]?.total || 0;
  }

  async deleteMonetaryDonation(id: string): Promise<void> {
    await db.delete(monetaryDonations).where(eq(monetaryDonations.id, id));
  }
}

export const storage = new DatabaseStorage();
