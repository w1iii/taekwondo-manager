import pg from "pg";

const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/** Wipes all tables in FK-safe order. */
export async function resetDb(): Promise<void> {
  await pool.query(
    `TRUNCATE TABLE "RateLimit", "Notification", "BracketCell", "Division",
      "TeamPayment", "Enrollment", "Event", "Athlete", "WeightClass", "Chapter"
      CASCADE`,
  );
}

export async function seedWeightClasses(): Promise<void> {
  await pool.query(
    `INSERT INTO "WeightClass" ("id", "gender", "name", "minKg", "maxKg", "sortOrder")
     VALUES ($1, 'MALE', 'Open', NULL, 200, 1),
            ($2, 'FEMALE', 'Open', NULL, 200, 1)`,
    [crypto.randomUUID(), crypto.randomUUID()],
  );
}

export async function seedPublishedEvent(): Promise<{ id: string }> {
  const id = "e2e00000-0000-4000-8000-000000000001";
  await pool.query(
    `INSERT INTO "Event" ("id", "name", "location", "eventDate", "registrationDeadline", "entryFeePesos", "status", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, 'PUBLISHED', now(), now())
     ON CONFLICT ("id") DO UPDATE SET
       "name" = EXCLUDED."name",
       "location" = EXCLUDED."location",
       "eventDate" = EXCLUDED."eventDate",
       "registrationDeadline" = EXCLUDED."registrationDeadline",
       "entryFeePesos" = EXCLUDED."entryFeePesos",
       "status" = 'PUBLISHED',
       "updatedAt" = now()`,
    [
      id,
      "E2E Open",
      "Bacolod City Sports Center",
      new Date("2026-12-01T00:00:00.000Z"),
      new Date("2026-11-01T00:00:00.000Z"),
      500,
    ],
  );
  return { id };
}

/** Simulates the organizer approving the coach's chapter. */
export async function approveChapterByEmail(email: string) {
  await pool.query(`UPDATE "Chapter" SET "status" = 'APPROVED' WHERE "headCoachEmail" = $1`, [
    email,
  ]);
}

/** Simulates the organizer approving a chapter's team payment. */
export async function approvePayment(chapterId: string, eventId: string) {
  await pool.query(
    `UPDATE "TeamPayment" SET "status" = 'APPROVED', "reviewedAt" = now()
     WHERE "chapterId" = $1 AND "eventId" = $2`,
    [chapterId, eventId],
  );
}

export type E2EDb = {
  chapterId?: string;
  eventId?: string;
  athleteId?: string;
  chapterStatus?: string;
  enrollmentCount?: number;
  paymentStatus?: string;
  paymentReference?: string;
  divisionCount?: number;
};

/**
 * Simulates the organizer generating divisions + bracket for the event
 * (mirrors generateDivisions/generateBracket) so the coach can view a bracket.
 */
export async function seedDivisionAndBracket(
  eventId: string,
  athleteIds: string[],
): Promise<void> {
  if (athleteIds.length < 2) throw new Error("seedDivisionAndBracket needs >= 2 athletes");

  const divisionId = crypto.randomUUID();
  await pool.query(
    `INSERT INTO "Division" ("id", "eventId", "name", "gender", "eventType", "divisionKey", "minAge", "maxAge")
     VALUES ($1, $2, $3, 'MALE', 'KYORUGI', $4, 15, 17)`,
    [divisionId, eventId, "Kyorugi Male Junior Open", `KYORUGI|MALE|15/17|e2e|`],
  );

  const leafA = crypto.randomUUID();
  const leafB = crypto.randomUUID();
  const final = crypto.randomUUID();

  await pool.query(
    `INSERT INTO "BracketCell" ("id", "divisionId", "round", "position", "athleteId", "childAId", "childBId")
     VALUES
       ($1, $5, 1, 0, $2, NULL, NULL),
       ($3, $5, 1, 1, $4, NULL, NULL),
       ($6, $5, 0, 0, NULL, $1, $3)`,
    [leafA, athleteIds[0], leafB, athleteIds[1], divisionId, final],
  );
}

