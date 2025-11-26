-- Create enum for rent recommendation status
CREATE TYPE "RentRecommendationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- Create table for rent recommendations
-- Note: Using JSONB instead of JSON, and correct index names to match later migration
CREATE TABLE "RentRecommendation" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "unitId" INTEGER NOT NULL,
  "currentRent" DOUBLE PRECISION NOT NULL,
  "recommendedRent" DOUBLE PRECISION NOT NULL,
  "confidenceIntervalLow" DOUBLE PRECISION NOT NULL,
  "confidenceIntervalHigh" DOUBLE PRECISION NOT NULL,
  "factors" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "marketComparables" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "modelVersion" TEXT,
  "reasoning" TEXT,
  "status" "RentRecommendationStatus" NOT NULL DEFAULT 'PENDING',
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acceptedAt" TIMESTAMP(3),
  "acceptedById" INTEGER,
  "rejectedAt" TIMESTAMP(3),
  "rejectedById" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "RentRecommendation"
  ADD CONSTRAINT "RentRecommendation_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RentRecommendation"
  ADD CONSTRAINT "RentRecommendation_acceptedById_fkey" FOREIGN KEY ("acceptedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "RentRecommendation"
  ADD CONSTRAINT "RentRecommendation_rejectedById_fkey" FOREIGN KEY ("rejectedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create indexes with the correct names (matching the later migration)
CREATE INDEX "RentRecommendation_unitId_idx" ON "RentRecommendation"("unitId");
CREATE INDEX "RentRecommendation_status_idx" ON "RentRecommendation"("status");
CREATE INDEX "RentRecommendation_acceptedById_idx" ON "RentRecommendation"("acceptedById");
CREATE INDEX "RentRecommendation_rejectedById_idx" ON "RentRecommendation"("rejectedById");
