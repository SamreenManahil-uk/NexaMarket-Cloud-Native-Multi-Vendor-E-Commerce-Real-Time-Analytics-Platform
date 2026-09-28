import type { Request, Response } from "express";

import {
  askNexaAssistant,
} from "../services/aiAssistant.js";

export async function assistant(
  req: Request,
  res: Response,
): Promise<void> {
  const message =
    typeof req.body?.message === "string"
      ? req.body.message.trim()
      : "";

  if (!message) {
    res.status(400).json({
      error: "message is required",
    });
    return;
  }

  if (message.length > 500) {
    res.status(400).json({
      error: "message must be 500 characters or fewer",
    });
    return;
  }

  const result = await askNexaAssistant(message);

  res.status(200).json({
    data: result,
  });
}
