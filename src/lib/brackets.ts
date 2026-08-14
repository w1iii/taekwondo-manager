import "server-only";

import type { Gender } from "@/generated/prisma/client";

export type AgeGroup = { name: string; minAge: number; maxAge: number };

export function ageGroupForAge(age: number): AgeGroup {
  if (age <= 14) return { name: "Youth", minAge: 5, maxAge: 14 };
  if (age <= 17) return { name: "Junior", minAge: 15, maxAge: 17 };
  return { name: "Senior", minAge: 18, maxAge: 40 };
}

export function ageForEventYear(birthYear: number, eventYear: number): number {
  return eventYear - birthYear;
}

export function divisionName(gender: Gender, group: string): string {
  const label = gender === "MALE" ? "Male" : "Female";
  return `${label} ${group}`;
}

export type DivisionInput = { name: string; gender: Gender; minAge: number; maxAge: number };

/**
 * Interim division system (gender + age group). Replaced by fixed WT
 * weight classes in M10. Athletes outside the 5–40 age range are skipped.
 */
export function buildDivisions(
  eventYear: number,
  athletes: { gender: Gender; birthYear: number }[],
): DivisionInput[] {
  const map = new Map<string, DivisionInput>();
  for (const athlete of athletes) {
    const age = ageForEventYear(athlete.birthYear, eventYear);
    const group = ageGroupForAge(age);
    if (age < group.minAge || age > group.maxAge) continue;
    const name = divisionName(athlete.gender, group.name);
    if (!map.has(name)) {
      map.set(name, { name, gender: athlete.gender, minAge: group.minAge, maxAge: group.maxAge });
    }
  }
  return [...map.values()];
}

export function athletesInDivision(
  division: { gender: Gender; minAge: number; maxAge: number },
  eventYear: number,
  athletes: { id: string; gender: Gender; birthYear: number }[],
): { id: string }[] {
  return athletes
    .filter((a) => a.gender === division.gender)
    .filter((a) => {
      const age = ageForEventYear(a.birthYear, eventYear);
      return age >= division.minAge && age <= division.maxAge;
    })
    .map((a) => ({ id: a.id }));
}

/**
 * Standard single-elimination layout: seed values by bracket position.
 * layout(4)=[1,4,2,3], layout(8)=[1,8,4,5,2,7,3,6], so adjacent positions
 * always pair seeds that sum to leafCount+1 (top seed vs bottom seed).
 */
export function standardBracketLayout(leafCount: number): number[] {
  const layout = [1];
  while (layout.length < leafCount) {
    const k = layout.length * 2;
    const next: number[] = [];
    for (const seed of layout) {
      next.push(seed, k + 1 - seed);
    }
    layout.splice(0, layout.length, ...next);
  }
  return layout;
}

export type CellInput = {
  id: string;
  round: number;
  position: number;
  athleteId?: string | null;
  childAId?: string | null;
  childBId?: string | null;
  winnerAthleteId?: string | null;
};

type SideSource = { athleteId?: string | null; winnerAthleteId?: string | null };

/**
 * Resolves which athlete represents a bracket slot: a seeded leaf athlete,
 * or the winner recorded on a completed child match.
 */
export function sideAthleteOf(
  cellId: string | null | undefined,
  byId: Map<string, SideSource>,
): string | null {
  if (!cellId) return null;
  const cell = byId.get(cellId);
  if (!cell) return null;
  return cell.athleteId ?? cell.winnerAthleteId ?? null;
}

/**
 * First-round matches involving a bye (one empty side) are decided
 * automatically: the present athlete advances without a bout.
 */
export function resolveByeWinners(cells: CellInput[]): CellInput[] {
  const byId = new Map(cells.map((c) => [c.id, c]));
  return cells.map((cell) => {
    if (!cell.childAId && !cell.childBId) return cell;
    const a = sideAthleteOf(cell.childAId, byId);
    const b = sideAthleteOf(cell.childBId, byId);
    if (a && !b) return { ...cell, winnerAthleteId: cell.winnerAthleteId ?? a };
    if (b && !a) return { ...cell, winnerAthleteId: cell.winnerAthleteId ?? b };
    return cell;
  });
}

export function generateBracketCells(
  athletes: { id: string }[],
  newId: () => string = () => crypto.randomUUID(),
): CellInput[] {
  const count = athletes.length;
  if (count === 0) return [];

  const leafCount = 1 << Math.ceil(Math.log2(count));
  const totalRounds = Math.floor(Math.log2(leafCount));
  const layout = standardBracketLayout(leafCount);

  const leafAthlete = new Array<string | null>(leafCount).fill(null);
  for (let rank = 0; rank < count; rank += 1) {
    leafAthlete[layout[rank] - 1] = athletes[rank].id;
  }

  const cells: CellInput[] = [];
  type Row = { id: string; athleteId?: string; childAId?: string; childBId?: string };
  let row: Row[] = leafAthlete.map((athleteId) => ({
    id: newId(),
    athleteId: athleteId ?? undefined,
  }));

  let round = totalRounds;
  while (row.length > 1) {
    const next: Row[] = [];
    for (let p = 0; p < row.length; p += 2) {
      next.push({ id: newId() });
    }
    row.forEach((cell, position) => {
      if (position % 2 === 0) {
        next[position / 2].childAId = cell.id;
      } else {
        next[Math.floor(position / 2)].childBId = cell.id;
      }
      cells.push({ ...cell, round, position });
    });
    row = next;
    round -= 1;
  }
  cells.push({ ...row[0], round: 0, position: 0 });

  return cells;
}

export function roundLabel(roundFromFinal: number): string {
  const names: Record<number, string> = {
    0: "Final",
    1: "Semi-final",
    2: "Quarterfinal",
    3: "Round of 16",
    4: "Round of 32",
  };
  return names[roundFromFinal] ?? `Preliminary ${roundFromFinal + 1}`;
}

export type BracketCellLike = {
  id: string;
  round: number;
  position: number;
  athleteId?: string | null;
  childAId?: string | null;
  childBId?: string | null;
  winnerAthleteId?: string | null;
};

/**
 * Participants of a match: a slot resolves to its direct athlete (leaf/seed)
 * or to the winner of the child match feeding it.
 */
export function participantsOf(
  cells: BracketCellLike[],
  match: Pick<BracketCellLike, "childAId" | "childBId">,
): [string | null, string | null] {
  const byId = new Map(cells.map((c) => [c.id, c]));
  const slot = (cellId?: string | null): string | null => {
    if (!cellId) return null;
    const cell = byId.get(cellId);
    if (!cell) return null;
    if (cell.athleteId) return cell.athleteId;
    return cell.winnerAthleteId ?? null;
  };
  return [slot(match.childAId), slot(match.childBId)];
}

/** 1st and 2nd place once the Final has a winner. */
export function championsOf(
  cells: BracketCellLike[],
): { winnerId: string; runnerUpId: string | null } | null {
  const final = cells.find((c) => c.round === 0);
  if (!final?.winnerAthleteId) return null;
  const [a, b] = participantsOf(cells, final);
  const runnerUpId = final.winnerAthleteId === a ? b : a;
  return {
    winnerId: final.winnerAthleteId,
    runnerUpId: runnerUpId && runnerUpId !== final.winnerAthleteId ? runnerUpId : null,
  };
}