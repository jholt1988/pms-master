#!/usr/bin/env ts-node
/* eslint-disable no-console */
import { PrismaClient, InspectionStatus, MaintenancePriority, PaymentAttemptStatus, PaymentMethodType, PaymentProvider, Status } from '@prisma/client';

const prisma = new PrismaClient();

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

function daysFromNow(n: number): Date {
  return new Date(Date.now() + n * 24 * 60 * 60 * 1000);
}

async function ensureInspectionCoverage(adminId: string, tenantId: string) {
  const inspections = await prisma.unitInspection.findMany({
    where: { tenantId },
    include: {
      rooms: { include: { checklistItems: { include: { photos: true } } } },
      signatures: true,
    },
    take: 10,
    orderBy: { createdAt: 'desc' },
  });

  for (const [idx, inspection] of inspections.entries()) {
    if (inspection.status !== InspectionStatus.COMPLETED || !inspection.completedDate) {
      await prisma.unitInspection.update({
        where: { id: inspection.id },
        data: {
          status: InspectionStatus.COMPLETED,
          completedDate: daysAgo(2 + idx),
        },
      });
    }

    for (const room of inspection.rooms) {
      for (const item of room.checklistItems) {
        if (item.photos.length === 0) {
          await prisma.inspectionChecklistPhoto.create({
            data: {
              checklistItemId: item.id,
              url: `https://example.com/inspection/${inspection.id}/item-${item.id}.jpg`,
              caption: 'Seeded photo evidence',
              uploadedById: adminId,
            },
          });
        }
      }
    }

    if (inspection.signatures.length === 0) {
      await prisma.inspectionSignature.createMany({
        data: [
          {
            inspectionId: inspection.id,
            userId: adminId,
            role: 'INSPECTOR',
            signatureData: 'data:image/png;base64,SEED_SIGNATURE',
            signedAt: daysAgo(2 + idx),
          },
          {
            inspectionId: inspection.id,
            userId: tenantId,
            role: 'TENANT',
            signatureData: 'data:image/png;base64,SEED_SIGNATURE',
            signedAt: daysAgo(2 + idx),
          },
        ],
        skipDuplicates: true,
      });
    }
  }

  console.log(`✅ Inspection coverage upgraded for ${inspections.length} inspections`);
}

async function ensureMaintenanceCoverage(orgId: string, propertyId: string, unitId: string, leaseId: string, tenantId: string, adminId: string) {
  const asset = await prisma.maintenanceAsset.upsert({
    where: { MaintenanceAsset_property_unit_name_key: { propertyId, unitId, name: 'Main HVAC' } },
    update: { installDate: daysAgo(1200), category: 'HVAC' },
    create: {
      propertyId,
      unitId,
      name: 'Main HVAC',
      category: 'HVAC',
      installDate: daysAgo(1200),
      notes: 'Seeded target asset for ML readiness',
    },
  });

  const sla = await prisma.maintenanceSlaPolicy.upsert({
    where: { MaintenanceSlaPolicy_property_priority_key: { propertyId, priority: MaintenancePriority.MEDIUM } },
    update: { active: true, resolutionTimeMinutes: 72 * 60 },
    create: {
      propertyId,
      priority: MaintenancePriority.MEDIUM,
      name: 'Default Medium SLA',
      responseTimeMinutes: 6 * 60,
      resolutionTimeMinutes: 72 * 60,
      active: true,
    },
  });

  let created = 0;
  for (let i = 0; i < 60; i += 1) {
    const createdAt = daysAgo(90 - i);
    const isClosed = i % 3 !== 0;
    const status = isClosed ? Status.COMPLETED : (i % 2 === 0 ? Status.IN_PROGRESS : Status.PENDING);

    const req = await prisma.maintenanceRequest.create({
      data: {
        title: `Seeded maintenance request #${i + 1}`,
        description: i % 2 === 0 ? 'AC underperforming during afternoon peak.' : 'Water pressure fluctuations in bathroom sink.',
        status,
        priority: i % 10 === 0 ? MaintenancePriority.HIGH : MaintenancePriority.MEDIUM,
        authorId: tenantId,
        propertyId,
        unitId,
        leaseId,
        assetId: asset.id,
        slaPolicyId: sla.id,
        createdAt,
        dueAt: daysFromNow(14),
        acknowledgedAt: daysAgo(89 - i),
        completedAt: isClosed ? daysAgo(Math.max(1, 60 - i)) : null,
      },
    });

    await prisma.maintenanceRequestHistory.create({
      data: {
        requestId: req.id,
        changedById: adminId,
        fromStatus: Status.PENDING,
        toStatus: status,
        note: 'Seeded lifecycle transition',
        createdAt: daysAgo(89 - i),
      },
    });

    await prisma.maintenancePhoto.create({
      data: {
        requestId: req.id,
        uploadedById: tenantId,
        url: `https://example.com/maintenance/${req.id}/photo.jpg`,
        caption: 'Seeded maintenance evidence photo',
      },
    });

    created += 1;
  }

  console.log(`✅ Created ${created} maintenance requests with history, SLA, asset link, and photos`);

  if (orgId) {
    console.log(`ℹ️ Organization context: ${orgId}`);
  }
}

