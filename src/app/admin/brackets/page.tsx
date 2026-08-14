import Link from "next/link";
import { CalendarDays, Users } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/events";
import { athletesInDivision } from "@/lib/brackets";
import { EventStatus, type Event, type Division } from "@/generated/prisma/client";
import { ActionButton } from "@/components/action-button";
import { generateBracket, generateDivisions, resetBracket } from "./actions";

export const metadata = { title: "Brackets" };

export default async function BracketsAdminPage() {
  await requireRole("organizer");

  const events = await db.event.findMany({
    where: { status: EventStatus.PUBLISHED },
    include: {
      divisions: true,
      enrollments: { include: { athlete: true } },
    },
    orderBy: { eventDate: "desc" },
  });

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
          Generate divisions from registrations, then build single-elimination
          brackets for each division.
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
          <EventSection
            key={event.id}
            event={event}
            cellCountByDivision={cellCountByDivision}
          />
        ))
      )}
    </div>
  );
}

function EventSection({
  event,
  cellCountByDivision,
}: {
  event: Event & { divisions: Division[]; enrollments: { athlete: { id: string; gender: "MALE" | "FEMALE"; birthYear: number } }[] };
  cellCountByDivision: Map<string, number>;
}) {
  const year = event.eventDate.getFullYear();
  const athletes = event.enrollments.map((e) => e.athlete);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-base font-medium">{event.name}</h2>
          <p className="text-sm text-muted-foreground">
            <CalendarDays className="mr-1 inline size-3.5" />
            {formatDate(event.eventDate)} · {athletes.length} athlete
            {athletes.length === 1 ? "" : "s"}
          </p>
        </div>
        <form action={generateDivisions}>
          <input type="hidden" name="eventId" value={event.id} />
          <ActionButton
            label={event.divisions.length > 0 ? "Regenerate divisions" : "Generate divisions"}
            variant="outline"
          />
        </form>
      </div>

      {event.divisions.length === 0 ? (
        <Card>
          <CardContent className="text-sm text-muted-foreground">
            No divisions yet — generate them from current registrations.
          </CardContent>
        </Card>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {event.divisions.map((division) => {
            const count = athletesInDivision(division, year, athletes).length;
            const hasBracket = (cellCountByDivision.get(division.id) ?? 0) > 0;
            return (
              <li key={division.id} className="rounded-lg border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{division.name}</p>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="size-3.5" />
                    {count}
                  </p>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {hasBracket ? (
                    <Button
                      render={<Link href={`/admin/brackets/${division.id}`} />}
                      size="sm"
                    >
                      View bracket
                    </Button>
                  ) : (
                    <form action={generateBracket}>
                      <input type="hidden" name="divisionId" value={division.id} />
                      <ActionButton label="Generate bracket" />
                    </form>
                  )}
                  <form action={resetBracket}>
                    <input type="hidden" name="divisionId" value={division.id} />
                    <ActionButton
                      label="Reset"
                      variant="outline"
                      pendingLabel="Clearing…"
                    />
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}