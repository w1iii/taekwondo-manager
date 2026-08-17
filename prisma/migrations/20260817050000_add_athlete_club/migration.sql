-- CreateTable
CREATE TYPE "AthleteClubStatus" AS ENUM ('ACTIVE', 'INACTIVE');

CREATE TABLE "AthleteClub" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "status" "AthleteClubStatus" NOT NULL DEFAULT 'ACTIVE',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AthleteClub_pkey" PRIMARY KEY ("id")
);

-- Backfill: every existing athlete becomes an ACTIVE member of their chapter.
INSERT INTO "AthleteClub" ("id", "athleteId", "chapterId", "status", "joinedAt", "createdAt", "updatedAt")
SELECT "id", "id", "chapterId", 'ACTIVE', "createdAt", now(), now()
FROM "Athlete";

-- CreateIndex
CREATE UNIQUE INDEX "AthleteClub_athleteId_chapterId_key" ON "AthleteClub"("athleteId", "chapterId");
CREATE INDEX "AthleteClub_chapterId_status_idx" ON "AthleteClub"("chapterId", "status");
CREATE INDEX "AthleteClub_athleteId_idx" ON "AthleteClub"("athleteId");

-- AddForeignKey
ALTER TABLE "AthleteClub" ADD CONSTRAINT "AthleteClub_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteClub" ADD CONSTRAINT "AthleteClub_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
