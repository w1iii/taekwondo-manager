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
    db.division.deleteMany({}),
    db.teamPayment.deleteMany({}),
    db.enrollment.deleteMany({}),
    db.event.deleteMany({}),
    db.athlete.deleteMany({}),
    db.weightClass.deleteMany({}),
    db.chapter.deleteMany({}),
  ]);
}

export async function seedWeightClasses(): Promise<void> {
  await db.weightClass.createMany({
    data: [
      { gender: Gender.MALE, name: "Open", minKg: null, maxKg: 200, sortOrder: 1 },
      { gender: Gender.FEMALE, name: "Open", minKg: null, maxKg: 200, sortOrder: 1 },
    ],
  });
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
  return db.athlete.findMany({ where: { chapterId } });
}

export async function seedChapter(
  overrides: Partial<{ status: ChapterStatus; headCoachEmail: string; name: string }> = {},
) {
  return db.chapter.create({
    data: {
      name: overrides.name ?? "Test Dojang",
      province: "Negros Occidental",
      city: "Bacolod",
      gcashNumber: "09170000000",
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

export async function seedEnrollment(eventId: string, chapterId: string, athleteId: string) {
  return db.enrollment.create({ data: { eventId, chapterId, athleteId } });
}

/** Wraps requireRole so each test can set the acting user. */
export function userForm(user: TestCoach): TestCoach {
  return user;
}

export { EventType };
