import { Prisma } from '@prisma/client';
import { sqltag as sql } from '@prisma/client/runtime/library';
import { PrismaLike, resolveSchema } from './reset-database';
import { PrismaService } from '../../src/prisma/prisma.service';


export async function truncateTables(prisma){
  const schema = resolveSchema().replace(/"/g, '""');

  const privilege = await prisma.$queryRaw<
    Array<{ has_privilege: boolean }>
  >(
    sql`
    SELECT has_table_privilege(current_user, 'maintenance_request', 'TRUNCATE') AS has_privilege
  `
  );

  console.log('TRUNCATE on maintenance_request:', privilege[0]?.has_privilege);
}
 const prisma = new PrismaService();

