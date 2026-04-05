const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const admin = await prisma.user.findFirst({ where: { username: 'admin' } });
  const tenant = await prisma.user.findFirst({ where: { username: 'tenant' } });
  if (!admin || !tenant) throw new Error('Missing admin/tenant');

  const lease = await prisma.lease.findFirst({ where: { tenantId: tenant.id, status: 'ACTIVE' } });
  if (!lease) throw new Error('No active lease for tenant');

  const existing = await prisma.leaseDocument.findFirst({
    where: { leaseId: lease.id, type: 'LEASE', url: 'https://example.com/A06-Test-Lease-Document.pdf' },
  });

  const rec = existing || await prisma.leaseDocument.create({
    data: {
      leaseId: lease.id,
      type: 'LEASE',
      url: 'https://example.com/A06-Test-Lease-Document.pdf',
      description: 'A06 Test Lease Document',
      uploadedById: admin.id,
    },
  });

  console.log(JSON.stringify({ leaseId: lease.id, leaseDocumentId: rec.id, url: rec.url }, null, 2));
  await prisma.$disconnect();
})();
