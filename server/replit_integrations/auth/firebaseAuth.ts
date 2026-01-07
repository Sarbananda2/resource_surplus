import { initializeApp, cert, App } from "firebase-admin/app";
import { getAuth, Auth, DecodedIdToken } from "firebase-admin/auth";
import type { Express, Request, Response, NextFunction } from "express";
import { authStorage } from "./storage";

// Initialize Firebase Admin SDK
let firebaseApp: App | null = null;
let firebaseInitError: Error | null = null;
let firebaseInitAttempted = false;

// Detect if running in development mode
const isDev = process.env.NODE_ENV !== 'production';

// Try to initialize Firebase - returns the app or null if not configured/failed
function tryInitializeFirebase(): App | null {
  if (firebaseApp) {
    return firebaseApp;
  }

  if (firebaseInitAttempted) {
    return null; // Already tried and failed
  }

  firebaseInitAttempted = true;

  // Use environment-specific service account key
  const serviceAccountKey = isDev 
    ? process.env.FIREBASE_SERVICE_ACCOUNT_KEY_DEV 
    : process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  
  if (!serviceAccountKey) {
    const keyName = isDev ? "FIREBASE_SERVICE_ACCOUNT_KEY_DEV" : "FIREBASE_SERVICE_ACCOUNT_KEY";
    console.log(`Firebase: ${keyName} not set, Firebase Auth disabled`);
    return null;
  }

  try {
    // Handle potential escaping issues - sometimes the JSON gets double-escaped
    let keyToParse = serviceAccountKey.trim();
    
    // If it starts with a quote, it might be double-stringified
    if (keyToParse.startsWith('"') && keyToParse.endsWith('"')) {
      try {
        keyToParse = JSON.parse(keyToParse);
      } catch {
        // Not double-stringified, continue with original
      }
    }
    
    const serviceAccount = JSON.parse(keyToParse);
    
    // Debug: log what fields we found
    console.log("Firebase: Parsed service account, found keys:", Object.keys(serviceAccount).join(", "));
    
    // Validate that it looks like a service account key
    if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
      console.error("Firebase: Invalid service account key format. Missing fields - project_id:", !!serviceAccount.project_id, "private_key:", !!serviceAccount.private_key, "client_email:", !!serviceAccount.client_email);
      firebaseInitError = new Error("Invalid Firebase service account key format");
      return null;
    }

    // Ensure private_key has proper newlines (sometimes they get escaped)
    if (serviceAccount.private_key && typeof serviceAccount.private_key === 'string') {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }

    firebaseApp = initializeApp({
      credential: cert(serviceAccount),
    });
    console.log("Firebase Admin SDK initialized successfully for project:", serviceAccount.project_id);
    return firebaseApp;
  } catch (error: any) {
    console.error("Firebase: Failed to initialize Admin SDK:", error.message);
    // Log more details for debugging
    if (error.stack) {
      console.error("Firebase: Stack trace:", error.stack.split('\n').slice(0, 3).join('\n'));
    }
    firebaseInitError = error;
    return null;
  }
}

// Check if Firebase Auth is properly configured and initialized
export function isFirebaseReady(): boolean {
  const app = tryInitializeFirebase();
  return app !== null;
}

// Check if Firebase credentials are present (doesn't verify they're valid)
export function isFirebaseConfigured(): boolean {
  return isDev 
    ? !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY_DEV 
    : !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
}

// Get Firebase Auth instance (returns null if not ready)
export function getFirebaseAuth(): Auth | null {
  const app = tryInitializeFirebase();
  if (!app) return null;
  return getAuth(app);
}

// Verify Firebase ID token and return decoded claims
export async function verifyFirebaseToken(idToken: string): Promise<DecodedIdToken | null> {
  try {
    const auth = getFirebaseAuth();
    if (!auth) {
      console.log("Firebase: Cannot verify token - Firebase not initialized");
      return null;
    }
    const decodedToken = await auth.verifyIdToken(idToken);
    return decodedToken;
  } catch (error: any) {
    console.error("Firebase: Error verifying token:", error.message);
    return null;
  }
}

// Extract Firebase token from Authorization header
function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.substring(7);
}

// Extend Express Request to include Firebase user
declare global {
  namespace Express {
    interface Request {
      firebaseUser?: DecodedIdToken;
    }
  }
}

// Middleware to verify Firebase JWT tokens
export async function firebaseAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = extractBearerToken(req);
  
  if (!token) {
    // No Firebase token, continue to next auth method
    next();
    return;
  }

  // Only try to verify if Firebase is ready
  if (isFirebaseReady()) {
    const decodedToken = await verifyFirebaseToken(token);
    if (decodedToken) {
      req.firebaseUser = decodedToken;
    }
  }
  
  next();
}

// Upsert Firebase user to our database
export async function upsertFirebaseUser(decodedToken: DecodedIdToken) {
  const { uid, email, name, picture } = decodedToken;
  
  // Split name into first and last
  let firstName = "";
  let lastName = "";
  if (name) {
    const nameParts = name.split(" ");
    firstName = nameParts[0] || "";
    lastName = nameParts.slice(1).join(" ") || "";
  }

  return await authStorage.upsertUser({
    id: uid,
    email: email || null,
    firstName: firstName || null,
    lastName: lastName || null,
    profileImageUrl: picture || null,
  });
}

// Get Firebase initialization error if any
export function getFirebaseError(): Error | null {
  // Trigger initialization check
  tryInitializeFirebase();
  return firebaseInitError;
}
