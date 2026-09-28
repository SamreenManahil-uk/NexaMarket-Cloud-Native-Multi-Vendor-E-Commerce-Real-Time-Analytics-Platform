import path from "node:path";
import { config } from "../config/env.js";
import { pool, closeDatabase } from "../db/index.js";
import { seedCatalogue } from "../db/seed.js";

async function main(): Promise<void> {
  try {
    await seedCatalogue(pool, config.database, path.resolve(__dirname, "../../database/seeds/development_catalogue.sql"));
    console.log("Fictional development catalogue seeded: localhost:5432/nexamarket.");
    console.log("1 user, 1 seller, 4 categories, 10 products, 10 inventory records; existing IDs preserved.");
  } finally {
    await closeDatabase();
  }
}
void main().catch((error: unknown) => {
  console.error("Development seed failed:", error instanceof Error ? error.message : "Unknown error");
  process.exitCode = 1;
});
