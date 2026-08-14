import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trophy, Users } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/events";
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
    include: { event: true },
  });
  if (!division) notFound();

  const cells = await db.bracketCell.findMany({
    where: { divisionId },
    include: { athlete: true },
    orderBy: [{ round: "desc" }, { position: "asc" }],
  });

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
            {division.event.name} · {formatDate(division.event.eventDate)} · Age{" "}
            {division.minAge}–{division.maxAge}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button render={<Link href="/admin/brackets" />} variant="outline">
            <ArrowLeft />
            Back
          </Button>
          <form action={generateBracket}>
            <input type="hidden" name="divisionId" value={division.id} />
            <ActionButton label="Regenerate bracket" pendingLabel="Rebuilding…" />
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
            No bracket yet. Generate one from the registrations.
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
    </div>
  );
}