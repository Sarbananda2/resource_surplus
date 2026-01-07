import { users, type User, type UpsertUser, type InsertUser } from "@shared/models/auth";
import { db } from "../../db";
import { eq } from "drizzle-orm";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

// Password hashing utilities
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Interface for auth storage operations
// (IMPORTANT) These user operations are mandatory for Replit Auth.
export interface IAuthStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUserWithPassword(userData: InsertUser): Promise<User>;
  verifyPassword(email: string, password: string): Promise<User | null>;
}

class AuthStorage implements IAuthStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // First check if a user with this email already exists
    // This handles the case where a user signs in with Google but already has an account
    if (userData.email) {
      const existingUser = await this.getUserByEmail(userData.email);
      if (existingUser) {
        // Update the existing user with any new data (like profile image from Google)
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

    // No existing user with this email, create a new one
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

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUserWithPassword(userData: InsertUser): Promise<User> {
    const hashedPassword = await hashPassword(userData.password);
    const [user] = await db
      .insert(users)
      .values({
        email: userData.email,
        password: hashedPassword,
        firstName: userData.firstName,
        lastName: userData.lastName,
      })
      .returning();
    return user;
  }

  async verifyPassword(email: string, password: string): Promise<User | null> {
    const user = await this.getUserByEmail(email);
    if (!user || !user.password) {
      return null;
    }
    const isValid = await comparePasswords(password, user.password);
    return isValid ? user : null;
  }
}

export const authStorage = new AuthStorage();
