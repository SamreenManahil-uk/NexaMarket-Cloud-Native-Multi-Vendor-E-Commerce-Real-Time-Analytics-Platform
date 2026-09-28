import { config } from "./config/env.js";
import { app } from "./app.js";

const server = app.listen(config.port);

server.on("listening", () => {
  console.log(`NexaMarket API listening on http://localhost:${config.port}`);
});

server.on("error", (error: Error) => {
  console.error("Failed to start NexaMarket API:", error.message);
  process.exitCode = 1;
});
