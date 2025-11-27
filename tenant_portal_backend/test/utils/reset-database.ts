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

export async function resetDatabase(prisma: PrismaLike, maxRetries = 3): Promise<void> {
  const schema = resolveSchema().replace(/"/g, '""');

  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
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
      return; // Success
    } catch (error: any) {
      lastError = error;
      // Retry on deadlock (40P01) or lock timeout (40P01)
      if (error?.code === '40P01' && attempt < maxRetries - 1) {
        // Exponential backoff: wait 50ms, 100ms, 200ms
        await new Promise(resolve => setTimeout(resolve, 50 * Math.pow(2, attempt)));
        continue;
      }
      throw error; // Re-throw if not a deadlock or out of retries
    }
  }
  
  throw lastError || new Error('Failed to reset database after retries');
}

