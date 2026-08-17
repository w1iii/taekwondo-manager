-- AlterTable
ALTER TABLE "Division" ADD COLUMN     "eventDivisionId" TEXT;

-- DropEnum
DROP TYPE "PaymentStatus";

-- CreateTable
CREATE TABLE "EventDivision" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gender" "Gender" NOT NULL,
    "eventType" "EventType" NOT NULL,
    "divisionKey" TEXT NOT NULL,
    "minAge" INTEGER,
    "maxAge" INTEGER,
    "weightClassId" TEXT,
    "beltType" "BeltType",
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventDivision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItemDivision" (
    "id" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "divisionId" TEXT NOT NULL,

    CONSTRAINT "OrderItemDivision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovedAthleteDivision" (
    "id" TEXT NOT NULL,
    "approvedAthleteId" TEXT NOT NULL,
    "divisionId" TEXT NOT NULL,

    CONSTRAINT "ApprovedAthleteDivision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventDivision_eventType_idx" ON "EventDivision"("eventType");

-- CreateIndex
CREATE UNIQUE INDEX "EventDivision_eventId_divisionKey_key" ON "EventDivision"("eventId", "divisionKey");

-- CreateIndex
CREATE INDEX "OrderItemDivision_divisionId_idx" ON "OrderItemDivision"("divisionId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderItemDivision_orderItemId_divisionId_key" ON "OrderItemDivision"("orderItemId", "divisionId");

-- CreateIndex
CREATE INDEX "ApprovedAthleteDivision_divisionId_idx" ON "ApprovedAthleteDivision"("divisionId");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovedAthleteDivision_approvedAthleteId_divisionId_key" ON "ApprovedAthleteDivision"("approvedAthleteId", "divisionId");

-- AddForeignKey
ALTER TABLE "Division" ADD CONSTRAINT "Division_eventDivisionId_fkey" FOREIGN KEY ("eventDivisionId") REFERENCES "EventDivision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventDivision" ADD CONSTRAINT "EventDivision_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventDivision" ADD CONSTRAINT "EventDivision_weightClassId_fkey" FOREIGN KEY ("weightClassId") REFERENCES "WeightClass"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItemDivision" ADD CONSTRAINT "OrderItemDivision_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItemDivision" ADD CONSTRAINT "OrderItemDivision_divisionId_fkey" FOREIGN KEY ("divisionId") REFERENCES "Division"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovedAthleteDivision" ADD CONSTRAINT "ApprovedAthleteDivision_approvedAthleteId_fkey" FOREIGN KEY ("approvedAthleteId") REFERENCES "ApprovedAthlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovedAthleteDivision" ADD CONSTRAINT "ApprovedAthleteDivision_divisionId_fkey" FOREIGN KEY ("divisionId") REFERENCES "Division"("id") ON DELETE CASCADE ON UPDATE CASCADE;
