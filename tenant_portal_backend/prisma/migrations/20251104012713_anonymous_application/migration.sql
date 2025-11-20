-- DropForeignKey
ALTER TABLE "public"."RentalApplication" DROP CONSTRAINT "RentalApplication_applicantId_fkey";

-- AlterTable
ALTER TABLE "RentalApplication" ALTER COLUMN "applicantId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "RentalApplication" ADD CONSTRAINT "RentalApplication_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
