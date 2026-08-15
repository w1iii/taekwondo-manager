import "server-only";

import { unstable_cache } from "next/cache";

import { db } from "@/lib/db";

export const EVENT_ENROLLMENTS_TAG = "event-enrollments";

/**
 * All enrollments (with athletes) for an event, cached per event. Bracket
 * generation reads this repeatedly — once per division — so the query runs
 * once per event instead of once per division. Invalidated via
 * `revalidateTag(EVENT_ENROLLMENTS_TAG, "max")` whenever an enrollment is
 * created or removed.
 */
export const getEventEnrollments = unstable_cache(
  async (eventId: string) =>
    db.enrollment.findMany({
      where: { eventId },
      include: { athlete: true },
      orderBy: { createdAt: "asc" },
    }),
  ["event-enrollments"],
  { tags: [EVENT_ENROLLMENTS_TAG], revalidate: 3600 },
);
