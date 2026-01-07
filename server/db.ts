import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

// Detect environment - use _DEV suffixed secrets in development
const isDev = process.env.NODE_ENV !== 'production';

// Use environment-specific Cloud SQL URL, fallback to Replit DATABASE_URL
const databaseUrl = isDev 
  ? (process.env.CLOUD_SQL_DATABASE_URL_DEV || process.env.DATABASE_URL)
  : (process.env.CLOUD_SQL_DATABASE_URL || process.env.DATABASE_URL);

if (!databaseUrl) {
  const expectedVar = isDev ? "CLOUD_SQL_DATABASE_URL_DEV" : "CLOUD_SQL_DATABASE_URL";
  throw new Error(
    `${expectedVar} or DATABASE_URL must be set. Did you forget to provision a database?`,
  );
}

// Log which database we're connecting to
if (isDev && process.env.CLOUD_SQL_DATABASE_URL_DEV) {
  console.log("Using Cloud SQL DEV database");
} else if (!isDev && process.env.CLOUD_SQL_DATABASE_URL) {
  console.log("Using Cloud SQL PROD database");
} else {
  console.log("Using Replit PostgreSQL database");
}

export const pool = new Pool({ connectionString: databaseUrl });
export const db = drizzle(pool, { schema });
