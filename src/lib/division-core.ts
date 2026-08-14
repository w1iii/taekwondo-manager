import {
  BeltType,
  EventType,
  Gender,
} from "../generated/prisma/client";

export type AgeGroupDef = {
  name: string;
  minAge: number | null;
  maxAge: number | null;
  /** Eligible for kyorugi weight divisions. */
  kyorugi: boolean;
};

export const AGE_GROUPS: AgeGroupDef[] = [
  { name: "Under 10", minAge: null, maxAge: 9, kyorugi: false },
  { name: "Little Tiger", minAge: 4, maxAge: 5, kyorugi: false },
  { name: "Tiger", minAge: 6, maxAge: 7, kyorugi: false },
  { name: "Cub", minAge: 8, maxAge: 9, kyorugi: false },
  { name: "Cadet", minAge: 12, maxAge: 14, kyorugi: true },
  { name: "Junior", minAge: 15, maxAge: 17, kyorugi: true },
  { name: "Under 21", minAge: 18, maxAge: 20, kyorugi: true },
  { name: "Senior", minAge: 15, maxAge: null, kyorugi: true },
  { name: "Veteran 30–39", minAge: 30, maxAge: 39, kyorugi: true },
  { name: "Veteran 40–49", minAge: 40, maxAge: 49, kyorugi: true },
  { name: "Veteran 50+", minAge: 50, maxAge: null, kyorugi: true },
];

export function ageForEventYear(birthYear: number, eventYear: number): number {
  return eventYear - birthYear;
}

export function ageWithinGroup(
  age: number,
  group: Pick<AgeGroupDef, "minAge" | "maxAge">,
): boolean {
  if (group.minAge !== null && age < group.minAge) return false;
  if (group.maxAge !== null && age > group.maxAge) return false;
  return true;
}

export type WeightClassRow = {
  id: string;
  gender: Gender;
  name: string;
  minKg: number | null;
  maxKg: number | null;
  sortOrder: number;
};

export function weightWithinClass(
  weightKg: number,
  wc: Pick<WeightClassRow, "minKg" | "maxKg">,
): boolean {
  if (wc.minKg === null && wc.maxKg === null) return false;
  if (wc.minKg !== null && weightKg < wc.minKg) return false;
  if (wc.maxKg !== null && weightKg > wc.maxKg) return false;
  return true;
}

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  KYORUGI: "Kyorugi",
  POOMSAE: "Poomsae",
  FREESTYLE_POOMSAE: "Freestyle",
  BREAKING: "Breaking",
};

const BELT_LABELS: Record<BeltType, string> = {
  WHITE: "White",
  YELLOW: "Yellow",
  GREEN: "Green",
  BLUE: "Blue",
  RED: "Red",
  BLACK: "Black",
};

const GENDER_LABEL: Record<Gender, string> = {
  MALE: "Male",
  FEMALE: "Female",
};

export type DivisionInput = {
  name: string;
  gender: Gender;
  eventType: EventType;
  divisionKey: string;
  minAge: number | null;
  maxAge: number | null;
  weightClassId: string | null;
  beltType: BeltType | null;
};

/**
 * Athlete view used when generating divisions and drawing brackets.
 * All fields ship with the Athlete row from Prisma.
 */
export type DivisionAthlete = {
  id: string;
  gender: Gender;
  birthYear: number;
  weightKg: number;
  beltType?: BeltType | null;
};

/**
 * Fixed WT division generator: Division = AgeGroup + Gender + WeightClass
 * + EventType. Only non-empty divisions are emitted; Kyorugi uses the WT
 * Senior table reused across Cadet/Junior/Senior/Veteran bands.
 */
export function buildDivisions(
  eventYear: number,
  athletes: DivisionAthlete[],
  weightClasses: WeightClassRow[],
  eventTypes: EventType[],
): DivisionInput[] {
  const result: DivisionInput[] = [];
  const keys = new Set<string>();

  const push = (div: DivisionInput) => {
    if (keys.has(div.divisionKey)) return;
    keys.add(div.divisionKey);
    result.push(div);
  };

  const ageFor = (a: DivisionAthlete) => ageForEventYear(a.birthYear, eventYear);
  const ageKey = (g: AgeGroupDef) => `${g.minAge ?? ""}/${g.maxAge ?? ""}`;

  for (const eventType of eventTypes) {
    const typeLabel = EVENT_TYPE_LABELS[eventType];
    const eligibleGroups =
      eventType === EventType.KYORUGI
        ? AGE_GROUPS.filter((g) => g.kyorugi)
        : AGE_GROUPS;

    for (const gender of [Gender.MALE, Gender.FEMALE]) {
      const byGender = athletes.filter((a) => a.gender === gender);

      for (const group of eligibleGroups) {
        const aged = byGender.filter((a) => ageWithinGroup(ageFor(a), group));
        if (aged.length === 0) continue;

        if (eventType === EventType.KYORUGI) {
          const classes = weightClasses
            .filter((w) => w.gender === gender)
            .sort((a, b) => a.sortOrder - b.sortOrder);
          for (const wc of classes) {
            const members = aged.filter((a) => weightWithinClass(a.weightKg, wc));
            if (members.length === 0) continue;
            push({
              name: `${typeLabel} ${group.name} ${GENDER_LABEL[gender]} ${wc.name}`,
              gender,
              eventType,
              divisionKey: `KYORUGI|${gender}|${ageKey(group)}|${wc.id}|`,
              minAge: group.minAge,
              maxAge: group.maxAge,
              weightClassId: wc.id,
              beltType: null,
            });
          }
        } else if (eventType === EventType.POOMSAE) {
          const belts = new Set<BeltType | null>(aged.map((a) => a.beltType ?? null));
          for (const belt of belts) {
            const members = aged.filter((a) => (a.beltType ?? null) === belt);
            if (members.length === 0) continue;
            const suffix = belt ? ` ${BELT_LABELS[belt]}` : "";
            push({
              name: `${typeLabel} ${group.name} ${GENDER_LABEL[gender]}${suffix}`,
              gender,
              eventType,
              divisionKey: `POOMSAE|${gender}|${ageKey(group)}||${belt ?? ""}`,
              minAge: group.minAge,
              maxAge: group.maxAge,
              weightClassId: null,
              beltType: belt,
            });
          }
        } else {
          push({
            name: `${typeLabel} ${group.name} ${GENDER_LABEL[gender]}`,
            gender,
            eventType,
            divisionKey: `${eventType}|${gender}|${ageKey(group)}||`,
            minAge: group.minAge,
            maxAge: group.maxAge,
            weightClassId: null,
            beltType: null,
          });
        }
      }
    }
  }

  return result;
}

export function athletesInDivision(
  division: {
    gender: Gender;
    eventType: EventType;
    minAge: number | null;
    maxAge: number | null;
    beltType: BeltType | null;
    weightClass?: Pick<WeightClassRow, "minKg" | "maxKg"> | null;
  },
  eventYear: number,
  athletes: DivisionAthlete[],
): { id: string }[] {
  return athletes
    .filter((a) => a.gender === division.gender)
    .filter((a) =>
      ageWithinGroup(ageForEventYear(a.birthYear, eventYear), {
        minAge: division.minAge,
        maxAge: division.maxAge,
      }),
    )
    .filter((a) =>
      division.eventType === EventType.KYORUGI
        ? division.weightClass != null &&
          weightWithinClass(a.weightKg, division.weightClass)
        : division.eventType === EventType.POOMSAE
          ? (a.beltType ?? null) === division.beltType
          : true,
    )
    .map((a) => ({ id: a.id }));
}

export { BeltType, EventType, Gender };
