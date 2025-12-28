import { PrismaClient } from '../../tenant_portal_backend/node_modules/@prisma/client';
import { normalizeEmail } from '../../tenant_portal_backend/src/utils/normalizeEmail';
import { normalizePhone } from '../../tenant_portal_backend/src/utils/normalizePhone';

const prisma = new PrismaClient();

const normalizeAddressField = (value?: string | null): string | null => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeState = (value?: string | null): string | null => {
  const trimmed = normalizeAddressField(value);
  return trimmed ? trimmed.toUpperCase() : null;
};

const normalizeCountry = (value?: string | null): string | null => {
  const trimmed = normalizeAddressField(value);
  return trimmed ? trimmed.toUpperCase() : null;
};

const runUserBackfill = async (): Promise<void> => {
  let cursorId: string | null = null;

  while (true) {
    const users = await prisma.user.findMany({
      take: 250,
      ...(cursorId !== null
        ? {
            skip: 1,
            cursor: { id: cursorId },
          }
        : {}),
      orderBy: { id: 'asc' },
      select: {
        id: true,
        email: true,
        phoneNumber: true,
      },
    });

    if (users.length === 0) {
      break;
    }

    const updates = users
      .map((user) => {
        const normalizedEmail = normalizeEmail(user.email);
        const normalizedPhone = normalizePhone(user.phoneNumber);

        const shouldUpdate =
          normalizedEmail !== user.email ||
          normalizedPhone !== user.phoneNumber;

        return shouldUpdate
          ? prisma.user.update({
              where: { id: user.id },
              data: {
                email: normalizedEmail,
                phoneNumber: normalizedPhone,
              },
            })
          : null;
      })
      .filter((update): update is ReturnType<typeof prisma.user.update> => update !== null);

    if (updates.length > 0) {
      await prisma.$transaction(updates);
    }

    cursorId = users[users.length - 1].id;
  }
};

const runPropertyBackfill = async (): Promise<void> => {
  let cursorId: number | null = null;

  while (true) {
    const properties = await prisma.property.findMany({
      take: 250,
      ...(cursorId !== null
        ? {
            skip: 1,
            cursor: { id: cursorId },
          }
        : {}),
      orderBy: { id: 'asc' },
      select: {
        id: true,
        address: true,
        city: true,
        state: true,
        zipCode: true,
        country: true,
      },
    });

    if (properties.length === 0) {
      break;
    }

    const updates = properties
      .map((property) => {
        const normalizedAddress = normalizeAddressField(property.address);
        const normalizedCity = normalizeAddressField(property.city);
        const normalizedState = normalizeState(property.state);
        const normalizedZip = normalizeAddressField(property.zipCode);
        const normalizedCountry = normalizeCountry(property.country || 'US');

        const shouldUpdate =
          normalizedAddress !== property.address ||
          normalizedCity !== property.city ||
          normalizedState !== property.state ||
          normalizedZip !== property.zipCode ||
          normalizedCountry !== property.country;

        return shouldUpdate
          ? prisma.property.update({
              where: { id: property.id },
              data: {
                address: normalizedAddress,
                city: normalizedCity,
                state: normalizedState,
                zipCode: normalizedZip,
                country: normalizedCountry,
              },
            })
          : null;
      })
      .filter(
        (update): update is ReturnType<typeof prisma.property.update> => update !== null,
      );

    if (updates.length > 0) {
      await prisma.$transaction(updates);
    }

    cursorId = properties[properties.length - 1].id;
  }
};

const run = async (): Promise<void> => {
  await runUserBackfill();
  await runPropertyBackfill();
};

run()
  .catch((error) => {
    console.error('Normalization backfill failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
