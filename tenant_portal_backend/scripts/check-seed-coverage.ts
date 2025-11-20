import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

type CountResult = { count: number };

async function main() {
  console.info('Checking each model for seed data...');
  const missingModels: string[] = [];

  for (const model of Prisma.dmmf.datamodel.models) {
    const tableName = model.dbName ?? model.name;
    try {
      const [{ count }] = await prisma.$queryRawUnsafe<CountResult[]>(
        `SELECT COUNT(*)::int AS count FROM "${tableName}"`,
      );

      if (!count) {
        missingModels.push(model.name);
        console.warn(`✖ ${model.name} (${tableName}) has no records yet.`);
      } else {
        console.info(`✔ ${model.name} (${tableName}) contains ${count} row(s).`);
      }
    } catch (error) {
      console.error(`Error checking ${model.name}:`, (error as Error).message);
    }
  }

  if (missingModels.length) {
    console.warn('\nSeed coverage gaps detected:');
    missingModels.forEach((name) => console.warn(`  • ${name}`));
    console.warn(
      'Run the relevant seed scripts (e.g., npm run db:seed or ts-node prisma/seed.ts) to populate these models.',
    );
    process.exitCode = 1;
  } else {
    console.info('\nAll models have at least one record.');
  }
}

main()
  .catch((error) => {
    console.error('Seed coverage check failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
