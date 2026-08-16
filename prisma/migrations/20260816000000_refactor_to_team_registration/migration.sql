-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('PENDING_PAYMENT', 'PAYMENT_SUBMITTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AthleteEntryStatus" AS ENUM ('ACTIVE', 'REMOVED');

-- CreateEnum
CREATE TYPE "PaymentOutcome" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "TeamRegistration" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AthleteEntry" (
    "id" TEXT NOT NULL,
    "teamRegistrationId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "status" "AthleteEntryStatus" NOT NULL DEFAULT 'ACTIVE',
    "removedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AthleteEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentAttempt" (
    "id" TEXT NOT NULL,
    "teamRegistrationId" TEXT NOT NULL,
    "referenceNo" TEXT NOT NULL,
    "proofUrl" TEXT NOT NULL,
    "amountPesos" INTEGER NOT NULL,
    "outcome" "PaymentOutcome" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TeamRegistration_eventId_chapterId_key" ON "TeamRegistration"("eventId", "chapterId");

-- CreateIndex
CREATE INDEX "TeamRegistration_status_idx" ON "TeamRegistration"("status");

-- CreateIndex
CREATE INDEX "TeamRegistration_coachId_idx" ON "TeamRegistration"("coachId");

-- CreateIndex
CREATE INDEX "TeamRegistration_eventId_chapterId_idx" ON "TeamRegistration"("eventId", "chapterId");

-- CreateIndex
CREATE UNIQUE INDEX "AthleteEntry_teamRegistrationId_athleteId_key" ON "AthleteEntry"("teamRegistrationId", "athleteId");

-- CreateIndex
CREATE INDEX "AthleteEntry_teamRegistrationId_idx" ON "AthleteEntry"("teamRegistrationId");

-- CreateIndex
CREATE INDEX "AthleteEntry_athleteId_idx" ON "AthleteEntry"("athleteId");

-- CreateIndex
CREATE INDEX "AthleteEntry_status_idx" ON "AthleteEntry"("status");

-- CreateIndex
CREATE INDEX "PaymentAttempt_teamRegistrationId_idx" ON "PaymentAttempt"("teamRegistrationId");

-- CreateIndex
CREATE INDEX "PaymentAttempt_outcome_idx" ON "PaymentAttempt"("outcome");

-- MigrateData: Create TeamRegistration from existing TeamPayment + Enrollment data
-- For each unique (eventId, chapterId) pair that has enrollments, create a registration
INSERT INTO "TeamRegistration" ("id", "coachId", "eventId", "chapterId", "status", "createdAt", "updatedAt")
SELECT
    'migrated_' || en."chapterId" || '_' || en."eventId" AS "id",
    en."chapterId" AS "coachId",
    en."eventId",
    en."chapterId",
    CASE
        WHEN tp."status"::text = 'APPROVED' THEN 'APPROVED'::"RegistrationStatus"
        WHEN tp."status"::text = 'PENDING' THEN 'PAYMENT_SUBMITTED'::"RegistrationStatus"
        WHEN tp."status"::text = 'REJECTED' THEN 'REJECTED'::"RegistrationStatus"
        WHEN tp."status"::text = 'CANCELLED' THEN 'REJECTED'::"RegistrationStatus"
        ELSE 'PENDING_PAYMENT'::"RegistrationStatus"
    END AS "status",
    MIN(en."createdAt") AS "createdAt",
    NOW() AS "updatedAt"
FROM "Enrollment" en
LEFT JOIN "TeamPayment" tp ON tp."eventId" = en."eventId" AND tp."chapterId" = en."chapterId"
GROUP BY en."chapterId", en."eventId", tp."status";

-- MigrateData: Create AthleteEntry from Enrollment
INSERT INTO "AthleteEntry" ("id", "teamRegistrationId", "athleteId", "status", "createdAt")
SELECT
    'migrated_entry_' || en."id" AS "id",
    'migrated_' || en."chapterId" || '_' || en."eventId" AS "teamRegistrationId",
    en."athleteId",
    'ACTIVE'::"AthleteEntryStatus",
    en."createdAt"
FROM "Enrollment" en;

-- MigrateData: Create PaymentAttempt from TeamPayment
INSERT INTO "PaymentAttempt" ("id", "teamRegistrationId", "referenceNo", "proofUrl", "amountPesos", "outcome", "rejectionReason", "submittedAt", "reviewedAt")
SELECT
    'migrated_pay_' || tp."id" AS "id",
    'migrated_' || tp."chapterId" || '_' || tp."eventId" AS "teamRegistrationId",
    tp."referenceNo",
    tp."proofUrl",
    tp."amountPesos",
    CASE
        WHEN tp."status"::text = 'APPROVED' THEN 'APPROVED'::"PaymentOutcome"
        WHEN tp."status"::text = 'PENDING' THEN 'PENDING'::"PaymentOutcome"
        WHEN tp."status"::text = 'REJECTED' THEN 'REJECTED'::"PaymentOutcome"
        ELSE 'REJECTED'::"PaymentOutcome"
    END AS "outcome",
    tp."rejectionReason",
    tp."submittedAt",
    tp."reviewedAt"
FROM "TeamPayment" tp;

-- DropForeignKey
ALTER TABLE "Enrollment" DROP CONSTRAINT "Enrollment_eventId_fkey";
ALTER TABLE "Enrollment" DROP CONSTRAINT "Enrollment_athleteId_fkey";
ALTER TABLE "Enrollment" DROP CONSTRAINT "Enrollment_chapterId_fkey";
ALTER TABLE "Enrollment" DROP CONSTRAINT "Enrollment_paymentId_fkey";
ALTER TABLE "TeamPayment" DROP CONSTRAINT "TeamPayment_eventId_fkey";
ALTER TABLE "TeamPayment" DROP CONSTRAINT "TeamPayment_chapterId_fkey";

-- DropTable
DROP TABLE "Enrollment";
DROP TABLE "TeamPayment";

-- AddForeignKey
ALTER TABLE "TeamRegistration" ADD CONSTRAINT "TeamRegistration_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeamRegistration" ADD CONSTRAINT "TeamRegistration_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeamRegistration" ADD CONSTRAINT "TeamRegistration_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AthleteEntry" ADD CONSTRAINT "AthleteEntry_teamRegistrationId_fkey" FOREIGN KEY ("teamRegistrationId") REFERENCES "TeamRegistration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AthleteEntry" ADD CONSTRAINT "AthleteEntry_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_teamRegistrationId_fkey" FOREIGN KEY ("teamRegistrationId") REFERENCES "TeamRegistration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
