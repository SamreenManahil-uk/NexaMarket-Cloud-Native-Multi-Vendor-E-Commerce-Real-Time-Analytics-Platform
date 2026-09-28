import { Pool } from "pg";
import { config } from "../config/env.js";

// Connections are opened lazily and reused across queries.
export const pool = new Pool({
  ...config.database,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  statement_timeout: 5_000,
});

// Idle clients can emit errors outside a query's promise rejection.
pool.on("error", () => {
  console.error("Unexpected PostgreSQL idle connection error.");
});

export async function verifyDatabaseConnection(): Promise<void> {
  await pool.query("SELECT 1");
}

// Call after database work has drained when shutting down a pool consumer.
export async function closeDatabase(): Promise<void> {
  await pool.end();
}
