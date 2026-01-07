import { Storage, File } from "@google-cloud/storage";
import { Response } from "express";
import { randomUUID } from "crypto";
import {
  ObjectAclPolicy,
  ObjectPermission,
  canAccessObject,
  getObjectAclPolicy,
  setObjectAclPolicy,
} from "./objectAcl";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

function getGCSCredentials(): { credentials: object; bucketName: string } {
  const isProduction = process.env.NODE_ENV === "production";
  
  // Use environment-specific bucket names
  const bucketName = isProduction
    ? "surplusflow-prod-storage"
    : "surplusflow-dev-storage";

  // Use environment-specific service account keys
  const serviceAccountKeyEnvVar = isProduction
    ? "GCS_SERVICE_ACCOUNT_KEY"
    : "GCS_SERVICE_ACCOUNT_KEY_DEV";
  
  const serviceAccountKey = process.env[serviceAccountKeyEnvVar];
  if (!serviceAccountKey) {
    throw new Error(
      `${serviceAccountKeyEnvVar} secret not set. Please add your GCS service account JSON key for ${isProduction ? "production" : "development"}.`
    );
  }

  try {
    const credentials = JSON.parse(serviceAccountKey);
    console.log(`[GCS] Using ${isProduction ? "production" : "development"} bucket: ${bucketName}`);
    return { credentials, bucketName };
  } catch (error) {
    throw new Error(
      `Failed to parse ${serviceAccountKeyEnvVar}. Ensure it contains valid JSON.`
    );
  }
}

let _objectStorageClient: Storage | null = null;
let _legacyStorageClient: Storage | null = null;
let _bucketName: string | null = null;

function getStorageClient(): Storage {
  if (!_objectStorageClient) {
    const { credentials, bucketName } = getGCSCredentials();
    _bucketName = bucketName;
    _objectStorageClient = new Storage({
      credentials: credentials as any,
      projectId: (credentials as any).project_id,
    });
  }
  return _objectStorageClient;
}

function getLegacyStorageClient(): Storage {
  if (!_legacyStorageClient) {
    _legacyStorageClient = new Storage({
      credentials: {
        audience: "replit",
        subject_token_type: "access_token",
        token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
        type: "external_account",
        credential_source: {
          url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
          format: {
            type: "json",
            subject_token_field_name: "access_token",
          },
        },
        universe_domain: "googleapis.com",
      },
      projectId: "",
    });
  }
  return _legacyStorageClient;
}

function getLegacyBucketId(): string | null {
  return process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID || null;
}

function getBucketName(): string {
  if (!_bucketName) {
    const { bucketName } = getGCSCredentials();
    _bucketName = bucketName;
  }
  return _bucketName;
}

