-- AlterTable
ALTER TABLE "Property" ALTER COLUMN "name" DROP NOT NULL,
ALTER COLUMN "address" DROP NOT NULL,
ALTER COLUMN "id" DROP DEFAULT;

-- RenameIndex
ALTER INDEX "MaintenanceAsset_property_unit_name_key" RENAME TO "MaintenanceAsset_propertyId_unitId_name_key";

-- RenameIndex
ALTER INDEX "MaintenanceSlaPolicy_property_priority_key" RENAME TO "MaintenanceSlaPolicy_propertyId_priority_key";
