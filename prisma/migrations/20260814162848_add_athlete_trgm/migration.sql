CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateIndex
CREATE INDEX "Athlete_name_trgm_idx" ON "Athlete" USING GIN ("name" gin_trgm_ops);
