import { describe, expect, it } from "vitest";

import {
  ageForEventYear,
  ageWithinGroup,
  weightWithinClass,
  buildDivisions,
  enumerateDivisions,
  athletesInDivision,
  AGE_GROUPS,
  BeltType,
  EventType,
  Gender,
} from "@/lib/division-core";

describe("ageForEventYear", () => {
  it("computes age from birth year against the event year", () => {
    expect(ageForEventYear(2010, 2026)).toBe(16);
    expect(ageForEventYear(2020, 2026)).toBe(6);
  });
});

describe("ageWithinGroup", () => {
  it("bounds age inclusively", () => {
    expect(ageWithinGroup(12, { minAge: 12, maxAge: 14 })).toBe(true);
    expect(ageWithinGroup(14, { minAge: 12, maxAge: 14 })).toBe(true);
    expect(ageWithinGroup(15, { minAge: 12, maxAge: 14 })).toBe(false);
    expect(ageWithinGroup(11, { minAge: 12, maxAge: 14 })).toBe(false);
  });

  it("treats null bounds as open-ended", () => {
    expect(ageWithinGroup(5, { minAge: null, maxAge: 9 })).toBe(true);
    expect(ageWithinGroup(80, { minAge: 50, maxAge: null })).toBe(true);
    expect(ageWithinGroup(10, { minAge: null, maxAge: 9 })).toBe(false);
  });
});

describe("weightWithinClass", () => {
  it("bounds weight inclusively", () => {
    expect(weightWithinClass(50, { minKg: 45, maxKg: 50 })).toBe(true);
    expect(weightWithinClass(50.1, { minKg: 45, maxKg: 50 })).toBe(false);
    expect(weightWithinClass(44.9, { minKg: 45, maxKg: 50 })).toBe(false);
  });

  it("requires at least one bound", () => {
    expect(weightWithinClass(60, { minKg: null, maxKg: null })).toBe(false);
  });
});

