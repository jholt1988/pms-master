/**
 * Real-World Data Seed Script
 * 
 * This seed script incorporates actual property management data including:
 * - 16 users (4 property managers, 13 tenants)
 * - 15 properties across Wichita, Kansas
 * - 26 units with detailed configurations
 * - 13 active leases
 * - Maintenance requests, invoices, payments, and expenses
 * 
 * Usage: npx ts-node prisma/seed-real-data.ts
 * Or: npx prisma db seed (if configured in package.json)
 */

import {
  LeaseStatus,
  MaintenancePriority,
  PrismaClient,
  Role,
  Status,
  ExpenseCategory,
  BillingAlignment,
  BillingFrequency,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ============================================
// REAL-WORLD DATA DEFINITIONS
// ============================================

interface UserData {
  username: string;
  password: string;
  role: Role;
  phoneNumber?: string | null;
}

interface PropertyData {
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  propertyType?: string;
}

interface UnitData {
  name: string;
  propertyName: string; // Reference to property by name
  unitNumber?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  squareFeet?: number | null;
  hasParking?: boolean;
  hasLaundry?: boolean;
  hasBalcony?: boolean;
  hasAC?: boolean;
  isFurnished?: boolean;
  petsAllowed?: boolean;
}

interface LeaseData {
  tenantUsername: string;
  unitName: string;
  propertyName: string;
  startDate: Date;
  endDate: Date;
  rentAmount: number;
  depositAmount: number;
  currentBalance?: number;
}

const REAL_USERS: UserData[] = [
  { username: 'admin', password: 'admin123', role: Role.PROPERTY_MANAGER, phoneNumber: '1111111111' },
  { username: 'jholt', password: 'adminpass', role: Role.PROPERTY_MANAGER, phoneNumber: '3162445752' },
  { username: 'plabrue', password: 'newpassword123', role: Role.PROPERTY_MANAGER, phoneNumber: '3163504020' },
  { username: 'areyna', password: 'newpassword123', role: Role.PROPERTY_MANAGER, phoneNumber: '3163504020' },
  { username: 'mark_donna', password: 'tenantpass123', role: Role.TENANT, phoneNumber: null },
  { username: 'steve', password: 'tenantpass123', role: Role.TENANT, phoneNumber: null },
  { username: 'mrB', password: 'tenantpass123', role: Role.TENANT, phoneNumber: null },
  { username: 'davidG', password: 'tenantpass123', role: Role.TENANT, phoneNumber: null },
  { username: 'Junior', password: 'tenantpass123', role: Role.TENANT, phoneNumber: null },
  { username: 'Siren', password: 'tenantpass123', role: Role.TENANT, phoneNumber: null },
  { username: 'Vicky', password: 'tenantpass123', role: Role.TENANT, phoneNumber: null },
  { username: 'MrsJ', password: 'tenantpass123', role: Role.TENANT, phoneNumber: null },
  { username: 'DaMansaws', password: 'tenantpass123', role: Role.TENANT, phoneNumber: null },
  { username: 'DaviSr', password: 'tenantpass123', role: Role.TENANT, phoneNumber: null },
  { username: 'Patrick', password: 'tenantpass123', role: Role.TENANT, phoneNumber: null },
  { username: 'Elijah', password: 'tenantpass123', role: Role.TENANT, phoneNumber: null },
];

const REAL_PROPERTIES: PropertyData[] = [
  { name: 'The Sharon', address: '370 S. Hydraulic', city: 'Wichita', state: 'Kansas', zipCode: '67211', country: 'US', latitude: 37.697948, longitude: -97.314835, propertyType: 'Apartment' },
  { name: 'Ida', address: '1026 S. Ida', city: 'Wichita', state: 'Kansas', zipCode: '67211', country: 'US', latitude: 37.673945699060496, longitude: -97.32475543333885, propertyType: 'Single Family' },
  { name: 'N. Market', address: '2053 N. Market', city: 'Wichita', state: 'Kansas', zipCode: '67214', country: 'US', latitude: 37.72023205858973, longitude: -97.33709661799546, propertyType: 'Apartment' },
  { name: 'Lincoln', address: '525 E Lincoln', city: 'Wichita', state: 'Kansas', zipCode: '67211', country: 'US', latitude: 37.67166869956, longitude: -97.3324820621742, propertyType: 'Duplex' },
  { name: 'Emporia', address: '1204 S. Emporia', city: 'Wichita', state: 'Kansas', zipCode: '67211', country: 'US', latitude: 37.671517228232446, longitude: -97.33264062915629, propertyType: 'Duplex' },
  { name: '1952 Jackson', address: '1952 S. Jackson', city: 'Wichita', state: 'Kansas', zipCode: '67203', country: 'US', latitude: 37.71885420132305, longitude: -97.3430751640177, propertyType: 'Duplex' },
  { name: '1954 Jackson', address: '1954 S. Jackson', city: 'Wichita', state: 'Kansas', zipCode: '67203', country: 'US', latitude: 37.71885420132305, longitude: -97.3430751640177, propertyType: 'Duplex' },
  { name: 'Maple', address: '1807 W. Maple', city: 'Wichita', state: 'Kansas', zipCode: '67213', country: 'US', latitude: 37.68057372537867, longitude: -97.36181534294771, propertyType: 'Duplex' },
  { name: '2042 Topeka', address: '2042 S Topeka', city: 'Wichita', state: 'Kansas', zipCode: '67211', country: 'US', latitude: 37.655656359982984, longitude: -97.33383694498818, propertyType: 'Duplex' },
  { name: '2044 Topeka', address: '2044 S. Topeka', city: 'Wichita', state: 'Kansas', zipCode: '67211', country: 'US', latitude: 37.655656359982984, longitude: -97.33383694498818, propertyType: 'Duplex' },
  { name: '2946 Bunkerhill', address: '2946 S. Bunkerhill', city: 'Wichita', state: 'Kansas', zipCode: '67210', country: 'US', latitude: 37.63923440179619, longitude: -97.2771379198464, propertyType: 'Duplex' },
  { name: '2948 Bunkerhill', address: '2948 S. Bunkerhill', city: 'Wichita', state: 'Kansas', zipCode: '67210', country: 'US', latitude: 37.63923440179619, longitude: -97.2771379198464, propertyType: 'Duplex' },
  { name: 'Volusia', address: '725 S. Volusia', city: 'Wichita', state: 'Kansas', zipCode: '67211', country: 'US', latitude: 37.674711375548064, longitude: -97.3039915026574, propertyType: 'Single Family' },
  { name: 'S. Market', address: '1419 S. Market', city: 'Wichita', state: 'Kansas', zipCode: '67211', country: 'US', latitude: 37.667611424504656, longitude: -97.33708061121672, propertyType: 'Duplex' },
  { name: 'Augusta', address: '231 12th Ave', city: 'Wichita', state: 'Kansas', zipCode: '67010', country: 'US', latitude: 37.68643191076886, longitude: -96.97487112080682, propertyType: 'Single Family' },
];

const REAL_UNITS: UnitData[] = [
  { name: 'unit1', propertyName: 'The Sharon', unitNumber: '1', bedrooms: 1, bathrooms: 1, squareFeet: 425, hasParking: true, hasLaundry: false, hasBalcony: false, hasAC: true, isFurnished: false, petsAllowed: true },
  { name: 'unit2', propertyName: 'The Sharon', unitNumber: '2', bedrooms: 1, bathrooms: 1, squareFeet: 425, hasParking: true, hasLaundry: false, hasBalcony: false, hasAC: true, isFurnished: false, petsAllowed: true },
  { name: 'unit3', propertyName: 'The Sharon', unitNumber: '3', bedrooms: 1, bathrooms: 1, squareFeet: 425, hasParking: true, hasLaundry: false, hasBalcony: false, hasAC: true, isFurnished: false, petsAllowed: true },
  { name: 'unit4', propertyName: 'The Sharon', unitNumber: '4', bedrooms: 1, bathrooms: 1, squareFeet: 425, hasParking: true, hasLaundry: false, hasBalcony: false, hasAC: true, isFurnished: false, petsAllowed: true },
  { name: 'unit5', propertyName: 'The Sharon', unitNumber: '5', bedrooms: 1, bathrooms: 1, squareFeet: 425, hasParking: true, hasLaundry: false, hasBalcony: false, hasAC: true, isFurnished: false, petsAllowed: true },
  { name: 'unit6', propertyName: 'The Sharon', unitNumber: '6', bedrooms: 1, bathrooms: 1, squareFeet: 425, hasParking: true, hasLaundry: false, hasBalcony: false, hasAC: true, isFurnished: false, petsAllowed: true },
  { name: 'unit7', propertyName: 'The Sharon', unitNumber: '7', bedrooms: 1, bathrooms: null, squareFeet: 425, hasParking: true, hasLaundry: false, hasBalcony: false, hasAC: true, isFurnished: false, petsAllowed: true },
  { name: 'unit8', propertyName: 'The Sharon', unitNumber: '8', bedrooms: 1, bathrooms: 1, squareFeet: 425, hasParking: true, hasLaundry: false, hasBalcony: false, hasAC: true, isFurnished: false, petsAllowed: true },
  { name: 'IDA', propertyName: 'Ida', unitNumber: '1', bedrooms: 2, bathrooms: 1, squareFeet: 889, hasParking: true, hasLaundry: true, hasBalcony: false, hasAC: true, isFurnished: false, petsAllowed: true },
  { name: 'N-Market 1', propertyName: 'N. Market', unitNumber: '1', bedrooms: 2, bathrooms: 1, squareFeet: 600, hasParking: true, hasLaundry: false, hasBalcony: false, hasAC: true, isFurnished: false, petsAllowed: true },
  { name: 'N-Market 2', propertyName: 'N. Market', unitNumber: '2', bedrooms: 1, bathrooms: 1, squareFeet: 324, hasParking: true, hasLaundry: false, hasBalcony: false, hasAC: true, isFurnished: false, petsAllowed: false },
  { name: 'N-Market 3', propertyName: 'N. Market', unitNumber: '3', bedrooms: 1, bathrooms: 1, squareFeet: 600, hasParking: true, hasLaundry: false, hasBalcony: false, hasAC: false, isFurnished: false, petsAllowed: false },
  { name: 'Lincoln', propertyName: 'Lincoln', unitNumber: '1', bedrooms: 2, bathrooms: 1, squareFeet: 494, hasParking: true, hasLaundry: true, hasBalcony: false, hasAC: true, isFurnished: false, petsAllowed: true },
  { name: 'Emporia', propertyName: 'Emporia', unitNumber: '2', bedrooms: 1, bathrooms: 1, squareFeet: 494, hasParking: true, hasLaundry: true, hasBalcony: false, hasAC: false, isFurnished: false, petsAllowed: true },
  { name: '1952 Jackson', propertyName: '1952 Jackson', unitNumber: '1952', bedrooms: 1, bathrooms: 1, squareFeet: 765, hasParking: false, hasLaundry: true, hasBalcony: false, hasAC: true, isFurnished: false, petsAllowed: false },
  { name: '1954 Jackson', propertyName: '1954 Jackson', unitNumber: '1954', bedrooms: 1, bathrooms: 1, squareFeet: 765, hasParking: false, hasLaundry: true, hasBalcony: false, hasAC: true, isFurnished: false, petsAllowed: false },
  { name: 'Maple', propertyName: 'Maple', unitNumber: '1', bedrooms: 2, bathrooms: 1, squareFeet: 1288, hasParking: true, hasLaundry: true, hasBalcony: false, hasAC: true, isFurnished: false, petsAllowed: false },
  { name: '1/2 Maple', propertyName: 'Maple', unitNumber: '1/2', bedrooms: 1, bathrooms: 1, squareFeet: 200, hasParking: false, hasLaundry: false, hasBalcony: false, hasAC: true, isFurnished: false, petsAllowed: false },
  { name: '2042 Topeka', propertyName: '2042 Topeka', unitNumber: '2042', bedrooms: 2, bathrooms: 1, squareFeet: 720, hasParking: true, hasLaundry: true, hasBalcony: false, hasAC: true, isFurnished: false, petsAllowed: true },
  { name: '2044 Topeka', propertyName: '2044 Topeka', unitNumber: '2044', bedrooms: 2, bathrooms: 1, squareFeet: 720, hasParking: true, hasLaundry: true, hasBalcony: false, hasAC: false, isFurnished: false, petsAllowed: true },
  { name: '2946 Bunkerhill', propertyName: '2946 Bunkerhill', unitNumber: '2946', bedrooms: 2, bathrooms: 1, squareFeet: 923, hasParking: true, hasLaundry: true, hasBalcony: false, hasAC: true, isFurnished: false, petsAllowed: true },
  { name: '2948 Bunkerhill', propertyName: '2948 Bunkerhill', unitNumber: '2948', bedrooms: 2, bathrooms: 1, squareFeet: 9223, hasParking: true, hasLaundry: true, hasBalcony: false, hasAC: true, isFurnished: false, petsAllowed: true },
  { name: 'Volusia', propertyName: 'Volusia', unitNumber: '1', bedrooms: 2, bathrooms: 1.5, squareFeet: 1368, hasParking: true, hasLaundry: true, hasBalcony: false, hasAC: true, isFurnished: false, petsAllowed: true },
  { name: 'S-Market 1', propertyName: 'S. Market', unitNumber: '1', bedrooms: 1, bathrooms: 1, squareFeet: 415, hasParking: true, hasLaundry: false, hasBalcony: false, hasAC: false, isFurnished: false, petsAllowed: true },
  { name: 'S-Market 2', propertyName: 'S. Market', unitNumber: '2', bedrooms: 1, bathrooms: 1, squareFeet: 415, hasParking: true, hasLaundry: false, hasBalcony: false, hasAC: false, isFurnished: false, petsAllowed: false },
  { name: 'Augusta', propertyName: 'Augusta', unitNumber: '1', bedrooms: 2, bathrooms: 1.5, squareFeet: 1146, hasParking: true, hasLaundry: true, hasBalcony: false, hasAC: true, isFurnished: false, petsAllowed: true },
];

// Lease mappings: tenantUsername -> { unitName, propertyName, rent, deposit, balance }
const REAL_LEASES: LeaseData[] = [
  { tenantUsername: 'mark_donna', unitName: 'Maple', propertyName: 'Maple', startDate: new Date('2025-01-01'), endDate: new Date('2025-12-31'), rentAmount: 725, depositAmount: 725, currentBalance: 0 },
  { tenantUsername: 'steve', unitName: 'IDA', propertyName: 'Ida', startDate: new Date('2025-01-01'), endDate: new Date('2025-12-31'), rentAmount: 700, depositAmount: 700, currentBalance: 0 },
  { tenantUsername: 'mrB', unitName: 'unit3', propertyName: 'The Sharon', startDate: new Date('2025-01-01'), endDate: new Date('2025-12-31'), rentAmount: 600, depositAmount: 600, currentBalance: 0 },
  { tenantUsername: 'davidG', unitName: 'unit6', propertyName: 'The Sharon', startDate: new Date('2025-01-01'), endDate: new Date('2025-12-31'), rentAmount: 525, depositAmount: 525, currentBalance: 300 },
  { tenantUsername: 'Junior', unitName: 'unit8', propertyName: 'The Sharon', startDate: new Date('2025-01-01'), endDate: new Date('2025-12-31'), rentAmount: 600, depositAmount: 600, currentBalance: 0 },
  { tenantUsername: 'Siren', unitName: 'N-Market 1', propertyName: 'N. Market', startDate: new Date('2025-01-01'), endDate: new Date('2025-12-31'), rentAmount: 600, depositAmount: 600, currentBalance: 0 },
  { tenantUsername: 'Vicky', unitName: 'Lincoln', propertyName: 'Lincoln', startDate: new Date('2025-01-01'), endDate: new Date('2025-12-31'), rentAmount: 650, depositAmount: 650, currentBalance: 0 },
  { tenantUsername: 'MrsJ', unitName: 'Emporia', propertyName: 'Emporia', startDate: new Date('2025-01-01'), endDate: new Date('2025-12-31'), rentAmount: 550, depositAmount: 550, currentBalance: 0 },
  { tenantUsername: 'DaMansaws', unitName: '1952 Jackson', propertyName: '1952 Jackson', startDate: new Date('2025-01-01'), endDate: new Date('2025-12-31'), rentAmount: 575, depositAmount: 575, currentBalance: 0 },
  { tenantUsername: 'DaviSr', unitName: '1954 Jackson', propertyName: '1954 Jackson', startDate: new Date('2025-01-01'), endDate: new Date('2025-12-31'), rentAmount: 625, depositAmount: 625, currentBalance: 0 },
  { tenantUsername: 'Patrick', unitName: '1/2 Maple', propertyName: 'Maple', startDate: new Date('2025-01-01'), endDate: new Date('2025-12-31'), rentAmount: 675, depositAmount: 675, currentBalance: 0 },
  { tenantUsername: 'Elijah', unitName: '2042 Topeka', propertyName: '2042 Topeka', startDate: new Date('2025-01-01'), endDate: new Date('2025-12-31'), rentAmount: 750, depositAmount: 750, currentBalance: 0 },
  { tenantUsername: 'admin', unitName: '2044 Topeka', propertyName: '2044 Topeka', startDate: new Date('2025-01-01'), endDate: new Date('2025-12-31'), rentAmount: 650, depositAmount: 650, currentBalance: 0 },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

async function ensureGlobalSla(priority: MaintenancePriority, resolution: number, response?: number) {
  const existing = await prisma.maintenanceSlaPolicy.findFirst({
    where: {
      propertyId: null,
      priority,
    },
  });

  if (existing) {
    await prisma.maintenanceSlaPolicy.update({
      where: { id: existing.id },
      data: {
        resolutionTimeMinutes: resolution,
        responseTimeMinutes: response ?? null,
        active: true,
      },
    });
    return existing;
  }

  return prisma.maintenanceSlaPolicy.create({
    data: {
      name: `${priority.toLowerCase()} default`,
      priority,
      resolutionTimeMinutes: resolution,
      responseTimeMinutes: response ?? null,
    },
  });
}

// ============================================
// MAIN SEED FUNCTION
// ============================================

async function main() {
  // Check if seeding is disabled
  if (process.env.DISABLE_AUTO_SEED === 'true' || process.env.SKIP_SEED === 'true') {
    console.info('⏭️  Auto-seeding is disabled. Skipping seed process.');
    console.info('   To seed manually, run: npx ts-node prisma/seed-real-data.ts');
    return;
  }

  console.info('🌱 Seeding real-world property management data...\n');

  // 1. Create SLA Policies
  console.info('📋 Creating SLA policies...');
  await ensureGlobalSla(MaintenancePriority.EMERGENCY, 240, 60);
  await ensureGlobalSla(MaintenancePriority.HIGH, 720, 240);
  await ensureGlobalSla(MaintenancePriority.MEDIUM, 1440, 480);
  await ensureGlobalSla(MaintenancePriority.LOW, 4320);
  console.info('   ✅ SLA policies created\n');

  // 2. Create Users
  console.info('👤 Creating users...');
  const userMap = new Map<string, number>(); // username -> userId
  
  for (const userData of REAL_USERS) {
    const hashedPassword = await hashPassword(userData.password);
    const user = await prisma.user.upsert({
      where: { username: userData.username },
      update: {
        password: hashedPassword,
        role: userData.role,
        phoneNumber: userData.phoneNumber,
      },
      create: {
        username: userData.username,
        password: hashedPassword,
        role: userData.role,
        phoneNumber: userData.phoneNumber,
      },
    });
    userMap.set(userData.username, user.id);
  }
  console.info(`   ✅ Created ${REAL_USERS.length} users (${REAL_USERS.filter(u => u.role === Role.PROPERTY_MANAGER).length} managers, ${REAL_USERS.filter(u => u.role === Role.TENANT).length} tenants)\n`);

  // 3. Create Properties
  console.info('🏢 Creating properties...');
  const propertyMap = new Map<string, number>(); // propertyName -> propertyId
  
  for (const propData of REAL_PROPERTIES) {
    const existing = await prisma.property.findFirst({
      where: { name: propData.name },
    });

    const property = existing
      ? await prisma.property.update({
          where: { id: existing.id },
          data: {
            address: propData.address,
            city: propData.city,
            state: propData.state,
            zipCode: propData.zipCode,
            country: propData.country || 'US',
            latitude: propData.latitude,
            longitude: propData.longitude,
            propertyType: propData.propertyType,
          },
        })
      : await prisma.property.create({
          data: {
            name: propData.name,
            address: propData.address,
            city: propData.city,
            state: propData.state,
            zipCode: propData.zipCode,
            country: propData.country || 'US',
            latitude: propData.latitude,
            longitude: propData.longitude,
            propertyType: propData.propertyType,
            tags: [],
          },
        });
    propertyMap.set(propData.name, property.id);
  }
  console.info(`   ✅ Created ${REAL_PROPERTIES.length} properties\n`);

  // 4. Create Units
  console.info('🏠 Creating units...');
  const unitMap = new Map<string, number>(); // unitName -> unitId
  
  for (const unitData of REAL_UNITS) {
    const propertyId = propertyMap.get(unitData.propertyName);
    if (!propertyId) {
      console.error(`   ⚠️  Property "${unitData.propertyName}" not found for unit "${unitData.name}"`);
      continue;
    }

    // Find existing unit or create new one
    const existingUnit = await prisma.unit.findFirst({
      where: {
        propertyId,
        name: unitData.name,
      },
    });

    const unit = existingUnit
      ? await prisma.unit.update({
          where: { id: existingUnit.id },
          data: {
            unitNumber: unitData.unitNumber,
            bedrooms: unitData.bedrooms,
            bathrooms: unitData.bathrooms,
            squareFeet: unitData.squareFeet,
            hasParking: unitData.hasParking ?? false,
            hasLaundry: unitData.hasLaundry ?? false,
            hasBalcony: unitData.hasBalcony ?? false,
            hasAC: unitData.hasAC ?? false,
            isFurnished: unitData.isFurnished ?? false,
            petsAllowed: unitData.petsAllowed ?? false,
          },
        })
      : await prisma.unit.create({
          data: {
            name: unitData.name,
            propertyId,
            unitNumber: unitData.unitNumber,
            bedrooms: unitData.bedrooms,
            bathrooms: unitData.bathrooms,
            squareFeet: unitData.squareFeet,
            hasParking: unitData.hasParking ?? false,
            hasLaundry: unitData.hasLaundry ?? false,
            hasBalcony: unitData.hasBalcony ?? false,
            hasAC: unitData.hasAC ?? false,
            isFurnished: unitData.isFurnished ?? false,
            petsAllowed: unitData.petsAllowed ?? false,
          },
        });
    unitMap.set(`${unitData.propertyName}:${unitData.name}`, unit.id);
  }
  console.info(`   ✅ Created ${REAL_UNITS.length} units\n`);

  // 5. Create Leases
  console.info('📄 Creating leases...');
  const leaseCount = { created: 0, skipped: 0 };
  
  for (const leaseData of REAL_LEASES) {
    const tenantId = userMap.get(leaseData.tenantUsername);
    const unitKey = `${leaseData.propertyName}:${leaseData.unitName}`;
    const unitId = unitMap.get(unitKey);

    if (!tenantId || !unitId) {
      console.error(`   ⚠️  Cannot create lease for ${leaseData.tenantUsername}: tenantId=${tenantId}, unitId=${unitId}`);
      leaseCount.skipped++;
      continue;
    }

    try {
      await prisma.lease.upsert({
        where: { tenantId },
        update: {
          unitId,
          startDate: leaseData.startDate,
          endDate: leaseData.endDate,
          rentAmount: leaseData.rentAmount,
          depositAmount: leaseData.depositAmount,
          currentBalance: leaseData.currentBalance ?? 0,
          status: LeaseStatus.ACTIVE,
          moveInAt: leaseData.startDate,
          noticePeriodDays: 30,
          autoRenew: true,
          billingAlignment: BillingAlignment.FULL_CYCLE,
        },
        create: {
          tenantId,
          unitId,
          startDate: leaseData.startDate,
          endDate: leaseData.endDate,
          rentAmount: leaseData.rentAmount,
          depositAmount: leaseData.depositAmount,
          currentBalance: leaseData.currentBalance ?? 0,
          status: LeaseStatus.ACTIVE,
          moveInAt: leaseData.startDate,
          noticePeriodDays: 30,
          autoRenew: true,
          billingAlignment: BillingAlignment.FULL_CYCLE,
        },
      });
      leaseCount.created++;
    } catch (error: any) {
      if (error.code === 'P2002') {
        // Unique constraint violation - lease already exists for this tenant or unit
        leaseCount.skipped++;
        console.warn(`   ⚠️  Lease already exists for ${leaseData.tenantUsername}`);
      } else {
        console.error(`   ❌ Error creating lease for ${leaseData.tenantUsername}:`, error.message);
        leaseCount.skipped++;
      }
    }
  }
  console.info(`   ✅ Created ${leaseCount.created} leases (${leaseCount.skipped} skipped)\n`);

  // 6. Create Maintenance Requests (sample)
  console.info('🔨 Creating sample maintenance requests...');
  const adminId = userMap.get('admin');
  const markDonnaId = userMap.get('mark_donna');
  const steveId = userMap.get('steve');
  const mrBId = userMap.get('mrB');
  const mapleUnitId = unitMap.get('Maple:Maple');
  const idaUnitId = unitMap.get('Ida:IDA');
  const sharonUnit3Id = unitMap.get('The Sharon:unit3');

  if (mapleUnitId && markDonnaId && adminId) {
    const lease = await prisma.lease.findFirst({ where: { tenantId: markDonnaId } });
    await prisma.maintenanceRequest.create({
      data: {
        title: 'Leaky faucet in kitchen',
        description: 'Kitchen faucet is dripping constantly, needs repair',
        status: Status.PENDING,
        priority: MaintenancePriority.MEDIUM,
        authorId: markDonnaId,
        propertyId: propertyMap.get('Maple'),
        unitId: mapleUnitId,
        leaseId: lease?.id,
      },
    }).catch(() => {}); // Ignore if already exists
  }

  if (idaUnitId && steveId) {
    const lease = await prisma.lease.findFirst({ where: { tenantId: steveId } });
    await prisma.maintenanceRequest.create({
      data: {
        title: 'AC not cooling',
        description: 'Air conditioning unit not working properly, room is too warm',
        status: Status.IN_PROGRESS,
        priority: MaintenancePriority.HIGH,
        authorId: steveId,
        propertyId: propertyMap.get('Ida'),
        unitId: idaUnitId,
        leaseId: lease?.id,
      },
    }).catch(() => {});
  }

  if (sharonUnit3Id && mrBId) {
    const lease = await prisma.lease.findFirst({ where: { tenantId: mrBId } });
    await prisma.maintenanceRequest.create({
      data: {
        title: 'Broken door lock',
        description: 'Front door lock mechanism is broken, cannot secure the unit',
        status: Status.COMPLETED,
        priority: MaintenancePriority.HIGH,
        authorId: mrBId,
        propertyId: propertyMap.get('The Sharon'),
        unitId: sharonUnit3Id,
        leaseId: lease?.id,
        completedAt: new Date(),
      },
    }).catch(() => {});
  }
  console.info('   ✅ Created sample maintenance requests\n');

  // 7. Create Invoices and Recurring Schedules
  console.info('💳 Creating invoices and recurring schedules...');
  const leases = await prisma.lease.findMany({
    where: { status: LeaseStatus.ACTIVE },
    include: { tenant: true },
  });

  for (const lease of leases) {
    // Create recurring invoice schedule
    await prisma.recurringInvoiceSchedule.upsert({
      where: { leaseId: lease.id },
      update: {
        amount: lease.rentAmount,
        description: 'Monthly Rent',
        frequency: BillingFrequency.MONTHLY,
        dayOfMonth: 1,
        nextRun: new Date('2025-02-01'),
        active: true,
      },
      create: {
        leaseId: lease.id,
        amount: lease.rentAmount,
        description: 'Monthly Rent',
        frequency: BillingFrequency.MONTHLY,
        dayOfMonth: 1,
        nextRun: new Date('2025-02-01'),
        active: true,
      },
    }).catch(() => {});

    // Create January 2025 invoice
    await prisma.invoice.create({
      data: {
        leaseId: lease.id,
        description: 'January 2025 Rent',
        amount: lease.rentAmount,
        dueDate: new Date('2025-02-01'),
        status: 'UNPAID',
        issuedAt: new Date(),
      },
    }).catch(() => {}); // Ignore duplicates
  }
  console.info(`   ✅ Created invoices and schedules for ${leases.length} active leases\n`);

  // 8. Create Sample Payments
  console.info('💰 Creating sample payments...');
  if (markDonnaId && steveId) {
    const markDonnaLease = await prisma.lease.findFirst({ where: { tenantId: markDonnaId } });
    const steveLease = await prisma.lease.findFirst({ where: { tenantId: steveId } });

    if (markDonnaLease) {
      const invoice = await prisma.invoice.findFirst({ where: { leaseId: markDonnaLease.id } });
      if (invoice) {
        await prisma.payment.create({
          data: {
            userId: markDonnaId,
            leaseId: markDonnaLease.id,
            invoiceId: invoice.id,
            amount: 725,
            paymentDate: new Date('2025-01-15'),
            status: 'COMPLETED',
          },
        }).catch(() => {});
      }
    }

    if (steveLease) {
      const invoice = await prisma.invoice.findFirst({ where: { leaseId: steveLease.id } });
      if (invoice) {
        await prisma.payment.create({
          data: {
            userId: steveId,
            leaseId: steveLease.id,
            invoiceId: invoice.id,
            amount: 700,
            paymentDate: new Date('2025-01-15'),
            status: 'COMPLETED',
          },
        }).catch(() => {});
      }
    }
  }
  console.info('   ✅ Created sample payments\n');

  // 9. Create Expenses
  console.info('📊 Creating expenses...');
  if (adminId) {
    const sharonPropertyId = propertyMap.get('The Sharon');
    const idaPropertyId = propertyMap.get('Ida');
    const maplePropertyId = propertyMap.get('Maple');

    if (sharonPropertyId) {
      await prisma.expense.create({
        data: {
          propertyId: sharonPropertyId,
          description: 'Monthly landscaping service',
          amount: 150,
          date: new Date('2025-01-15'),
          category: ExpenseCategory.MAINTENANCE,
          recordedById: adminId,
        },
      }).catch(() => {});
    }

    if (idaPropertyId) {
      await prisma.expense.create({
        data: {
          propertyId: idaPropertyId,
          description: 'Property insurance payment',
          amount: 250,
          date: new Date('2025-01-10'),
          category: ExpenseCategory.INSURANCE,
          recordedById: adminId,
        },
      }).catch(() => {});
    }

    if (maplePropertyId && mapleUnitId) {
      await prisma.expense.create({
        data: {
          propertyId: maplePropertyId,
          unitId: mapleUnitId,
          description: 'Repair leaky faucet',
          amount: 125,
          date: new Date('2025-01-20'),
          category: ExpenseCategory.REPAIRS,
          recordedById: adminId,
        },
      }).catch(() => {});
    }
  }
  console.info('   ✅ Created sample expenses\n');

  // Summary
  console.info('✅ Real-world data seeding completed!\n');
  console.info('📊 Summary:');
  console.info(`   - Users: ${REAL_USERS.length} (${REAL_USERS.filter(u => u.role === Role.PROPERTY_MANAGER).length} managers, ${REAL_USERS.filter(u => u.role === Role.TENANT).length} tenants)`);
  console.info(`   - Properties: ${REAL_PROPERTIES.length}`);
  console.info(`   - Units: ${REAL_UNITS.length}`);
  console.info(`   - Active Leases: ${leaseCount.created}`);
  console.info('\n🔑 Login Credentials:');
  console.info('   PROPERTY MANAGERS:');
  REAL_USERS.filter(u => u.role === Role.PROPERTY_MANAGER).forEach(u => {
    console.info(`     username: ${u.username.padEnd(12)} | password: ${u.password}`);
  });
  console.info('   TENANTS:');
  REAL_USERS.filter(u => u.role === Role.TENANT).slice(0, 5).forEach(u => {
    console.info(`     username: ${u.username.padEnd(12)} | password: ${u.password}`);
  });
  console.info(`     ... and ${REAL_USERS.filter(u => u.role === Role.TENANT).length - 5} more tenants`);
}

main()
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


