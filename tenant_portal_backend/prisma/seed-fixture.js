const { PrismaClient, Role, LeaseStatus, Status } = require('@prisma/client');
const bcrypt = require('bcrypt');
const { PrismaPg } = require('@prisma/adapter-pg');

const ALLOWED_HOSTS = ['localhost', '127.0.0.1', 'host.docker.internal'];

function isAllowedUrl(raw) {
  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase();
    if (ALLOWED_HOSTS.includes(host)) return true;
    if (host.endsWith('.staging') || host.includes('staging')) return true;
    return false;
  } catch {
    return false;
  }
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}
if (!isAllowedUrl(databaseUrl)) {
  console.error(`Refusing to run: DATABASE_URL host is not on the allowlist (${ALLOWED_HOSTS.join(', ')} or a staging host).`);
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

const FIXTURE_ORG_NAME = 'Fixture Org';
const FIXTURE_PROPERTY_NAME = 'Fixture Property';
const FIXTURE_UNIT_NUMBER = '101';
const FIXTURE_OPERATOR_USERNAME = 'fixture-operator';
const FIXTURE_TENANT_USERNAME = 'fixture-tenant';
const FIXTURE_PASSWORD = 'fixture-password';
const FIXTURE_LEASE_MARKER = 'fixture-lease';
const FIXTURE_MAINTENANCE_TITLE = 'Fixture leaky faucet';

async function main() {
  const passwordHash = await bcrypt.hash(FIXTURE_PASSWORD, 10);

  const org = await prisma.organization.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: { id: '00000000-0000-0000-0000-000000000001', name: FIXTURE_ORG_NAME },
  });

  const property = await prisma.property.findFirst({ where: { name: FIXTURE_PROPERTY_NAME, organizationId: org.id } })
    ?? await prisma.property.create({
      data: { name: FIXTURE_PROPERTY_NAME, address: '1 Fixture St', city: 'Fixtureville', state: 'FX', zipCode: '00000', organizationId: org.id },
    });

  const unit = await prisma.unit.findFirst({ where: { propertyId: property.id, unitNumber: FIXTURE_UNIT_NUMBER } })
    ?? await prisma.unit.create({
      data: { name: FIXTURE_UNIT_NUMBER, unitNumber: FIXTURE_UNIT_NUMBER, propertyId: property.id },
    });

  const operator = await prisma.user.upsert({
    where: { username: FIXTURE_OPERATOR_USERNAME },
    update: { password: passwordHash, role: Role.PROPERTY_MANAGER },
    create: { username: FIXTURE_OPERATOR_USERNAME, password: passwordHash, role: Role.PROPERTY_MANAGER, email: 'fixture-operator@example.com', firstName: 'Fixture', lastName: 'Operator' },
  });

  const tenant = await prisma.user.upsert({
    where: { username: FIXTURE_TENANT_USERNAME },
    update: { password: passwordHash, role: Role.TENANT },
    create: { username: FIXTURE_TENANT_USERNAME, password: passwordHash, role: Role.TENANT, email: 'fixture-tenant@example.com', firstName: 'Fixture', lastName: 'Tenant' },
  });

  // link operator + tenant to org
  await prisma.userOrganization.upsert({
    where: { userId_organizationId: { userId: operator.id, organizationId: org.id } },
    update: {},
    create: { userId: operator.id, organizationId: org.id, role: 'OWNER' },
  });
  await prisma.userOrganization.upsert({
    where: { userId_organizationId: { userId: tenant.id, organizationId: org.id } },
    update: {},
    create: { userId: tenant.id, organizationId: org.id, role: 'MEMBER' },
  });

  // lease
  let lease = await prisma.lease.findFirst({ where: { tenantId: tenant.id } });
  if (!lease) {
    lease = await prisma.lease.create({
      data: {
        tenantId: tenant.id,
        unitId: unit.id,
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        status: LeaseStatus.ACTIVE,
        rentAmountCents: 100000,
      },
    });
  }

  // maintenance request
  const existingMaint = await prisma.maintenanceRequest.findFirst({ where: { authorId: tenant.id, title: FIXTURE_MAINTENANCE_TITLE } });
  if (!existingMaint) {
    await prisma.maintenanceRequest.create({
      data: {
        title: FIXTURE_MAINTENANCE_TITLE,
        description: 'Fixture maintenance request for smoke test.',
        authorId: tenant.id,
        propertyId: property.id,
        unitId: unit.id,
        leaseId: lease.id,
        status: Status.PENDING,
      },
    });
  }

  console.log('Fixture seed complete.');
  console.log(`  operator: ${FIXTURE_OPERATOR_USERNAME} / ${FIXTURE_PASSWORD}`);
  console.log(`  tenant:   ${FIXTURE_TENANT_USERNAME} / ${FIXTURE_PASSWORD}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());