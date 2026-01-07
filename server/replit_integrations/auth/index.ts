export { setupAuth, isAuthenticated, getSession } from "./replitAuth";
export { authStorage, type IAuthStorage } from "./storage";
export { registerAuthRoutes } from "./routes";
export { 
  firebaseAuthMiddleware, 
  verifyFirebaseToken, 
  upsertFirebaseUser,
  isFirebaseConfigured,
  isFirebaseReady,
  getFirebaseAuth,
  getFirebaseError
} from "./firebaseAuth";
export { registerFirebaseRoutes } from "./firebaseRoutes";
