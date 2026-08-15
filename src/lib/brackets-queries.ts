import "server-only";

import { unstable_cache } from "next/cache";

import { db } from "@/lib/db";
import { EventStatus } from "@/generated/prisma/client";

export const getPublishedEvents = unstable_cache(
  async () =>
    db.event.findMany({
      where: { status: EventStatus.PUBLISHED },
      include: { divisions: true },
      orderBy: { eventDate: "asc" },
    }),
  ["published-events-divisions"],
  { tags: ["events-published"] },
);

export const getPublishedEvent = unstable_cache(
  async (eventId: string) =>
    db.event.findUnique({
      where: { id: eventId, status: EventStatus.PUBLISHED },
      include: { divisions: true },
    }),
  ["published-event-divisions"],
  { tags: ["events-published"] },
);

export const getBracketCells = unstable_cache(
  async (divisionIds: string[]) => {
    if (divisionIds.length === 0) return [];
    return db.bracketCell.findMany({
      where: { divisionId: { in: divisionIds } },
      include: { athlete: true },
      orderBy: [{ round: "desc" }, { position: "asc" }],
    });
  },
  ["bracket-cells"],
  { tags: ["brackets-cells"] },
);