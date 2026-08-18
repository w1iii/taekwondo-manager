import { db } from "@/lib/db";
import {
  BeltType,
  ChapterStatus,
  EventStatus,
  EventType,
  Gender,
} from "@/generated/prisma/client";

export type TestCoach = {
  userId: string;
  email: string;
  role: "coach" | "organizer";
  chapterId?: string;
};

/** Wipes all tables in FK-safe order. Run in beforeEach. */
export async function resetDb(): Promise<void> {
  await db.$transaction([
    db.pageView.deleteMany({}),
    db.rateLimit.deleteMany({}),
    db.notification.deleteMany({}),
    db.bracketCell.deleteMany({}),
    db.orderItemDivision.deleteMany({}),
    db.division.deleteMany({}),
    db.approvedAthleteDivision.deleteMany({}),
    db.approvedAthlete.deleteMany({}),
    db.eventDivision.deleteMany({}),
    db.paymentAttempt.deleteMany({}),
    db.orderItem.deleteMany({}),
    db.order.deleteMany({}),
    db.event.deleteMany({}),
    db.athleteClub.deleteMany({}),
    db.athlete.deleteMany({}),
    db.weightClass.deleteMany({}),
    db.chapter.deleteMany({}),
  ]);
}

export async function seedWeightClasses(): Promise<
  { id: string; gender: Gender }[]
> {
  await db.weightClass.createMany({
    data: [
      { gender: Gender.MALE, name: "Open", minKg: null, maxKg: 200, sortOrder: 1 },
      { gender: Gender.FEMALE, name: "Open", minKg: null, maxKg: 200, sortOrder: 1 },
    ],
  });
  return db.weightClass.findMany({ orderBy: { gender: "asc" } });
}

export async function seedAthletes(
  chapterId: string,
  count = 4,
  opts: { gender?: Gender; birthYear?: number } = {},
) {
  const rows = Array.from({ length: count }, (_, i) => ({
    chapterId,
    name: `Athlete ${i + 1}`,
    gender: opts.gender ?? (i % 2 === 0 ? Gender.MALE : Gender.FEMALE),
    birthYear: opts.birthYear ?? 2010 + i,
    weightKg: 40 + i * 5,
    beltType: BeltType.BLUE,
  }));
  await db.athlete.createMany({ data: rows });
  const athletes = await db.athlete.findMany({ where: { chapterId } });
  const existing = await db.athleteClub.findMany({
    where: { chapterId },
    select: { athleteId: true },
  });
  const existingIds = new Set(existing.map((e) => e.athleteId));
  await db.athleteClub.createMany({
    data: athletes
      .filter((a) => !existingIds.has(a.id))
      .map((a) => ({ athleteId: a.id, chapterId })),
  });
  return athletes;
}

export async function seedChapter(
  overrides: Partial<{
    status: ChapterStatus;
    headCoachEmail: string;
    name: string;
    gcashNumber: string;
  }> = {},
) {
  return db.chapter.create({
    data: {
      name: overrides.name ?? "Test Dojang",
      province: "Negros Occidental",
      city: "Bacolod",
      gcashNumber: overrides.gcashNumber ?? "09170000000",
      headCoachName: "Test Coach",
      headCoachEmail: overrides.headCoachEmail ?? "coach@test.ph",
      status: overrides.status ?? ChapterStatus.APPROVED,
    },
  });
}

export async function seedEvent(overrides: Partial<{ status: EventStatus; eventDate: Date }> = {}) {
  return db.event.create({
    data: {
      name: "Test Open",
      location: "Test Venue",
      eventDate: overrides.eventDate ?? new Date("2026-12-01T00:00:00.000Z"),
      registrationDeadline: new Date("2026-11-01T00:00:00.000Z"),
      entryFeePesos: 500,
      status: overrides.status ?? EventStatus.PUBLISHED,
    },
  });
}

async function ensureSeedOrder(eventId: string, chapterId: string) {
  const id = `seed-order-${eventId}`;
  await db.order.upsert({
    where: { id },
    create: { id, eventId, coachId: chapterId, chapterId },
    update: {},
  });
  return id;
}

export async function seedApprovedAthlete(eventId: string, chapterId: string, athleteId: string) {
  const orderId = await ensureSeedOrder(eventId, chapterId);
  return db.approvedAthlete.upsert({
    where: { eventId_athleteId: { eventId, athleteId } },
    create: {
      eventId,
      chapterId,
      athleteId,
      orderId,
    },
    update: {},
  });
}

const KYORUGI_JUNIOR_KEY = (wcId: string) => `KYORUGI|MALE|15/17|${wcId}|`;
const KYORUGI_CADET_KEY = (wcId: string) => `KYORUGI|MALE|12/14|${wcId}|`;

/**
 * Seeds an EventDivision pool (available divisions) on an event. Male kyorugi
 * Cadet (12–14) and Junior (15–17) against the given weight class — covers the
 * male athletes seedAthletes() creates (age 16, weight 40–65 within Open).
 */
export async function seedEventDivisions(eventId: string, wcId: string) {
  const rows = [
    {
      eventId,
      name: "Kyorugi Male Cadet Open",
      gender: Gender.MALE,
      eventType: EventType.KYORUGI,
      divisionKey: KYORUGI_CADET_KEY(wcId),
      minAge: 12,
      maxAge: 14,
      weightClassId: wcId,
      beltType: null,
      sortOrder: 0,
    },
    {
      eventId,
      name: "Kyorugi Male Junior Open",
      gender: Gender.MALE,
      eventType: EventType.KYORUGI,
      divisionKey: KYORUGI_JUNIOR_KEY(wcId),
      minAge: 15,
      maxAge: 17,
      weightClassId: wcId,
      beltType: null,
      sortOrder: 1,
    },
  ];
  await db.eventDivision.createMany({ data: rows });
  return {
    rows,
    cadetKey: KYORUGI_CADET_KEY(wcId),
    juniorKey: KYORUGI_JUNIOR_KEY(wcId),
  };
}

export async function seedApprovedAthleteDivision(
  approvedAthleteId: string,
  divisionId: string,
) {
  return db.approvedAthleteDivision.create({
    data: { approvedAthleteId, divisionId },
  });
}

/** Seeds weight classes + a male kyorugi pool on an event; returns the pool. */
export async function seedPool(eventId: string) {
  const [maleWc] = await seedWeightClasses();
  return seedEventDivisions(eventId, maleWc.id);
}

/** Wraps requireRole so each test can set the acting user. */
export function userForm(user: TestCoach): TestCoach {
  return user;
}

export { EventType };
