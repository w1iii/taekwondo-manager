import "server-only";

export * from "./division-core";

import { EventType } from "../generated/prisma/client";
import {
  ageForEventYear,
  ageWithinGroup,
  enumerateDivisions,
  EVENT_TYPE_LABELS,
  weightWithinClass,
  type DivisionInput,
  type WeightClassRow,
} from "./division-core";

export type DivisionOption = {
  divisionKey: string;
  name: string;
  eventTypeLabel: string;
  gender: string;
  type: EventType;
};

const ALL_EVENT_TYPES = [
  EventType.KYORUGI,
  EventType.POOMSAE,
  EventType.FREESTYLE_POOMSAE,
  EventType.BREAKING,
];

/** Serializes the full WT candidate division set for the admin event form. */
export function candidateDivisionsForEvent(
  weightClasses: WeightClassRow[],
): DivisionOption[] {
  return enumerateDivisions(weightClasses, ALL_EVENT_TYPES).map((d) => ({
    divisionKey: d.divisionKey,
    name: d.name,
    eventTypeLabel: EVENT_TYPE_LABELS[d.eventType],
    gender: d.gender,
    type: d.eventType,
  }));
}

/** Resolves a submitted divisionKey back to its full definition (or null). */
export function findDivisionDefinition(
  weightClasses: WeightClassRow[],
  divisionKey: string,
): DivisionInput | null {
  return (
    enumerateDivisions(weightClasses, ALL_EVENT_TYPES).find(
      (d) => d.divisionKey === divisionKey,
    ) ?? null
  );
}

export type PoolDivision = {
  divisionKey: string;
  name: string;
  gender: string;
  eventType: string;
  minAge: number | null;
  maxAge: number | null;
  beltType: string | null;
  weightClass: { minKg: number | null; maxKg: number | null } | null;
};

export type AvailableDivisionOption = { divisionKey: string; name: string };

/**
 * Divisions from an event's pool that a given athlete actually qualifies for
 * (gender, age, weight class, belt). Coaches can only pick from these.
 */
export function availableDivisionsForAthlete(
  athlete: {
    gender: string;
    birthYear: number;
    weightKg: number;
    beltType: string | null;
  },
  eventYear: number,
  pool: PoolDivision[],
): AvailableDivisionOption[] {
  const age = ageForEventYear(athlete.birthYear, eventYear);
  return pool
    .filter((d) => d.gender === athlete.gender)
    .filter((d) => ageWithinGroup(age, d))
    .filter((d) =>
      d.eventType === EventType.POOMSAE
        ? (d.beltType ?? null) === (athlete.beltType ?? null)
        : true,
    )
    .filter((d) =>
      d.weightClass ? weightWithinClass(athlete.weightKg, d.weightClass) : true,
    )
    .map((d) => ({ divisionKey: d.divisionKey, name: d.name }));
}