import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { databaseUrl } from './load-db-url';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl() }) });

async function main() {
  console.log('Seeding user-story coverage data...');
  const property = await prisma.property.findFirst();
  const manager = await prisma.user.findFirst({ where: { role: 'PROPERTY_MANAGER' } });
  const tenant = await prisma.user.findFirst({ where: { role: 'TENANT' } });
  const unit = property ? await prisma.unit.findFirst({ where: { propertyId: property.id } }) : null;
  const lease = await prisma.lease.findFirst();

  // Maintenance across priorities/statuses
  if (property && unit && tenant && manager) {
    const priorities = ['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY'] as const;
    const statuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const;
    for (const p of priorities) {
      for (const s of statuses) {
        await prisma.maintenanceRequest.create({
          data: {
          propertyId: property.id,
          unitId: unit.id,
          authorId: tenant.id,
          title: `${p} ${s} request`,
          description: `Seeded ${p} priority ${s} maintenance`,
          priority: p as any,
          status: s as any,
          },
        }).catch(() => {});
      }
    }
  }

  // Rental application across pipeline
  if (property && unit) {
    const stages = ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'] as const;
    for (const st of stages) {
      await prisma.rentalApplication.create({
        data: {
          propertyId: property.id,
          unitId: unit.id,
          fullName: `Applicant ${st}`,
          email: `applicant-${st.toLowerCase()}@example.com`,
          phoneNumber: '555-0000',
          income: 5000,
          employmentStatus: 'Employed',
          previousAddress: '123 Main St',
          status: st as any,
        },
      }).catch(() => {});
    }
  }

  console.log('Done.');
}

main().finally(() => prisma.$disconnect());