/**
 * Reads rows back so the spec can assert on committed state.
 * Avoids importing the generated Prisma client in the ESM e2e context.
 */
export const db: E2EDb & {
  chapter: (email: string) => Promise<{ id: string; status: string } | null>;
  chapterEmail: (chapterId: string) => Promise<string | null>;
  athlete: (chapterId: string, name: string) => Promise<{ id: string } | null>;
  enrollment: (eventId: string, athleteId: string) => Promise<{ id: string } | null>;
  teamPayment: (eventId: string, chapterId: string) => Promise<{ status: string; referenceNo: string } | null>;
  event: () => Promise<{ id: string } | null>;
  division: (eventId: string) => Promise<{ count: number }>;
  createAthlete: (
    chapterId: string,
    name: string,
    gender: "MALE" | "FEMALE",
    birthYear: number,
    weightKg: number,
  ) => Promise<{ id: string }>;
  createEnrollment: (
    eventId: string,
    chapterId: string,
    athleteId: string,
  ) => Promise<{ id: string }>;
} = {
  async chapter(email: string) {
    const { rows } = await pool.query(
      `SELECT "id", "status" FROM "Chapter" WHERE "headCoachEmail" LIKE $1 LIMIT 1`,
      [`${email}%`],
    );
    return rows[0] ?? null;
  },
  async chapterEmail(chapterId: string) {
    const { rows } = await pool.query(
      `SELECT "headCoachEmail" FROM "Chapter" WHERE "id" = $1 LIMIT 1`,
      [chapterId],
    );
    return rows[0]?.headCoachEmail ?? null;
  },
  async athlete(chapterId: string, name: string) {
    const { rows } = await pool.query(
      `SELECT "id" FROM "Athlete" WHERE "chapterId" = $1 AND "name" = $2 LIMIT 1`,
      [chapterId, name],
    );
    return rows[0] ?? null;
  },
  async enrollment(eventId: string, athleteId: string) {
    const { rows } = await pool.query(
      `SELECT "id" FROM "Enrollment" WHERE "eventId" = $1 AND "athleteId" = $2 LIMIT 1`,
      [eventId, athleteId],
    );
    return rows[0] ?? null;
  },
  async teamPayment(eventId: string, chapterId: string) {
    const { rows } = await pool.query(
      `SELECT "status", "referenceNo" FROM "TeamPayment"
       WHERE "eventId" = $1 AND "chapterId" = $2 LIMIT 1`,
      [eventId, chapterId],
    );
    return rows[0] ?? null;
  },
  async event() {
    const { rows } = await pool.query(`SELECT "id" FROM "Event" ORDER BY "eventDate" ASC LIMIT 1`);
    return rows[0] ?? null;
  },
  async division(eventId: string) {
    const { rows } = await pool.query(
      `SELECT count(*)::int AS "count" FROM "Division" WHERE "eventId" = $1`,
      [eventId],
    );
    return { count: rows[0].count };
  },
  async createAthlete(chapterId, name, gender, birthYear, weightKg) {
    const id = crypto.randomUUID();
    await pool.query(
      `INSERT INTO "Athlete" ("id", "chapterId", "name", "gender", "birthYear", "weightKg", "beltType", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, 'BLUE', now(), now())`,
      [id, chapterId, name, gender, birthYear, weightKg],
    );
    return { id };
  },
  async createEnrollment(eventId, chapterId, athleteId) {
    const id = crypto.randomUUID();
    await pool.query(
      `INSERT INTO "Enrollment" ("id", "eventId", "chapterId", "athleteId")
       VALUES ($1, $2, $3, $4)`,
      [id, eventId, chapterId, athleteId],
    );
    return { id };
  },
};
