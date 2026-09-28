import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { Pool } from "pg";

export function assertMigrationTarget(database: { host: string; port: number; database: string; user: string }): void {
  if (database.host !== "localhost" || database.port !== 5432 ||
      database.database !== "nexamarket" || database.user !== "nexamarket") {
    throw new Error("Migrations require localhost:5432/nexamarket with user nexamarket.");
  }
}

export async function migrate(pool: Pool, database: Parameters<typeof assertMigrationTarget>[0], directory: string): Promise<string[]> {
  assertMigrationTarget(database);
  const names = (await readdir(directory)).filter((name) => /^\d{3}_[a-z0-9_]+\.sql$/.test(name)).sort();
  if (names.length === 0) throw new Error("No SQL migrations found.");
  if (new Set(names.map((name) => name.slice(0, 3))).size !== names.length) {
    throw new Error("Duplicate migration numbers.");
  }
  const files = await Promise.all(names.map(async (name) => {
    const sql = await readFile(path.join(directory, name), "utf8");
    return { name, sql, checksum: createHash("sha256").update(sql).digest("hex") };
  }));
  const client = await pool.connect();
  try {
    const identity = await client.query("SELECT current_database() AS database, current_user AS username, inet_server_port() AS port");
    const actual = identity.rows[0];
    if (actual?.database !== "nexamarket" || actual?.username !== "nexamarket" || actual?.port !== 5432) {
      throw new Error("Connected database identity does not match the NexaMarket migration target.");
    }
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(748192, 1)");
    await client.query("SET LOCAL search_path = public, pg_catalog");
    await client.query(`CREATE TABLE IF NOT EXISTS public.schema_migrations (
      name TEXT PRIMARY KEY,
      checksum TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);
    const history = await client.query<{ name: string; checksum: string }>("SELECT name, checksum FROM public.schema_migrations ORDER BY name");
    for (const [index, record] of history.rows.entries()) {
      const file = files[index];
      if (!file || record.name !== file.name || record.checksum !== file.checksum) {
        throw new Error(`Migration history mismatch: ${record.name}. Restore applied files; add new migrations for changes.`);
      }
    }
    const applied: string[] = [];
    for (const file of files.slice(history.rows.length)) {
      await client.query(file.sql);
      await client.query("INSERT INTO public.schema_migrations (name, checksum) VALUES ($1, $2)", [file.name, file.checksum]);
      applied.push(file.name);
    }
    await client.query("COMMIT");
    return applied;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
