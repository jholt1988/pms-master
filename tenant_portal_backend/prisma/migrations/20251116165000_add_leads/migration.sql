-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'TOURING', 'APPLICATION_SUBMITTED', 'CONVERTED', 'LOST');

-- CreateEnum
CREATE TYPE "InterestLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "TourStatus" AS ENUM ('SCHEDULED', 'RESCHEDULED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LeadApplicationStatus" AS ENUM ('SUBMITTED', 'PENDING', 'APPROVED', 'CONDITIONALLY_APPROVED', 'DENIED', 'REJECTED');

-- AlterTable
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "city" TEXT;

-- AlterTable
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "state" TEXT;

-- AlterTable
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "zipCode" TEXT;

-- AlterTable
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "country" TEXT NOT NULL DEFAULT 'USA';

-- AlterTable
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "propertyType" TEXT;

-- AlterTable
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "description" TEXT;

-- AlterTable
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "bedrooms" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "bathrooms" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "minRent" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "maxRent" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "yearBuilt" INTEGER;

-- AlterTable
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "preferredContactMethod" TEXT,
    "bedrooms" INTEGER,
    "budget" DOUBLE PRECISION,
    "moveInDate" TEXT,
    "source" TEXT,
    "notes" TEXT,
    "convertedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Lead_sessionId_key" UNIQUE ("sessionId")
);

-- CreateTable
CREATE TABLE "LeadMessage" (
    "id" SERIAL NOT NULL,
    "leadId" TEXT NOT NULL,
    "role" "MessageRole" NOT NULL DEFAULT 'USER',
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadMessage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "LeadMessage" ADD CONSTRAINT "LeadMessage_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "LeadMessage_leadId_index" ON "LeadMessage" ("leadId");

-- CreateTable
CREATE TABLE "PropertyInquiry" (
    "id" SERIAL NOT NULL,
    "leadId" TEXT NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "unitId" INTEGER,
    "interest" "InterestLevel" NOT NULL DEFAULT 'MEDIUM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropertyInquiry_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PropertyInquiry" ADD CONSTRAINT "PropertyInquiry_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyInquiry" ADD CONSTRAINT "PropertyInquiry_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyInquiry" ADD CONSTRAINT "PropertyInquiry_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "PropertyInquiry_leadId_index" ON "PropertyInquiry" ("leadId");

-- CreateIndex
CREATE INDEX "PropertyInquiry_propertyId_index" ON "PropertyInquiry" ("propertyId");

-- CreateTable
CREATE TABLE "Tour" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "unitId" INTEGER,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "scheduledTime" TEXT NOT NULL,
    "notes" TEXT,
    "status" "TourStatus" NOT NULL DEFAULT 'SCHEDULED',
    "conductedById" INTEGER,
    "feedback" TEXT,
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tour_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Tour" ADD CONSTRAINT "Tour_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tour" ADD CONSTRAINT "Tour_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tour" ADD CONSTRAINT "Tour_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tour" ADD CONSTRAINT "Tour_conductedById_fkey" FOREIGN KEY ("conductedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Tour_leadId_index" ON "Tour" ("leadId");

-- CreateIndex
CREATE INDEX "Tour_propertyId_index" ON "Tour" ("propertyId");

-- CreateIndex
CREATE INDEX "Tour_unitId_index" ON "Tour" ("unitId");

-- CreateTable
CREATE TABLE "LeadApplication" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "unitId" INTEGER,
    "status" "LeadApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creditScore" INTEGER,
    "backgroundCheckStatus" TEXT,
    "creditCheckStatus" TEXT,
    "reviewedById" INTEGER,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "applicationFee" DOUBLE PRECISION,
    "feePaid" BOOLEAN NOT NULL DEFAULT false,
    "feePaidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadApplication_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "LeadApplication" ADD CONSTRAINT "LeadApplication_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadApplication" ADD CONSTRAINT "LeadApplication_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadApplication" ADD CONSTRAINT "LeadApplication_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadApplication" ADD CONSTRAINT "LeadApplication_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "LeadApplication_leadId_index" ON "LeadApplication" ("leadId");

-- CreateIndex
CREATE INDEX "LeadApplication_propertyId_index" ON "LeadApplication" ("propertyId");
