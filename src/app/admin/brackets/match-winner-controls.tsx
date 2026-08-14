"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

import type { MatchDescriptor } from "@/components/bracket-view";
import { recordWinner } from "./actions";

function WinnerButton({
  label,
  isWinner,
}: {
  label: string;
  isWinner: boolean;
}) {
  const { pending } = useFormStatus();
  const busy = pending ? "cursor-wait opacity-70" : "";
  return (
    <button
      type="submit"
      title={isWinner ? "Click again to clear winner" : undefined}
      className={cn(
        "h-6 w-full truncate rounded border px-1.5 text-[11px] font-medium transition-colors",
        busy,
        isWinner
          ? "border-emerald-600/40 bg-emerald-500/15 text-emerald-700"
          : "border-input bg-transparent text-muted-foreground hover:border-ring",
      )}
    >
      {pending ? (
        <Loader2 className="mx-auto size-3 animate-spin" />
      ) : isWinner ? (
        "✓ Winner"
      ) : (
        `${label} wins`
      )}
    </button>
  );
}

export function MatchWinnerControls({
  divisionId,
  match,
}: {
  divisionId: string;
  match: MatchDescriptor;
}) {
  const winnerId = match.winnerAthleteId;

  const control = (side: NonNullable<MatchDescriptor["sideA"]>) => (
    <form action={recordWinner}>
      <input type="hidden" name="divisionId" value={divisionId} />
      <input type="hidden" name="matchId" value={match.cellId} />
      <input type="hidden" name="winnerId" value={side.athleteId} />
      <WinnerButton label={side.name} isWinner={winnerId === side.athleteId} />
    </form>
  );

  const first = match.sideA;
  const second = match.sideB;

  if (!first && !second) {
    return (
      <p className="h-6 rounded border border-input text-center text-[11px] leading-6 text-muted-foreground/50">
        Bye — awaiting bracket room
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {control(first ?? (second as NonNullable<MatchDescriptor["sideA"]>))}
      {first && second ? control(second) : null}
    </div>
  );
}