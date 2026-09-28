import { Router } from "express";

import {
  assistant,
} from "../controllers/aiAssistant.js";

export const aiAssistantRouter = Router();

aiAssistantRouter.post(
  "/ai/assistant",
  assistant,
);
