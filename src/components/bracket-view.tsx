import { roundLabel, sideAthleteOf } from "@/lib/brackets";

type Cell = {
  id: string;
  round: number;
  position: number;
  athleteId?: string | null;
  childAId?: string | null;
  childBId?: string | null;
  winnerAthleteId?: string | null;
};

export type MatchSide = { athleteId: string; name: string };

export type MatchDescriptor = {
  cellId: string;
  sideA: MatchSide | null;
  sideB: MatchSide | null;
  winnerAthleteId: string | null;
};

export function BracketView({
  cells,
  nameById,
  verifiedById,
  matchControls,
}: {
  cells: Cell[];
  nameById: Record<string, string>;
  verifiedById?: Record<string, boolean>;
  matchControls?: (match: MatchDescriptor) => React.ReactNode;
}) {
  if (cells.length === 0) return null;

  const byId = new Map(cells.map((c) => [c.id, c]));

  const resolveSide = (cellId: string | null | undefined): MatchSide | null => {
    const id = sideAthleteOf(cellId, byId as Map<string, { athleteId?: string | null; winnerAthleteId?: string | null }>);
    if (!id) return null;
    return { athleteId: id, name: nameById[id] ?? "—" };
  };

  const matches = cells.filter((c) => c.childAId || c.childBId);
  const maxMatchRound = matches.length > 0 ? Math.max(...matches.map((m) => m.round)) : 0;
  const columnCount = maxMatchRound + 1;

  const columns = Array.from({ length: columnCount }, (_, colIdx) => {
    const round = maxMatchRound - colIdx;
    const roundMatches = matches
      .filter((m) => m.round === round)
      .sort((a, b) => a.position - b.position);
    return { round, roundMatches };
  });

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex min-w-max items-start gap-3">
        {columns.map(({ round, roundMatches }) => (
          <section key={round} className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {roundLabel(round)}
            </h3>
            <div className="flex flex-col gap-2">
              {roundMatches.map((match) => {
                const descriptor: MatchDescriptor = {
                  cellId: match.id,
                  sideA: resolveSide(match.childAId),
                  sideB: resolveSide(match.childBId),
                  winnerAthleteId: match.winnerAthleteId ?? null,
                };
                return (
                  <div key={match.id} className="w-44 rounded-lg border bg-card p-2 text-xs">
                    <Slot
                      name={descriptor.sideA?.name ?? "—"}
                      verified={descriptor.sideA ? verifiedById?.[descriptor.sideA.athleteId] : undefined}
                    />
                    <Slot
                      name={descriptor.sideB?.name ?? "—"}
                      verified={descriptor.sideB ? verifiedById?.[descriptor.sideB.athleteId] : undefined}
                    />
                    {matchControls ? (
                      <div className="mt-1.5">{matchControls(descriptor)}</div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function Slot({ name, verified }: { name: string; verified?: boolean }) {
  const isBye = name === "—";
  return (
    <p className="flex items-center justify-between gap-1 rounded border-b px-2 py-1 last:border-b-0">
      <span className={`truncate ${isBye ? "text-muted-foreground/60" : ""}`}>{name}</span>
      {!isBye && verified !== undefined ? (
        <span
          title={verified ? "Chapter payment approved" : "Payment pending approval"}
          className={`size-2 shrink-0 rounded-full ${
            verified ? "bg-emerald-500" : "bg-amber-500"
          }`}
        />
      ) : null}
    </p>
  );
}