describe("buildDivisions", () => {
  const weightClasses = [
    { id: "w1", gender: Gender.MALE, name: "Under 45kg", minKg: 1, maxKg: 45, sortOrder: 1 },
    { id: "w2", gender: Gender.FEMALE, name: "Under 43kg", minKg: 1, maxKg: 43, sortOrder: 1 },
  ];

  const maleJunior = (id: string, birthYear: number, weightKg = 60) => ({
    id,
    gender: Gender.MALE,
    birthYear,
    weightKg,
    beltType: BeltType.BLUE,
  });

  it("emits only non-empty divisions", () => {
    const divisions = buildDivisions(2026, [], weightClasses, [EventType.KYORUGI]);
    expect(divisions).toEqual([]);
  });

  it("places kyorugi athletes into matching weight classes by gender", () => {
    const athletes = [maleJunior("a1", 2011, 40)];
    const divisions = buildDivisions(2026, athletes, weightClasses, [EventType.KYORUGI]);
    // Junior MALE athletes: 2011 → age 15, kyorugi-eligible, weight 40 → w1.
    expect(divisions.length).toBeGreaterThan(0);
    const div = divisions.find((d) => d.divisionKey.includes("w1"));
    expect(div).toBeTruthy();
    expect(div!.gender).toBe(Gender.MALE);
    expect(div!.eventType).toBe(EventType.KYORUGI);
  });

  it("keys are unique across the generated set", () => {
    const athletes = [
      maleJunior("a1", 2011, 40),
      maleJunior("a2", 2012, 40),
    ];
    const divisions = buildDivisions(2026, athletes, weightClasses, [EventType.KYORUGI]);
    const keys = divisions.map((d) => d.divisionKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("drops empty weight classes", () => {
    // No athlete under 45kg for males → no kyorugi division referencing w1.
    const athletes = [maleJunior("a1", 2011, 70)];
    const divisions = buildDivisions(2026, athletes, weightClasses, [EventType.KYORUGI]);
    expect(divisions.some((d) => d.divisionKey.includes("w1"))).toBe(false);
  });

  it("generates poomsae belt groups", () => {
    const athletes = [maleJunior("a1", 2011, 60)];
    const divisions = buildDivisions(2026, athletes, weightClasses, [EventType.POOMSAE]);
    expect(divisions.some((d) => d.eventType === EventType.POOMSAE)).toBe(true);
    expect(divisions.some((d) => d.beltType === BeltType.BLUE)).toBe(true);
  });

  it("does not route non-kyorugi athletes through weight classes", () => {
    const athletes = [maleJunior("a1", 2011, 70)];
    const divisions = buildDivisions(2026, athletes, weightClasses, [EventType.POOMSAE]);
    expect(divisions.every((d) => d.weightClassId === null)).toBe(true);
  });
});

describe("athletesInDivision", () => {
  it("filters by gender, age group, and weight class", () => {
    const athletes = [
      { id: "m1", gender: Gender.MALE, birthYear: 2011, weightKg: 40, beltType: BeltType.WHITE },
      { id: "m2", gender: Gender.MALE, birthYear: 2005, weightKg: 40, beltType: BeltType.WHITE },
      { id: "f1", gender: Gender.FEMALE, birthYear: 2011, weightKg: 40, beltType: BeltType.WHITE },
    ];
    const members = athletesInDivision(
      {
        gender: Gender.MALE,
        eventType: EventType.KYORUGI,
        minAge: 12,
        maxAge: 17,
        beltType: null,
        weightClass: { minKg: 1, maxKg: 45 },
      },
      2026,
      athletes,
    );
    expect(members.map((m) => m.id)).toEqual(["m1"]);
  });
});

describe("AGE_GROUPS", () => {
  it("covers the full age range", () => {
    const minAges = AGE_GROUPS.filter((g) => g.minAge !== null).map((g) => g.minAge!);
    const maxAges = AGE_GROUPS.filter((g) => g.maxAge !== null).map((g) => g.maxAge!);
    expect(Math.min(...minAges)).toBe(4);
    expect(Math.max(...maxAges)).toBe(49);
  });
});

describe("enumerateDivisions", () => {
  const weightClasses = [
    { id: "w1", gender: Gender.MALE, name: "Under 45kg", minKg: 1, maxKg: 45, sortOrder: 1 },
    { id: "w2", gender: Gender.FEMALE, name: "Under 43kg", minKg: 1, maxKg: 43, sortOrder: 1 },
  ];

  it("enumerates every kyorugi weight class regardless of athletes", () => {
    const divisions = enumerateDivisions(weightClasses, [EventType.KYORUGI]);
    expect(divisions.length).toBeGreaterThan(0);
    expect(
      divisions.some((d) => d.eventType === EventType.KYORUGI && d.weightClassId === "w1"),
    ).toBe(true);
    expect(
      divisions.some((d) => d.eventType === EventType.KYORUGI && d.weightClassId === "w2"),
    ).toBe(true);
    // Only kyorugi-eligible age groups.
    const kyorugiGroups = AGE_GROUPS.filter((g) => g.kyorugi);
    expect(divisions.length).toBe(kyorugiGroups.length * 2);
  });

  it("enumerates every belt option for poomsae", () => {
    const divisions = enumerateDivisions(weightClasses, [EventType.POOMSAE]);
    const maleDivs = divisions.filter(
      (d) => d.eventType === EventType.POOMSAE && d.gender === Gender.MALE,
    );
    const beltCounts = new Set(maleDivs.map((d) => d.beltType));
    // null (no belt) + 6 belt colors per age group.
    expect(beltCounts.size).toBe(7);
    expect(maleDivs.length).toBe(AGE_GROUPS.length * 7);
  });

  it("enumerates one freestyle/breaking division per age group per gender", () => {
    const divisions = enumerateDivisions(weightClasses, [EventType.BREAKING]);
    expect(divisions.length).toBe(AGE_GROUPS.length * 2);
    expect(divisions.every((d) => d.weightClassId === null)).toBe(true);
  });

  it("emits unique keys across event types", () => {
    const divisions = enumerateDivisions(weightClasses, [
      EventType.KYORUGI,
      EventType.POOMSAE,
      EventType.FREESTYLE_POOMSAE,
      EventType.BREAKING,
    ]);
    const keys = divisions.map((d) => d.divisionKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("omits kyorugi divisions when no weight classes exist", () => {
    const divisions = enumerateDivisions([], [EventType.KYORUGI, EventType.POOMSAE]);
    expect(divisions.some((d) => d.eventType === EventType.KYORUGI)).toBe(false);
    expect(divisions.some((d) => d.eventType === EventType.POOMSAE)).toBe(true);
  });
});
