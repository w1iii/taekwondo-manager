import Link from "next/link";
import { CalendarDays, Users } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/events";
import { EventStatus } from "@/generated/prisma/client";
import { unstable_cache } from "next/cache";

export const metadata = { title: "Brackets" };

async function getAdminBracketsEvents() {
  const events = await db.event.findMany({
    where: { status: EventStatus.PUBLISHED },
    include: {
      divisions: true,
      _count: { select: { orders: true } },
    },
    orderBy: { eventDate: "desc" },
  });

  const eventIds = events.map((e) => e.id);
  const approvedCounts = await db.approvedAthlete.groupBy({
    by: ["eventId"],
    where: { eventId: { in: eventIds } },
    _count: { _all: true },
  });
  const approvedCountByEvent = new Map(
    approvedCounts.map((c) => [c.eventId, c._count._all]),
  );

  return events.map((e) => ({
    ...e,
    _count: {
      orders: e._count.orders,
      totalEntries: approvedCountByEvent.get(e.id) ?? 0,
    },
  }));
}

const getCachedAdminBracketsEvents = unstable_cache(getAdminBracketsEvents, ["admin-brackets-events"], {
  tags: ["events-published"],
});

export default async function BracketsAdminPage() {
  await requireRole("organizer");

  const events = await getCachedAdminBracketsEvents();

  const divisionIds = events.flatMap((e) => e.divisions.map((d) => d.id));
  const cellCounts = await db.bracketCell.groupBy({
    by: ["divisionId"],
    where: { divisionId: { in: divisionIds } },
    _count: { _all: true },
  });
  const cellCountByDivision = new Map(
    cellCounts.map((c) => [c.divisionId, c._count._all]),
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Brackets</h1>
        <p className="text-sm text-muted-foreground">
          Manage brackets per event — view players, generate divisions and draw
          single-elimination brackets for each.
        </p>
      </div>

      {events.length === 0 ? (
        <Card>
          <CardContent className="text-sm text-muted-foreground">
            Publish an event with registrations to start building brackets.
          </CardContent>
        </Card>
      ) : (
        events.map((event) => (
          <section key={event.id} className="space-y-3">
            <Card>
              <CardContent className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-heading text-base font-medium">{event.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    <CalendarDays className="mr-1 inline size-3.5" />
                    {formatDate(event.eventDate)} ·{" "}
                    <Users className="mr-1 inline size-3.5" />
                    {event._count.totalEntries} athlete
                    {event._count.totalEntries === 1 ? "" : "s"} ·{" "}
                    {event.divisions.length} division
                    {event.divisions.length === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {event.divisions.some((d) => (cellCountByDivision.get(d.id) ?? 0) > 0) ? (
                    <Badge variant="secondary">Bracket ready</Badge>
                  ) : null}
                  <Button
                    render={<Link href={`/admin/brackets/events/${event.id}`} />}
                    size="sm"
                  >
                    View
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>
        ))
      )}
    </div>
  );
}
