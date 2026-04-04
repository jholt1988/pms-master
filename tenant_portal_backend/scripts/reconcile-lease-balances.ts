import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const apply = process.argv.includes('--apply');

async function run() {
  console.log(`Lease balance reconciliation started (${apply ? 'APPLY' : 'DRY-RUN'})...`);

  const accounts = await prisma.ledgerAccount.findMany({
    include: {
      lease: true,
      entries: {
        where: { status: 'POSTED' },
      },
    },
  });

  let checked = 0;
  let mismatches = 0;
  let updated = 0;

  for (const account of accounts) {
    checked += 1;
    const ledgerBalanceCents = account.entries.reduce((sum, e) => {
      return sum + (e.direction === 'DEBIT' ? e.amountCents : -e.amountCents);
    }, 0);

    const legacyBalanceCents = Math.round(Number(account.lease.currentBalance) * 100);
    const delta = ledgerBalanceCents - legacyBalanceCents;

    if (delta !== 0) {
      mismatches += 1;
      console.log(
        JSON.stringify({
          leaseId: account.leaseId,
          accountId: account.id,
          legacyBalanceCents,
          ledgerBalanceCents,
          deltaCents: delta,
        }),
      );

      if (apply) {
        await prisma.lease.update({
          where: { id: account.leaseId },
          data: {
            currentBalance: ledgerBalanceCents / 100,
          },
        });
        updated += 1;
      }
    }
  }

  console.log(
    `Done. checked=${checked}, mismatches=${mismatches}, updated=${updated}, mode=${apply ? 'apply' : 'dry-run'}`,
  );
}

run()
  .catch((err) => {
    console.error('Reconciliation failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
