const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany({ include: { organizations: true } });
  console.log(JSON.stringify(users.map(u => ({ username: u.username, role: u.role, orgs: u.organizations })), null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