async function ensurePaymentCoverage(leaseId: string, tenantId: string) {
  const paymentMethod = await prisma.paymentMethod.create({
    data: {
      userId: tenantId,
      type: PaymentMethodType.CARD,
      provider: PaymentProvider.STRIPE,
      providerCustomerId: `seed_cus_${tenantId.slice(0, 8)}`,
      providerPaymentMethodId: `seed_pm_${Date.now()}`,
      last4: '4242',
      brand: 'VISA',
      expMonth: 12,
      expYear: 2030,
    },
  });

  const enrollment = await prisma.autopayEnrollment.upsert({
    where: { leaseId },
    update: { active: true, paymentMethodId: paymentMethod.id },
    create: {
      leaseId,
      paymentMethodId: paymentMethod.id,
      active: true,
      maxAmount: 2500,
    },
  });

  let invoicesCreated = 0;
  for (let i = 0; i < 24; i += 1) {
    const due = daysAgo(120 - i * 5);
    const paid = i % 4 !== 0;

    const invoice = await prisma.invoice.create({
      data: {
        leaseId,
        description: `Seeded rent invoice ${i + 1}`,
        amount: 1350,
        dueDate: due,
        status: paid ? 'PAID' : 'OVERDUE',
      },
    });

    if (paid) {
      await prisma.payment.create({
        data: {
          amount: 1350,
          status: 'COMPLETED',
          invoiceId: invoice.id,
          userId: tenantId,
          leaseId,
          paymentMethodId: paymentMethod.id,
          paymentDate: daysAgo(119 - i * 5),
        },
      });
    }

    await prisma.paymentAttempt.create({
      data: {
        autopayEnrollmentId: enrollment.id,
        invoiceId: invoice.id,
        status: paid ? PaymentAttemptStatus.SUCCEEDED : PaymentAttemptStatus.FAILED,
        failureReason: paid ? null : 'Insufficient funds (seeded)',
        scheduledFor: due,
        attemptedAt: daysAgo(119 - i * 5),
        completedAt: daysAgo(119 - i * 5),
      },
    });

    invoicesCreated += 1;
  }

  console.log(`✅ Created ${invoicesCreated} invoices with payments/attempts`);
}

async function main() {
  console.log('🌱 Targeted ML readiness seed starting...');

  const admin = await prisma.user.findFirst({
    where: { role: { in: ['PROPERTY_MANAGER', 'ADMIN'] } },
    orderBy: { createdAt: 'desc' },
  });

  const lease = await prisma.lease.findFirst({
    include: {
      tenant: true,
      unit: { include: { property: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!admin) throw new Error('No PM/Admin user found. Run base seed first.');
  if (!lease?.tenantId || !lease.unitId || !lease.unit?.propertyId) {
    throw new Error('No lease/unit/property context found. Run inspection robust seed first.');
  }

  const orgId = lease.unit.property?.organizationId ?? null;
  const tenantId = lease.tenantId;

  await ensureInspectionCoverage(admin.id, tenantId);
  await ensureMaintenanceCoverage(orgId ?? '', lease.unit.propertyId, lease.unitId, lease.id, tenantId, admin.id);
  await ensurePaymentCoverage(lease.id, tenantId);

  console.log('✅ Targeted ML readiness seed complete');
  console.log('Next: npm run ml:readiness:json && npm run ml:readiness:md');
}

main()
  .catch((e) => {
    console.error('❌ Targeted ML readiness seed failed:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
