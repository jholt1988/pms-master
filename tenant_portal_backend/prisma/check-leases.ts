import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkLeases() {
  const leases = await prisma.lease.findMany({
    select: {
      id: true,
      status: true,
      rentAmount: true,
      unitId: true,
      startDate: true,
      endDate: true,
    },
  });
  
  console.log(`Found ${leases.length} leases:`);
  console.log(JSON.stringify(leases, null, 2));
  
  await prisma.$disconnect();
}

checkLeases();
