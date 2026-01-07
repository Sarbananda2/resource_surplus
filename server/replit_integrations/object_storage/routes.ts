import type { Express, RequestHandler } from "express";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission, getObjectAclPolicy } from "./objectAcl";
import { authStorage } from "../auth/storage";

/**
 * Optional auth middleware that populates req.user if session exists.
 * Unlike isAuthenticated, this doesn't block unauthenticated requests
 * (needed because some objects may be public).
 */
const optionalAuth: RequestHandler = async (req: any, res, next) => {
  // Check session-based auth
  if (req.session?.userId) {
    const user = await authStorage.getUser(req.session.userId);
    if (user) {
      req.user = { claims: { sub: user.id } };
    }
  }
  
  // Check for Firebase Bearer token
  if (!req.user) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const { verifyFirebaseToken, upsertFirebaseUser, isFirebaseReady } = await import("../auth/firebaseAuth");
        if (isFirebaseReady()) {
          const idToken = authHeader.substring(7);
          const decodedToken = await verifyFirebaseToken(idToken);
          if (decodedToken) {
            const user = await upsertFirebaseUser(decodedToken);
            req.user = { claims: { sub: user.id } };
          }
        }
      } catch (error) {
        // Ignore token errors for optional auth
      }
    }
  }
  
  next();
};

/**
 * Register object storage routes for file uploads.
 *
 * This provides example routes for the presigned URL upload flow:
 * 1. POST /api/uploads/request-url - Get a presigned URL for uploading
 * 2. The client then uploads directly to the presigned URL
 *
 * IMPORTANT: These are example routes. Customize based on your use case:
 * - Add authentication middleware for protected uploads
 * - Add file metadata storage (save to database after upload)
 * - Add ACL policies for access control
 */
export function registerObjectStorageRoutes(app: Express): void {
  const objectStorageService = new ObjectStorageService();

  /**
   * Request a presigned URL for file upload.
   *
   * Request body (JSON):
   * {
   *   "name": "filename.jpg",
   *   "size": 12345,
   *   "contentType": "image/jpeg"
   * }
   *
   * Response:
   * {
   *   "uploadURL": "https://storage.googleapis.com/...",
   *   "objectPath": "/objects/uploads/uuid"
   * }
   *
   * IMPORTANT: The client should NOT send the file to this endpoint.
   * Send JSON metadata only, then upload the file directly to uploadURL.
   */
  app.post("/api/uploads/request-url", async (req, res) => {
    try {
      const { name, size, contentType } = req.body;

      if (!name) {
        return res.status(400).json({
          error: "Missing required field: name",
        });
      }

      const uploadURL = await objectStorageService.getObjectEntityUploadURL();

      // Extract object path from the presigned URL for later reference
      const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);

      res.json({
        uploadURL,
        objectPath,
        // Echo back the metadata for client convenience
        metadata: { name, size, contentType },
      });
    } catch (error) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  /**
   * Get a signed URL for downloading an object.
   *
   * GET /api/objects/signed-url?path=/objects/uploads/uuid
   *
   * Returns a signed URL that the client can use to download directly from GCS.
   * This is faster than proxying through the server.
   * 
   * Access control: 
   * - Public files (visibility=public): accessible by anyone
   * - Files without ACL policy: require authentication
   * - Private files (visibility=private): require authentication + ACL check
   */
  app.get("/api/objects/signed-url", optionalAuth, async (req: any, res) => {
    try {
      const objectPath = req.query.path as string;
      if (!objectPath) {
        return res.status(400).json({ error: "Missing required query parameter: path" });
      }

      const objectFile = await objectStorageService.getObjectEntityFile(objectPath);
      const aclPolicy = await getObjectAclPolicy(objectFile);
      const userId = req.user?.claims?.sub;
      
      const isExplicitlyPublic = aclPolicy?.visibility === "public";
      
      if (!isExplicitlyPublic) {
        if (!userId) {
          res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
          return res.status(401).json({ error: "Authentication required" });
        }
        
        if (aclPolicy?.visibility === "private") {
          const canAccess = await objectStorageService.canAccessObjectEntity({
            userId,
            objectFile,
            requestedPermission: ObjectPermission.READ,
          });
          
          if (!canAccess) {
            res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
            return res.status(403).json({ error: "Access denied" });
          }
        }
      }

      const signedUrl = await objectStorageService.getSignedUrlForFile(objectFile);
      res.json({ url: signedUrl });
    } catch (error) {
      console.error("Error generating signed URL:", error);
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ error: "Object not found" });
      }
      return res.status(500).json({ error: "Failed to generate signed URL" });
    }
  });

  /**
   * Serve uploaded objects via redirect to signed URL.
   *
   * GET /objects/:objectPath(*)
   *
   * This redirects to a signed URL for faster downloads directly from GCS.
   * 
   * Access control: 
   * - Public files (visibility=public): accessible by anyone
   * - Files without ACL policy: require authentication
   * - Private files (visibility=private): require authentication + ACL check
   */
  app.get("/objects/:objectPath(*)", optionalAuth, async (req: any, res) => {
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      const aclPolicy = await getObjectAclPolicy(objectFile);
      const userId = req.user?.claims?.sub;
      
      const isExplicitlyPublic = aclPolicy?.visibility === "public";
      
      if (!isExplicitlyPublic) {
        if (!userId) {
          res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
          return res.status(401).json({ error: "Authentication required" });
        }
        
        if (aclPolicy?.visibility === "private") {
          const canAccess = await objectStorageService.canAccessObjectEntity({
            userId,
            objectFile,
            requestedPermission: ObjectPermission.READ,
          });
          
          if (!canAccess) {
            res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
            return res.status(403).json({ error: "Access denied" });
          }
        }
      }

      const signedUrl = await objectStorageService.getSignedUrlForFile(objectFile);
      res.redirect(302, signedUrl);
    } catch (error) {
      console.error("Error serving object:", error);
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ error: "Object not found" });
      }
      return res.status(500).json({ error: "Failed to serve object" });
    }
  });
}

