-- CreateEnum
CREATE TYPE "PackKind" AS ENUM ('GLOBAL_COUPLING_CEILINGS', 'CROSS_RISK_GLOBAL', 'CROSS_RISK_TENANT_EDGE_OVERLAY', 'SHOCK_VENDOR_LEADTIME', 'SECONDARY_DAMAGE_GLOBAL', 'SECONDARY_DAMAGE_TENANT', 'WORKFLOW_POLICY_GLOBAL', 'WORKFLOW_POLICY_TENANT');

-- CreateEnum
CREATE TYPE "CrossRiskEdge" AS ENUM ('M_to_R', 'R_to_M', 'M_to_V', 'R_to_V');

-- CreateEnum
CREATE TYPE "ActionTier" AS ENUM ('TIER_1', 'TIER_2', 'TIER_3');

-- CreateEnum
CREATE TYPE "IntentStatus" AS ENUM ('DETECTED', 'QUEUED', 'APPROVED', 'EXECUTED', 'COMPLETED', 'RESOLVED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "BuildingVintageBucket" AS ENUM ('PRE_1970', 'YEAR_1970_1989', 'YEAR_1990_2009', 'YEAR_2010_PLUS', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "PropertyClassBucket" AS ENUM ('A', 'B', 'C', 'UNKNOWN');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pack" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "kind" "PackKind" NOT NULL,
    "version" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "payloadJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackActivation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "packId" TEXT NOT NULL,
    "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "boundaryTag" TEXT NOT NULL,
    "reason" TEXT NOT NULL,

    CONSTRAINT "PackActivation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrossRiskTenantEdgeOverlay" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "edge" "CrossRiskEdge" NOT NULL,
    "parentPackHash" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "deltaBeta" DOUBLE PRECISION NOT NULL,
    "deltaAlpha" DOUBLE PRECISION NOT NULL,
    "windowDays" INTEGER NOT NULL,
    "decayLambda" DOUBLE PRECISION NOT NULL,
    "neff" DOUBLE PRECISION NOT NULL,
    "metricsJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrossRiskTenantEdgeOverlay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionIntent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "propertyId" TEXT,
    "unitId" TEXT,
    "riskType" TEXT NOT NULL,
    "horizonDays" INTEGER NOT NULL,
    "percentile" INTEGER NOT NULL,
    "rawProbability" DOUBLE PRECISION NOT NULL,
    "expectedLoss90d" DOUBLE PRECISION,
    "amplified" BOOLEAN NOT NULL DEFAULT false,
    "recommendedAction" TEXT NOT NULL,
    "priorityScore" DOUBLE PRECISION NOT NULL,
    "tier" "ActionTier" NOT NULL,
    "status" "IntentStatus" NOT NULL DEFAULT 'DETECTED',
    "bundleHash" TEXT,
    "governanceJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActionIntent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecondaryDamageOutcome" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "propertyId" TEXT,
    "unitId" TEXT,
    "assetGroup" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "directCostUsd" DOUBLE PRECISION NOT NULL,
    "downtimeDays" INTEGER,
    "vintageBucket" "BuildingVintageBucket" NOT NULL DEFAULT 'UNKNOWN',
    "classBucket" "PropertyClassBucket" NOT NULL DEFAULT 'UNKNOWN',
    "bundleHash" TEXT,
    "taxonomyVersion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecondaryDamageOutcome_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Pack_hash_key" ON "Pack"("hash");

-- CreateIndex
CREATE INDEX "CrossRiskTenantEdgeOverlay_tenantId_edge_status_idx" ON "CrossRiskTenantEdgeOverlay"("tenantId", "edge", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CrossRiskTenantEdgeOverlay_tenantId_edge_version_key" ON "CrossRiskTenantEdgeOverlay"("tenantId", "edge", "version");

-- CreateIndex
CREATE INDEX "ActionIntent_tenantId_status_tier_idx" ON "ActionIntent"("tenantId", "status", "tier");

-- CreateIndex
CREATE INDEX "AuditEvent_tenantId_type_idx" ON "AuditEvent"("tenantId", "type");

-- CreateIndex
CREATE INDEX "SecondaryDamageOutcome_tenantId_occurredAt_idx" ON "SecondaryDamageOutcome"("tenantId", "occurredAt");

-- CreateIndex
CREATE INDEX "SecondaryDamageOutcome_tenantId_eventType_idx" ON "SecondaryDamageOutcome"("tenantId", "eventType");

-- AddForeignKey
ALTER TABLE "Pack" ADD CONSTRAINT "Pack_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackActivation" ADD CONSTRAINT "PackActivation_packId_fkey" FOREIGN KEY ("packId") REFERENCES "Pack"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackActivation" ADD CONSTRAINT "PackActivation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrossRiskTenantEdgeOverlay" ADD CONSTRAINT "CrossRiskTenantEdgeOverlay_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionIntent" ADD CONSTRAINT "ActionIntent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecondaryDamageOutcome" ADD CONSTRAINT "SecondaryDamageOutcome_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
