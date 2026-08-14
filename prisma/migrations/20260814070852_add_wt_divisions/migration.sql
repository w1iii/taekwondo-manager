/*
  Warnings:

  - A unique constraint covering the columns `[eventId,divisionKey]` on the table `Division` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `divisionKey` to the `Division` table without a default value. This is not possible if the table is not empty.
  - Added the required column `eventType` to the `Division` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('COACH', 'ORGANIZER');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('KYORUGI', 'POOMSAE', 'FREESTYLE_POOMSAE', 'BREAKING');

-- CreateEnum
CREATE TYPE "BeltType" AS ENUM ('WHITE', 'YELLOW', 'GREEN', 'BLUE', 'RED', 'BLACK');

-- DropIndex
DROP INDEX "Division_eventId_name_key";

-- AlterTable
ALTER TABLE "Athlete" ADD COLUMN     "beltType" "BeltType";

-- AlterTable
ALTER TABLE "Division" ADD COLUMN     "beltType" "BeltType",
ADD COLUMN     "divisionKey" TEXT NOT NULL,
ADD COLUMN     "eventType" "EventType" NOT NULL,
ADD COLUMN     "weightClassId" TEXT,
ALTER COLUMN "minAge" DROP NOT NULL,
ALTER COLUMN "maxAge" DROP NOT NULL;

-- CreateTable
CREATE TABLE "WeightClass" (
    "id" TEXT NOT NULL,
    "gender" "Gender" NOT NULL,
    "name" TEXT NOT NULL,
    "minKg" DOUBLE PRECISION,
    "maxKg" DOUBLE PRECISION,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "WeightClass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "targetChapterId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "link" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WeightClass_gender_sortOrder_idx" ON "WeightClass"("gender", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "WeightClass_gender_name_key" ON "WeightClass"("gender", "name");

-- CreateIndex
CREATE INDEX "Notification_role_readAt_idx" ON "Notification"("role", "readAt");

-- CreateIndex
CREATE INDEX "Notification_role_targetChapterId_readAt_idx" ON "Notification"("role", "targetChapterId", "readAt");

-- CreateIndex
CREATE INDEX "Division_eventType_idx" ON "Division"("eventType");

-- CreateIndex
CREATE UNIQUE INDEX "Division_eventId_divisionKey_key" ON "Division"("eventId", "divisionKey");

-- AddForeignKey
ALTER TABLE "Division" ADD CONSTRAINT "Division_weightClassId_fkey" FOREIGN KEY ("weightClassId") REFERENCES "WeightClass"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_targetChapterId_fkey" FOREIGN KEY ("targetChapterId") REFERENCES "Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
