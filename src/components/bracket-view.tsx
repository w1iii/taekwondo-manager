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

/* ── Light theme (matches app background via CSS vars) ── */
const THEME = {
  panelBg: "var(--muted)",
  cardBg: "var(--card)",
  border: "var(--border)",
  text: "var(--foreground)",
  muted: "var(--muted-foreground)",
  accent: "var(--primary)",
  scoreBg: "var(--muted)",
  winnerSlotBg: "rgba(142, 14, 21, 0.05)",
  verified: "#22c55e",
  unverified: "#f59e0b",
  mono: "var(--font-mono)",
} as const;

/* ── Layout constants ── */
const CARD_W = 168;
const SLOT_H = 32;
const CARD_H = SLOT_H * 2 + 3;
const CONNECTOR_W = 28;
const MIN_GAP = 88;
const LABEL_H = 24;

function roundCenters(count: number, total: number): number[] {
  const top = (total - count * CARD_H - (count - 1) * MIN_GAP) / 2;
  return Array.from(
    { length: count },
    (_, i) => top + CARD_H / 2 + i * (CARD_H + MIN_GAP),
  );
}

/* ── Seed slot ── */
function Slot({
  num,
  name,
  score,
  isWinner,
  isVerified,
  divider,
}: {
  num?: number;
  name: string;
  score?: number;
  isWinner: boolean;
  isVerified?: boolean;
  divider?: boolean;
}) {
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        gap: 6,
        height: SLOT_H,
        padding: "0 8px",
        background: isWinner ? THEME.winnerSlotBg : "transparent",
        borderBottom: divider ? `1px solid ${THEME.border}` : "none",
      }}
    >
      {isWinner && (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 2,
            background: THEME.accent,
          }}
        />
      )}
      {num !== undefined && (
        <span
          style={{
            fontFamily: THEME.mono,
            fontSize: 9,
            fontWeight: 700,
            color: THEME.muted,
            minWidth: 12,
            textAlign: "right",
          }}
        >
          {num}
        </span>
      )}
      <span
        style={{
          flex: 1,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          fontSize: 12,
          color: isWinner ? THEME.text : THEME.muted,
          fontWeight: isWinner ? 700 : 400,
        }}
      >
        {name}
      </span>
      {isVerified !== undefined && (
        <span
          title={isVerified ? "Chapter payment approved" : "Payment pending approval"}
          style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: isVerified ? THEME.verified : THEME.unverified,
            flexShrink: 0,
          }}
        />
      )}
      {score !== undefined && (
        <span
          style={{
            background: THEME.scoreBg,
            padding: "1px 6px",
            borderRadius: 3,
            fontFamily: THEME.mono,
            fontSize: 12,
            fontWeight: 700,
            color: isWinner ? THEME.accent : THEME.muted,
            minWidth: 18,
            textAlign: "center",
          }}
        >
          {score}
        </span>
      )}
    </div>
  );
}

/* ── Match card ── */
function Match({
  top,
  bot,
  matchControls,
  descriptor,
}: {
  top: { num?: number; name: string; score?: number; isWinner: boolean; isVerified?: boolean };
  bot: { num?: number; name: string; score?: number; isWinner: boolean; isVerified?: boolean };
  matchControls?: (match: MatchDescriptor) => React.ReactNode;
  descriptor?: MatchDescriptor;
}) {
  return (
    <div
      style={{
        width: CARD_W,
        background: THEME.cardBg,
        border: `1px solid ${THEME.border}`,
        borderRadius: 6,
        overflow: "hidden",
      }}
    >
      <Slot num={top.num} name={top.name} score={top.score} isWinner={top.isWinner} isVerified={top.isVerified} divider />
      <Slot num={bot.num} name={bot.name} score={bot.score} isWinner={bot.isWinner} isVerified={bot.isVerified} />
      {matchControls && descriptor && (
        <div style={{ padding: "4px 8px", borderTop: `1px solid ${THEME.border}`, fontSize: 11 }}>
          {matchControls(descriptor)}
        </div>
      )}
    </div>
  );
}

