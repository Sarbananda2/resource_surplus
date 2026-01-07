import type { Express } from "express";
import { verifyFirebaseToken, upsertFirebaseUser, isFirebaseReady, getFirebaseError } from "./firebaseAuth";
import { authStorage } from "./storage";

// Register Firebase auth routes
export function registerFirebaseRoutes(app: Express): void {
  // Exchange Firebase ID token for a session
  app.post("/api/firebase/session", async (req, res) => {
    try {
      if (!isFirebaseReady()) {
        const error = getFirebaseError();
        return res.status(503).json({ 
          message: "Firebase authentication is not available",
          reason: error?.message || "Not configured"
        });
      }

      const { idToken } = req.body;
      
      if (!idToken) {
        return res.status(400).json({ message: "Firebase ID token is required" });
      }

      // Verify the Firebase token
      const decodedToken = await verifyFirebaseToken(idToken);
      
      if (!decodedToken) {
        return res.status(401).json({ message: "Invalid Firebase token" });
      }

      // Upsert user to our database
      const user = await upsertFirebaseUser(decodedToken);

      // Set session with the user ID (same as email/password login)
      req.session.userId = user.id;

      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error("Error creating Firebase session:", error);
      res.status(500).json({ message: "Failed to create session" });
    }
  });

  // Get current user via Firebase token (stateless, no session)
  app.get("/api/firebase/user", async (req, res) => {
    try {
      if (!isFirebaseReady()) {
        return res.status(503).json({ message: "Firebase authentication is not available" });
      }

      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Authorization header required" });
      }

      const idToken = authHeader.substring(7);
      const decodedToken = await verifyFirebaseToken(idToken);
      
      if (!decodedToken) {
        return res.status(401).json({ message: "Invalid Firebase token" });
      }

      // Get user from database
      const user = await authStorage.getUser(decodedToken.uid);
      
      if (!user) {
        // User not in database yet, create them
        const newUser = await upsertFirebaseUser(decodedToken);
        const { password, ...safeUser } = newUser;
        return res.json(safeUser);
      }

      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error("Error fetching Firebase user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Check Firebase configuration status - frontend uses this to decide whether to show Google button
  app.get("/api/firebase/status", (req, res) => {
    const isDev = process.env.NODE_ENV !== 'production';
    const projectId = isDev 
      ? process.env.VITE_FIREBASE_PROJECT_ID_DEV 
      : process.env.VITE_FIREBASE_PROJECT_ID;
    res.json({
      ready: isFirebaseReady(),
      projectId: projectId || null,
    });
  });
}
