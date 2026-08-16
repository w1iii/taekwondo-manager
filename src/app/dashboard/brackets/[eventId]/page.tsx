import { notFound } from "next/navigation";
import { CalendarDays, Medal, Trophy } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/events";
import { BracketView } from "@/components/bracket-view";
import { LiveBracketsRefresh } from "@/components/live-brackets-refresh";
import { championsOf } from "@/lib/brackets";
import { getBracketCells, getPublishedEvent } from "@/lib/brackets-queries";

export const metadata = { title: "Brackets & Schedule" };

export default async function BracketsCoachEventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  await requireRole("coach");

  const { eventId } = await params;
  const event = await getPublishedEvent(eventId);
  if (!event) notFound();

  const divisionIds = event.divisions.map((d) => d.id);
  const cells = await getBracketCells(divisionIds);

  const cellsByDivision = new Map<string, (typeof cells)[number][]>();
  for (const cell of cells) {
    const list = cellsByDivision.get(cell.divisionId) ?? [];
    list.push(cell);
    cellsByDivision.set(cell.divisionId, list);
  }

  const approvedAthletes = await db.approvedAthlete.findMany({
    where: { eventId: event.id },
    select: { athleteId: true },
  });
  const paidAthletes = new Set(approvedAthletes.map((a) => a.athleteId));

  const hasAny = event.divisions.some(
    (d) => (cellsByDivision.get(d.id)?.length ?? 0) > 0,
  );

  return (
    <div className="space-y-8">
      <LiveBracketsRefresh />
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{event.name}</h1>
        <p className="flex items-center gap-1 text-sm text-muted-foreground">
          <CalendarDays className="size-3.5" />
          {formatDate(event.eventDate)}
        </p>
        <p className="text-xs text-muted-foreground">
          <span className="text-emerald-600">Verified</span> = registration approved ·{" "}
          <span className="text-amber-600">Pending</span> = not approved yet
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
        event.divisions.map((division) => {
          const divisionCells = cellsByDivision.get(division.id) ?? [];
          if (divisionCells.length === 0) return null;
          const names = namesFor(divisionCells);
          const champions = championsOf(divisionCells);
          return (
            <Card key={division.id}>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    {division.name}
                  </h2>
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
                  verifiedById={verifiedFor(divisionCells, paidAthletes)}
                />
              </CardContent>
            </Card>
          );
        })
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
  cells: { athleteId?: string | null; athlete?: { id: string } | null }[],
  paidAthletes: Set<string>,
): Record<string, boolean> {
  const map: Record<string, boolean> = {};
  for (const cell of cells) {
    if (cell.athleteId && cell.athlete) {
      map[cell.athleteId] = paidAthletes.has(cell.athleteId);
    }
  }
  return map;
}
