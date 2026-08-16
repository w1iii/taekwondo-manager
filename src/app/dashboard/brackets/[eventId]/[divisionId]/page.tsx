import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Medal, Trophy } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/events";
import { BracketView } from "@/components/bracket-view";
import { LiveBracketsRefresh } from "@/components/live-brackets-refresh";
import { championsOf } from "@/lib/brackets";
import { getBracketCells, getPublishedEvent } from "@/lib/brackets-queries";

export const metadata = { title: "Bracket" };

export default async function BracketsCoachBracketPage({
  params,
}: {
  params: Promise<{ eventId: string; divisionId: string }>;
}) {
  await requireRole("coach");

  const { eventId, divisionId } = await params;
  const event = await getPublishedEvent(eventId);
  if (!event) notFound();

  const division = event.divisions.find((d) => d.id === divisionId);
  if (!division) notFound();

  const cells = await getBracketCells([divisionId]);

  const approvedAthletes = await db.approvedAthlete.findMany({
    where: { eventId: event.id },
    select: { athleteId: true },
  });
  const paidAthletes = new Set(approvedAthletes.map((a) => a.athleteId));

  const names = namesFor(cells);
  const champions = championsOf(cells);

  return (
    <div className="space-y-8">
      <LiveBracketsRefresh />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link href={`/dashboard/brackets/${event.id}`} className="hover:underline">
              <ArrowLeft className="mr-1 inline size-3.5" />
              {event.name}
            </Link>
          </p>
          <h1 className="text-2xl font-bold tracking-tight">{division.name}</h1>
          <p className="text-sm text-muted-foreground">
            <CalendarDays className="mr-1 inline size-3.5" />
            {formatDate(event.eventDate)}
          </p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        <span className="text-emerald-600">Verified</span> = registration approved ·{" "}
        <span className="text-amber-600">Pending</span> = not approved yet
      </p>

      {cells.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-8 text-sm text-muted-foreground">
            <Trophy className="size-8" />
            Brackets coming soon. Check back once the organizer publishes draws.
          </CardContent>
        </Card>
      ) : (
        <>
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
          <BracketView
            cells={cells}
            nameById={names}
            verifiedById={verifiedFor(cells, paidAthletes)}
          />
        </>
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