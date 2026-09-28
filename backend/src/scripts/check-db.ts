import { config } from "../config/env.js";
import { closeDatabase, verifyDatabaseConnection } from "../db/index.js";

async function main(): Promise<void> {
  try {
    if (
      config.database.host !== "localhost" ||
      config.database.port !== 5432 ||
      config.database.database !== "nexamarket"
    ) {
      throw new Error("Database check is restricted to localhost:5432/nexamarket.");
    }
    await verifyDatabaseConnection();
    console.log("PostgreSQL connectivity verified: localhost:5432/nexamarket.");
  } finally {
    await closeDatabase();
  }
}

void main().catch(() => {
  console.error("Database check failed. Check the NexaMarket database configuration and availability.");
  process.exitCode = 1;
});
