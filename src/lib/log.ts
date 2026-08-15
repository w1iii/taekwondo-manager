/**
 * Minimal structured logging — no external dependency. In production each call
 * emits one JSON line (key-value pairs + optional error stack) so host log
 * pipelines (Vercel/Neon/whatever) can grep, filter, and correlate on
 * `event`, `actorId`, and `route`. In development it pretty-prints.
 *
 * Used by both server modules and the client global-error boundary, so no
 * `server-only` guard here — it never logs secrets, only IDs and counts.
 *
 * Why not Sentry outright? This covers the "log what mutates money/results"
 * requirement with zero infra, and the call sites are already centralized here
 * — swapping the bodies for `Sentry.captureException` later is a one-line change
 * per function. Add `global-error.tsx` (below) so unexpected errors reach it.
 */

type Fields = Record<string, unknown>;

function line(level: string, event: string, fields: Fields, error?: unknown): string {
  const record: Fields = {
    ts: new Date().toISOString(),
    level,
    event,
    ...fields,
  };
  if (error instanceof Error) {
    record.errorMessage = error.message;
    record.errorStack = error.stack;
  } else if (error !== undefined) {
    record.error = String(error);
  }
  return JSON.stringify(record);
}

export function logInfo(event: string, fields: Fields = {}): void {
  if (process.env.NODE_ENV !== "production") {
    console.info(`[info] ${event}`, fields);
    return;
  }
  console.log(line("info", event, fields));
}

export function logError(event: string, fields: Fields = {}, error?: unknown): void {
  if (process.env.NODE_ENV !== "production") {
    console.error(`[error] ${event}`, fields, error ?? "");
    return;
  }
  console.error(line("error", event, fields, error));
}

/**
 * Report an unexpected error from a server action or page. Call in catch
 * blocks after you've returned a friendly message to the user, so the real
 * cause doesn't vanish.
 */
export function reportError(
  event: string,
  fields: Fields = {},
  error?: unknown,
): void {
  logError(event, fields, error);
}