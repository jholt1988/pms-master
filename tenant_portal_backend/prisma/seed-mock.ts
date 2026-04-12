import { PrismaClient } from '@prisma/client';
import { MockSeedFactory } from './mock-seed-factory';

const prisma = new PrismaClient({
  log: ['warn', 'error'],
});

function numberFromEnv(name: string, fallback: number) {
  const value = process.env[name];
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function main() {
  const factory = new MockSeedFactory(prisma, {
    fakerSeed: numberFromEnv('MOCK_SEED', 20260411),
    runLabel: process.env.MOCK_RUN_LABEL,
    assetBaseUrl: process.env.MOCK_ASSET_BASE_URL,
    passwordHash: process.env.MOCK_PASSWORD_HASH,
  });

  const summary = await factory.seed({
    organizations: numberFromEnv('MOCK_ORGS', 1),
    propertiesPerOrg: numberFromEnv('MOCK_PROPERTIES_PER_ORG', 2),
    unitsPerProperty: numberFromEnv('MOCK_UNITS_PER_PROPERTY', 6),
    vacancyRatio: numberFromEnv('MOCK_VACANCY_RATIO', 0.34),
    applicantsPerVacantUnit: numberFromEnv('MOCK_APPLICANTS_PER_VACANT_UNIT', 2),
  });

  console.log('\nMock seed completed:\n');
  console.table(summary);
}

main()
  .catch((error) => {
    console.error('\nMock seed failed.\n');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
