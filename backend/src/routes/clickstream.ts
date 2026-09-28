import { randomUUID } from "node:crypto";
import { Router } from "express";
import { publishKafkaEvent } from "../events/kafka.js";

export const clickstreamRouter = Router();

const allowedEvents = new Set([
  "PAGE_VIEW",
  "PRODUCT_VIEW",
  "SEARCH",
  "ADD_TO_CART",
  "ADD_TO_WISHLIST",
]);

clickstreamRouter.post("/events/clickstream", async (req, res, next) => {
  try {
    const { eventType, sessionId, productId, searchQuery, path } = req.body ?? {};

    if (typeof eventType !== "string" || !allowedEvents.has(eventType)) {
      res.status(400).json({ error: "Invalid clickstream event type" });
      return;
    }

    if (typeof sessionId !== "string" || sessionId.trim().length === 0) {
      res.status(400).json({ error: "sessionId is required" });
      return;
    }

    const eventId = randomUUID();

    const event = {
      eventId,
      eventType,
      occurredAt: new Date().toISOString(),
      sessionId: sessionId.trim(),
      productId: typeof productId === "string" ? productId : null,
      searchQuery: typeof searchQuery === "string" ? searchQuery : null,
      path: typeof path === "string" ? path : null,
    };

    await publishKafkaEvent(
      "nexamarket.clickstream",
      sessionId.trim(),
      event,
    );

    res.status(202).json({
      data: {
        eventId,
        accepted: true,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default clickstreamRouter;
