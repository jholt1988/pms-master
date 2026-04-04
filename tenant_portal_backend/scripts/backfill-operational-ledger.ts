import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function ensureLedgerAccount(leaseId: string, organizationId: string, propertyId?: string | null, unitId?: string | null, residentId?: string | null) {
  return prisma.ledgerAccount.upsert({
    where: {
      organizationId_leaseId: {
        organizationId,
        leaseId,
      },
    },
    create: {
      organizationId,
      leaseId,
      propertyId: propertyId ?? undefined,
      unitId: unitId ?? undefined,
      residentId: residentId ?? undefined,
      currency: 'USD',
      status: 'ACTIVE',
    },
    update: {
      propertyId: propertyId ?? undefined,
      unitId: unitId ?? undefined,
      residentId: residentId ?? undefined,
      status: 'ACTIVE',
    },
  });
}

async function ensureTx(params: {
  accountId: string;
  entryType: 'CHARGE' | 'PAYMENT' | 'REVERSAL';
  direction: 'DEBIT' | 'CREDIT';
  amountCents: number;
  effectiveDate: Date;
  categoryCode: string;
  sourceType: string;
  sourceId: string;
  description: string;
  reasonCode?: string;
  reversesEntryId?: string;
}) {
  const existing = await prisma.ledgerTransaction.findFirst({
    where: {
      sourceType: params.sourceType,
      sourceId: params.sourceId,
      accountId: params.accountId,
    },
    select: { id: true },
  });

  if (existing) return false;

  await prisma.ledgerTransaction.create({
    data: {
      accountId: params.accountId,
      entryType: params.entryType,
      direction: params.direction,
      amountCents: params.amountCents,
      effectiveDate: params.effectiveDate,
      categoryCode: params.categoryCode,
      sourceType: params.sourceType,
      sourceId: params.sourceId,
      description: params.description,
      reasonCode: params.reasonCode,
      reversesEntryId: params.reversesEntryId,
    },
  });

  return true;
}

async function run() {
  console.log('Starting operational ledger backfill...');

  const leases = await prisma.lease.findMany({
    include: {
      unit: { include: { property: true } },
      invoices: true,
      payments: true,
      manualCharges: true,
      manualPayments: true,
    },
  });

  let accountsTouched = 0;
  let txCreated = 0;

  for (const lease of leases) {
    const orgId = lease.unit?.property?.organizationId;
    if (!orgId) continue;

    const account = await ensureLedgerAccount(
      lease.id,
      orgId,
      lease.unit?.propertyId,
      lease.unitId,
      lease.tenantId,
    );
    accountsTouched++;

    for (const inv of lease.invoices) {
      if (
        await ensureTx({
          accountId: account.id,
          entryType: 'CHARGE',
          direction: 'DEBIT',
          amountCents: Math.round(Number(inv.amount) * 100),
          effectiveDate: inv.dueDate,
          categoryCode: 'rent',
          sourceType: 'invoice',
          sourceId: String(inv.id),
          description: inv.description || `Invoice #${inv.id}`,
        })
      ) {
        txCreated++;
      }
    }

    for (const p of lease.payments) {
      if ((p.status ?? '').toUpperCase() === 'FAILED') continue;
      if (
        await ensureTx({
          accountId: account.id,
          entryType: 'PAYMENT',
          direction: 'CREDIT',
          amountCents: Math.round(Number(p.amount) * 100),
          effectiveDate: p.paymentDate,
          categoryCode: 'rent_payment',
          sourceType: 'payment',
          sourceId: String(p.id),
          description: `Payment #${p.id}`,
        })
      ) {
        txCreated++;
      }
    }

    for (const c of lease.manualCharges) {
      const posted = c.status === 'POSTED';
      if (posted) {
        if (
          await ensureTx({
            accountId: account.id,
            entryType: 'CHARGE',
            direction: 'DEBIT',
            amountCents: c.amountCents,
            effectiveDate: c.chargeDate,
            categoryCode: String(c.chargeType).toLowerCase(),
            sourceType: 'manual_charge',
            sourceId: c.id,
            description: c.description,
          })
        ) {
          txCreated++;
        }
      }

      if (c.status === 'VOIDED') {
        const original = await prisma.ledgerTransaction.findFirst({
          where: {
            accountId: account.id,
            sourceType: 'manual_charge',
            sourceId: c.id,
          },
          orderBy: { createdAt: 'asc' },
        });

        if (
          await ensureTx({
            accountId: account.id,
            entryType: 'REVERSAL',
            direction: 'CREDIT',
            amountCents: c.amountCents,
            effectiveDate: c.updatedAt,
            categoryCode: 'manual_charge_void',
            sourceType: 'manual_charge_void',
            sourceId: c.id,
            description: `Void of manual charge ${c.id}`,
            reasonCode: c.voidReason ?? undefined,
            reversesEntryId: original?.id,
          })
        ) {
          txCreated++;
        }
      }
    }

    for (const p of lease.manualPayments) {
      const posted = p.status === 'POSTED';
      if (posted) {
        if (
          await ensureTx({
            accountId: account.id,
            entryType: 'PAYMENT',
            direction: 'CREDIT',
            amountCents: p.amountCents,
            effectiveDate: p.receivedAt,
            categoryCode: 'manual_payment',
            sourceType: 'manual_payment',
            sourceId: p.id,
            description: p.memo || `Manual ${p.method} payment`,
          })
        ) {
          txCreated++;
        }
      }

      if (p.status === 'REVERSED') {
        const original = await prisma.ledgerTransaction.findFirst({
          where: {
            accountId: account.id,
            sourceType: 'manual_payment',
            sourceId: p.id,
          },
          orderBy: { createdAt: 'asc' },
        });

        if (
          await ensureTx({
            accountId: account.id,
            entryType: 'REVERSAL',
            direction: 'DEBIT',
            amountCents: p.amountCents,
            effectiveDate: p.updatedAt,
            categoryCode: 'manual_payment_reversal',
            sourceType: 'manual_payment_reversal',
            sourceId: p.id,
            description: `Reversal of manual payment ${p.id}`,
            reasonCode: p.reversalReason ?? undefined,
            reversesEntryId: original?.id,
          })
        ) {
          txCreated++;
        }
      }
    }
  }

  console.log(`Backfill complete. Accounts touched: ${accountsTouched}, transactions created: ${txCreated}`);
}

run()
  .catch((err) => {
    console.error('Backfill failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
