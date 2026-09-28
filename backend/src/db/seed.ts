import { readFile } from "node:fs/promises";
import type { Pool } from "pg";

interface SeedTarget { host: string; port: number; database: string; user: string }

export async function seedCatalogue(pool: Pool, database: SeedTarget, file: string): Promise<void> {
  if (database.host !== "localhost" || database.port !== 5432 ||
      database.database !== "nexamarket" || database.user !== "nexamarket") {
    throw new Error("Development seed requires localhost:5432/nexamarket with user nexamarket.");
  }
  if (process.env.NODE_ENV === "production") throw new Error("Development seed is disabled in production.");
  const sql = await readFile(file, "utf8");
  const client = await pool.connect();
  try {
    const { rows } = await client.query("SELECT current_database() AS database, current_user AS username, inet_server_port() AS port");
    if (rows[0]?.database !== "nexamarket" || rows[0]?.username !== "nexamarket" || rows[0]?.port !== 5432) {
      throw new Error("Connected database identity does not match the NexaMarket seed target.");
    }
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(748192, 2)");
    await client.query(sql);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