export const objectStorageClient = {
  bucket: (name: string) => getStorageClient().bucket(name),
};

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export class ObjectStorageService {
  constructor() {}

  private getDefaultBucketName(): string {
    return getBucketName();
  }

  getPublicObjectSearchPaths(): Array<string> {
    const bucketName = this.getDefaultBucketName();
    return [`/${bucketName}/public`];
  }

  getPrivateObjectDir(): string {
    const bucketName = this.getDefaultBucketName();
    return `/${bucketName}/.private`;
  }

  async searchPublicObject(filePath: string): Promise<File | null> {
    const storage = getStorageClient();
    
    for (const searchPath of this.getPublicObjectSearchPaths()) {
      const fullPath = `${searchPath}/${filePath}`;
      const { bucketName, objectName } = parseObjectPath(fullPath);
      const bucket = storage.bucket(bucketName);
      const file = bucket.file(objectName);

      const [exists] = await file.exists();
      if (exists) {
        return file;
      }
    }

    return null;
  }

  async downloadObject(file: File, res: Response, cacheTtlSec: number = 3600) {
    try {
      const [metadata] = await file.getMetadata();
      const aclPolicy = await getObjectAclPolicy(file);
      const isPublic = aclPolicy?.visibility === "public";
      
      res.set({
        "Content-Type": metadata.contentType || "application/octet-stream",
        "Content-Length": metadata.size,
        "Cache-Control": `${
          isPublic ? "public" : "private"
        }, max-age=${cacheTtlSec}`,
      });

      const stream = file.createReadStream();

      stream.on("error", (err) => {
        console.error("Stream error:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Error streaming file" });
        }
      });

      stream.pipe(res);
    } catch (error) {
      console.error("Error downloading file:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error downloading file" });
      }
    }
  }

  async getObjectEntityUploadURL(): Promise<string> {
    const privateObjectDir = this.getPrivateObjectDir();
    const objectId = randomUUID();
    const fullPath = `${privateObjectDir}/uploads/${objectId}`;

    const { bucketName, objectName } = parseObjectPath(fullPath);

    return signObjectURL({
      bucketName,
      objectName,
      method: "PUT",
      ttlSec: 900,
    });
  }

  async getObjectEntityFile(objectPath: string): Promise<File> {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }

    const parts = objectPath.slice(1).split("/");
    if (parts.length < 2) {
      throw new ObjectNotFoundError();
    }

    const entityId = parts.slice(1).join("/");
    
    let entityDir = this.getPrivateObjectDir();
    if (!entityDir.endsWith("/")) {
      entityDir = `${entityDir}/`;
    }
    const objectEntityPath = `${entityDir}${entityId}`;
    const { bucketName, objectName } = parseObjectPath(objectEntityPath);
    
    const storage = getStorageClient();
    const bucket = storage.bucket(bucketName);
    const objectFile = bucket.file(objectName);
    
    try {
      const [exists] = await objectFile.exists();
      if (exists) {
        return objectFile;
      }
    } catch (error) {
      console.error(`[GCS] Error checking bucket ${bucketName}:`, error);
    }
    
    const legacyFile = await this.tryGetLegacyObjectEntityFile(entityId);
    if (legacyFile) {
      return legacyFile;
    }
    
    throw new ObjectNotFoundError();
  }
  
  private async tryGetLegacyObjectEntityFile(entityId: string): Promise<File | null> {
    const legacyBucketId = getLegacyBucketId();
    if (!legacyBucketId) {
      return null;
    }
    
    try {
      const legacyStorage = getLegacyStorageClient();
      const legacyBucket = legacyStorage.bucket(legacyBucketId);
      const legacyObjectPath = `.private/${entityId}`;
      const legacyFile = legacyBucket.file(legacyObjectPath);
      const [exists] = await legacyFile.exists();
      
      if (exists) {
        console.log(`[MIGRATION] Found legacy file: ${legacyObjectPath} in bucket ${legacyBucketId}`);
        return legacyFile;
      }
    } catch (error) {
      console.warn(`[MIGRATION] Failed to check legacy bucket: ${error}`);
    }
    
    return null;
  }

  normalizeObjectEntityPath(rawPath: string): string {
    if (!rawPath.startsWith("https://storage.googleapis.com/")) {
      return rawPath;
    }

    const url = new URL(rawPath);
    const rawObjectPath = url.pathname;

    let objectEntityDir = this.getPrivateObjectDir();
    if (!objectEntityDir.endsWith("/")) {
      objectEntityDir = `${objectEntityDir}/`;
    }

    if (!rawObjectPath.startsWith(objectEntityDir)) {
      return rawObjectPath;
    }

    const entityId = rawObjectPath.slice(objectEntityDir.length);
    return `/objects/${entityId}`;
  }

  async trySetObjectEntityAclPolicy(
    rawPath: string,
    aclPolicy: ObjectAclPolicy
  ): Promise<string> {
    const normalizedPath = this.normalizeObjectEntityPath(rawPath);
    if (!normalizedPath.startsWith("/")) {
      return normalizedPath;
    }

    const objectFile = await this.getObjectEntityFile(normalizedPath);
    await setObjectAclPolicy(objectFile, aclPolicy);
    return normalizedPath;
  }

  async canAccessObjectEntity({
    userId,
    objectFile,
    requestedPermission,
  }: {
    userId?: string;
    objectFile: File;
    requestedPermission?: ObjectPermission;
  }): Promise<boolean> {
    return canAccessObject({
      userId,
      objectFile,
      requestedPermission: requestedPermission ?? ObjectPermission.READ,
    });
  }

  async getObjectEntitySignedUrl(objectPath: string, ttlSec: number = 3600): Promise<string> {
    const objectFile = await this.getObjectEntityFile(objectPath);
    return this.getSignedUrlForFile(objectFile, ttlSec);
  }
  
  async getSignedUrlForFile(objectFile: File, ttlSec: number = 3600): Promise<string> {
    const bucketName = objectFile.bucket.name;
    const objectName = objectFile.name;
    
    return signObjectURL({
      bucketName,
      objectName,
      method: "GET",
      ttlSec,
    });
  }
}

function parseObjectPath(path: string): {
  bucketName: string;
  objectName: string;
} {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  const pathParts = path.split("/");
  if (pathParts.length < 3) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }

  const bucketName = pathParts[1];
  const objectName = pathParts.slice(2).join("/");

  return {
    bucketName,
    objectName,
  };
}

async function signObjectURL({
  bucketName,
  objectName,
  method,
  ttlSec,
}: {
  bucketName: string;
  objectName: string;
  method: "GET" | "PUT" | "DELETE" | "HEAD";
  ttlSec: number;
}): Promise<string> {
  const storage = getStorageClient();
  const bucket = storage.bucket(bucketName);
  const file = bucket.file(objectName);

  const actionMap: Record<string, "read" | "write" | "delete"> = {
    GET: "read",
    PUT: "write",
    DELETE: "delete",
    HEAD: "read",
  };

  const [signedUrl] = await file.getSignedUrl({
    version: "v4",
    action: actionMap[method],
    expires: Date.now() + ttlSec * 1000,
  });

  return signedUrl;
}
