-- CreateEnum
CREATE TYPE "ChapterStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "Chapter" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "gcashNumber" TEXT NOT NULL,
    "logoUrl" TEXT,
    "headCoachName" TEXT NOT NULL,
    "headCoachEmail" TEXT NOT NULL,
    "status" "ChapterStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "headCoachUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Chapter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Chapter_status_idx" ON "Chapter"("status");

-- CreateIndex
CREATE INDEX "Chapter_province_idx" ON "Chapter"("province");

-- Allow only one active registration per email, but let REJECTED rows
-- free the email so the head coach can re-register.
CREATE UNIQUE INDEX "Chapter_active_head_coach_email_unique"
ON "Chapter"("headCoachEmail")
WHERE "status" IN ('PENDING', 'APPROVED');
