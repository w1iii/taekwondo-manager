-- CreateEnum (idempotent)
DO $$ BEGIN
    CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PAID', 'APPROVED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable (idempotent)
CREATE TABLE IF NOT EXISTS "Order" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ApprovedAthlete" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "approvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApprovedAthlete_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (idempotent)
CREATE UNIQUE INDEX IF NOT EXISTS "OrderItem_orderId_athleteId_key" ON "OrderItem"("orderId", "athleteId");
CREATE INDEX IF NOT EXISTS "OrderItem_orderId_idx" ON "OrderItem"("orderId");
CREATE INDEX IF NOT EXISTS "OrderItem_athleteId_idx" ON "OrderItem"("athleteId");

CREATE UNIQUE INDEX IF NOT EXISTS "ApprovedAthlete_eventId_athleteId_key" ON "ApprovedAthlete"("eventId", "athleteId");
CREATE INDEX IF NOT EXISTS "ApprovedAthlete_chapterId_idx" ON "ApprovedAthlete"("chapterId");
CREATE INDEX IF NOT EXISTS "ApprovedAthlete_eventId_idx" ON "ApprovedAthlete"("eventId");

CREATE INDEX IF NOT EXISTS "Order_eventId_chapterId_idx" ON "Order"("eventId", "chapterId");
CREATE INDEX IF NOT EXISTS "Order_status_idx" ON "Order"("status");
CREATE INDEX IF NOT EXISTS "Order_coachId_idx" ON "Order"("coachId");

-- Migrate data: TeamRegistration -> Order (only if Order is empty)
INSERT INTO "Order" ("id", "coachId", "eventId", "chapterId", "status", "createdAt", "updatedAt")
SELECT
    tr."id",
    tr."coachId",
    tr."eventId",
    tr."chapterId",
    CASE
        WHEN tr."status" = 'PENDING_PAYMENT' THEN 'PENDING'::"OrderStatus"
        WHEN tr."status" = 'PAYMENT_SUBMITTED' THEN 'PAID'::"OrderStatus"
        WHEN tr."status" = 'APPROVED' THEN 'APPROVED'::"OrderStatus"
        WHEN tr."status" = 'REJECTED' THEN 'REJECTED'::"OrderStatus"
        ELSE 'PENDING'::"OrderStatus"
    END,
    tr."createdAt",
    tr."updatedAt"
FROM "TeamRegistration" tr
WHERE NOT EXISTS (SELECT 1 FROM "Order" o WHERE o."id" = tr."id");

-- Migrate data: AthleteEntry -> OrderItem (for PENDING/PAID orders)
INSERT INTO "OrderItem" ("id", "orderId", "athleteId")
SELECT
    ae."id",
    ae."teamRegistrationId",
    ae."athleteId"
FROM "AthleteEntry" ae
WHERE ae."status" = 'ACTIVE'
  AND EXISTS (
      SELECT 1 FROM "TeamRegistration" tr
      WHERE tr.id = ae."teamRegistrationId"
        AND tr.status IN ('PENDING_PAYMENT', 'PAYMENT_SUBMITTED')
  )
  AND NOT EXISTS (SELECT 1 FROM "OrderItem" oi WHERE oi."id" = ae."id");

-- Migrate data: AthleteEntry -> ApprovedAthlete (for APPROVED orders)
INSERT INTO "ApprovedAthlete" ("id", "eventId", "chapterId", "athleteId", "orderId", "approvedAt")
SELECT
    ae."id",
    tr."eventId",
    tr."chapterId",
    ae."athleteId",
    ae."teamRegistrationId",
    COALESCE(ae."createdAt", CURRENT_TIMESTAMP)
FROM "AthleteEntry" ae
JOIN "TeamRegistration" tr ON tr.id = ae."teamRegistrationId"
WHERE ae."status" = 'ACTIVE'
  AND tr."status" = 'APPROVED'
  AND NOT EXISTS (SELECT 1 FROM "ApprovedAthlete" aa WHERE aa."id" = ae."id");

-- Add orderId column to PaymentAttempt (if not exists)
DO $$ BEGIN
    ALTER TABLE "PaymentAttempt" ADD COLUMN "orderId" TEXT;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Migrate PaymentAttempt data (only where orderId is null)
UPDATE "PaymentAttempt" SET "orderId" = "teamRegistrationId" WHERE "orderId" IS NULL;

-- Make orderId NOT NULL
ALTER TABLE "PaymentAttempt" ALTER COLUMN "orderId" SET NOT NULL;

-- CreateIndex for PaymentAttempt.orderId (idempotent)
CREATE INDEX IF NOT EXISTS "PaymentAttempt_orderId_idx" ON "PaymentAttempt"("orderId");

-- Drop foreign key constraint on PaymentAttempt before dropping TeamRegistration
ALTER TABLE "PaymentAttempt" DROP CONSTRAINT IF EXISTS "PaymentAttempt_teamRegistrationId_fkey";

-- Drop old tables (if they exist)
DROP TABLE IF EXISTS "AthleteEntry";
DROP TABLE IF EXISTS "TeamRegistration";

-- Drop old enums (idempotent)
DO $$ BEGIN DROP TYPE "AthleteEntryStatus"; EXCEPTION WHEN undefined_object THEN null; END $$;
DO $$ BEGIN DROP TYPE "RegistrationStatus"; EXCEPTION WHEN undefined_object THEN null; END $$;

-- Drop old column (if exists)
DO $$ BEGIN ALTER TABLE "PaymentAttempt" DROP COLUMN "teamRegistrationId"; EXCEPTION WHEN undefined_column THEN null; END $$;
