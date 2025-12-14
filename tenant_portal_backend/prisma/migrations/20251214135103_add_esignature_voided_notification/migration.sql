/*
  Warnings:

  - A unique constraint covering the columns `[email]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'ESIGNATURE_VOIDED';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "driverLicenseImage" TEXT,
ADD COLUMN     "driverLicenseNumber" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "lastName" TEXT,
ADD COLUMN     "socialSecurityImage" TEXT,
ADD COLUMN     "socialSecurityNumber" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
