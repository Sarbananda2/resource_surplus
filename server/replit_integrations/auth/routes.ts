import type { Express } from "express";
import { authStorage } from "./storage";
import { isAuthenticated } from "./replitAuth";
import { verifyFirebaseToken, upsertFirebaseUser, isFirebaseReady } from "./firebaseAuth";

// Extend express-session types to include userId for password-based auth
declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

// Register auth-specific routes
export function registerAuthRoutes(app: Express): void {
  // Get current authenticated user (supports session-based, Replit Auth, and Firebase Auth)
  app.get("/api/auth/user", async (req: any, res) => {
    try {
      // Check session-based auth first (email/password login or Firebase session)
      if (req.session?.userId) {
        const user = await authStorage.getUser(req.session.userId);
        if (user) {
          const { password, ...safeUser } = user;
          return res.json(safeUser);
        }
      }
      
      // Fall back to Replit Auth
      if (req.user?.claims?.sub) {
        const userId = req.user.claims.sub;
        const user = await authStorage.getUser(userId);
        if (user) {
          const { password, ...safeUser } = user;
          return res.json(safeUser);
        }
      }
      
      // Fall back to Firebase Bearer token (stateless auth)
      if (isFirebaseReady()) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
          const idToken = authHeader.substring(7);
          const decodedToken = await verifyFirebaseToken(idToken);
          if (decodedToken) {
            // Ensure user exists in database
            const user = await upsertFirebaseUser(decodedToken);
            const { password, ...safeUser } = user;
            return res.json(safeUser);
          }
        }
      }
      
      return res.status(401).json({ message: "Not authenticated" });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Email/password registration (for development testing)
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const existingUser = await authStorage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const user = await authStorage.createUserWithPassword({
        email,
        password,
        firstName,
        lastName,
      });

      // Set session
      req.session.userId = user.id;

      const { password: _, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (error) {
      console.error("Error registering user:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // Email/password login (for development testing)
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const user = await authStorage.verifyPassword(email, password);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Set session
      req.session.userId = user.id;

      const { password: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error("Error logging in:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Logout (clears session)
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Error destroying session:", err);
        return res.status(500).json({ message: "Logout failed" });
      }
      res.clearCookie("connect.sid");
      res.json({ message: "Logged out" });
    });
  });
}
