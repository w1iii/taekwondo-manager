import { describe, expect, it } from "vitest";

import {
  standardBracketLayout,
  generateBracketCells,
  resolveByeWinners,
  participantsOf,
  championsOf,
  roundLabel,
} from "@/lib/bracket-core";

describe("standardBracketLayout", () => {
  it("pairs top seed against bottom seed in adjacent positions", () => {
    expect(standardBracketLayout(4)).toEqual([1, 4, 2, 3]);
    expect(standardBracketLayout(8)).toEqual([1, 8, 4, 5, 2, 7, 3, 6]);
    // Adjacent pairs always sum to leafCount + 1.
    const layout = standardBracketLayout(8);
    for (let i = 0; i < layout.length; i += 2) {
      expect(layout[i] + layout[i + 1]).toBe(9);
    }
  });

  it("handles non-power-of-two leaf counts by rounding up", () => {
    expect(standardBracketLayout(5).length).toBe(8);
    expect(standardBracketLayout(3).length).toBe(4);
  });
});

describe("generateBracketCells", () => {
  const newId = (() => {
    let n = 0;
    return () => `c${n++}`;
  })();

  it("builds a single-elimination tree with rounds and positions", () => {
    const cells = generateBracketCells(
      [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }],
      newId,
    );
    // Full single-elimination tree: 4 leaves + 2 semifinal + 1 final.
    expect(cells.length).toBe(7);
    const final = cells.find((c) => c.round === 0)!;
    expect(final.position).toBe(0);
    expect(final.childAId).toBeTruthy();
    expect(final.childBId).toBeTruthy();
  });

  it("returns an empty array for zero athletes", () => {
    expect(generateBracketCells([], newId)).toEqual([]);
  });

  it("seeds leaves in layout order", () => {
    const cells = generateBracketCells([{ id: "s1" }, { id: "s2" }], newId);
    const leaves = cells.filter((c) => !c.childAId && !c.childBId);
    expect(leaves.map((c) => c.athleteId)).toEqual(["s1", "s2"]);
  });
});

describe("resolveByeWinners", () => {
  it("advances the present athlete when one side is empty", () => {
    const cells = [
      { id: "leafA", round: 1, position: 0, athleteId: "alice" },
      { id: "leafB", round: 1, position: 1, athleteId: null },
      { id: "match", round: 0, position: 0, childAId: "leafA", childBId: "leafB" },
    ];
    const resolved = resolveByeWinners(cells);
    const match = resolved.find((c) => c.id === "match")!;
    expect(match.winnerAthleteId).toBe("alice");
  });

  it("keeps an existing recorded winner", () => {
    const cells = [
      { id: "leafA", round: 1, position: 0, athleteId: "alice" },
      { id: "leafB", round: 1, position: 1, athleteId: null },
      { id: "match", round: 0, position: 0, childAId: "leafA", childBId: "leafB", winnerAthleteId: "alice" },
    ];
    const resolved = resolveByeWinners(cells);
    expect(resolved.find((c) => c.id === "match")!.winnerAthleteId).toBe("alice");
  });

  it("leaves a two-sided match undecided", () => {
    const cells = [
      { id: "leafA", round: 1, position: 0, athleteId: "alice" },
      { id: "leafB", round: 1, position: 1, athleteId: "bob" },
      { id: "match", round: 0, position: 0, childAId: "leafA", childBId: "leafB" },
    ];
    const resolved = resolveByeWinners(cells);
    expect(resolved.find((c) => c.id === "match")!.winnerAthleteId).toBeUndefined();
  });
});

describe("participantsOf", () => {
  it("resolves leaves directly and winners for fed matches", () => {
    const cells = [
      { id: "a", round: 1, position: 0, athleteId: "alice" },
      { id: "b", round: 1, position: 1, athleteId: "bob", winnerAthleteId: "bob" },
      { id: "m", round: 0, position: 0, childAId: "a", childBId: "b" },
    ];
    expect(participantsOf(cells, cells[2])).toEqual(["alice", "bob"]);
  });
});

describe("championsOf", () => {
  it("returns winner and runner-up after the final has a winner", () => {
    const cells = [
      { id: "a", round: 1, position: 0, athleteId: "alice" },
      { id: "b", round: 1, position: 1, athleteId: "bob" },
      { id: "m", round: 0, position: 0, childAId: "a", childBId: "b", winnerAthleteId: "alice" },
    ];
    expect(championsOf(cells)).toEqual({ winnerId: "alice", runnerUpId: "bob" });
  });

  it("returns null when the final is undecided", () => {
    const cells = [
      { id: "a", round: 1, position: 0, athleteId: "alice" },
      { id: "b", round: 1, position: 1, athleteId: "bob" },
      { id: "m", round: 0, position: 0, childAId: "a", childBId: "b" },
    ];
    expect(championsOf(cells)).toBeNull();
  });
});

describe("roundLabel", () => {
  it("labels finals and preliminaries", () => {
    expect(roundLabel(0)).toBe("Final");
    expect(roundLabel(1)).toBe("Semi-final");
    expect(roundLabel(2)).toBe("Quarterfinal");
    expect(roundLabel(3)).toBe("Round of 16");
    expect(roundLabel(7)).toBe("Preliminary 8");
  });
});
