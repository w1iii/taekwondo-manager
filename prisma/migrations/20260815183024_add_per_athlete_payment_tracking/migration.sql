-- AlterTable: Enrollment — add paymentId (nullable)
ALTER TABLE "Enrollment" ADD COLUMN "paymentId" TEXT;

-- AlterTable: TeamPayment — add enrollmentCount (nullable first for backfill)
ALTER TABLE "TeamPayment" ADD COLUMN "enrollmentCount" INTEGER;

-- Backfill enrollmentCount from amountPesos / entryFeePesos
UPDATE "TeamPayment" tp
SET "enrollmentCount" = tp."amountPesos" / e."entryFeePesos"
FROM "Event" e
WHERE e.id = tp."eventId";

-- Now make enrollmentCount NOT NULL
ALTER TABLE "TeamPayment" ALTER COLUMN "enrollmentCount" SET NOT NULL;

-- Backfill paymentId on Enrollment for APPROVED payments
-- Link the oldest enrollments (by createdAt) for each chapter+event to the approved payment
UPDATE "Enrollment" en
SET "paymentId" = sub."paymentId"
FROM (
  SELECT en2.id AS "enrollmentId",
         tp.id AS "paymentId",
         ROW_NUMBER() OVER (
           PARTITION BY tp."eventId", tp."chapterId"
           ORDER BY en2."createdAt" ASC
         ) AS rn
  FROM "Enrollment" en2
  JOIN "TeamPayment" tp ON tp."eventId" = en2."eventId"
                       AND tp."chapterId" = en2."chapterId"
                       AND tp.status = 'APPROVED'
) sub
WHERE en.id = sub."enrollmentId"
  AND sub.rn <= (
    SELECT tp2."enrollmentCount"
    FROM "TeamPayment" tp2
    WHERE tp2.id = sub."paymentId"
  );

-- DropIndex: remove old unique constraint (allow multiple payments per chapter per event)
DROP INDEX "TeamPayment_eventId_chapterId_key";

-- CreateIndex
CREATE INDEX "Enrollment_paymentId_idx" ON "Enrollment"("paymentId");

-- CreateIndex
CREATE INDEX "TeamPayment_eventId_chapterId_idx" ON "TeamPayment"("eventId", "chapterId");

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_paymentId_fkey"
  FOREIGN KEY ("paymentId") REFERENCES "TeamPayment"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
