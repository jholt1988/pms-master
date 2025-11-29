#!/bin/bash

# ============================================
# Database Migration and Seeding Script
# ============================================
# This script runs migrations and seeds the database with real-world data
#
# Usage:
#   ./scripts/migrate-and-seed.sh
#   OR
#   bash scripts/migrate-and-seed.sh
#

set -e  # Exit on error

echo "🚀 Starting Database Migration and Seeding Process..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the correct directory
if [ ! -f "prisma/schema.prisma" ]; then
    echo -e "${RED}❌ Error: prisma/schema.prisma not found${NC}"
    echo "Please run this script from the tenant_portal_backend directory"
    exit 1
fi

# Step 1: Validate Prisma Schema
echo -e "${YELLOW}📋 Step 1: Validating Prisma schema...${NC}"
npx prisma validate
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Schema is valid${NC}"
else
    echo -e "${RED}❌ Schema validation failed${NC}"
    exit 1
fi
echo ""

# Step 2: Generate Prisma Client
echo -e "${YELLOW}📦 Step 2: Generating Prisma client...${NC}"
npx prisma generate
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Prisma client generated${NC}"
else
    echo -e "${RED}❌ Failed to generate Prisma client${NC}"
    exit 1
fi
echo ""

# Step 3: Run Migrations
echo -e "${YELLOW}🔄 Step 3: Running database migrations...${NC}"
npx prisma migrate deploy
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Migrations applied successfully${NC}"
else
    echo -e "${YELLOW}⚠️  Migration failed, trying migrate dev...${NC}"
    npx prisma migrate dev --name real_world_data
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Migrations created and applied${NC}"
    else
        echo -e "${RED}❌ Migration failed${NC}"
        exit 1
    fi
fi
echo ""

# Step 4: Seed with Real-World Data
echo -e "${YELLOW}🌱 Step 4: Seeding database with real-world data...${NC}"
echo "This will populate the database with:"
echo "  - 16 users (4 property managers, 13 tenants)"
echo "  - 15 properties"
echo "  - 26 units"
echo "  - 13 active leases"
echo "  - Sample maintenance requests, invoices, payments, expenses"
echo ""
read -p "Continue with seeding? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}⚠️  Seeding cancelled${NC}"
    exit 0
fi

# Check if seed script exists
if [ -f "prisma/seed-real-data.ts" ]; then
    echo "Using real-world data seed script..."
    npx ts-node prisma/seed-real-data.ts
elif [ -f "prisma/seed.ts" ]; then
    echo "Using default seed script..."
    npx ts-node prisma/seed.ts
else
    echo -e "${RED}❌ No seed script found${NC}"
    exit 1
fi

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database seeded successfully${NC}"
else
    echo -e "${RED}❌ Seeding failed${NC}"
    exit 1
fi
echo ""

# Step 5: Verify Data
echo -e "${YELLOW}🔍 Step 5: Verifying seeded data...${NC}"
echo "Running verification queries..."
echo ""

# Count records
USER_COUNT=$(npx prisma db execute --stdin <<< "SELECT COUNT(*) as count FROM \"User\";" | grep -oP '\d+' | head -1 || echo "0")
PROPERTY_COUNT=$(npx prisma db execute --stdin <<< "SELECT COUNT(*) as count FROM \"Property\";" | grep -oP '\d+' | head -1 || echo "0")
UNIT_COUNT=$(npx prisma db execute --stdin <<< "SELECT COUNT(*) as count FROM \"Unit\";" | grep -oP '\d+' | head -1 || echo "0")
LEASE_COUNT=$(npx prisma db execute --stdin <<< "SELECT COUNT(*) as count FROM \"Lease\";" | grep -oP '\d+' | head -1 || echo "0")

echo -e "📊 Database Summary:"
echo -e "   Users: ${USER_COUNT}"
echo -e "   Properties: ${PROPERTY_COUNT}"
echo -e "   Units: ${UNIT_COUNT}"
echo -e "   Leases: ${LEASE_COUNT}"
echo ""

# Final Summary
echo -e "${GREEN}✅ Migration and seeding completed successfully!${NC}"
echo ""
echo "🔑 Next Steps:"
echo "   1. Verify data in Prisma Studio: npx prisma studio"
echo "   2. Start backend server: npm run start:dev"
echo "   3. Test login with seeded credentials"
echo ""
echo "📝 Seeded User Credentials:"
echo "   Property Manager: admin / admin123"
echo "   Property Manager: jholt / adminpass"
echo "   Tenant: mark_donna / tenantpass123"
echo "   Tenant: steve / tenantpass123"
echo "   (See seed script for full list)"

