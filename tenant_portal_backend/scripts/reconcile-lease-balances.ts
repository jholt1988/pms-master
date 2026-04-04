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
  let integrityIssues = 0;

  for (const account of accounts) {
    checked += 1;

    const byId = new Map(account.entries.map((e) => [e.id, e]));
    const reversalCounts = new Map<string, number>();

    for (const entry of account.entries) {
      if (entry.amountCents <= 0) {
        integrityIssues += 1;
        console.log(
          JSON.stringify({
            level: 'INTEGRITY',
            type: 'NON_POSITIVE_AMOUNT',
            leaseId: account.leaseId,
            accountId: account.id,
            entryId: entry.id,
            amountCents: entry.amountCents,
          }),
        );
      }

      if (entry.entryType === 'REVERSAL') {
        if (!entry.reversesEntryId) {
          integrityIssues += 1;
          console.log(
            JSON.stringify({
              level: 'INTEGRITY',
              type: 'REVERSAL_MISSING_ORIGINAL',
              leaseId: account.leaseId,
              accountId: account.id,
              entryId: entry.id,
            }),
          );
        } else {
          const original = byId.get(entry.reversesEntryId);
          if (!original) {
            integrityIssues += 1;
            console.log(
              JSON.stringify({
                level: 'INTEGRITY',
                type: 'REVERSAL_ORIGINAL_NOT_FOUND',
                leaseId: account.leaseId,
                accountId: account.id,
                entryId: entry.id,
                reversesEntryId: entry.reversesEntryId,
              }),
            );
          }

          reversalCounts.set(entry.reversesEntryId, (reversalCounts.get(entry.reversesEntryId) ?? 0) + 1);
        }
      }
    }

    for (const [reversesEntryId, count] of reversalCounts.entries()) {
      if (count > 1) {
        integrityIssues += 1;
        console.log(
          JSON.stringify({
            level: 'INTEGRITY',
            type: 'MULTIPLE_REVERSALS_FOR_ORIGINAL',
            leaseId: account.leaseId,
            accountId: account.id,
            reversesEntryId,
            count,
          }),
        );
      }
    }

    const ledgerBalanceCents = account.entries.reduce((sum, e) => {
      return sum + (e.direction === 'DEBIT' ? e.amountCents : -e.amountCents);
    }, 0);

    const legacyBalanceCents = Math.round(Number(account.lease.currentBalance) * 100);
    const delta = ledgerBalanceCents - legacyBalanceCents;

    if (delta !== 0) {
      mismatches += 1;
      console.log(
        JSON.stringify({
          level: 'MISMATCH',
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

  const hasAlert = mismatches > 0 || integrityIssues > 0;
  console.log(
    `Done. checked=${checked}, mismatches=${mismatches}, integrityIssues=${integrityIssues}, updated=${updated}, mode=${apply ? 'apply' : 'dry-run'}, status=${hasAlert ? 'ALERT' : 'OK'}`,
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
