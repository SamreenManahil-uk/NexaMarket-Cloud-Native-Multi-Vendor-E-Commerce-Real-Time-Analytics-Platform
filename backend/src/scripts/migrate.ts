import path from "node:path";
import { config } from "../config/env.js";
import { pool, closeDatabase } from "../db/index.js";
import { migrate } from "../db/migrate.js";

async function main(): Promise<void> {
  try {
    const applied = await migrate(pool, config.database, path.resolve(__dirname, "../../database/migrations"));
    console.log("Migration target: localhost:5432/nexamarket (user nexamarket).");
    console.log(applied.length ? `Applied: ${applied.join(", ")}` : "Database is up to date.");
  } finally {
    await closeDatabase();
  }
}

void main().catch((error: unknown) => {
  console.error("Migration failed:", error instanceof Error ? error.message : "Unknown error");
  process.exitCode = 1;
});
