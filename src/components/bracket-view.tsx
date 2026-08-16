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

/* ── Dark theme palette (self-contained, matches template) ── */
const C = {
  bg: "#0f1117",
  cardBg: "#1e2433",
  cardBorder: "#2d3748",
  winBg: "#1a2a1e",
  winBorder: "#2d6a4f",
  winText: "#4ade80",
  text: "#cbd5e1",
  muted: "#94a3b8",
  dim: "#475569",
  champBg: "#1c1708",
  champBorder: "#92400e",
  champText: "#fbbf24",
  connector: "#2d3748",
  champConnector: "#92400e",
} as const;

/* ── Layout constants ── */
const SEED_H = 36;
const MATCH_H = SEED_H * 2 + 4; // 76px per match (2 seeds + gap)
const CONNECTOR_W = 40;
const ROUND_GAP = 12;
const BRACKET_H = 500;

/* ── Seed slot ── */
function Seed({
  num,
  name,
  score,
  isWinner,
  isVerified,
}: {
  num?: number;
  name: string;
  score?: number;
  isWinner: boolean;
  isVerified?: boolean;
}) {
  const bg = isWinner ? C.winBg : C.cardBg;
  const border = isWinner ? C.winBorder : C.cardBorder;
  const textColor = isWinner ? C.winText : C.text;
  const numColor = isWinner ? C.winBorder : C.dim;
  const scoreColor = isWinner ? C.winText : C.muted;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        height: SEED_H,
        padding: "0 12px",
        background: bg,
        border: `1px solid ${border}`,
        borderBottom: "none",
        color: textColor,
        position: "relative",
        fontSize: 13,
        borderRadius: 0,
      }}
    >
      {num !== undefined && (
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: numColor,
            minWidth: 14,
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
        }}
      >
        {name}
      </span>
      {isVerified !== undefined && (
        <span
          title={isVerified ? "Chapter payment approved" : "Payment pending approval"}
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: isVerified ? "#4ade80" : "#facc15",
            flexShrink: 0,
          }}
        />
      )}
      {score !== undefined && (
        <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: scoreColor }}>
          {score}
        </span>
      )}
    </div>
  );
}

/* ── Match wrapper: 2 seeds stacked ── */
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
    <div style={{ display: "flex", flexDirection: "column", width: 160 }}>
      <Seed
        num={top.num}
        name={top.name}
        score={top.score}
        isWinner={top.isWinner}
        isVerified={top.isVerified}
      />
      <Seed
        num={bot.num}
        name={bot.name}
        score={bot.score}
        isWinner={bot.isWinner}
        isVerified={bot.isVerified}
      />
      {matchControls && descriptor && (
        <div style={{ padding: "4px 0", fontSize: 12 }}>{matchControls(descriptor)}</div>
      )}
    </div>
  );
}

