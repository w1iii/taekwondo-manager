-- Add FKs that were declared in the schema but never created in the DB.
-- These CASCADE constraints ensure deleting an Order/Event/Chapter/Athlete
-- also cleans up dependent rows (OrderItem, ApprovedAthlete, PaymentAttempt),
-- preventing orphans like the stale PaymentAttempt rows that used to show
-- "Unknown chapter"/"Unknown event" on the admin payments page.
--
-- Guarded by existence checks so the migration is idempotent (the first
-- apply attempt was interrupted part-way and committed some constraints).

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Order_coachId_fkey') THEN
    ALTER TABLE "Order" ADD CONSTRAINT "Order_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Order_eventId_fkey') THEN
    ALTER TABLE "Order" ADD CONSTRAINT "Order_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Order_chapterId_fkey') THEN
    ALTER TABLE "Order" ADD CONSTRAINT "Order_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OrderItem_orderId_fkey') THEN
    ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OrderItem_athleteId_fkey') THEN
    ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ApprovedAthlete_eventId_fkey') THEN
    ALTER TABLE "ApprovedAthlete" ADD CONSTRAINT "ApprovedAthlete_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ApprovedAthlete_chapterId_fkey') THEN
    ALTER TABLE "ApprovedAthlete" ADD CONSTRAINT "ApprovedAthlete_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ApprovedAthlete_athleteId_fkey') THEN
    ALTER TABLE "ApprovedAthlete" ADD CONSTRAINT "ApprovedAthlete_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ApprovedAthlete_orderId_fkey') THEN
    ALTER TABLE "ApprovedAthlete" ADD CONSTRAINT "ApprovedAthlete_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PaymentAttempt_orderId_fkey') THEN
    ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;