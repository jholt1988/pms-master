import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function test() {
  console.log('--- Inspecting Columns on Decision ---');
  
  const sql = `
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'Decision';
  `;

  try {
    const results = await prisma.$queryRawUnsafe(sql);
    console.log(JSON.stringify(results, null, 2));
  } catch (err) {
    console.error('SQL query failed:', err);
  }

  await prisma.$disconnect();
}

test();
