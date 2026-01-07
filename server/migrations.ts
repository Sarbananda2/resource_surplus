import { pool } from "./db";

export async function runStartupMigrations(): Promise<void> {
  console.log("Running startup database migrations...");

  const client = await pool.connect();
  try {
    const migrations = [
      {
        name: "add_approval_status_to_delivery_agent_profiles",
        sql: `
          ALTER TABLE delivery_agent_profiles 
          ADD COLUMN IF NOT EXISTS approval_status varchar(20) DEFAULT 'pending';
        `,
      },
      {
        name: "add_affiliated_ngo_id_to_delivery_agent_profiles",
        sql: `
          DO $$ 
          BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'delivery_agent_profiles' 
              AND column_name = 'affiliated_ngo_id'
            ) THEN
              ALTER TABLE delivery_agent_profiles 
              ADD COLUMN affiliated_ngo_id uuid REFERENCES ngo_profiles(id);
            END IF;
          END $$;
        `,
      },
      {
        name: "add_ngo_invite_links_table",
        sql: `
          CREATE TABLE IF NOT EXISTS ngo_invite_links (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            ngo_profile_id uuid NOT NULL REFERENCES ngo_profiles(id),
            code varchar(20) NOT NULL UNIQUE,
            label varchar(100),
            max_uses integer,
            used_count integer DEFAULT 0,
            expires_at timestamp,
            is_active boolean DEFAULT true,
            created_at timestamp DEFAULT now()
          );
        `,
      },
      {
        name: "add_visibility_preference_to_delivery_agent_profiles",
        sql: `
          ALTER TABLE delivery_agent_profiles 
          ADD COLUMN IF NOT EXISTS visibility_preference varchar(20) DEFAULT 'open';
        `,
      },
      {
        name: "add_assignment_type_to_delivery_tasks",
        sql: `
          ALTER TABLE delivery_tasks 
          ADD COLUMN IF NOT EXISTS assignment_type varchar(20) DEFAULT 'unassigned';
        `,
      },
      {
        name: "add_rejection_notes_to_delivery_agent_profiles",
        sql: `
          ALTER TABLE delivery_agent_profiles 
          ADD COLUMN IF NOT EXISTS rejection_notes text;
        `,
      },
      {
        name: "normalize_transport_type_values",
        sql: `
          UPDATE delivery_agent_profiles 
          SET transport_type = CASE transport_type
            WHEN 'bike' THEN 'bicycle'
            WHEN 'motorbike' THEN 'motorcycle'
            ELSE transport_type
          END
          WHERE transport_type IN ('bike', 'motorbike');
        `,
      },
      {
        name: "normalize_load_capacity_values",
        sql: `
          UPDATE delivery_agent_profiles 
          SET load_capacity = CASE load_capacity
            WHEN 'extra_large' THEN 'xlarge'
            ELSE load_capacity
          END
          WHERE load_capacity = 'extra_large';
        `,
      },
    ];

    const errors: string[] = [];

    for (const migration of migrations) {
      try {
        await client.query(migration.sql);
        console.log(`Migration "${migration.name}" completed successfully`);
      } catch (error: any) {
        if (error.code === "42701") {
          console.log(`Migration "${migration.name}" skipped (column already exists)`);
        } else if (error.code === "42P07") {
          console.log(`Migration "${migration.name}" skipped (table already exists)`);
        } else {
          console.error(`Migration "${migration.name}" failed:`, error.message);
          errors.push(`${migration.name}: ${error.message}`);
        }
      }
    }

    if (errors.length > 0) {
      throw new Error(`Critical migrations failed: ${errors.join(", ")}`);
    }

    console.log("Startup migrations completed successfully");
  } finally {
    client.release();
  }
}
