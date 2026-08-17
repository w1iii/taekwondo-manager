import { describe, expect, it } from "vitest";

import { EventType, Gender } from "@/generated/prisma/client";
import {
  availableDivisionsForAthlete,
  candidateDivisionsForEvent,
  findDivisionDefinition,
  type PoolDivision,
} from "@/lib/divisions";
import type { WeightClassRow } from "@/lib/division-core";

const OPEN_MALE: WeightClassRow = {
  id: "wc-male-open",
  gender: Gender.MALE,
  name: "Open",
  minKg: null,
  maxKg: 200,
  sortOrder: 1,
};

const POOL: PoolDivision[] = [
  {
    divisionKey: "KYORUGI|MALE|15/17|wc-male-open|",
    name: "Kyorugi Male Junior Open",
    gender: "MALE",
    eventType: "KYORUGI",
    minAge: 15,
    maxAge: 17,
    beltType: null,
    weightClass: { minKg: null, maxKg: 200 },
  },
  {
    divisionKey: "KYORUGI|MALE|12/14|wc-male-open|",
    name: "Kyorugi Male Cadet Open",
    gender: "MALE",
    eventType: "KYORUGI",
    minAge: 12,
    maxAge: 14,
    beltType: null,
    weightClass: { minKg: null, maxKg: 200 },
  },
  {
    divisionKey: "POOMSAE|MALE|15/17||BLUE",
    name: "Poomsae Male Junior Blue",
    gender: "MALE",
    eventType: "POOMSAE",
    minAge: 15,
    maxAge: 17,
    beltType: "BLUE",
    weightClass: null,
  },
  {
    divisionKey: "POOMSAE|MALE|15/17||",
    name: "Poomsae Male Junior",
    gender: "MALE",
    eventType: "POOMSAE",
    minAge: 15,
    maxAge: 17,
    beltType: null,
    weightClass: null,
  },
  {
    divisionKey: "POOMSAE|FEMALE|15/17||BLUE",
    name: "Poomsae Female Junior Blue",
    gender: "FEMALE",
    eventType: "POOMSAE",
    minAge: 15,
    maxAge: 17,
    beltType: "BLUE",
    weightClass: null,
  },
  {
    divisionKey: "BREAKING|MALE|15/17||",
    name: "Breaking Male Junior",
    gender: "MALE",
    eventType: "BREAKING",
    minAge: 15,
    maxAge: 17,
    beltType: null,
    weightClass: null,
  },
];

const athlete = {
  gender: "MALE",
  birthYear: 2010, // age 16 in 2026
  weightKg: 60,
  beltType: "BLUE",
};

describe("availableDivisionsForAthlete", () => {
  it("includes every division the athlete qualifies for", () => {
    const options = availableDivisionsForAthlete(athlete, 2026, POOL).map(
      (o) => o.divisionKey,
    );
    expect(options).toContain("KYORUGI|MALE|15/17|wc-male-open|");
    expect(options).toContain("POOMSAE|MALE|15/17||BLUE");
    expect(options).toContain("BREAKING|MALE|15/17||");
  });

  it("excludes wrong-gender divisions", () => {
    const options = availableDivisionsForAthlete(athlete, 2026, POOL).map(
      (o) => o.divisionKey,
    );
    expect(options).not.toContain("POOMSAE|FEMALE|15/17||BLUE");
  });

  it("excludes age groups the athlete falls outside of", () => {
    const options = availableDivisionsForAthlete(athlete, 2026, POOL).map(
      (o) => o.divisionKey,
    );
    expect(options).not.toContain("KYORUGI|MALE|12/14|wc-male-open|");
  });

  it("filters poomsae by belt but ignores belt for kyorugi", () => {
    const options = availableDivisionsForAthlete(athlete, 2026, POOL).map(
      (o) => o.divisionKey,
    );
    expect(options).not.toContain("POOMSAE|MALE|15/17||");
    expect(options).toContain("KYORUGI|MALE|15/17|wc-male-open|");
  });

  it("excludes a weight class the athlete does not fit", () => {
    const pool = POOL.map((d) => ({
      ...d,
      weightClass: d.weightClass ? { minKg: 30, maxKg: 40 } : null,
    }));
    const options = availableDivisionsForAthlete(athlete, 2026, pool).map(
      (o) => o.divisionKey,
    );
    expect(options).not.toContain("KYORUGI|MALE|15/17|wc-male-open|");
  });

  it("returns empty for an athlete who fits nothing", () => {
    const options = availableDivisionsForAthlete(
      { ...athlete, gender: "FEMALE", birthYear: 1990 },
      2026,
      POOL,
    );
    expect(options).toEqual([]);
  });

  it("returns the display name alongside each key", () => {
    const options = availableDivisionsForAthlete(athlete, 2026, POOL);
    const junior = options.find(
      (o) => o.divisionKey === "KYORUGI|MALE|15/17|wc-male-open|",
    );
    expect(junior?.name).toBe("Kyorugi Male Junior Open");
  });
});

describe("candidateDivisionsForEvent", () => {
  it("covers every event type with unique keys", () => {
    const options = candidateDivisionsForEvent([OPEN_MALE]);
    const types = new Set(options.map((o) => o.type));
    expect(types.size).toBe(4);
    expect(
      types.has(EventType.KYORUGI) &&
        types.has(EventType.POOMSAE) &&
        types.has(EventType.FREESTYLE_POOMSAE) &&
        types.has(EventType.BREAKING),
    ).toBe(true);
    const keys = options.map((o) => o.divisionKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("labels the event type for the UI", () => {
    const options = candidateDivisionsForEvent([OPEN_MALE]);
    const junior = options.find(
      (o) => o.divisionKey === "KYORUGI|MALE|15/17|wc-male-open|",
    );
    expect(junior?.eventTypeLabel).toBe("Kyorugi");
  });
});

describe("findDivisionDefinition", () => {
  it("resolves a known division key", () => {
    const def = findDivisionDefinition([OPEN_MALE], "KYORUGI|MALE|15/17|wc-male-open|");
    expect(def).not.toBeNull();
    expect(def?.minAge).toBe(15);
    expect(def?.maxAge).toBe(17);
    expect(def?.weightClassId).toBe("wc-male-open");
  });

  it("returns null for an unknown division key", () => {
    const def = findDivisionDefinition([OPEN_MALE], "KYORUGI|MALE|15/17|missing|");
    expect(def).toBeNull();
  });
});
