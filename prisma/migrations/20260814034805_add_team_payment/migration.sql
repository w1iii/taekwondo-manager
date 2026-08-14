-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "TeamPayment" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "amountPesos" INTEGER NOT NULL,
    "referenceNo" TEXT NOT NULL,
    "proofUrl" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "TeamPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeamPayment_status_idx" ON "TeamPayment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TeamPayment_eventId_chapterId_key" ON "TeamPayment"("eventId", "chapterId");

-- AddForeignKey
ALTER TABLE "TeamPayment" ADD CONSTRAINT "TeamPayment_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamPayment" ADD CONSTRAINT "TeamPayment_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
