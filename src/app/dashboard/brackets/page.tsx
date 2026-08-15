import { CalendarDays, Medal, Trophy } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/events";
import { EventStatus, PaymentStatus } from "@/generated/prisma/client";
import { BracketView } from "@/components/bracket-view";
import { LiveBracketsRefresh } from "@/components/live-brackets-refresh";
import { championsOf } from "@/lib/brackets";
import { unstable_cache } from "next/cache";

export const metadata = { title: "Brackets & Schedule" };

async function getPublishedEventsWithDivisions() {
  return db.event.findMany({
    where: { status: EventStatus.PUBLISHED },
    include: { divisions: true },
    orderBy: { eventDate: "asc" },
  });
}

const getCachedPublishedEventsWithDivisions = unstable_cache(
  getPublishedEventsWithDivisions,
  ["published-events-divisions"],
  { tags: ["events-published"] },
);

async function getBracketCells(divisionIds: string[]) {
  if (divisionIds.length === 0) return [];
  return db.bracketCell.findMany({
    where: { divisionId: { in: divisionIds } },
    include: { athlete: true },
    orderBy: [{ round: "desc" }, { position: "asc" }],
  });
}

const getCachedBracketCells = unstable_cache(getBracketCells, ["bracket-cells"], {
  tags: ["brackets-cells"],
});

export default async function BracketsCoachPage() {
  await requireRole("coach");

  const events = await getCachedPublishedEventsWithDivisions();

  const divisionIds = events.flatMap((e) => e.divisions.map((d) => d.id));
  const cells = await getCachedBracketCells(divisionIds);

  const cellsByDivision = new Map<string, (typeof cells)[number][]>();
  for (const cell of cells) {
    const list = cellsByDivision.get(cell.divisionId) ?? [];
    list.push(cell);
    cellsByDivision.set(cell.divisionId, list);
  }

  const payments = await db.teamPayment.findMany({
    where: { eventId: { in: events.map((e) => e.id) }, status: PaymentStatus.APPROVED },
    select: { eventId: true, chapterId: true },
  });
  const approvedByEvent = new Map<string, Set<string>>();
  for (const payment of payments) {
    const set = approvedByEvent.get(payment.eventId) ?? new Set<string>();
    set.add(payment.chapterId);
    approvedByEvent.set(payment.eventId, set);
  }

  const hasAny = events.some((e) =>
    e.divisions.some((d) => (cellsByDivision.get(d.id)?.length ?? 0) > 0),
  );

  return (
    <div className="space-y-8">
      <LiveBracketsRefresh />
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Brackets & Schedule</h1>
        <p className="text-sm text-muted-foreground">
          Published tournament brackets.
        </p>
        <p className="text-xs text-muted-foreground">
          <span className="text-emerald-600">Verified</span> = chapter payment
          approved · <span className="text-amber-600">Pending</span> = not approved yet
        </p>
      </div>

      {!hasAny ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-8 text-sm text-muted-foreground">
            <Trophy className="size-8" />
            Brackets coming soon. Check back once the organizer publishes draws.
          </CardContent>
        </Card>
      ) : (
        events.map((event) => (
          <section key={event.id} className="space-y-3">
            <div>
              <h2 className="font-heading text-base font-medium">{event.name}</h2>
              <p className="text-sm text-muted-foreground">
                <CalendarDays className="mr-1 inline size-3.5" />
                {formatDate(event.eventDate)}
              </p>
            </div>
            {event.divisions.map((division) => {
              const divisionCells = cellsByDivision.get(division.id) ?? [];
              if (divisionCells.length === 0) return null;
              const approvedChapters = approvedByEvent.get(event.id) ?? new Set<string>();
              const names = namesFor(divisionCells);
              const champions = championsOf(divisionCells);
              return (
                <Card key={division.id}>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        {division.name}
                      </h3>
                      {champions ? (
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                          <span className="flex items-center gap-1 font-semibold text-amber-600">
                            <Trophy className="size-3.5" />
                            {names[champions.winnerId] ?? "—"}
                          </span>
                          {champions.runnerUpId ? (
                            <span className="flex items-center gap-1 font-medium text-slate-500">
                              <Medal className="size-3.5" />
                              {names[champions.runnerUpId] ?? "—"}
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                    <BracketView
                      cells={divisionCells}
                      nameById={names}
                      verifiedById={verifiedFor(divisionCells, approvedChapters)}
                    />
                  </CardContent>
                </Card>
              );
            })}
          </section>
        ))
      )}
    </div>
  );
}

function namesFor(
  cells: { athleteId?: string | null; athlete?: { id: string; name: string } | null }[],
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const cell of cells) {
    if (cell.athleteId && cell.athlete) map[cell.athleteId] = cell.athlete.name;
  }
  return map;
}

function verifiedFor(
  cells: { athleteId?: string | null; athlete?: { id: string; chapterId: string } | null }[],
  approvedChapters: Set<string>,
): Record<string, boolean> {
  const map: Record<string, boolean> = {};
  for (const cell of cells) {
    if (cell.athleteId && cell.athlete) {
      map[cell.athleteId] = approvedChapters.has(cell.athlete.chapterId);
    }
  }
  return map;
}