import "server-only";

import { randomUUID } from "crypto";

import { db } from "@/lib/db";

/**
 * Fixed-window rate limit backed by a single Postgres upsert, so concurrent
 * requests can never race past `limit` (the counter is mutated atomically
 * server-side by the `ON CONFLICT ... DO UPDATE`). Returns `true` when the
 * caller is allowed through, `false` when the window's budget is exhausted.
 *
 * The window is per-call: if `now - windowStart` exceeds `windowMs` the row is
 * reset to a fresh window of count 1. One row is kept per key, so storage cost
 * is bounded by the number of distinct users × actions.
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<boolean> {
  const now = new Date();
  const cutoff = new Date(now.getTime() - windowMs);

  const rows = await db.$queryRaw<
    { count: number }[]
  >`INSERT INTO "RateLimit" ("id", "key", "count", "windowStart", "updatedAt")
    VALUES (${randomUUID()}, ${key}, 1, ${now}, ${now})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."windowStart" < ${cutoff} THEN 1 ELSE "RateLimit"."count" + 1 END,
      "windowStart" = CASE WHEN "RateLimit"."windowStart" < ${cutoff} THEN ${now} ELSE "RateLimit"."windowStart" END,
      "updatedAt" = ${now}
    RETURNING "count";`;

  const count = rows[0]?.count ?? 0;
  return count <= limit;
}