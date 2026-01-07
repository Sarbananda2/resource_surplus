import { initializeApp, type FirebaseApp } from "firebase/app";
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type Auth,
  type User as FirebaseUser
} from "firebase/auth";

// Firebase configuration from environment variables
// Use _DEV suffixed variables in development, original variables in production
const isDev = import.meta.env.DEV;

const firebaseConfig = {
  apiKey: isDev ? import.meta.env.VITE_FIREBASE_API_KEY_DEV : import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: isDev ? import.meta.env.VITE_FIREBASE_AUTH_DOMAIN_DEV : import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: isDev ? import.meta.env.VITE_FIREBASE_PROJECT_ID_DEV : import.meta.env.VITE_FIREBASE_PROJECT_ID,
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

// Check if Firebase is configured
export function isFirebaseConfigured(): boolean {
  if (isDev) {
    return !!(
      import.meta.env.VITE_FIREBASE_API_KEY_DEV &&
      import.meta.env.VITE_FIREBASE_AUTH_DOMAIN_DEV &&
      import.meta.env.VITE_FIREBASE_PROJECT_ID_DEV
    );
  }
  return !!(
    import.meta.env.VITE_FIREBASE_API_KEY &&
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN &&
    import.meta.env.VITE_FIREBASE_PROJECT_ID
  );
}

// Initialize Firebase (lazy initialization)
export function getFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseConfigured()) {
    console.warn("Firebase is not configured. Missing environment variables.");
    return null;
  }

  if (!app) {
    app = initializeApp(firebaseConfig);
  }
  return app;
}

// Get Firebase Auth instance
export function getFirebaseAuth(): Auth | null {
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) return null;

  if (!auth) {
    auth = getAuth(firebaseApp);
  }
  return auth;
}

// Sign in with Google popup
export async function signInWithGoogle(): Promise<FirebaseUser | null> {
  const auth = getFirebaseAuth();
  if (!auth) {
    throw new Error("Firebase is not configured");
  }

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    prompt: "select_account",
  });

  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error: any) {
    console.error("Google sign-in error:", error);
    throw error;
  }
}

// Sign out from Firebase
export async function signOut(): Promise<void> {
  const auth = getFirebaseAuth();
  if (auth) {
    await firebaseSignOut(auth);
  }
}

// Get current Firebase user
export function getCurrentUser(): FirebaseUser | null {
  const auth = getFirebaseAuth();
  return auth?.currentUser || null;
}

// Get ID token for the current user
export async function getIdToken(): Promise<string | null> {
  const user = getCurrentUser();
  if (!user) return null;

  try {
    return await user.getIdToken();
  } catch (error) {
    console.error("Error getting ID token:", error);
    return null;
  }
}

// Subscribe to auth state changes
export function onAuthChange(callback: (user: FirebaseUser | null) => void): () => void {
  const auth = getFirebaseAuth();
  if (!auth) {
    callback(null);
    return () => {};
  }

  return onAuthStateChanged(auth, callback);
}

// Exchange Firebase token for server session
export async function exchangeTokenForSession(idToken: string): Promise<any> {
  const response = await fetch("/api/firebase/session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ idToken }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to create session");
  }

  return response.json();
}

// Check if Firebase is ready on the backend
export async function checkFirebaseBackendStatus(): Promise<{ ready: boolean; projectId: string | null }> {
  try {
    const response = await fetch("/api/firebase/status");
    if (!response.ok) {
      return { ready: false, projectId: null };
    }
    return response.json();
  } catch {
    return { ready: false, projectId: null };
  }
}
