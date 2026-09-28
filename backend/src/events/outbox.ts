import type { PoolClient } from "pg";
import { pool } from "../db/index.js";
import { publishKafkaEvent } from "./kafka.js";

export interface OutboxEventInput {
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  topic: string;
  payload: Record<string, unknown>;
}

interface OutboxRow {
  id: string;
  aggregate_type: string;
  aggregate_id: string;
  event_type: string;
  topic: string;
  payload: Record<string, unknown>;
  attempts: number;
}

const MAX_ATTEMPTS = 5;
const STALE_PROCESSING_MINUTES = 5;

export async function addOutboxEvent(
  client: PoolClient,
  event: OutboxEventInput,
): Promise<string> {
  const result = await client.query<{ id: string }>(
    `
      INSERT INTO public.outbox_events
        (aggregate_type, aggregate_id, event_type, topic, payload)
      VALUES ($1, $2, $3, $4, $5::jsonb)
      RETURNING id
    `,
    [
      event.aggregateType,
      event.aggregateId,
      event.eventType,
      event.topic,
      JSON.stringify(event.payload),
    ],
  );

  const row = result.rows[0];

  if (!row) {
    throw new Error("Failed to create outbox event.");
  }

  return row.id;
}

async function recoverStaleProcessingEvents(): Promise<number> {
  const result = await pool.query(
    `
      UPDATE public.outbox_events
      SET
        status = 'FAILED',
        last_error = COALESCE(
          last_error,
          'Recovered stale PROCESSING event.'
        )
      WHERE
        status = 'PROCESSING'
        AND published_at IS NULL
        AND created_at <
          CURRENT_TIMESTAMP -
          ($1::int * INTERVAL '1 minute')
        AND attempts < $2
    `,
    [STALE_PROCESSING_MINUTES, MAX_ATTEMPTS],
  );

  return result.rowCount ?? 0;
}

async function claimOutboxEvents(
  batchSize: number,
): Promise<OutboxRow[]> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query<OutboxRow>(
      `
        WITH candidates AS (
          SELECT id
          FROM public.outbox_events
          WHERE
            status IN ('PENDING', 'FAILED')
            AND attempts < $2
          ORDER BY created_at ASC
          FOR UPDATE SKIP LOCKED
          LIMIT $1
        )
        UPDATE public.outbox_events AS event
        SET
          status = 'PROCESSING',
          attempts = event.attempts + 1,
          last_error = NULL
        FROM candidates
        WHERE event.id = candidates.id
        RETURNING
          event.id,
          event.aggregate_type,
          event.aggregate_id,
          event.event_type,
          event.topic,
          event.payload,
          event.attempts
      `,
      [batchSize, MAX_ATTEMPTS],
    );

    await client.query("COMMIT");
    return result.rows;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function markPublished(eventId: string): Promise<void> {
  await pool.query(
    `
      UPDATE public.outbox_events
      SET
        status = 'PUBLISHED',
        published_at = CURRENT_TIMESTAMP,
        last_error = NULL
      WHERE
        id = $1
        AND status = 'PROCESSING'
    `,
    [eventId],
  );
}

async function markFailed(
  eventId: string,
  error: unknown,
): Promise<void> {
  const message =
    error instanceof Error
      ? error.message.slice(0, 2000)
      : "Unknown Kafka publishing error";

  await pool.query(
    `
      UPDATE public.outbox_events
      SET
        status = 'FAILED',
        last_error = $2
      WHERE
        id = $1
        AND status = 'PROCESSING'
    `,
    [eventId, message],
  );
}

export async function publishPendingOutboxEvents(
  batchSize = 50,
): Promise<number> {
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 500) {
    throw new Error("Outbox batch size must be between 1 and 500.");
  }

  await recoverStaleProcessingEvents();

  const events = await claimOutboxEvents(batchSize);

  let published = 0;

  for (const event of events) {
    try {
      await publishKafkaEvent(
        event.topic,
        event.aggregate_id,
        {
          eventId: event.id,
          eventType: event.event_type,
          aggregateType: event.aggregate_type,
          aggregateId: event.aggregate_id,
          occurredAt: new Date().toISOString(),
          data: event.payload,
        },
      );

      await markPublished(event.id);
      published += 1;
    } catch (error) {
      await markFailed(event.id, error);
    }
  }

  return published;
}

export async function getOutboxHealth() {
  const result = await pool.query<{
    status: string;
    count: string;
  }>(
    `
      SELECT status, COUNT(*)::text AS count
      FROM public.outbox_events
      GROUP BY status
      ORDER BY status
    `,
  );

  return Object.fromEntries(
    result.rows.map((row) => [
      row.status,
      Number(row.count),
    ]),
  );
}
