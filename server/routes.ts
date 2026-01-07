import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes, isAuthenticated, registerFirebaseRoutes } from "./replit_integrations/auth";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";

const VALID_TRANSPORT_TYPES = ["bicycle", "motorcycle", "car", "van", "truck"] as const;
const VALID_LOAD_CAPACITIES = ["small", "medium", "large", "xlarge"] as const;

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup authentication
  await setupAuth(app);
  registerAuthRoutes(app);
  registerFirebaseRoutes(app);
  registerObjectStorageRoutes(app);

  // Search areas for autocomplete suggestions
  app.get("/api/location/suggest", async (req, res) => {
    try {
      const query = (req.query.q as string) || "";
      const areas = await storage.searchAreas(query);
      res.json({ 
        areas: areas.map(a => ({ 
          id: a.id, 
          name: a.displayName,
          region: a.region 
        }))
      });
    } catch (error) {
      console.error("Area search error:", error);
      res.status(500).json({ error: "Failed to search areas" });
    }
  });

  // Check if an area is in the catalog
  app.get("/api/location/validate", async (req, res) => {
    try {
      const name = (req.query.name as string) || "";
      const area = await storage.getAreaByName(name);
      res.json({ isValid: !!area, area: area?.displayName });
    } catch (error) {
      console.error("Area validation error:", error);
      res.status(500).json({ error: "Failed to validate area" });
    }
  });

  // Reverse geocoding endpoint - returns area name only (privacy-safe)
  // Uses Google Maps Geocoding API (Wave 1 migration from OpenStreetMap Nominatim)
  app.post("/api/location/reverse-geocode", async (req, res) => {
    try {
      const { latitude, longitude } = req.body;

      if (!latitude || !longitude) {
        return res.status(400).json({ error: "Latitude and longitude are required" });
      }

      const apiKey = process.env.GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        console.error("GOOGLE_MAPS_API_KEY not configured");
        return res.status(500).json({ error: "Geocoding service not configured" });
      }

      // Privacy protection: Snap coordinates to ~1km grid (2 decimal places)
      // This prevents exact location disclosure to external services
      const snappedLat = Math.round(latitude * 100) / 100;
      const snappedLon = Math.round(longitude * 100) / 100;

      // Use Google Maps Geocoding API
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${snappedLat},${snappedLon}&result_type=sublocality|locality|administrative_area_level_2&key=${apiKey}`
      );

      if (!response.ok) {
        throw new Error("Geocoding service unavailable");
      }

      const data = await response.json();
      
      // Handle Google API errors
      if (data.status === "REQUEST_DENIED") {
        console.error("Google Maps API request denied:", data.error_message);
        return res.status(500).json({ error: "Geocoding service configuration error" });
      }
      
      if (data.status === "OVER_QUERY_LIMIT") {
        console.error("Google Maps API quota exceeded");
        return res.status(503).json({ error: "Geocoding service temporarily unavailable" });
      }

      if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
        console.error("Google Maps API error:", data.status, data.error_message);
        throw new Error("Geocoding service error");
      }

      // Extract area-level information from Google's response (privacy-safe)
      let areaName = "Unknown Area";
      let region = "";
      let country = "";

      if (data.results && data.results.length > 0) {
        const addressComponents = data.results[0].address_components || [];
        
        // Find area name - prioritize sublocality, then locality, then administrative areas
        const areaTypes = [
          "sublocality_level_1",
          "sublocality",
          "neighborhood",
          "locality",
          "administrative_area_level_2"
        ];
        
        for (const type of areaTypes) {
          const component = addressComponents.find((c: any) => c.types.includes(type));
          if (component) {
            areaName = component.long_name;
            break;
          }
        }

        // Get region for context
        const regionComponent = addressComponents.find((c: any) => 
          c.types.includes("locality") || 
          c.types.includes("administrative_area_level_1") ||
          c.types.includes("administrative_area_level_2")
        );
        if (regionComponent && regionComponent.long_name !== areaName) {
          region = regionComponent.long_name;
        }

        // Get country
        const countryComponent = addressComponents.find((c: any) => c.types.includes("country"));
        if (countryComponent) {
          country = countryComponent.long_name;
        }
      }

      // Auto-seed area into catalog for future autocomplete
      if (areaName !== "Unknown Area") {
        try {
          await storage.upsertArea({
            name: areaName,
            displayName: areaName,
            region: region,
            country: country,
          });
        } catch (seedError) {
          console.log("Area seeding skipped:", seedError);
        }
      }

      // Return only the area name - no street addresses or exact coordinates
      res.json({ area: areaName, isValidated: true });
    } catch (error) {
      console.error("Reverse geocoding error:", error);
      res.status(500).json({ error: "Failed to get location" });
    }
  });

  // Get current user profile
  app.get("/api/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userProfile = await storage.getUserProfile(userId);
      
      if (!userProfile) {
        return res.json({ userProfile: null });
      }

      let ngoProfile = null;
      let deliveryAgentProfile = null;

      if (userProfile.role === "ngo") {
        ngoProfile = await storage.getNgoProfile(userProfile.id);
      } else if (userProfile.role === "delivery_agent") {
        deliveryAgentProfile = await storage.getDeliveryAgentProfile(userProfile.id);
      }

      res.json({ userProfile, ngoProfile, deliveryAgentProfile });
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  });

  // Create user profile (role selection)
  app.post("/api/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { role } = req.body;

      if (!["donor", "ngo", "delivery_agent"].includes(role)) {
        return res.status(400).json({ error: "Invalid role" });
      }

      const existingProfile = await storage.getUserProfile(userId);
      if (existingProfile) {
        return res.status(400).json({ error: "Profile already exists" });
      }

      const userProfile = await storage.createUserProfile({
        userId,
        role,
        isOnboarded: role === "donor", // Donors don't need additional onboarding
      });

      res.json({ userProfile });
    } catch (error) {
      console.error("Error creating profile:", error);
      res.status(500).json({ error: "Failed to create profile" });
    }
  });

  // Update user profile
  const updateProfileSchema = z.object({
    displayName: z.string().min(1).optional(),
    phone: z.string().optional(),
    area: z.string().optional(),
    avatarUrl: z.string().optional(),
  });

  app.patch("/api/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userProfile = await storage.getUserProfile(userId);

      if (!userProfile) {
        return res.status(404).json({ error: "Profile not found" });
      }

      const parseResult = updateProfileSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Invalid profile data" });
      }

      const { displayName, phone, area, avatarUrl } = parseResult.data;

      const updatedProfile = await storage.updateUserProfile(userProfile.id, {
        displayName,
        phone,
        area,
        avatarUrl,
      });

      res.json({ userProfile: updatedProfile });
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  // Update NGO profile
  const updateNgoProfileSchema = z.object({
    organizationName: z.string().min(1).optional(),
    description: z.string().optional(),
    warehouseAddress: z.string().optional(),
    warehouseArea: z.string().optional(),
    categories: z.array(z.string()).optional(),
  });

  app.patch("/api/ngo/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userProfile = await storage.getUserProfile(userId);

      if (!userProfile || userProfile.role !== "ngo") {
        return res.status(403).json({ error: "Not authorized" });
      }

      const ngoProfile = await storage.getNgoProfile(userProfile.id);
      if (!ngoProfile) {
        return res.status(404).json({ error: "NGO profile not found" });
      }

      const parseResult = updateNgoProfileSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Invalid NGO profile data" });
      }

      const updatedProfile = await storage.updateNgoProfile(ngoProfile.id, parseResult.data);
      res.json({ ngoProfile: updatedProfile });
    } catch (error) {
      console.error("Error updating NGO profile:", error);
      res.status(500).json({ error: "Failed to update NGO profile" });
    }
  });

  // Update Delivery Agent profile
  const updateDeliveryAgentProfileSchema = z.object({
    transportType: z.enum(VALID_TRANSPORT_TYPES).optional(),
    loadCapacity: z.enum(VALID_LOAD_CAPACITIES).optional(),
    operatingArea: z.string().optional(),
    availabilityStart: z.string().optional(),
    availabilityEnd: z.string().optional(),
    isAvailable: z.boolean().optional(),
  });

  app.patch("/api/delivery-agent/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userProfile = await storage.getUserProfile(userId);

      if (!userProfile || userProfile.role !== "delivery_agent") {
        return res.status(403).json({ error: "Not authorized" });
      }

      const agentProfile = await storage.getDeliveryAgentProfile(userProfile.id);
      if (!agentProfile) {
        return res.status(404).json({ error: "Delivery agent profile not found" });
      }

      const parseResult = updateDeliveryAgentProfileSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Invalid delivery agent profile data" });
      }

      const updatedProfile = await storage.updateDeliveryAgentProfile(agentProfile.id, parseResult.data);
      res.json({ deliveryAgentProfile: updatedProfile });
    } catch (error) {
      console.error("Error updating delivery agent profile:", error);
      res.status(500).json({ error: "Failed to update delivery agent profile" });
    }
  });

  // Get profile stats
  app.get("/api/profile/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userProfile = await storage.getUserProfile(userId);

      if (!userProfile) {
        return res.status(404).json({ error: "Profile not found" });
      }

      let stats: Record<string, number> = {};

      if (userProfile.role === "donor") {
        const donations = await storage.getDonationsByDonor(userProfile.id);
        stats.donationsCount = donations.length;
        stats.completedDonationsCount = donations.filter(
          (d) => d.status === "distributed" || d.status === "in_warehouse"
        ).length;
        
        const monetaryDonations = await storage.getMonetaryDonationsByDonor(userProfile.id);
        const completedMonetary = monetaryDonations.filter(d => d.status === "completed");
        stats.totalMonetaryDonated = completedMonetary.reduce((sum, d) => sum + d.amount, 0);
      } else if (userProfile.role === "delivery_agent") {
        const agentProfile = await storage.getDeliveryAgentProfile(userProfile.id);
        if (agentProfile) {
          const tasks = await storage.getTasksByAgent(agentProfile.id);
          stats.tasksAccepted = tasks.length;
          stats.tasksCompleted = tasks.filter((t) => t.status === "completed").length;
        }
      } else if (userProfile.role === "ngo") {
        const ngoProfile = await storage.getNgoProfile(userProfile.id);
        if (ngoProfile) {
          const warehouseItems = await storage.getDonationsByNgo(ngoProfile.id, ["in_warehouse"]);
          stats.warehouseItemsCount = warehouseItems.length;
          const events = await storage.getDistributionEventsByNgo(ngoProfile.id);
          stats.distributionEventsCount = events.length;
        }
      }

      res.json(stats);
    } catch (error) {
      console.error("Error fetching profile stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // NGO Onboarding
  app.post("/api/ngo/onboard", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { organizationName, description, warehouseArea, categories } = req.body;

      const userProfile = await storage.getUserProfile(userId);
      if (!userProfile || userProfile.role !== "ngo") {
        return res.status(403).json({ error: "Not authorized" });
      }

      const ngoProfile = await storage.createNgoProfile({
        userProfileId: userProfile.id,
        organizationName,
        description,
        warehouseArea,
        categories,
      });

      await storage.updateUserProfile(userProfile.id, { isOnboarded: true });

      res.json({ ngoProfile });
    } catch (error) {
      console.error("Error onboarding NGO:", error);
      res.status(500).json({ error: "Failed to complete onboarding" });
    }
  });

  // Delivery Agent Onboarding
  const deliveryAgentOnboardSchema = z.object({
    transportType: z.enum(VALID_TRANSPORT_TYPES),
    loadCapacity: z.enum(VALID_LOAD_CAPACITIES),
    operatingArea: z.string(),
    availabilityStart: z.string().optional(),
    availabilityEnd: z.string().optional(),
  });

  app.post("/api/delivery/onboard", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const parseResult = deliveryAgentOnboardSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Invalid delivery agent data", details: parseResult.error.issues });
      }
      
      const { transportType, loadCapacity, operatingArea, availabilityStart, availabilityEnd } = parseResult.data;

      const userProfile = await storage.getUserProfile(userId);
      if (!userProfile || userProfile.role !== "delivery_agent") {
        return res.status(403).json({ error: "Not authorized" });
      }

      const agentProfile = await storage.createDeliveryAgentProfile({
        userProfileId: userProfile.id,
        transportType,
        loadCapacity,
        operatingArea,
        availabilityStart,
        availabilityEnd,
      });

      await storage.updateUserProfile(userProfile.id, { isOnboarded: true });

      res.json({ agentProfile });
    } catch (error) {
      console.error("Error onboarding delivery agent:", error);
      res.status(500).json({ error: "Failed to complete onboarding" });
    }
  });

  // Donor Donations
  app.get("/api/donations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userProfile = await storage.getUserProfile(userId);
      
      if (!userProfile || userProfile.role !== "donor") {
        return res.status(403).json({ error: "Not authorized" });
      }

      const donations = await storage.getDonationsByDonor(userProfile.id);
      res.json(donations);
    } catch (error) {
      console.error("Error fetching donations:", error);
      res.status(500).json({ error: "Failed to fetch donations" });
    }
  });

  app.post("/api/donations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userProfile = await storage.getUserProfile(userId);
      
      if (!userProfile || userProfile.role !== "donor") {
        return res.status(403).json({ error: "Not authorized" });
      }

      const { category, quantity, condition, description, area, availabilityStart, availabilityEnd } = req.body;

      const donation = await storage.createDonation({
        donorProfileId: userProfile.id,
        category,
        quantity,
        condition,
        description,
        area,
        availabilityStart: new Date(availabilityStart),
        availabilityEnd: new Date(availabilityEnd),
        status: "listed",
      });

      res.json(donation);
    } catch (error) {
      console.error("Error creating donation:", error);
      res.status(500).json({ error: "Failed to create donation" });
    }
  });

  // NGO Available Donations
  app.get("/api/ngo/available-donations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userProfile = await storage.getUserProfile(userId);
      
      if (!userProfile || userProfile.role !== "ngo") {
        return res.status(403).json({ error: "Not authorized" });
      }

      const donations = await storage.getAvailableDonations();
      res.json(donations);
    } catch (error) {
      console.error("Error fetching available donations:", error);
      res.status(500).json({ error: "Failed to fetch donations" });
    }
  });

  // NGO Accepted Donations
  app.get("/api/ngo/donations/:filter", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userProfile = await storage.getUserProfile(userId);
      
      if (!userProfile || userProfile.role !== "ngo") {
        return res.status(403).json({ error: "Not authorized" });
      }

      const ngoProfile = await storage.getNgoProfile(userProfile.id);
      if (!ngoProfile) {
        return res.status(404).json({ error: "NGO profile not found" });
      }

      const { filter } = req.params;
      let donations;
      
      if (filter === "accepted") {
        donations = await storage.getDonationsByNgo(ngoProfile.id, ["assigned", "collected", "delivered"]);
      } else if (filter === "warehouse") {
        donations = await storage.getWarehouseDonations(ngoProfile.id);
      } else if (filter === "distributed") {
        donations = await storage.getDistributedDonations(ngoProfile.id);
      } else {
        donations = await storage.getDonationsByNgo(ngoProfile.id);
      }

      res.json(donations);
    } catch (error) {
      console.error("Error fetching NGO donations:", error);
      res.status(500).json({ error: "Failed to fetch donations" });
    }
  });

  // NGO Donation Details (for drawer)
  app.get("/api/ngo/donations/:id/details", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userProfile = await storage.getUserProfile(userId);
      
      if (!userProfile || userProfile.role !== "ngo") {
        return res.status(403).json({ error: "Not authorized" });
      }

      const { id } = req.params;
      const ngoProfile = await storage.getNgoProfile(userProfile.id);
      const donation = await storage.getDonation(id);
      
      if (!donation) {
        return res.status(404).json({ error: "Donation not found" });
      }

      // Security: Only allow access if donation is listed (available) or belongs to this NGO
      if (donation.status !== "listed" && donation.ngoProfileId !== ngoProfile?.id) {
        return res.status(403).json({ error: "Not authorized to view this donation" });
      }

      // Get delivery task if exists
      const deliveryTask = await storage.getDeliveryTaskByDonationId(id);

      // Get delivery agent display name if assigned
      let agentDisplayName = null;
      if (deliveryTask?.deliveryAgentProfileId) {
        const agentProfile = await storage.getDeliveryAgentProfileById(deliveryTask.deliveryAgentProfileId);
        if (agentProfile) {
          const agentUserProfile = await storage.getUserProfileById(agentProfile.userProfileId);
          agentDisplayName = agentUserProfile?.displayName || "Delivery Agent";
        }
      }

      // Privacy: Don't expose donorProfileId to NGOs - return sanitized donation
      const sanitizedDonation = {
        id: donation.id,
        category: donation.category,
        quantity: donation.quantity,
        condition: donation.condition,
        description: donation.description,
        area: donation.area,
        availabilityStart: donation.availabilityStart,
        availabilityEnd: donation.availabilityEnd,
        status: donation.status,
        priority: donation.priority,
        ngoProfileId: donation.ngoProfileId,
        pickupProofUrl: donation.pickupProofUrl,
        deliveryProofUrl: donation.deliveryProofUrl,
        warehouseReceiptStatus: donation.warehouseReceiptStatus,
        distributionEventId: donation.distributionEventId,
        distributedAt: donation.distributedAt,
        createdAt: donation.createdAt,
        updatedAt: donation.updatedAt,
      };

      res.json({
        donation: sanitizedDonation,
        deliveryTask,
        donorDisplayName: "Anonymous Donor",
        agentDisplayName,
      });
    } catch (error) {
      console.error("Error fetching donation details:", error);
      res.status(500).json({ error: "Failed to fetch donation details" });
    }
  });

  // NGO Accept Donation
  app.post("/api/ngo/donations/:id/accept", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userProfile = await storage.getUserProfile(userId);
      
      if (!userProfile || userProfile.role !== "ngo") {
        return res.status(403).json({ error: "Not authorized" });
      }

      const ngoProfile = await storage.getNgoProfile(userProfile.id);
      if (!ngoProfile) {
        return res.status(404).json({ error: "NGO profile not found" });
      }

      const { id } = req.params;
      const { priority, assignedAgentProfileId } = req.body;

      // Volunteer assignment is mandatory
      if (!assignedAgentProfileId) {
        return res.status(400).json({ error: "Volunteer assignment is required. Please select a volunteer from your team." });
      }

      const donation = await storage.getDonation(id);
      if (!donation || donation.status !== "listed") {
        return res.status(400).json({ error: "Donation not available" });
      }

      // Verify the agent is affiliated with this NGO
      const agentProfile = await storage.getDeliveryAgentProfileById(assignedAgentProfileId);
      if (!agentProfile || agentProfile.affiliatedNgoId !== ngoProfile.id) {
        return res.status(400).json({ error: "Agent not affiliated with this NGO" });
      }

      if (agentProfile.approvalStatus !== "approved") {
        return res.status(400).json({ error: "Only approved volunteers can be assigned to tasks" });
      }

      const updatedDonation = await storage.updateDonation(id, {
        status: "assigned",
        ngoProfileId: ngoProfile.id,
        priority: priority || "medium",
        acceptedAt: new Date(),
      });

      // Create delivery task with mandatory agent assignment
      const taskData: any = {
        donationId: id,
        pickupArea: donation.area,
        dropoffArea: ngoProfile.warehouseArea || "NGO Warehouse",
        ngoProfileId: ngoProfile.id,
        status: "accepted",
        assignmentType: "ngo_assigned",
        deliveryAgentProfileId: assignedAgentProfileId,
        timeWindowStart: donation.availabilityStart,
        timeWindowEnd: donation.availabilityEnd,
      };

      await storage.createDeliveryTask(taskData);

      res.json(updatedDonation);
    } catch (error) {
      console.error("Error accepting donation:", error);
      res.status(500).json({ error: "Failed to accept donation" });
    }
  });

  // NGO Assign Agent to existing task
  app.post("/api/ngo/tasks/:id/assign", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userProfile = await storage.getUserProfile(userId);
      
      if (!userProfile || userProfile.role !== "ngo") {
        return res.status(403).json({ error: "Not authorized" });
      }

      const ngoProfile = await storage.getNgoProfile(userProfile.id);
      if (!ngoProfile) {
        return res.status(404).json({ error: "NGO profile not found" });
      }

      const { id } = req.params;
      const { agentProfileId } = req.body;

      if (!agentProfileId) {
        return res.status(400).json({ error: "Agent profile ID required" });
      }

      const task = await storage.getDeliveryTask(id);
      if (!task || task.ngoProfileId !== ngoProfile.id) {
        return res.status(404).json({ error: "Task not found" });
      }

      if (task.status !== "pending") {
        return res.status(400).json({ error: "Task already assigned or completed" });
      }

      // Verify the agent is affiliated with this NGO
      const agentProfile = await storage.getDeliveryAgentProfileById(agentProfileId);
      if (!agentProfile || agentProfile.affiliatedNgoId !== ngoProfile.id) {
        return res.status(400).json({ error: "Agent not affiliated with this NGO" });
      }

      const updatedTask = await storage.assignAgentToTask(id, agentProfileId, "ngo_assigned");
      res.json(updatedTask);
    } catch (error) {
      console.error("Error assigning agent to task:", error);
      res.status(500).json({ error: "Failed to assign agent" });
    }
  });

  // NGO Confirm Receipt
  app.post("/api/ngo/donations/:id/confirm-receipt", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userProfile = await storage.getUserProfile(userId);
      
      if (!userProfile || userProfile.role !== "ngo") {
        return res.status(403).json({ error: "Not authorized" });
      }

      const { id } = req.params;
      const { status } = req.body;

      const donation = await storage.getDonation(id);
      if (!donation || donation.status !== "delivered") {
        return res.status(400).json({ error: "Donation not ready for receipt" });
      }

      const updatedDonation = await storage.updateDonation(id, {
        status: "in_warehouse",
        warehouseReceiptStatus: status,
        warehouseReceivedAt: new Date(),
      });

      res.json(updatedDonation);
    } catch (error) {
      console.error("Error confirming receipt:", error);
      res.status(500).json({ error: "Failed to confirm receipt" });
    }
  });

  // NGO Distribution Events
  app.get("/api/ngo/distribution-events", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userProfile = await storage.getUserProfile(userId);
      
      if (!userProfile || userProfile.role !== "ngo") {
        return res.status(403).json({ error: "Not authorized" });
      }

      const ngoProfile = await storage.getNgoProfile(userProfile.id);
      if (!ngoProfile) {
        return res.status(404).json({ error: "NGO profile not found" });
      }

      const events = await storage.getDistributionEventsByNgo(ngoProfile.id);
      res.json(events);
    } catch (error) {
      console.error("Error fetching distribution events:", error);
      res.status(500).json({ error: "Failed to fetch events" });
    }
  });

  app.post("/api/ngo/distribution-events", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userProfile = await storage.getUserProfile(userId);
      
      if (!userProfile || userProfile.role !== "ngo") {
        return res.status(403).json({ error: "Not authorized" });
      }

      const ngoProfile = await storage.getNgoProfile(userProfile.id);
      if (!ngoProfile) {
        return res.status(404).json({ error: "NGO profile not found" });
      }

      const { eventDate, distributionType, area, estimatedBeneficiaryCount } = req.body;

      // Create event as "scheduled" - donations will be linked when event is completed
      const event = await storage.createDistributionEvent({
        ngoProfileId: ngoProfile.id,
        eventDate: new Date(eventDate),
        distributionType,
        area,
        estimatedBeneficiaryCount,
        isPublished: false,
      });

      res.json(event);
    } catch (error) {
      console.error("Error creating distribution event:", error);
      res.status(500).json({ error: "Failed to create event" });
    }
  });

  // Complete a distribution event - add photos, impact data, and mark donations as distributed
  app.post("/api/ngo/distribution-events/:id/complete", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userProfile = await storage.getUserProfile(userId);
      
      if (!userProfile || userProfile.role !== "ngo") {
        return res.status(403).json({ error: "Not authorized" });
      }

      const ngoProfile = await storage.getNgoProfile(userProfile.id);
      if (!ngoProfile) {
        return res.status(404).json({ error: "NGO profile not found" });
      }

      const { id } = req.params;
      const { photoUrls, beneficiaryCount, impactDescription, donationIds } = req.body;

      // Get the event and verify ownership
      const event = await storage.getDistributionEvent(id);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }
      if (event.ngoProfileId !== ngoProfile.id) {
        return res.status(403).json({ error: "Not authorized to modify this event" });
      }
      if (event.status === "completed") {
        return res.status(400).json({ error: "Event is already completed" });
      }

      const completionTime = new Date();
      
      // Determine which donations to link: if donationIds provided, use those; otherwise use all warehouse items (legacy behavior)
      let itemsToDistribute: { id: string }[] = [];
      if (donationIds && Array.isArray(donationIds) && donationIds.length > 0) {
        // Verify all donations belong to this NGO and are in warehouse
        const warehouseItems = await storage.getWarehouseDonations(ngoProfile.id);
        const warehouseIds = new Set(warehouseItems.map(d => d.id));
        
        for (const donationId of donationIds) {
          if (!warehouseIds.has(donationId)) {
            return res.status(400).json({ error: `Donation ${donationId} is not in your warehouse` });
          }
        }
        itemsToDistribute = donationIds.map((donId: string) => ({ id: donId }));
      } else {
        // Legacy behavior: auto-associate all warehouse items
        itemsToDistribute = await storage.getWarehouseDonations(ngoProfile.id);
      }

      // Update event to completed
      const updatedEvent = await storage.updateDistributionEvent(id, {
        status: "completed",
        photoUrls,
        beneficiaryCount,
        impactDescription,
        itemCount: itemsToDistribute.length,
        isPublished: true,
        completedAt: completionTime,
      });

      // Update selected items to distributed
      for (const item of itemsToDistribute) {
        await storage.updateDonation(item.id, {
          status: "distributed",
          distributionEventId: id,
          distributedAt: completionTime,
        });
      }

      res.json(updatedEvent);
    } catch (error) {
      console.error("Error completing distribution event:", error);
      res.status(500).json({ error: "Failed to complete event" });
    }
  });

  // Delivery Agent Tasks
  app.get("/api/delivery/tasks/:filter", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userProfile = await storage.getUserProfile(userId);
      
      if (!userProfile || userProfile.role !== "delivery_agent") {
        return res.status(403).json({ error: "Not authorized" });
      }

      const agentProfile = await storage.getDeliveryAgentProfile(userProfile.id);
      if (!agentProfile) {
        return res.status(404).json({ error: "Agent profile not found" });
      }

      const { filter } = req.params;
      let tasks: any[] = [];

      if (filter === "available") {
        // Self-claim is disabled - all tasks are assigned by NGOs
        // Return empty array for backward compatibility
        tasks = [];
      } else if (filter === "mine") {
        tasks = await storage.getTasksByAgent(agentProfile.id, ["accepted", "in_progress"]);
      } else if (filter === "completed") {
        tasks = await storage.getCompletedTasksByAgent(agentProfile.id);
      } else {
        tasks = await storage.getTasksByAgent(agentProfile.id);
      }

      res.json(tasks);
    } catch (error) {
      console.error("Error fetching delivery tasks:", error);
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  // Delivery Agent Accept Task - DISABLED: All tasks are now assigned by NGOs
  // Keeping endpoint for backward compatibility but returning error
  app.post("/api/delivery/tasks/:id/accept", isAuthenticated, async (req: any, res) => {
    return res.status(400).json({ 
      error: "Self-claim is disabled. All delivery tasks are assigned by your organization." 
    });
  });

  // Delivery Agent Submit Proof
  app.post("/api/delivery/tasks/:id/proof", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userProfile = await storage.getUserProfile(userId);
      
      if (!userProfile || userProfile.role !== "delivery_agent") {
        return res.status(403).json({ error: "Not authorized" });
      }

      const { id } = req.params;
      const { proofType, proofUrl } = req.body;

      const task = await storage.getDeliveryTask(id);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      if (proofType === "pickup") {
        await storage.updateDeliveryTask(id, {
          status: "in_progress",
          pickupProofUrl: proofUrl,
          pickupTimestamp: new Date(),
        });

        await storage.updateDonation(task.donationId, {
          status: "collected",
          pickupProofUrl: proofUrl,
        });
      } else if (proofType === "delivery") {
        await storage.updateDeliveryTask(id, {
          status: "completed",
          deliveryProofUrl: proofUrl,
          deliveryTimestamp: new Date(),
        });

        await storage.updateDonation(task.donationId, {
          status: "delivered",
          deliveryProofUrl: proofUrl,
        });
      }

      const updatedTask = await storage.getDeliveryTask(id);
      res.json(updatedTask);
    } catch (error) {
      console.error("Error submitting proof:", error);
      res.status(500).json({ error: "Failed to submit proof" });
    }
  });

  // Donor Donation Details (for drawer)
  app.get("/api/donor/donations/:id/details", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userProfile = await storage.getUserProfile(userId);
      
      if (!userProfile || userProfile.role !== "donor") {
        return res.status(403).json({ error: "Not authorized" });
      }

      const { id } = req.params;
      const donation = await storage.getDonation(id);
      
      if (!donation) {
        return res.status(404).json({ error: "Donation not found" });
      }

      // Security: Only allow access if donor owns this donation
      if (donation.donorProfileId !== userProfile.id) {
        return res.status(403).json({ error: "Not authorized to view this donation" });
      }

      // Get delivery task if exists
      const deliveryTask = await storage.getDeliveryTaskByDonationId(id);

      // Get delivery agent display name if assigned
      let agentDisplayName = null;
      if (deliveryTask?.deliveryAgentProfileId) {
        const agentProfile = await storage.getDeliveryAgentProfileById(deliveryTask.deliveryAgentProfileId);
        if (agentProfile) {
          const agentUserProfile = await storage.getUserProfileById(agentProfile.userProfileId);
          agentDisplayName = agentUserProfile?.displayName || "Delivery Agent";
        }
      }

      // Check for consent request and determine what NGO info to show
      let ngoSummary = null;
      let consentRequest = null;
      
      if (donation.ngoProfileId) {
        consentRequest = await storage.getConsentRequestByDonation(id, userProfile.id);
        
        // Only show NGO details if consent was approved
        if (consentRequest?.status === "approved") {
          const ngoProfile = await storage.getNgoProfileById(donation.ngoProfileId);
          if (ngoProfile) {
            ngoSummary = {
              organizationName: ngoProfile.organizationName,
              warehouseArea: ngoProfile.warehouseArea,
              description: ngoProfile.description,
            };
          }
        }
      }

      // Get distribution event if distributed
      let distributionEvent = null;
      if (donation.distributionEventId) {
        distributionEvent = await storage.getDistributionEvent(donation.distributionEventId);
      }

      res.json({
        donation,
        deliveryTask,
        ngoSummary,
        agentDisplayName,
        distributionEvent,
        consentRequest,
      });
    } catch (error) {
      console.error("Error fetching donor donation details:", error);
      res.status(500).json({ error: "Failed to fetch donation details" });
    }
  });

  // Donor Request NGO Details
  app.post("/api/donor/donations/:id/ngo-request", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userProfile = await storage.getUserProfile(userId);
      
      if (!userProfile || userProfile.role !== "donor") {
        return res.status(403).json({ error: "Not authorized" });
      }

      const { id } = req.params;
      const donation = await storage.getDonation(id);
      
      if (!donation) {
        return res.status(404).json({ error: "Donation not found" });
      }

      // Security: Only allow if donor owns donation
      if (donation.donorProfileId !== userProfile.id) {
        return res.status(403).json({ error: "Not authorized" });
      }

      // Only allow if donation has been accepted by an NGO
      if (!donation.ngoProfileId) {
        return res.status(400).json({ error: "Donation has not been accepted by an NGO" });
      }

      // Check if request already exists
      const existingRequest = await storage.getConsentRequestByDonation(id, userProfile.id);
      if (existingRequest && existingRequest.status === "pending") {
        return res.status(400).json({ error: "Request already pending" });
      }

      // Create or update consent request
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

      const request = await storage.createConsentRequest({
        donationId: id,
        donorProfileId: userProfile.id,
        ngoProfileId: donation.ngoProfileId,
        status: "pending",
        expiresAt,
      });

      res.json(request);
    } catch (error) {
      console.error("Error creating NGO request:", error);
      res.status(500).json({ error: "Failed to create request" });
    }
  });

  // NGO Get Pending Consent Requests
  app.get("/api/ngo/consent-requests", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userProfile = await storage.getUserProfile(userId);
      
      if (!userProfile || userProfile.role !== "ngo") {
        return res.status(403).json({ error: "Not authorized" });
      }

      const ngoProfile = await storage.getNgoProfile(userProfile.id);
      if (!ngoProfile) {
        return res.status(404).json({ error: "NGO profile not found" });
      }

      const requests = await storage.getConsentRequestsByNgo(ngoProfile.id, "pending");
      
      // Enrich with donation info
      const enrichedRequests = await Promise.all(requests.map(async (req) => {
        const donation = await storage.getDonation(req.donationId);
        return {
          ...req,
          donation: donation ? {
            category: donation.category,
            quantity: donation.quantity,
            area: donation.area,
            createdAt: donation.createdAt,
          } : null,
        };
      }));

      res.json(enrichedRequests);
    } catch (error) {
      console.error("Error fetching consent requests:", error);
      res.status(500).json({ error: "Failed to fetch requests" });
    }
  });

  // NGO Respond to Consent Request
  app.post("/api/ngo/consent-requests/:id/decision", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userProfile = await storage.getUserProfile(userId);
      
      if (!userProfile || userProfile.role !== "ngo") {
        return res.status(403).json({ error: "Not authorized" });
      }

      const ngoProfile = await storage.getNgoProfile(userProfile.id);
      if (!ngoProfile) {
        return res.status(404).json({ error: "NGO profile not found" });
      }

      const { id } = req.params;
      const { decision, note } = req.body;

      if (!["approved", "denied"].includes(decision)) {
        return res.status(400).json({ error: "Invalid decision" });
      }

      const request = await storage.getConsentRequest(id);
      if (!request) {
        return res.status(404).json({ error: "Request not found" });
      }

      // Security: Only allow NGO that owns the request to respond
      if (request.ngoProfileId !== ngoProfile.id) {
        return res.status(403).json({ error: "Not authorized to respond to this request" });
      }

      const updatedRequest = await storage.updateConsentRequest(id, {
        status: decision,
        ngoNote: note || null,
        respondedAt: new Date(),
      });

      res.json(updatedRequest);
    } catch (error) {
      console.error("Error responding to consent request:", error);
      res.status(500).json({ error: "Failed to respond to request" });
    }
  });

  // Delivery Agent Task Details (for drawer)
  app.get("/api/delivery/tasks/:id/details", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userProfile = await storage.getUserProfile(userId);
      
      if (!userProfile || userProfile.role !== "delivery_agent") {
        return res.status(403).json({ error: "Not authorized" });
      }

      const agentProfile = await storage.getDeliveryAgentProfile(userProfile.id);
      if (!agentProfile) {
        return res.status(404).json({ error: "Agent profile not found" });
      }

      const { id } = req.params;
      const task = await storage.getDeliveryTask(id);
      
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      // Security: Only allow access if task is pending (available) or assigned to this agent
      if (task.status !== "pending" && task.deliveryAgentProfileId !== agentProfile.id) {
        return res.status(403).json({ error: "Not authorized to view this task" });
      }

      // Get associated donation
      const donation = await storage.getDonation(task.donationId);
      if (!donation) {
        return res.status(404).json({ error: "Donation not found" });
      }

      // Get NGO info
      const ngoProfile = await storage.getNgoProfileById(task.ngoProfileId);

      // Sanitize donation - remove donor info
      const sanitizedDonation = {
        id: donation.id,
        category: donation.category,
        quantity: donation.quantity,
        condition: donation.condition,
        description: donation.description,
        area: donation.area,
        availabilityStart: donation.availabilityStart,
        availabilityEnd: donation.availabilityEnd,
        status: donation.status,
        priority: donation.priority,
        pickupProofUrl: donation.pickupProofUrl,
        deliveryProofUrl: donation.deliveryProofUrl,
        createdAt: donation.createdAt,
      };

      res.json({
        task,
        donation: sanitizedDonation,
        ngoName: ngoProfile?.organizationName || "NGO",
        ngoWarehouseArea: ngoProfile?.warehouseArea,
      });
    } catch (error) {
      console.error("Error fetching task details:", error);
      res.status(500).json({ error: "Failed to fetch task details" });
    }
  });

  // NGO Invite Links - Create new invite link
  app.post("/api/ngo/invite-links", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userProfile = await storage.getUserProfile(userId);
      
      if (!userProfile || userProfile.role !== "ngo") {
        return res.status(403).json({ error: "Not authorized" });
      }

      const ngoProfile = await storage.getNgoProfile(userProfile.id);
      if (!ngoProfile) {
        return res.status(404).json({ error: "NGO profile not found" });
      }

      const { label, maxUses, expiresInDays } = req.body;

      // Generate unique invite code
      const code = `${ngoProfile.organizationName?.slice(0, 3).toUpperCase() || "NGO"}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      const expiresAt = expiresInDays 
        ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
        : null;

      const inviteLink = await storage.createInviteLink({
        ngoProfileId: ngoProfile.id,
        code,
        label: label || null,
        maxUses: maxUses || null,
        expiresAt,
        isActive: true,
      });

      res.json(inviteLink);
    } catch (error) {
      console.error("Error creating invite link:", error);
      res.status(500).json({ error: "Failed to create invite link" });
    }
  });

  // NGO Invite Links - Get all for NGO
  app.get("/api/ngo/invite-links", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userProfile = await storage.getUserProfile(userId);
      
      if (!userProfile || userProfile.role !== "ngo") {
        return res.status(403).json({ error: "Not authorized" });
      }

      const ngoProfile = await storage.getNgoProfile(userProfile.id);
      if (!ngoProfile) {
        return res.status(404).json({ error: "NGO profile not found" });
      }

      const links = await storage.getInviteLinksByNgo(ngoProfile.id);
      res.json(links);
    } catch (error) {
      console.error("Error fetching invite links:", error);
      res.status(500).json({ error: "Failed to fetch invite links" });
    }
  });

  // NGO Invite Links - Toggle active state
  app.patch("/api/ngo/invite-links/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userProfile = await storage.getUserProfile(userId);
      
      if (!userProfile || userProfile.role !== "ngo") {
        return res.status(403).json({ error: "Not authorized" });
      }

      const ngoProfile = await storage.getNgoProfile(userProfile.id);
      if (!ngoProfile) {
        return res.status(404).json({ error: "NGO profile not found" });
      }

      const { id } = req.params;
      const link = await storage.getInviteLink(id);
      
      if (!link || link.ngoProfileId !== ngoProfile.id) {
        return res.status(404).json({ error: "Invite link not found" });
      }

      const { isActive } = req.body;
      const updated = await storage.updateInviteLink(id, { isActive });
      res.json(updated);
    } catch (error) {
      console.error("Error updating invite link:", error);
      res.status(500).json({ error: "Failed to update invite link" });
    }
  });

  // NGO Volunteers - Get list (with enriched user profile data)
  app.get("/api/ngo/volunteers", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userProfile = await storage.getUserProfile(userId);
      
      if (!userProfile || userProfile.role !== "ngo") {
        return res.status(403).json({ error: "Not authorized" });
      }

      const ngoProfile = await storage.getNgoProfile(userProfile.id);
      if (!ngoProfile) {
        return res.status(404).json({ error: "NGO profile not found" });
      }

      const volunteers = await storage.getVolunteersByNgo(ngoProfile.id);
      
      // Enrich with user profile details
      const enrichedVolunteers = await Promise.all(
        volunteers.map(async (volunteer) => {
          const volunteerUserProfile = await storage.getUserProfileById(volunteer.userProfileId);
          return {
            ...volunteer,
            displayName: volunteerUserProfile?.displayName || "Volunteer",
            phone: volunteerUserProfile?.phone || null,
            avatarUrl: volunteerUserProfile?.avatarUrl || null,
            area: volunteerUserProfile?.area || null,
            joinedAt: volunteer.createdAt,
          };
        })
      );
      
      res.json(enrichedVolunteers);
    } catch (error) {
      console.error("Error fetching volunteers:", error);
      res.status(500).json({ error: "Failed to fetch volunteers" });
    }
  });

  // Get available volunteers for assignment (with display names)
  app.get("/api/ngo/volunteers/available", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userProfile = await storage.getUserProfile(userId);
      
      if (!userProfile || userProfile.role !== "ngo") {
        return res.status(403).json({ error: "Not authorized" });
      }

      const ngoProfile = await storage.getNgoProfile(userProfile.id);
      if (!ngoProfile) {
        return res.status(404).json({ error: "NGO profile not found" });
      }

      const volunteers = await storage.getAvailableVolunteersForNgo(ngoProfile.id);
      
      // Enrich with display names
      const enrichedVolunteers = await Promise.all(
        volunteers.map(async (volunteer) => {
          const volunteerUserProfile = await storage.getUserProfileById(volunteer.userProfileId);
          return {
            ...volunteer,
            displayName: volunteerUserProfile?.displayName || "Volunteer",
          };
        })
      );
      
      res.json(enrichedVolunteers);
    } catch (error) {
      console.error("Error fetching available volunteers:", error);
      res.status(500).json({ error: "Failed to fetch available volunteers" });
    }
  });

  // Get tasks for NGO (for assignment management)
  app.get("/api/ngo/tasks", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userProfile = await storage.getUserProfile(userId);
      
      if (!userProfile || userProfile.role !== "ngo") {
        return res.status(403).json({ error: "Not authorized" });
      }

      const ngoProfile = await storage.getNgoProfile(userProfile.id);
      if (!ngoProfile) {
        return res.status(404).json({ error: "NGO profile not found" });
      }

      const tasks = await storage.getTasksByNgo(ngoProfile.id);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching NGO tasks:", error);
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  // Validate invite code (public endpoint for onboarding)
  app.get("/api/invite/:code", async (req, res) => {
    try {
      const { code } = req.params;
      const link = await storage.getInviteLinkByCode(code);

      if (!link) {
        return res.status(404).json({ error: "Invalid invite code" });
      }

      // Check if link is still valid
      if (!link.isActive) {
        return res.status(400).json({ error: "This invite link is no longer active" });
      }

      if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
        return res.status(400).json({ error: "This invite link has expired" });
      }

      if (link.maxUses && (link.usedCount || 0) >= link.maxUses) {
        return res.status(400).json({ error: "This invite link has reached its usage limit" });
      }

      // Get NGO info
      const ngoProfile = await storage.getNgoProfileById(link.ngoProfileId);
      
      res.json({
        valid: true,
        ngoName: ngoProfile?.organizationName || "Organization",
        ngoId: link.ngoProfileId,
        linkId: link.id,
      });
    } catch (error) {
      console.error("Error validating invite code:", error);
      res.status(500).json({ error: "Failed to validate invite code" });
    }
  });

  // Register as volunteer with invite code
  const registerWithInviteSchema = z.object({
    inviteCode: z.string(),
    operatingArea: z.string().optional(),
    transportType: z.enum(VALID_TRANSPORT_TYPES).optional(),
    loadCapacity: z.enum(VALID_LOAD_CAPACITIES).optional(),
  });

  app.post("/api/delivery-agent/register-with-invite", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const parseResult = registerWithInviteSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Invalid registration data", details: parseResult.error.issues });
      }
      
      const { inviteCode, operatingArea, transportType, loadCapacity } = parseResult.data;
      
      let userProfile = await storage.getUserProfile(userId);
      
      // Create user profile if it doesn't exist (new users joining via invite)
      if (!userProfile) {
        userProfile = await storage.createUserProfile({
          userId,
          role: "delivery_agent",
          isOnboarded: true,
        });
      }

      // Validate invite code
      const link = await storage.getInviteLinkByCode(inviteCode);
      if (!link) {
        return res.status(400).json({ error: "Invalid invite code" });
      }

      if (!link.isActive) {
        return res.status(400).json({ error: "This invite link is no longer active" });
      }

      if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
        return res.status(400).json({ error: "This invite link has expired" });
      }

      if (link.maxUses && (link.usedCount || 0) >= link.maxUses) {
        return res.status(400).json({ error: "This invite link has reached its usage limit" });
      }

      // Create or update delivery agent profile
      let agentProfile = await storage.getDeliveryAgentProfile(userProfile.id);
      
      if (agentProfile) {
        // Update existing profile with affiliation - status reset to pending for re-approval
        agentProfile = await storage.updateDeliveryAgentProfile(agentProfile.id, {
          affiliatedNgoId: link.ngoProfileId,
          approvalStatus: "pending",
          operatingArea: operatingArea || agentProfile.operatingArea,
          transportType: transportType || agentProfile.transportType,
          loadCapacity: loadCapacity || agentProfile.loadCapacity,
        });
      } else {
        // Create new profile - starts as pending approval
        agentProfile = await storage.createDeliveryAgentProfile({
          userProfileId: userProfile.id,
          affiliatedNgoId: link.ngoProfileId,
          approvalStatus: "pending",
          operatingArea,
          transportType,
          loadCapacity,
          isAvailable: true,
        });
      }

      // Update user role if needed, but don't overwrite existing roles
      if (userProfile.role !== "delivery_agent") {
        // User already has a different role - they should use their existing profile
        return res.status(400).json({ 
          error: `You already have an account as a ${userProfile.role.replace("_", " ")}. Please contact support if you need to change your role.` 
        });
      }

      // Increment invite link usage
      await storage.incrementInviteLinkUsage(link.id);

      res.json({ 
        success: true, 
        profile: agentProfile,
        ngoId: link.ngoProfileId,
      });
    } catch (error) {
      console.error("Error registering with invite:", error);
      res.status(500).json({ error: "Failed to register as volunteer" });
    }
  });

  // Join an NGO with invite link (for existing agents without affiliation)
  app.patch("/api/delivery-agent/join-ngo", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userProfile = await storage.getUserProfile(userId);
      
      if (!userProfile || userProfile.role !== "delivery_agent") {
        return res.status(403).json({ error: "Not authorized" });
      }

      const agentProfile = await storage.getDeliveryAgentProfile(userProfile.id);
      if (!agentProfile) {
        return res.status(404).json({ error: "Agent profile not found" });
      }

      const { inviteLinkId } = req.body;
      if (!inviteLinkId) {
        return res.status(400).json({ error: "Invite link ID required" });
      }

      // Get the invite link by ID
      const link = await storage.getInviteLink(inviteLinkId);
      if (!link) {
        return res.status(400).json({ error: "Invalid invite link" });
      }

      if (!link.isActive) {
        return res.status(400).json({ error: "This invite link is no longer active" });
      }

      if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
        return res.status(400).json({ error: "This invite link has expired" });
      }

      if (link.maxUses && (link.usedCount || 0) >= link.maxUses) {
        return res.status(400).json({ error: "This invite link has reached its usage limit" });
      }

      // Update agent profile with new affiliation - status reset to pending for approval
      const updated = await storage.updateDeliveryAgentProfile(agentProfile.id, {
        affiliatedNgoId: link.ngoProfileId,
        approvalStatus: "pending",
      });

      // Increment invite link usage
      await storage.incrementInviteLinkUsage(link.id);

      res.json({ 
        success: true, 
        profile: updated,
        ngoId: link.ngoProfileId,
      });
    } catch (error) {
      console.error("Error joining NGO:", error);
      res.status(500).json({ error: "Failed to join organization" });
    }
  });

  // Approve a volunteer (NGO only)
  app.post("/api/ngo/volunteers/:id/approve", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userProfile = await storage.getUserProfile(userId);
      
      if (!userProfile || userProfile.role !== "ngo") {
        return res.status(403).json({ error: "Not authorized" });
      }

      const ngoProfile = await storage.getNgoProfile(userProfile.id);
      if (!ngoProfile) {
        return res.status(404).json({ error: "NGO profile not found" });
      }

      const { id } = req.params;
      const agentProfile = await storage.getDeliveryAgentProfileById(id);
      
      if (!agentProfile || agentProfile.affiliatedNgoId !== ngoProfile.id) {
        return res.status(404).json({ error: "Volunteer not found" });
      }

      const updated = await storage.updateDeliveryAgentProfile(id, {
        approvalStatus: "approved",
      });

      res.json(updated);
    } catch (error) {
      console.error("Error approving volunteer:", error);
      res.status(500).json({ error: "Failed to approve volunteer" });
    }
  });

  // Reject a volunteer (NGO only)
  app.post("/api/ngo/volunteers/:id/reject", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userProfile = await storage.getUserProfile(userId);
      
      if (!userProfile || userProfile.role !== "ngo") {
        return res.status(403).json({ error: "Not authorized" });
      }

      const ngoProfile = await storage.getNgoProfile(userProfile.id);
      if (!ngoProfile) {
        return res.status(404).json({ error: "NGO profile not found" });
      }

      const { id } = req.params;
      const { notes } = req.body;
      const agentProfile = await storage.getDeliveryAgentProfileById(id);
      
      if (!agentProfile || agentProfile.affiliatedNgoId !== ngoProfile.id) {
        return res.status(404).json({ error: "Volunteer not found" });
      }

      // Auto-unassign any active tasks from this volunteer
      const unassignedCount = await storage.unassignAgentFromActiveTasks(id);
      if (unassignedCount > 0) {
        console.log(`Auto-unassigned ${unassignedCount} tasks from rejected volunteer ${id}`);
      }

      const updated = await storage.updateDeliveryAgentProfile(id, {
        approvalStatus: "rejected",
        rejectionNotes: notes || null,
      });

      res.json(updated);
    } catch (error) {
      console.error("Error rejecting volunteer:", error);
      res.status(500).json({ error: "Failed to reject volunteer" });
    }
  });

  // Remove a volunteer (NGO only) - disassociates agent from NGO
  app.delete("/api/ngo/volunteers/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userProfile = await storage.getUserProfile(userId);
      
      if (!userProfile || userProfile.role !== "ngo") {
        return res.status(403).json({ error: "Not authorized" });
      }

      const ngoProfile = await storage.getNgoProfile(userProfile.id);
      if (!ngoProfile) {
        return res.status(404).json({ error: "NGO profile not found" });
      }

      const { id } = req.params;
      const agentProfile = await storage.getDeliveryAgentProfileById(id);
      
      if (!agentProfile || agentProfile.affiliatedNgoId !== ngoProfile.id) {
        return res.status(404).json({ error: "Volunteer not found" });
      }

      // Auto-unassign any active tasks from this volunteer - only pending/accepted tasks are unassigned
      const unassignedCount = await storage.unassignAgentFromActiveTasks(id);
      if (unassignedCount > 0) {
        console.log(`Auto-unassigned ${unassignedCount} tasks from removed volunteer ${id}`);
      }

      // Clear affiliation and reset approval status
      // Note: approvalStatus="pending" with affiliatedNgoId=null represents an unaffiliated agent
      await storage.updateDeliveryAgentProfile(id, {
        affiliatedNgoId: null,
        approvalStatus: "pending",
        rejectionNotes: null,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error removing volunteer:", error);
      res.status(500).json({ error: "Failed to remove volunteer" });
    }
  });

  // Volunteer self-leave - allows delivery agents to leave their affiliated NGO
  app.post("/api/delivery-agent/leave-ngo", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userProfile = await storage.getUserProfile(userId);
      
      if (!userProfile || userProfile.role !== "delivery_agent") {
        return res.status(403).json({ error: "Not authorized" });
      }

      const agentProfile = await storage.getDeliveryAgentProfile(userProfile.id);
      if (!agentProfile) {
        return res.status(404).json({ error: "Agent profile not found" });
      }

      if (!agentProfile.affiliatedNgoId) {
        return res.status(400).json({ error: "You are not affiliated with any organization" });
      }

      // Check for active tasks before leaving
      const activeTasks = await storage.getActiveTasksForAgent(agentProfile.id);
      
      // Unassign all active tasks (return to pool) - only pending/accepted tasks are unassigned, in_progress tasks are preserved
      const unassignedCount = await storage.unassignAgentFromActiveTasks(agentProfile.id);
      
      // Clear affiliation and reset status
      // Note: approvalStatus="pending" with affiliatedNgoId=null represents an unaffiliated agent
      // ready to join a new org. The frontend checks affiliatedNgoId first to show "Not Affiliated" state.
      await storage.updateDeliveryAgentProfile(agentProfile.id, {
        affiliatedNgoId: null,
        approvalStatus: "pending",
        rejectionNotes: null,
      });

      res.json({ 
        success: true, 
        tasksReassigned: unassignedCount,
        message: unassignedCount > 0 
          ? `You have left the organization. ${unassignedCount} task(s) were returned to the pool.`
          : "You have successfully left the organization."
      });
    } catch (error) {
      console.error("Error leaving NGO:", error);
      res.status(500).json({ error: "Failed to leave organization" });
    }
  });

  // =====================
  // MONETARY DONATIONS (STRIPE)
  // =====================

  // Get Stripe publishable key
  app.get("/api/stripe/publishable-key", async (_req, res) => {
    try {
      const { getStripePublishableKey } = await import("./stripeClient");
      const publishableKey = await getStripePublishableKey();
      res.json({ publishableKey });
    } catch (error) {
      console.error("Error getting publishable key:", error);
      res.status(500).json({ error: "Failed to get Stripe configuration" });
    }
  });

  // List NGOs available for monetary donations
  app.get("/api/monetary-donations/ngos", isAuthenticated, async (_req, res) => {
    try {
      const ngos = await storage.getAllNgoProfiles();
      res.json(ngos.map(ngo => ({
        id: ngo.id,
        organizationName: ngo.organizationName,
        description: ngo.description,
        warehouseArea: ngo.warehouseArea,
      })));
    } catch (error) {
      console.error("Error listing NGOs:", error);
      res.status(500).json({ error: "Failed to list organizations" });
    }
  });

  // Create checkout session for monetary donation
  app.post("/api/monetary-donations/checkout", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userProfile = await storage.getUserProfile(userId);
      
      if (!userProfile) {
        return res.status(404).json({ error: "User profile not found" });
      }

      const { ngoProfileId, amount, message, isAnonymous } = req.body;

      if (!ngoProfileId || !amount || amount < 100) {
        return res.status(400).json({ error: "Invalid donation details. Minimum amount is 100 (1.00 INR)" });
      }

      const ngo = await storage.getNgoProfileById(ngoProfileId);
      if (!ngo) {
        return res.status(404).json({ error: "Organization not found" });
      }

      const { getUncachableStripeClient } = await import("./stripeClient");
      const stripe = await getUncachableStripeClient();

      const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;

      // Check for existing pending donations from this donor
      const allDonations = await storage.getMonetaryDonationsByDonor(userProfile.id);
      const pendingDonations = allDonations.filter(d => d.status === 'pending');
      
      // Look for a recent pending donation with same NGO and amount (within 30 min)
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      const recentMatch = pendingDonations.find(d => 
        d.ngoProfileId === ngoProfileId && 
        d.amount === amount && 
        d.stripeCheckoutSessionId &&
        d.createdAt && new Date(d.createdAt) > thirtyMinutesAgo
      );

      // If we have a recent matching pending donation, try to reuse its session
      if (recentMatch && recentMatch.stripeCheckoutSessionId) {
        try {
          const existingSession = await stripe.checkout.sessions.retrieve(recentMatch.stripeCheckoutSessionId);
          
          // If session is still open, redirect to it
          if (existingSession.status === 'open' && existingSession.url) {
            return res.json({ 
              checkoutUrl: existingSession.url,
              donationId: recentMatch.id,
            });
          }
          
          // Session expired or completed - mark the donation accordingly
          if (existingSession.status === 'expired') {
            await storage.updateMonetaryDonation(recentMatch.id, { status: 'expired' });
          } else if (existingSession.payment_status === 'paid') {
            await storage.updateMonetaryDonation(recentMatch.id, { 
              status: 'completed',
              completedAt: new Date(),
            });
          }
        } catch (sessionError) {
          console.error("Error checking existing session:", sessionError);
          // Mark as expired if we can't retrieve the session
          await storage.updateMonetaryDonation(recentMatch.id, { status: 'expired' });
        }
      }

      // Mark all other old pending donations (older than 30 min) as expired
      for (const pending of pendingDonations) {
        if (pending.id !== recentMatch?.id && pending.createdAt && new Date(pending.createdAt) <= thirtyMinutesAgo) {
          await storage.updateMonetaryDonation(pending.id, { status: 'expired' });
        }
      }

      // Create the donation record first so we can include the ID in the cancel URL
      const monetaryDonation = await storage.createMonetaryDonation({
        donorProfileId: userProfile.id,
        ngoProfileId,
        amount,
        currency: 'inr',
        status: 'pending',
        stripeCheckoutSessionId: '', // Will update after session creation
        message,
        isAnonymous: isAnonymous || false,
      });

      try {
        const sessionOptions: any = {
          payment_method_types: ['card'],
          billing_address_collection: 'required',
          line_items: [{
            price_data: {
              currency: 'inr',
              product_data: {
                name: `Donation to ${ngo.organizationName}`,
                description: message || `Supporting ${ngo.organizationName}`,
              },
              unit_amount: amount,
            },
            quantity: 1,
          }],
          mode: 'payment',
          success_url: `${baseUrl}/donor?donation=success`,
          cancel_url: `${baseUrl}/donor?donation=cancelled&donationId=${monetaryDonation.id}`,
          metadata: {
            donorProfileId: userProfile.id,
            ngoProfileId,
            donationId: monetaryDonation.id,
            message: message || '',
            isAnonymous: isAnonymous ? 'true' : 'false',
          },
        };

        // If NGO has a connected Stripe account with payouts enabled,
        // route the payment directly to them (minus optional platform fee)
        if (ngo.stripeAccountId && ngo.stripePayoutsEnabled) {
          // Use destination charges: collect full amount, transfer to connected account
          // Platform fee: 0% for now (100% goes to NGO) - can be adjusted later
          sessionOptions.payment_intent_data = {
            transfer_data: {
              destination: ngo.stripeAccountId,
            },
          };
        }

        // Industry-standard idempotency key: prevents duplicate sessions at Stripe level
        const idempotencyKey = `donation_${monetaryDonation.id}_${ngoProfileId}_${amount}`;
        const session = await stripe.checkout.sessions.create(sessionOptions, {
          idempotencyKey,
        });

        // Update the donation with the session ID
        await storage.updateMonetaryDonation(monetaryDonation.id, {
          stripeCheckoutSessionId: session.id,
        });

        res.json({ 
          checkoutUrl: session.url,
          donationId: monetaryDonation.id,
        });
      } catch (stripeError) {
        // Clean up the orphaned donation record if Stripe session creation failed
        console.error("Error creating Stripe checkout session:", stripeError);
        await storage.deleteMonetaryDonation(monetaryDonation.id);
        throw stripeError;
      }
    } catch (error) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  // Get donor's monetary donations
  app.get("/api/monetary-donations/my-donations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userProfile = await storage.getUserProfile(userId);
      
      if (!userProfile) {
        return res.status(404).json({ error: "User profile not found" });
      }

      const donations = await storage.getMonetaryDonationsByDonor(userProfile.id);

      const enrichedDonations = await Promise.all(donations.map(async (donation) => {
        const ngo = await storage.getNgoProfileById(donation.ngoProfileId);
        return {
          ...donation,
          ngoName: ngo?.organizationName || "Unknown Organization",
        };
      }));

      res.json(enrichedDonations);
    } catch (error) {
      console.error("Error fetching donations:", error);
      res.status(500).json({ error: "Failed to fetch donations" });
    }
  });

  // Get donor's monetary donation summary
  app.get("/api/monetary-donations/summary", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userProfile = await storage.getUserProfile(userId);
      
      if (!userProfile || userProfile.role !== "donor") {
        return res.json({ totalDonated: 0, completedCount: 0 });
      }

      const donations = await storage.getMonetaryDonationsByDonor(userProfile.id);
      const completedDonations = donations.filter(d => d.status === "completed");
      const totalDonated = completedDonations.reduce((sum, d) => sum + d.amount, 0);

      res.json({
        totalDonated,
        completedCount: completedDonations.length,
      });
    } catch (error) {
      console.error("Error fetching donation summary:", error);
      res.status(500).json({ error: "Failed to fetch summary" });
    }
  });

  // Get NGO's received monetary donations
  app.get("/api/ngo/monetary-donations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userProfile = await storage.getUserProfile(userId);
      
      if (!userProfile || userProfile.role !== "ngo") {
        return res.status(403).json({ error: "Not authorized" });
      }

      const ngoProfile = await storage.getNgoProfile(userProfile.id);
      if (!ngoProfile) {
        return res.status(404).json({ error: "NGO profile not found" });
      }

      const donations = await storage.getMonetaryDonationsByNgo(ngoProfile.id);
      const total = await storage.getTotalMonetaryDonationsByNgo(ngoProfile.id);

      const enrichedDonations = await Promise.all(donations.map(async (donation) => {
        if (donation.isAnonymous) {
          return {
            ...donation,
            donorName: "Anonymous Donor",
          };
        }
        const donorProfile = await storage.getUserProfileById(donation.donorProfileId);
        const user = donorProfile ? await storage.getUser(donorProfile.userId) : null;
        return {
          ...donation,
          donorName: user ? `${user.firstName} ${user.lastName}` : "Unknown Donor",
        };
      }));

      res.json({
        donations: enrichedDonations,
        totalReceived: total,
      });
    } catch (error) {
      console.error("Error fetching NGO donations:", error);
      res.status(500).json({ error: "Failed to fetch donations" });
    }
  });

  // ============================================
  // STRIPE CONNECT - NGO PAYOUT ONBOARDING
  // ============================================

  // Create Stripe Connect account and return onboarding link
  app.post("/api/ngo/stripe-connect/onboard", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userProfile = await storage.getUserProfile(userId);
      
      if (!userProfile || userProfile.role !== "ngo") {
        return res.status(403).json({ error: "Not authorized" });
      }

      const ngoProfile = await storage.getNgoProfile(userProfile.id);
      if (!ngoProfile) {
        return res.status(404).json({ error: "NGO profile not found" });
      }

      const { getUncachableStripeClient } = await import("./stripeClient");
      const stripe = await getUncachableStripeClient();
      const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;

      let accountId = ngoProfile.stripeAccountId;

      // Create a new connected account if one doesn't exist
      if (!accountId) {
        const account = await stripe.accounts.create({
          type: 'express',
          country: 'IN',
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
          business_type: 'non_profit',
          business_profile: {
            name: ngoProfile.organizationName,
            product_description: ngoProfile.description || `Nonprofit organization: ${ngoProfile.organizationName}`,
          },
        });

        accountId = account.id;

        // Save the account ID to the NGO profile
        await storage.updateNgoProfile(ngoProfile.id, {
          stripeAccountId: accountId,
        });
      }

      // Create an account link for onboarding
      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${baseUrl}/ngo/stripe-connect/refresh`,
        return_url: `${baseUrl}/ngo/stripe-connect/return`,
        type: 'account_onboarding',
      });

      res.json({ url: accountLink.url });
    } catch (error: any) {
      console.error("Error creating Stripe Connect onboarding:", error);
      const errorMessage = error?.message || error?.raw?.message || "Failed to start onboarding";
      res.status(500).json({ error: errorMessage });
    }
  });

  // Get NGO's Stripe Connect status
  app.get("/api/ngo/stripe-connect/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userProfile = await storage.getUserProfile(userId);
      
      if (!userProfile || userProfile.role !== "ngo") {
        return res.status(403).json({ error: "Not authorized" });
      }

      const ngoProfile = await storage.getNgoProfile(userProfile.id);
      if (!ngoProfile) {
        return res.status(404).json({ error: "NGO profile not found" });
      }

      if (!ngoProfile.stripeAccountId) {
        return res.json({
          connected: false,
          chargesEnabled: false,
          payoutsEnabled: false,
          onboardingComplete: false,
          pendingBalance: 0,
        });
      }

      const { getUncachableStripeClient } = await import("./stripeClient");
      const stripe = await getUncachableStripeClient();

      // Fetch the latest account status from Stripe
      const account = await stripe.accounts.retrieve(ngoProfile.stripeAccountId);

      // Update our database with the latest status
      const chargesEnabled = account.charges_enabled || false;
      const payoutsEnabled = account.payouts_enabled || false;
      const onboardingComplete = account.details_submitted || false;

      if (chargesEnabled !== ngoProfile.stripeChargesEnabled ||
          payoutsEnabled !== ngoProfile.stripePayoutsEnabled ||
          onboardingComplete !== ngoProfile.stripeOnboardingComplete) {
        await storage.updateNgoProfile(ngoProfile.id, {
          stripeChargesEnabled: chargesEnabled,
          stripePayoutsEnabled: payoutsEnabled,
          stripeOnboardingComplete: onboardingComplete,
        });
      }

      // Get pending balance (completed donations not yet paid out)
      const completedDonations = await storage.getMonetaryDonationsByNgo(ngoProfile.id);
      const pendingBalance = completedDonations
        .filter(d => d.status === 'completed')
        .reduce((sum, d) => sum + d.amount, 0);

      res.json({
        connected: true,
        chargesEnabled,
        payoutsEnabled,
        onboardingComplete,
        pendingBalance,
        accountId: ngoProfile.stripeAccountId,
      });
    } catch (error) {
      console.error("Error fetching Stripe Connect status:", error);
      res.status(500).json({ error: "Failed to fetch status" });
    }
  });

  // Generate a new onboarding link (for incomplete onboarding)
  app.post("/api/ngo/stripe-connect/refresh-link", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userProfile = await storage.getUserProfile(userId);
      
      if (!userProfile || userProfile.role !== "ngo") {
        return res.status(403).json({ error: "Not authorized" });
      }

      const ngoProfile = await storage.getNgoProfile(userProfile.id);
      if (!ngoProfile || !ngoProfile.stripeAccountId) {
        return res.status(404).json({ error: "No Stripe account found. Please start onboarding first." });
      }

      const { getUncachableStripeClient } = await import("./stripeClient");
      const stripe = await getUncachableStripeClient();
      const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;

      const accountLink = await stripe.accountLinks.create({
        account: ngoProfile.stripeAccountId,
        refresh_url: `${baseUrl}/ngo/stripe-connect/refresh`,
        return_url: `${baseUrl}/ngo/stripe-connect/return`,
        type: 'account_onboarding',
      });

      res.json({ url: accountLink.url });
    } catch (error: any) {
      console.error("Error refreshing Stripe Connect link:", error);
      const errorMessage = error?.message || error?.raw?.message || "Failed to generate new link";
      res.status(500).json({ error: errorMessage });
    }
  });

  // Mark a donation as cancelled (when user cancels checkout)
  app.post("/api/monetary-donations/:id/cancel", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userProfile = await storage.getUserProfile(userId);
      const { id } = req.params;
      
      if (!userProfile) {
        return res.status(404).json({ error: "User profile not found" });
      }

      // Get the donation and verify ownership
      const allDonations = await storage.getMonetaryDonationsByDonor(userProfile.id);
      const donation = allDonations.find(d => d.id === id);

      if (!donation) {
        return res.status(404).json({ error: "Donation not found" });
      }

      // Only mark as failed if it's still pending
      if (donation.status === 'pending') {
        await storage.updateMonetaryDonation(donation.id, {
          status: 'failed',
        });
      }

      res.json({ ok: true });
    } catch (error) {
      console.error("Error cancelling donation:", error);
      res.status(500).json({ error: "Failed to cancel donation" });
    }
  });

  // Verify and sync pending monetary donations with Stripe (fallback for webhooks)
  app.post("/api/monetary-donations/verify-pending", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userProfile = await storage.getUserProfile(userId);
      
      if (!userProfile) {
        return res.status(404).json({ error: "User profile not found" });
      }

      const { getUncachableStripeClient } = await import("./stripeClient");
      const stripe = await getUncachableStripeClient();

      // Get all pending donations for this donor
      const allDonations = await storage.getMonetaryDonationsByDonor(userProfile.id);
      const pendingDonations = allDonations.filter(d => d.status === 'pending' && d.stripeCheckoutSessionId);

      let updatedCount = 0;

      for (const donation of pendingDonations) {
        try {
          const session = await stripe.checkout.sessions.retrieve(donation.stripeCheckoutSessionId!);
          
          if (session.payment_status === 'paid') {
            await storage.updateMonetaryDonation(donation.id, {
              status: 'completed',
              completedAt: new Date(),
            });
            updatedCount++;
          } else if (session.status === 'expired') {
            await storage.updateMonetaryDonation(donation.id, {
              status: 'expired',
            });
          }
        } catch (stripeError) {
          console.error(`Error verifying session ${donation.stripeCheckoutSessionId}:`, stripeError);
          // Continue with other donations even if one fails
        }
      }

      res.json({ 
        verified: pendingDonations.length, 
        updated: updatedCount 
      });
    } catch (error) {
      console.error("Error verifying pending donations:", error);
      res.status(500).json({ error: "Failed to verify donations" });
    }
  });

  // Stripe checkout session completed webhook handler (called by stripe-replit-sync)
  app.post("/api/stripe/checkout-completed", async (req, res) => {
    try {
      const { session_id, payment_status } = req.body;
      
      if (!session_id) {
        return res.status(400).json({ error: "Missing session_id" });
      }

      const donation = await storage.getMonetaryDonationByCheckoutSession(session_id);
      if (!donation) {
        console.log("No donation found for session:", session_id);
        return res.status(200).json({ ok: true });
      }

      if (payment_status === 'paid') {
        await storage.updateMonetaryDonation(donation.id, {
          status: 'completed',
          completedAt: new Date(),
        });
      }

      res.json({ ok: true });
    } catch (error) {
      console.error("Error processing checkout completion:", error);
      res.status(500).json({ error: "Failed to process checkout completion" });
    }
  });

  return httpServer;
}
