import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const propertyManager = await prisma.user.findFirst({ where: { role: 'PROPERTY_MANAGER' } });
  const tenant = await prisma.user.findFirst({ where: { role: 'TENANT' } });
  const property = await prisma.property.findFirst();
  const firstUnit = property ? await prisma.unit.findFirst({ where: { propertyId: property.id } }) : null;
  const firstLease = await prisma.lease.findFirst();
  const maintenanceRequest = await prisma.maintenanceRequest.findFirst();
  const application = await prisma.rentalApplication.findFirst();

  if (!property || !propertyManager || !tenant) {
    throw new Error('Base property/manager/tenant data is required before seeding supplemental tables.');
  }

  await prisma.propertyMarketingProfile.upsert({
    where: { propertyId: property.id },
    update: {
      availabilityStatus: 'AVAILABLE',
      minRent: 2500,
      maxRent: 3600,
      marketingHeadline: 'Seeded marketing headline',
      marketingDescription: 'This property is seeded for coverage.',
    },
    create: {
      propertyId: property.id,
      availabilityStatus: 'AVAILABLE',
      minRent: 2500,
      maxRent: 3600,
      marketingHeadline: 'Seeded marketing headline',
      marketingDescription: 'This property is seeded for coverage.',
    },
  });

  await prisma.propertyPhoto.create({
    data: {
      propertyId: property.id,
      url: 'https://example.com/seed/property.jpg',
      caption: 'Seeded exterior photo',
    },
  });

  const poolAmenity = await prisma.amenity.upsert({
    where: { key: 'seed-pool' },
    update: {},
    create: {
      key: 'seed-pool',
      label: 'Seed Pool',
      description: 'Seeded pool amenity',
      category: 'Wellness',
    },
  });

  await prisma.propertyAmenity.upsert({
    where: { propertyId_amenityId: { propertyId: property.id, amenityId: poolAmenity.id } },
    update: { value: 'Outdoor lap pool' },
    create: {
      propertyId: property.id,
      amenityId: poolAmenity.id,
      value: 'Outdoor lap pool',
      isFeatured: true,
    },
  });

  await prisma.savedPropertyFilter.create({
    data: {
      name: 'Seeded Filter',
      filters: { minRent: 2000 },
      userId: propertyManager.id,
    },
  });

  const credential = await prisma.syndicationCredential.upsert({
    where: { channel: 'ZILLOW' },
    update: { config: { apiKey: 'seed', enabled: true } },
    create: {
      channel: 'ZILLOW',
      config: { apiKey: 'seed', enabled: true },
    },
  });

  const queue = await prisma.syndicationQueue.findFirst({ where: { propertyId: property.id, channel: 'ZILLOW' } });
  if (!queue) {
    await prisma.syndicationQueue.create({
      data: {
        propertyId: property.id,
        channel: 'ZILLOW',
        status: 'PENDING',
      },
    });
  }

  await prisma.syndicationErrorLog.create({
    data: {
      propertyId: property.id,
      channel: 'ZILLOW',
      error: 'Seeded syndication error',
    },
  });

  if (maintenanceRequest) {
    await prisma.maintenanceRequestHistory.create({
      data: {
        requestId: maintenanceRequest.id,
        changedById: propertyManager.id,
        fromStatus: 'PENDING',
        toStatus: 'IN_PROGRESS',
        note: 'Seeded history',
      },
    });

    await prisma.maintenanceNote.create({
      data: {
        requestId: maintenanceRequest.id,
        authorId: propertyManager.id,
        body: 'Seeded maintenance note',
      },
    });

    await prisma.maintenancePhoto.create({
      data: {
        requestId: maintenanceRequest.id,
        uploadedById: propertyManager.id,
        url: 'https://example.com/maintenance.jpg',
      },
    });
  }

  if (firstLease) {
    await prisma.leaseHistory.create({
      data: {
        leaseId: firstLease.id,
        actorId: propertyManager.id,
        note: 'Seeded lease history',
        toStatus: firstLease.status,
      },
    });

    const doc = await prisma.document.create({
      data: {
        uploadedById: propertyManager.id,
        fileName: 'seed-lease.pdf',
        filePath: '/seed/lease.pdf',
        category: 'LEASE',
        mimeType: 'application/pdf',
        size: 1024,
        leaseId: firstLease.id,
        propertyId: property.id,
        description: 'Seeded lease PDF',
      },
    });

    await prisma.leaseDocument.create({
      data: {
        leaseId: firstLease.id,
        type: 'LEASE',
        url: doc.filePath,
        uploadedById: propertyManager.id,
      },
    });

    const envelope = await prisma.esignEnvelope.create({
      data: {
        leaseId: firstLease.id,
        providerEnvelopeId: `seed-${Date.now()}`,
        status: 'COMPLETED',
        createdById: propertyManager.id,
        signedPdfDocumentId: doc.id,
      },
    });

    await prisma.esignParticipant.create({
      data: {
        envelopeId: envelope.id,
        name: tenant.username,
        email: `${tenant.username}@example.com`,
        role: 'TENANT',
        userId: tenant.id,
        status: 'SIGNED',
      },
    });

    const renewalEnd = new Date(firstLease.endDate);
    renewalEnd.setFullYear(renewalEnd.getFullYear() + 1);
    await prisma.leaseRenewalOffer.create({
      data: {
        leaseId: firstLease.id,
        proposedRent: firstLease.rentAmount * 1.05,
        proposedStart: firstLease.endDate,
        proposedEnd: renewalEnd,
        status: 'OFFERED',
      },
    });

    await prisma.leaseNotice.create({
      data: {
        leaseId: firstLease.id,
        type: 'RENT_INCREASE',
        deliveryMethod: 'EMAIL',
        message: 'Seeded notice',
        createdById: propertyManager.id,
      },
    });

    const invoice = await prisma.invoice.create({
      data: {
        leaseId: firstLease.id,
        description: 'Seeded invoice',
        amount: firstLease.rentAmount,
        dueDate: new Date(),
        status: 'UNPAID',
      },
    });

    await prisma.lateFee.create({
      data: {
        invoiceId: invoice.id,
        amount: 25,
      },
    });

    await prisma.recurringInvoiceSchedule.upsert({
      where: { leaseId: firstLease.id },
      update: {
        amount: firstLease.rentAmount,
        nextRun: new Date(),
        frequency: 'MONTHLY',
        lateFeeAmount: 15,
      },
      create: {
        leaseId: firstLease.id,
        amount: firstLease.rentAmount,
        dayOfMonth: 1,
        nextRun: new Date(),
        frequency: 'MONTHLY',
        lateFeeAmount: 15,
      },
    });
  }

  let paymentMethod = await prisma.paymentMethod.findFirst({ where: { userId: tenant.id } });
  if (!paymentMethod) {
    paymentMethod = await prisma.paymentMethod.create({
      data: {
        userId: tenant.id,
        type: 'BANK_ACCOUNT',
        provider: 'STRIPE',
        last4: '4242',
        brand: 'Seed Bank',
      },
    });
  }

  if (firstLease) {
    await prisma.autopayEnrollment.upsert({
      where: { leaseId: firstLease.id },
      update: {
        paymentMethodId: paymentMethod.id,
        active: true,
      },
      create: {
        leaseId: firstLease.id,
        paymentMethodId: paymentMethod.id,
        active: true,
      },
    });
  }

  await prisma.passwordResetToken.create({
    data: {
      token: `seed-reset-${Date.now()}`,
      userId: tenant.id,
      expiresAt: new Date(Date.now() + 86400 * 1000),
    },
  });

  await prisma.notification.create({
    data: {
      userId: tenant.id,
      type: 'RENT_REMINDER',
      title: 'Seeded notification',
      message: 'Automated notification',
    },
  });

  const template = await prisma.messageTemplate.create({
    data: {
      name: 'Seeded Template',
      body: 'Seeded message body',
      createdById: propertyManager.id,
    },
  });

  const conversation = await prisma.conversation.create({
    data: {
      participants: {
        create: [
          { userId: propertyManager.id },
          { userId: tenant.id },
        ],
      },
    },
  });

  await prisma.message.create({
    data: {
      content: 'Seeded conversation message',
      senderId: propertyManager.id,
      conversationId: conversation.id,
      templateId: template.id,
    },
  });

  const batch = await prisma.bulkMessageBatch.create({
    data: {
      title: 'Seeded Batch',
      body: 'Seeded body',
      status: 'DRAFT',
      creatorId: propertyManager.id,
      templateId: template.id,
      sendStrategy: 'IMMEDIATE',
    },
  });

  await prisma.bulkMessageRecipient.create({
    data: {
      batchId: batch.id,
      userId: tenant.id,
      status: 'PENDING',
    },
  });

  if (application) {
    await prisma.rentalApplicationNote.create({
      data: {
        applicationId: application.id,
        body: 'Seeded application note',
      },
    });
  }

  if (firstUnit && firstLease) {
    const inspection = await prisma.unitInspection.create({
      data: {
        unitId: firstUnit.id,
        propertyId: property.id,
        leaseId: firstLease.id,
        type: 'ROUTINE',
        status: 'SCHEDULED',
        scheduledDate: new Date(),
        createdById: propertyManager.id,
        inspectorId: propertyManager.id,
      },
    });

    await prisma.unitInspectionPhoto.create({
      data: {
        inspectionId: inspection.id,
        uploadedById: propertyManager.id,
        url: 'https://example.com/inspection.jpg',
      },
    });

    const room = await prisma.inspectionRoom.create({
      data: {
        inspectionId: inspection.id,
        name: 'Seed Room',
        roomType: 'LIVING_ROOM',
      },
    });

    const checklistItem = await prisma.inspectionChecklistItem.create({
      data: {
        roomId: room.id,
        category: 'INSPECTION',
        itemName: 'Check Floors',
        condition: 'GOOD',
      },
    });

    await prisma.inspectionChecklistSubItem.create({
      data: {
        parentItemId: checklistItem.id,
        name: 'No stains',
        condition: 'GOOD',
      },
    });

    await prisma.inspectionChecklistPhoto.create({
      data: {
        checklistItemId: checklistItem.id,
        uploadedById: propertyManager.id,
        url: 'https://example.com/checklist.jpg',
      },
    });

    await prisma.inspectionSignature.create({
      data: {
        inspectionId: inspection.id,
        userId: tenant.id,
        role: 'TENANT',
        signatureData: 'seed-signature',
      },
    });

    const estimate = await prisma.repairEstimate.create({
      data: {
        inspectionId: inspection.id,
        propertyId: property.id,
        unitId: firstUnit.id,
        totalLaborCost: 100,
        totalMaterialCost: 50,
        totalProjectCost: 150,
        itemsToRepair: 1,
        itemsToReplace: 0,
        generatedById: propertyManager.id,
        currency: 'USD',
      },
    });

    await prisma.repairEstimateLineItem.create({
      data: {
        estimateId: estimate.id,
        itemDescription: 'Seed Repair',
        location: 'Living Room',
        category: 'plumbing',
        issueType: 'repair',
        laborCost: 80,
        materialCost: 20,
        totalCost: 100,
      },
    });
  }

  await prisma.scheduleEvent.create({
    data: {
      type: 'MAINTENANCE',
      title: 'Seeded Event',
      date: new Date(),
      priority: 'MEDIUM',
      propertyId: property.id,
    },
  });

  await prisma.quickBooksConnection.create({
    data: {
      userId: propertyManager.id,
      companyId: `seed-${Date.now()}`,
      accessToken: 'seed-access',
      refreshToken: 'seed-refresh',
      tokenExpiresAt: new Date(Date.now() + 1e6),
      refreshTokenExpiresAt: new Date(Date.now() + 2e6),
    },
  });
}

main()
  .catch((error) => {
    console.error('Supplemental seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
