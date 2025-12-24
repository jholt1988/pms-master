import { PrismaService } from '../../src/prisma/prisma.service';
import { PrismaClient } from '@prisma/client';

export const resolveSchema = (): string => {
  const url = process.env.DIRECT_DATABASE_URL ?? '';
  const match = url.match(/schema=([^&]+)/);
  return match?.[1] ?? 'public';
};

/**
 * Truncate every application table (except Prisma's migration metadata)
 * so each e2e test starts from a known-empty schema while reusing the
 * same Prisma connection that the Nest app already bootstrapped.
 */
export type PrismaLike = PrismaService | PrismaClient;

const IGNORED_TABLES = [
  '_prisma_migrations',
  'prisma_migrations',
  'AgentRun',
  'AgentToolCall',
];

async function truncateTable(prisma: PrismaLike, qualifiedName: string, maxRetries: number): Promise<void> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${qualifiedName} RESTART IDENTITY CASCADE`);
      return;
    } catch (error: any) {
      if (error?.code === '42501') {
        console.warn(`Skipping ${qualifiedName}: insufficient privileges (${error.message})`);
        return;
      }
      if (error?.code === '40P01' && attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 50 * Math.pow(2, attempt)));
        continue;
      }
      throw error;
    }
  }
}

async function fetchTables(prisma: PrismaLike, schemaLiteral: string, ignoredList: string) {
  return prisma.$queryRawUnsafe<
    Array<{ schemaname: string; tablename: string }>
  >(
    `
    SELECT schemaname, tablename
    FROM pg_tables
    WHERE schemaname = '${schemaLiteral}'
      AND tablename NOT IN (${ignoredList})
    ORDER BY schemaname, tablename
    `
  );
}

export async function resetDatabase(prisma: PrismaLike | null | undefined, maxRetries = 3): Promise<void> {
  if (!prisma) {
    console.warn('resetDatabase: prisma client is not available, skipping database reset.');
    return;
  }
  if (typeof prisma.$queryRawUnsafe !== 'function') {
    console.warn('resetDatabase: prisma client lacks $queryRawUnsafe, skipping database reset.');
                                                                                  return;
  }

  const schemaName = resolveSchema();
  const schemaLiteral = schemaName.replace(/'/g, "''");
  const ignoredList = IGNORED_TABLES.map(name => `'${name}'`).join(', ');

  let tables = await fetchTables(prisma, schemaLiteral, ignoredList);
  if (!tables.length) {
    const fallbackRows = await prisma.$queryRawUnsafe<{ current_schema: string }>('SELECT current_schema()');
    const fallbackSchema = fallbackRows[0]?.current_schema;
    if (fallbackSchema && fallbackSchema !== schemaName) {
      const fallbackLiteral = fallbackSchema.replace(/'/g, "''");
      tables = await fetchTables(prisma, fallbackLiteral, ignoredList);
    }
  }

  if (!tables.length) {
    return;
  }

  for (const { schemaname, tablename } of tables) {
    const qualifiedName = `"${schemaname.replace(/"/g, '""')}"."${tablename.replace(/"/g, '""')}"`;
    await truncateTable(prisma, qualifiedName, maxRetries);
  }
}
