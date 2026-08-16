import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trophy, Users } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/events";
import { athletesInDivision, EVENT_TYPE_LABELS } from "@/lib/divisions";
import { beltLabel, genderLabel } from "@/lib/athletes";
import { BracketView } from "@/components/bracket-view";
import { ActionButton } from "@/components/action-button";
import { generateBracket, resetBracket } from "../actions";
import { MatchWinnerControls } from "../match-winner-controls";

export const metadata = { title: "Division bracket" };

export default async function DivisionBracketPage({
  params,
}: {
  params: Promise<{ divisionId: string }>;
}) {
  await requireRole("organizer");

  const { divisionId } = await params;
  const division = await db.division.findUnique({
    where: { id: divisionId },
    include: { event: true, weightClass: true },
  });
  if (!division) notFound();

  const cells = await db.bracketCell.findMany({
    where: { divisionId },
    include: { athlete: true },
    orderBy: [{ round: "desc" }, { position: "asc" }],
  });

  const approvedAthletes = await db.approvedAthlete.findMany({
    where: { eventId: division.event.id },
    include: { athlete: true },
    orderBy: { approvedAt: "asc" },
  });

  const participantIds = new Set(
    athletesInDivision(
      {
        gender: division.gender,
        eventType: division.eventType,
        minAge: division.minAge,
        maxAge: division.maxAge,
        beltType: division.beltType,
        weightClass: division.weightClass,
      },
      division.event.eventDate.getFullYear(),
      approvedAthletes.map((a) => a.athlete),
    ).map((a) => a.id),
  );
  const participants = approvedAthletes
    .filter((a) => participantIds.has(a.athlete.id))
    .map((a) => a.athlete);

  const nameById: Record<string, string> = {};
  for (const cell of cells) {
    if (cell.athleteId && cell.athlete) nameById[cell.athleteId] = cell.athlete.name;
  }

  const championCell = cells.find((c) => c.round === 0 && c.childAId && c.childBId);
  const championId = championCell?.winnerAthleteId ?? null;
  const championName = championId ? nameById[championId] : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{division.name}</h1>
          <p className="text-sm text-muted-foreground">
            {division.event.name} · {formatDate(division.event.eventDate)} ·{" "}
            {EVENT_TYPE_LABELS[division.eventType]} · Age {division.minAge}–
            {division.maxAge}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button render={<Link href={`/admin/brackets/events/${division.event.id}`} />} variant="outline">
            <ArrowLeft />
            Back
          </Button>
          <form action={generateBracket}>
            <input type="hidden" name="divisionId" value={division.id} />
            <ActionButton
              label={cells.length > 0 ? "Regenerate bracket" : "Generate bracket"}
              pendingLabel={cells.length > 0 ? "Rebuilding…" : "Generating…"}
            />
          </form>
          <form action={resetBracket}>
            <input type="hidden" name="divisionId" value={division.id} />
            <ActionButton label="Reset" variant="outline" pendingLabel="Clearing…" />
          </form>
        </div>
      </div>

      {championName ? (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-600/30 bg-emerald-500/10 p-4">
          <Trophy className="size-5 text-emerald-700" />
          <p className="font-medium">
            Champion: <span className="text-emerald-700">{championName}</span>
          </p>
        </div>
      ) : null}

      {cells.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-8 text-sm text-muted-foreground">
            <Users className="size-8" />
            No bracket yet. Generate one from the players below.
          </CardContent>
        </Card>
      ) : (
        <BracketView
          cells={cells}
          nameById={nameById}
          matchControls={(match) => (
            <MatchWinnerControls divisionId={division.id} match={match} />
          )}
        />
      )}

      {cells.length === 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <Users className="size-4" />
            Players · {participants.length}
          </h2>
          {participants.length === 0 ? (
            <Card>
              <CardContent className="text-sm text-muted-foreground">
                No players in this division yet.
              </CardContent>
            </Card>
          ) : (
          <ul className="overflow-hidden rounded-lg border bg-card">
            {participants.map((athlete) => (
              <li
                key={athlete.id}
                className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-2.5 last:border-b-0"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate font-medium">{athlete.name}</span>
                  <Badge variant="secondary">{genderLabel(athlete.gender)}</Badge>
                  {athlete.beltType ? (
                    <Badge variant="outline">{beltLabel(athlete.beltType)}</Badge>
                  ) : null}
                </span>
                <span className="text-sm text-muted-foreground">
                  {athlete.birthYear}
                  {athlete.weightKg > 0 ? ` · ${athlete.weightKg} kg` : ""}
                </span>
              </li>
            ))}
          </ul>
          )}
        </section>
      )}
    </div>
  );
}
