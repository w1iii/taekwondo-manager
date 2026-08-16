import "server-only";

import { unstable_cache } from "next/cache";

import { db } from "@/lib/db";

export const EVENT_REGISTRATIONS_TAG = "event-registrations";

/**
 * All approved athletes for an event, cached per event.
 * Bracket generation reads this repeatedly — once per division — so the query
 * runs once per event instead of once per division. Invalidated via
 * `revalidateTag(EVENT_REGISTRATIONS_TAG, "max")` whenever an order is
 * approved.
 */
export const getEventEntries = unstable_cache(
  async (eventId: string) =>
    db.approvedAthlete.findMany({
      where: { eventId },
      include: { athlete: true, chapter: { select: { id: true } } },
      orderBy: { approvedAt: "asc" },
    }),
  ["event-entries"],
  { tags: [EVENT_REGISTRATIONS_TAG], revalidate: 3600 },
);
