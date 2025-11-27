import { PrismaService } from '../../src/prisma/prisma.service';
import { PrismaClient } from '@prisma/client';

const resolveSchema = (): string => {
  const url = process.env.DATABASE_URL ?? '';
  const match = url.match(/schema=([^&]+)/);
  return match?.[1] ?? 'public';
};

/**
 * Truncate every application table (except Prisma's migration metadata)
 * so each e2e test starts from a known-empty schema while reusing the
 * same Prisma connection that the Nest app already bootstrapped.
 */
type PrismaLike = PrismaService | PrismaClient;

export async function resetDatabase(prisma: PrismaLike): Promise<void> {
  const schema = resolveSchema().replace(/"/g, '""');

  await prisma.$executeRawUnsafe(`
    DO
    $do$
    DECLARE
      tables TEXT;
    BEGIN
      SELECT string_agg(format('%I.%I', schemaname, tablename), ', ')
        INTO tables
      FROM pg_tables
      WHERE schemaname = '${schema}'
        AND tablename NOT IN ('_prisma_migrations', 'prisma_migrations');

      IF tables IS NOT NULL THEN
        EXECUTE 'TRUNCATE TABLE ' || tables || ' RESTART IDENTITY CASCADE';
      END IF;
    END
    $do$;
  `);
}

