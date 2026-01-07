import { db } from "./db";
import { users } from "@shared/models/auth";
import { userProfiles, ngoProfiles, deliveryAgentProfiles } from "@shared/schema";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function seedTestAccounts() {
  console.log("Creating test accounts...");

  const password = await hashPassword("password123");

  // Create donor user
  const [donorUser] = await db
    .insert(users)
    .values({
      email: "donor@test.com",
      password,
      firstName: "Test",
      lastName: "Donor",
    })
    .onConflictDoNothing()
    .returning();

  if (donorUser) {
    await db.insert(userProfiles).values({
      userId: donorUser.id,
      role: "donor",
      displayName: "Test Donor",
      phone: "+1234567890",
      area: "Downtown",
      isOnboarded: true,
    });
    console.log("Created donor: donor@test.com / password123");
  } else {
    console.log("Donor already exists");
  }

  // Create NGO user
  const [ngoUser] = await db
    .insert(users)
    .values({
      email: "ngo@test.com",
      password,
      firstName: "Test",
      lastName: "NGO",
    })
    .onConflictDoNothing()
    .returning();

  if (ngoUser) {
    const [ngoProfile] = await db
      .insert(userProfiles)
      .values({
        userId: ngoUser.id,
        role: "ngo",
        displayName: "Community Care Foundation",
        phone: "+1234567891",
        area: "Midtown",
        isOnboarded: true,
      })
      .returning();

    await db.insert(ngoProfiles).values({
      userProfileId: ngoProfile.id,
      organizationName: "Community Care Foundation",
      description: "A nonprofit dedicated to helping those in need through surplus redistribution.",
      warehouseArea: "Midtown Warehouse District",
      categories: ["clothing", "food", "essentials"],
    });
    console.log("Created NGO: ngo@test.com / password123");
  } else {
    console.log("NGO already exists");
  }

  // Create delivery agent user
  const [agentUser] = await db
    .insert(users)
    .values({
      email: "agent@test.com",
      password,
      firstName: "Test",
      lastName: "Agent",
    })
    .onConflictDoNothing()
    .returning();

  if (agentUser) {
    const [agentProfile] = await db
      .insert(userProfiles)
      .values({
        userId: agentUser.id,
        role: "delivery_agent",
        displayName: "Test Agent",
        phone: "+1234567892",
        area: "Citywide",
        isOnboarded: true,
      })
      .returning();

    await db.insert(deliveryAgentProfiles).values({
      userProfileId: agentProfile.id,
      transportType: "bike",
      loadCapacity: "medium",
      operatingArea: "Downtown, Midtown, Uptown",
      availabilityStart: "09:00",
      availabilityEnd: "18:00",
      isAvailable: true,
    });
    console.log("Created delivery agent: agent@test.com / password123");
  } else {
    console.log("Delivery agent already exists");
  }

  console.log("\nTest accounts ready!");
  console.log("-------------------");
  console.log("Donor:    donor@test.com / password123");
  console.log("NGO:      ngo@test.com / password123");
  console.log("Agent:    agent@test.com / password123");
}

// Export for use in build script
export { seedTestAccounts };

// CLI execution guard - only runs when executed directly (ESM compatible)
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  seedTestAccounts()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Error seeding test accounts:", err);
      process.exit(1);
    });
}
