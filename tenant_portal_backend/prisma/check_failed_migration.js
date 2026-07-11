const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const failedMigrations = await prisma.$queryRaw`SELECT * FROM _prisma_migrations WHERE migration_name = '20260708100300_payment_id_to_uuid'`;
  console.log(failedMigrations);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
