const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const pm = await prisma.user.findFirst({ where: { username: 'admin' } });
  const tenant = await prisma.user.findFirst({ where: { username: 'tenant' } });
  if (!pm || !tenant) throw new Error('Missing admin or tenant user');

  const lease = await prisma.lease.findFirst({
    where: { tenantId: tenant.id, status: 'ACTIVE' },
    include: { unit: true },
  });
  if (!lease) throw new Error('No active lease found for tenant');

  const existing = await prisma.document.findFirst({
    where: { leaseId: lease.id, fileName: 'A06-Test-Lease-Document.pdf' },
  });

  const doc = existing || await prisma.document.create({
    data: {
      fileName: 'A06-Test-Lease-Document.pdf',
      filePath: '/tmp/A06-Test-Lease-Document.pdf',
      category: 'LEASE',
      description: 'A-06 verification document',
      mimeType: 'application/pdf',
      size: 1024,
      uploadedById: pm.id,
      leaseId: lease.id,
      propertyId: lease.unit ? undefined : undefined,
    },
  });

  console.log(JSON.stringify({
    pm: { id: pm.id, username: pm.username },
    tenant: { id: tenant.id, username: tenant.username },
    lease: { id: lease.id, unitId: lease.unitId },
    document: { id: doc.id, fileName: doc.fileName, leaseId: doc.leaseId },
  }, null, 2));

  await prisma.$disconnect();
})();
