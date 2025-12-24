const { PrismaClient } = require('@prisma/client');

async function main() {
  const url =
    process.env.DIRECT_DATABASE_URL ??
    'postgresql://postgres:jordan@localhost:5432/pms_db?schema=public_';
  const prisma = new PrismaClient({ datasources: { db: { url } } });

  try {
    const [schema] = await prisma.$queryRawUnsafe('SELECT current_schema()');
    console.log('current_schema():', schema);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