/* ── Connector between two rounds ── */
function Connector({
  fromYs,
  toYs,
  isChampion,
}: {
  fromYs: number[];
  toYs: number[];
  isChampion?: boolean;
}) {
  const midX = CONNECTOR_W / 2;
  const d: string[] = [];
  if (isChampion && fromYs.length === 1) {
    const y = fromYs[0];
    d.push(`M0 ${y} H ${CONNECTOR_W}`);
  } else {
    for (let t = 0; t < toYs.length; t++) {
      const y1 = fromYs[2 * t];
      const y2 = fromYs[2 * t + 1];
      const ym = toYs[t];
      d.push(
        `M0 ${y1} H ${midX}`,
        `M ${midX} ${y1} V ${ym}`,
        `M0 ${y2} H ${midX}`,
        `M ${midX} ${y2} V ${ym}`,
        `M ${midX} ${ym} H ${CONNECTOR_W}`,
      );
    }
  }
  return (
    <div style={{ width: CONNECTOR_W, flexShrink: 0, display: "flex", flexDirection: "column" }}>
      <div style={{ height: LABEL_H, flexShrink: 0 }} />
      <svg width={CONNECTOR_W} style={{ display: "block", flex: 1 }}>
        <path
          d={d.join(" ")}
          fill="none"
          stroke={isChampion ? THEME.accent : THEME.border}
          strokeWidth={1.5}
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

/* ── Main bracket component ── */
export function BracketView({
  cells,
  nameById,
  verifiedById,
  matchControls,
  innerId,
}: {
  cells: Cell[];
  nameById: Record<string, string>;
  verifiedById?: Record<string, boolean>;
  matchControls?: (match: MatchDescriptor) => React.ReactNode;
  innerId?: string;
}) {
  if (cells.length === 0) return null;

  const byId = new Map(cells.map((c) => [c.id, c]));

  const resolveSide = (cellId: string | null | undefined): MatchSide | null => {
    const id = sideAthleteOf(
      cellId,
      byId as Map<string, { athleteId?: string | null; winnerAthleteId?: string | null }>,
    );
    if (!id) return null;
    return { athleteId: id, name: nameById[id] ?? "—" };
  };

  const matches = cells.filter((c) => c.childAId || c.childBId);
  if (matches.length === 0) return null;

  const rounds = [...new Set(matches.map((m) => m.round))].sort((a, b) => b - a);
  const columns = rounds.map((round) => ({
    round,
    roundMatches: matches
      .filter((m) => m.round === round)
      .sort((a, b) => a.position - b.position),
  }));

  const firstCount = columns[0].roundMatches.length;
  const totalH = firstCount * CARD_H + (firstCount - 1) * MIN_GAP;

  const championId = cells.find(
    (c) => c.round === 0 && (c.childAId || c.childBId),
  )?.winnerAthleteId ?? null;
  const championName = championId ? nameById[championId] ?? "—" : null;

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "100%",
        overflowX: "auto",
        background: THEME.panelBg,
        border: `1px solid ${THEME.border}`,
        borderRadius: 12,
        padding: "28px 20px",
      }}
    >
      <div id={innerId} style={{ display: "flex", alignItems: "flex-start", gap: 20, minWidth: "max-content" }}>
        {columns.map(({ round, roundMatches }, colIdx) => {
          const centers = roundCenters(roundMatches.length, totalH);
          const isFinal = roundMatches.length === 1;
          const labelColor = isFinal ? THEME.accent : THEME.muted;

          const nextCenters = roundCenters(
            columns[colIdx + 1]?.roundMatches.length ?? 0,
            totalH,
          );

          return (
            <div key={round} style={{ display: "flex", alignItems: "flex-start", gap: 20 }}>
              {/* Round column */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div
                  style={{
                    height: LABEL_H,
                    display: "flex",
                    alignItems: "center",
                    fontFamily: THEME.mono,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: labelColor,
                    whiteSpace: "nowrap",
                    padding: "0 4px",
                  }}
                >
                  {roundLabel(Math.log2(roundMatches.length))}
                </div>
                <div style={{ position: "relative", width: CARD_W, height: totalH, flexShrink: 0 }}>
                  {roundMatches.map((match, i) => {
                    const sideA = resolveSide(match.childAId);
                    const sideB = resolveSide(match.childBId);
                    const topWin = match.winnerAthleteId === sideA?.athleteId;
                    const botWin = match.winnerAthleteId === sideB?.athleteId;
                    const topNum = seedNum(byId, match.childAId);
                    const botNum = seedNum(byId, match.childBId);

                    const descriptor: MatchDescriptor = {
                      cellId: match.id,
                      sideA,
                      sideB,
                      winnerAthleteId: match.winnerAthleteId ?? null,
                    };

                    return (
                      <div
                        key={match.id}
                        style={{
                          position: "absolute",
                          top: centers[i] - CARD_H / 2,
                          left: 0,
                          width: CARD_W,
                        }}
                      >
                        <Match
                          top={{
                            num: topNum,
                            name: sideA?.name ?? "—",
                            isWinner: topWin,
                            isVerified: sideA ? verifiedById?.[sideA.athleteId] : undefined,
                          }}
                          bot={{
                            num: botNum,
                            name: sideB?.name ?? "—",
                            isWinner: botWin,
                            isVerified: sideB ? verifiedById?.[sideB.athleteId] : undefined,
                          }}
                          matchControls={matchControls}
                          descriptor={descriptor}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Connector to next round or champion */}
              {colIdx < columns.length - 1 ? (
                <Connector fromYs={centers} toYs={nextCenters} />
              ) : (
                <Connector fromYs={[centers[0]]} toYs={[]} isChampion />
              )}
            </div>
          );
        })}

        {/* Champion slot */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div
            style={{
              height: LABEL_H,
              display: "flex",
              alignItems: "center",
              fontFamily: THEME.mono,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: THEME.accent,
              whiteSpace: "nowrap",
            }}
          >
            Champion
          </div>
          <div style={{ position: "relative", width: CARD_W, height: totalH }}>
            <div
              style={{
                position: "absolute",
                top: totalH / 2 - CARD_H / 2,
                left: 0,
                width: CARD_W,
                height: CARD_H,
                border: `1px dashed ${THEME.accent}`,
                borderRadius: 6,
                background: THEME.cardBg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: "0 8px",
              }}
            >
              <span style={{ fontSize: 15 }}>🏆</span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: THEME.text,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {championName ?? "—"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function seedNum(
  byId: Map<string, Cell>,
  cellId: string | null | undefined,
): number | undefined {
  if (!cellId) return undefined;
  const cell = byId.get(cellId);
  if (!cell?.athleteId) return undefined;
  if (cell.childAId || cell.childBId) return undefined;
  return cell.position + 1;
}