/* ── SVG connector between two rounds ── */
function Connector({
  fromCount,
  toCount,
}: {
  fromCount: number;
  toCount: number;
}) {
  const totalH = BRACKET_H;
  const fromGap = fromCount > 1 ? (totalH - fromCount * MATCH_H) / (fromCount - 1) : 0;
  const toGap = toCount > 1 ? (totalH - toCount * MATCH_H) / (toCount - 1) : 0;

  // Y positions of match midpoints in the "from" round
  const fromYs = Array.from({ length: fromCount }, (_, i) => {
    const top = i * (MATCH_H + fromGap);
    return top + SEED_H; // midpoint between the 2 seeds
  });

  // Y positions where connectors arrive in the "to" round
  const toYs = Array.from({ length: toCount }, (_, i) => {
    if (toCount === 1) return totalH / 2;
    const top = i * (MATCH_H + toGap);
    return top + SEED_H;
  });

  const paths: string[] = [];
  const midX = CONNECTOR_W / 2;

  for (let t = 0; t < toCount; t++) {
    const y1 = fromYs[t * 2];
    const y2 = fromYs[t * 2 + 1];
    const yMid = toYs[t];
    const sw = 1;

    // top branch: horizontal out → vertical down → horizontal in
    paths.push(`<line x1="0" y1="${y1}" x2="${midX}" y2="${y1}" stroke="${C.connector}" stroke-width="${sw}"/>`);
    paths.push(`<line x1="${midX}" y1="${y1}" x2="${midX}" y2="${yMid}" stroke="${C.connector}" stroke-width="${sw}"/>`);
    // bottom branch
    paths.push(`<line x1="0" y1="${y2}" x2="${midX}" y2="${y2}" stroke="${C.connector}" stroke-width="${sw}"/>`);
    paths.push(`<line x1="${midX}" y1="${y2}" x2="${midX}" y2="${yMid}" stroke="${C.connector}" stroke-width="${sw}"/>`);
    // horizontal into next round
    paths.push(`<line x1="${midX}" y1="${yMid}" x2="${CONNECTOR_W}" y2="${yMid}" stroke="${C.connector}" stroke-width="${sw}"/>`);
  }

  return (
    <div
      style={{
        width: CONNECTOR_W,
        flexShrink: 0,
        marginTop: 31,
      }}
    >
      <svg width={CONNECTOR_W} height={totalH} style={{ display: "block" }}>
        {paths.map((d, i) => (
          <g key={i} dangerouslySetInnerHTML={{ __html: d }} />
        ))}
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
}: {
  cells: Cell[];
  nameById: Record<string, string>;
  verifiedById?: Record<string, boolean>;
  matchControls?: (match: MatchDescriptor) => React.ReactNode;
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

  const maxMatchRound = Math.max(...matches.map((m) => m.round));
  const columnCount = maxMatchRound + 1;

  // Build columns: index 0 = earliest round, last = final
  const columns = Array.from({ length: columnCount }, (_, colIdx) => {
    const round = colIdx;
    const roundMatches = matches
      .filter((m) => m.round === round)
      .sort((a, b) => a.position - b.position);
    return { round, roundMatches };
  });

  // Determine champion from the final round
  const finalCell = cells.find((c) => c.round === 0 && (c.childAId || c.childBId));
  const championId = finalCell?.winnerAthleteId ?? null;
  const championName = championId ? nameById[championId] ?? "—" : null;

  return (
    <div
      style={{
        background: C.bg,
        borderRadius: 12,
        padding: "32px 24px",
        overflowX: "auto",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 0,
          minWidth: "max-content",
        }}
      >
        {columns.map(({ round, roundMatches }, colIdx) => {
          const matchCount = roundMatches.length;
          const gap =
            matchCount > 1 ? (BRACKET_H - matchCount * MATCH_H) / (matchCount - 1) : 0;

          return (
            <div key={round} style={{ display: "flex", gap: 0 }}>
              {/* Round column */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: C.dim,
                    marginBottom: 20,
                    whiteSpace: "nowrap",
                  }}
                >
                  {roundLabel(maxMatchRound - round)}
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: matchCount === 1 ? "center" : "flex-start",
                    height: BRACKET_H,
                  }}
                >
                  {roundMatches.map((match, i) => {
                    const sideA = resolveSide(match.childAId);
                    const sideB = resolveSide(match.childBId);
                    const topWin = match.winnerAthleteId === sideA?.athleteId;
                    const botWin = match.winnerAthleteId === sideB?.athleteId;
                    const marginTop = i === 0 ? 0 : gap;

                    const descriptor: MatchDescriptor = {
                      cellId: match.id,
                      sideA,
                      sideB,
                      winnerAthleteId: match.winnerAthleteId ?? null,
                    };

                    return (
                      <div key={match.id} style={{ marginTop }}>
                        <Match
                          top={{
                            name: sideA?.name ?? "—",
                            isWinner: topWin,
                            isVerified: sideA ? verifiedById?.[sideA.athleteId] : undefined,
                          }}
                          bot={{
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

              {/* Connector to next round (or to champion) */}
              {colIdx < columns.length - 1 ? (
                <Connector
                  fromCount={matchCount}
                  toCount={columns[colIdx + 1].roundMatches.length}
                />
              ) : (
                /* Final connector → champion */
                <div style={{ width: CONNECTOR_W, flexShrink: 0, marginTop: 31 }}>
                  <svg width={CONNECTOR_W} height={BRACKET_H} style={{ display: "block" }}>
                    <line
                      x1="0"
                      y1={BRACKET_H / 2}
                      x2={CONNECTOR_W}
                      y2={BRACKET_H / 2}
                      stroke={C.champConnector}
                      strokeWidth={1}
                    />
                  </svg>
                </div>
              )}
            </div>
          );
        })}

        {/* Champion slot */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            marginLeft: 40,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: C.champText,
              marginBottom: 4,
            }}
          >
            Champion
          </div>
          <div
            style={{
              width: 160,
              height: 52,
              borderRadius: 8,
              background: C.champBg,
              border: `1px solid ${C.champBorder}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              fontWeight: 700,
              fontSize: 14,
              color: C.champText,
            }}
          >
            <span style={{ fontSize: 18 }}>🏆</span>
            <span>{championName ?? "—"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
