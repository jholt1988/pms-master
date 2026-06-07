import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type Check = {
  name: string;
  pass: boolean;
  detail: string;
};

async function main() {
  const checks: Check[] = [];

  const org = await prisma.organization.findFirst({
    orderBy: { createdAt: 'asc' },
  });

  checks.push({
    name: 'demo organization',
    pass: Boolean(org),
    detail: org ? `found ${org.name} (${org.id})` : 'no organization records found',
  });

  if (org) {
    const requiredAccountCodes = ['1000', '1010', '1020', '2100', '4000', '4010', '5000', '5050', '9000'];
    const accounts = await prisma.chartOfAccount.findMany({
      where: { organizationId: org.id, code: { in: requiredAccountCodes }, isActive: true },
      select: { code: true },
    });
    const foundCodes = new Set(accounts.map((account) => account.code));
    const missingCodes = requiredAccountCodes.filter((code) => !foundCodes.has(code));

    checks.push({
      name: 'chart of accounts',
      pass: missingCodes.length === 0,
      detail: missingCodes.length ? `missing ${missingCodes.join(', ')}` : `found ${accounts.length} required accounts`,
    });
  }

  const approvalCount = await prisma.approvalTask.count();
  checks.push({
    name: 'approval tasks',
    pass: approvalCount > 0,
    detail: `${approvalCount} approval task(s)`,
  });

  const feedCount = await prisma.feedItem.count({
    where: { isDismissed: false },
  });
  checks.push({
    name: 'command-center feed items',
    pass: feedCount > 0,
    detail: `${feedCount} active feed item(s)`,
  });

  for (const check of checks) {
    const mark = check.pass ? 'OK' : 'MISSING';
    console.info(`[${mark}] ${check.name}: ${check.detail}`);
  }

  const failed = checks.filter((check) => !check.pass);
  if (failed.length > 0) {
    console.error(`Phase 1 seed verification failed: ${failed.map((check) => check.name).join(', ')}`);
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error('Phase 1 seed verification failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
