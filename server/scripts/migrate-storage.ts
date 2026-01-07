import { Storage } from "@google-cloud/storage";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

interface MigrationResult {
  source: string;
  destination: string;
  status: "success" | "error" | "skipped";
  error?: string;
}

async function migrateStorage(): Promise<void> {
  console.log("=== Storage Migration Script ===\n");
  
  const legacyBucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
  const newBucketName = process.env.GCS_BUCKET_NAME;
  const gcsServiceAccountKey = process.env.GCS_SERVICE_ACCOUNT_KEY;
  
  if (!legacyBucketId) {
    console.error("ERROR: DEFAULT_OBJECT_STORAGE_BUCKET_ID not set. Cannot access legacy bucket.");
    process.exit(1);
  }
  
  if (!newBucketName) {
    console.error("ERROR: GCS_BUCKET_NAME not set. Cannot access new bucket.");
    process.exit(1);
  }
  
  if (!gcsServiceAccountKey) {
    console.error("ERROR: GCS_SERVICE_ACCOUNT_KEY not set. Cannot access new bucket.");
    process.exit(1);
  }
  
  console.log(`Legacy Bucket: ${legacyBucketId}`);
  console.log(`New Bucket: ${newBucketName}\n`);
  
  const legacyStorage = new Storage({
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
  
  const gcsCredentials = JSON.parse(gcsServiceAccountKey);
  const newStorage = new Storage({
    credentials: gcsCredentials,
    projectId: gcsCredentials.project_id,
  });
  
  console.log("Listing files in legacy bucket...\n");
  
  const legacyBucket = legacyStorage.bucket(legacyBucketId);
  const newBucket = newStorage.bucket(newBucketName);
  
  try {
    const [files] = await legacyBucket.getFiles({ prefix: ".private/" });
    
    if (files.length === 0) {
      console.log("No files found in legacy bucket .private/ directory.");
      return;
    }
    
    console.log(`Found ${files.length} files to migrate:\n`);
    
    const results: MigrationResult[] = [];
    
    for (const file of files) {
      const sourcePath = file.name;
      const destPath = sourcePath;
      
      console.log(`Migrating: ${sourcePath}`);
      
      try {
        const destFile = newBucket.file(destPath);
        const [destExists] = await destFile.exists();
        
        if (destExists) {
          console.log(`  - SKIPPED (already exists in destination)\n`);
          results.push({
            source: sourcePath,
            destination: destPath,
            status: "skipped",
          });
          continue;
        }
        
        const [contents] = await file.download();
        const [metadata] = await file.getMetadata();
        
        const newMetadata: Record<string, string> = {
          migratedFrom: `${legacyBucketId}/${sourcePath}`,
          migratedAt: new Date().toISOString(),
        };
        
        if (metadata.metadata) {
          for (const [key, value] of Object.entries(metadata.metadata)) {
            if (typeof value === "string") {
              newMetadata[key] = value;
            }
          }
        }
        
        await destFile.save(contents, {
          contentType: metadata.contentType || "application/octet-stream",
          metadata: newMetadata,
        });
        
        console.log(`  - SUCCESS (${contents.length} bytes)\n`);
        results.push({
          source: sourcePath,
          destination: destPath,
          status: "success",
        });
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log(`  - ERROR: ${errorMessage}\n`);
        results.push({
          source: sourcePath,
          destination: destPath,
          status: "error",
          error: errorMessage,
        });
      }
    }
    
    console.log("\n=== Migration Summary ===");
    console.log(`Total files: ${results.length}`);
    console.log(`Successful: ${results.filter(r => r.status === "success").length}`);
    console.log(`Skipped: ${results.filter(r => r.status === "skipped").length}`);
    console.log(`Errors: ${results.filter(r => r.status === "error").length}`);
    
    const errors = results.filter(r => r.status === "error");
    if (errors.length > 0) {
      console.log("\nFailed files:");
      for (const err of errors) {
        console.log(`  - ${err.source}: ${err.error}`);
      }
    }
    
  } catch (error) {
    console.error("Failed to list files from legacy bucket:", error);
    process.exit(1);
  }
}

migrateStorage().catch(console.error);
