import pg from "pg";

const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const E2E_DIVISION_NAME = "Kyorugi Male Junior Open";

/** Wipes all tables in FK-safe order. */
export async function resetDb(): Promise<void> {
  await pool.query(
    `TRUNCATE TABLE "RateLimit", "Notification", "BracketCell", "OrderItemDivision",
      "Division", "ApprovedAthleteDivision", "ApprovedAthlete", "EventDivision",
      "PaymentAttempt", "OrderItem", "Order", "Event", "AthleteClub", "Athlete",
      "WeightClass", "Chapter" CASCADE`,
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

async function maleOpenWeightClassId(): Promise<string> {
  const { rows } = await pool.query(
    `SELECT "id" FROM "WeightClass" WHERE "gender" = 'MALE' ORDER BY "sortOrder" ASC LIMIT 1`,
  );
  return rows[0].id;
}

function juniorKey(wcId: string): string {
  return `KYORUGI|MALE|15/17|${wcId}|`;
}

/** Creates the live Division row a coach's registration materializes. */
async function findOrCreateLiveDivision(eventId: string): Promise<{ id: string }> {
  const wcId = await maleOpenWeightClassId();
  const key = juniorKey(wcId);
  const { rows } = await pool.query(
    `INSERT INTO "Division" ("id", "eventId", "name", "gender", "eventType", "divisionKey", "minAge", "maxAge", "weightClassId", "createdAt")
     VALUES ($1, $2, $3, 'MALE', 'KYORUGI', $4, 15, 17, $5, now())
     ON CONFLICT ("eventId", "divisionKey") DO NOTHING
     RETURNING "id"`,
    [crypto.randomUUID(), eventId, E2E_DIVISION_NAME, key, wcId],
  );
  if (rows[0]) return rows[0];
  const existing = await pool.query(
    `SELECT "id" FROM "Division" WHERE "eventId" = $1 AND "divisionKey" = $2 LIMIT 1`,
    [eventId, key],
  );
  return existing.rows[0];
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

  // Admin-curated available divisions (pool) for the event.
  const wcId = await maleOpenWeightClassId();
  await pool.query(
    `INSERT INTO "EventDivision" ("id", "eventId", "name", "gender", "eventType", "divisionKey", "minAge", "maxAge", "weightClassId", "sortOrder", "createdAt")
     VALUES ($1, $2, $3, 'MALE', 'KYORUGI', $4, 15, 17, $5, 0, now())
     ON CONFLICT ("eventId", "divisionKey") DO NOTHING`,
    [crypto.randomUUID(), id, E2E_DIVISION_NAME, juniorKey(wcId), wcId],
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
  const { rows } = await pool.query(
    `SELECT o."id" AS "orderId" FROM "Order" o
     WHERE o."eventId" = $1 AND o."chapterId" = $2
       AND o."status" IN ('PENDING', 'PAID') LIMIT 1`,
    [eventId, chapterId],
  );
  const orderId = rows[0]?.orderId;
  if (!orderId) return;

  await pool.query(
    `UPDATE "PaymentAttempt" SET "outcome" = 'APPROVED', "reviewedAt" = now()
     WHERE "orderId" = $1`,
    [orderId],
  );
  await pool.query(`UPDATE "Order" SET "status" = 'APPROVED' WHERE "id" = $1`, [orderId]);

  const items = await pool.query(
    `SELECT "athleteId" FROM "OrderItem" WHERE "orderId" = $1`,
    [orderId],
  );
  const division = await findOrCreateLiveDivision(eventId);
  for (const item of items.rows) {
    const approvedId = crypto.randomUUID();
    await pool.query(
      `INSERT INTO "ApprovedAthlete" ("id", "eventId", "chapterId", "athleteId", "orderId", "approvedAt")
       VALUES ($1, $2, $3, $4, $5, now())
       ON CONFLICT ("eventId", "athleteId") DO NOTHING`,
      [approvedId, eventId, chapterId, item.athleteId, orderId],
    );
    const approved = await pool.query(
      `SELECT "id" FROM "ApprovedAthlete" WHERE "eventId" = $1 AND "athleteId" = $2 LIMIT 1`,
      [eventId, item.athleteId],
    );
    await pool.query(
      `INSERT INTO "ApprovedAthleteDivision" ("id", "approvedAthleteId", "divisionId")
       VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING`,
      [crypto.randomUUID(), approved.rows[0].id, division.id],
    );
    await pool.query(
      `DELETE FROM "OrderItem" WHERE "orderId" = $1 AND "athleteId" = $2`,
      [orderId, item.athleteId],
    );
  }
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
 * Simulates the organizer drawing the bracket for the live division
 * (mirrors generateBracket) so the coach can view it. Athletes must already
 * be enrolled into that division via approvePayment/createEnrollment.
 */
export async function seedDivisionAndBracket(
  eventId: string,
  athleteIds: string[],
): Promise<void> {
  if (athleteIds.length < 2) throw new Error("seedDivisionAndBracket needs >= 2 athletes");

  const { rows } = await pool.query(
    `SELECT "id" FROM "Division" WHERE "eventId" = $1 ORDER BY "createdAt" ASC LIMIT 1`,
    [eventId],
  );
  const divisionId = rows[0].id;

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
      `SELECT i."id" FROM "OrderItem" i
       JOIN "Order" o ON o."id" = i."orderId"
       WHERE o."eventId" = $1 AND i."athleteId" = $2 LIMIT 1`,
      [eventId, athleteId],
    );
    return rows[0] ?? null;
  },
  async teamPayment(eventId: string, chapterId: string) {
    const { rows } = await pool.query(
      `SELECT p."outcome" AS "status", p."referenceNo" FROM "PaymentAttempt" p
       JOIN "Order" o ON o."id" = p."orderId"
       WHERE o."eventId" = $1 AND o."chapterId" = $2 LIMIT 1`,
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
    await pool.query(
      `INSERT INTO "AthleteClub" ("id", "athleteId", "chapterId", "status", "joinedAt", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, 'ACTIVE', now(), now(), now())`,
      [crypto.randomUUID(), id, chapterId],
    );
    return { id };
  },
  async createEnrollment(eventId, chapterId, athleteId) {
    const division = await findOrCreateLiveDivision(eventId);
    const approvedId = crypto.randomUUID();
    await pool.query(
      `INSERT INTO "ApprovedAthlete" ("id", "eventId", "chapterId", "athleteId", "orderId", "approvedAt")
       VALUES ($1, $2, $3, $4, 'e2e', now())
       ON CONFLICT ("eventId", "athleteId") DO NOTHING`,
      [approvedId, eventId, chapterId, athleteId],
    );
    const approved = await pool.query(
      `SELECT "id" FROM "ApprovedAthlete" WHERE "eventId" = $1 AND "athleteId" = $2 LIMIT 1`,
      [eventId, athleteId],
    );
    await pool.query(
      `INSERT INTO "ApprovedAthleteDivision" ("id", "approvedAthleteId", "divisionId")
       VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING`,
      [crypto.randomUUID(), approved.rows[0].id, division.id],
    );
    return { id: approved.rows[0].id };
  },
};