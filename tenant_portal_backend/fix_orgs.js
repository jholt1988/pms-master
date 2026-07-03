const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const defaultOrgId = "11111111-1111-4111-8111-111111111111";
  
  // Find users with multiple orgs
  const users = await prisma.user.findMany({
    include: { organizations: true }
  });
  
  for (const user of users) {
    if (user.organizations.length > 1) {
      // Find the one that is the default org and delete it
      const defaultMembership = user.organizations.find(o => o.organizationId === defaultOrgId);
      if (defaultMembership) {
        console.log(`Deleting redundant default org membership for user ${user.username}`);
        await prisma.userOrganization.delete({
          where: { id: defaultMembership.id }
        });
      } else {
         // if they have multiple orgs but none are the default org, just delete all but the first
         const toDelete = user.organizations.slice(1);
         for (const membership of toDelete) {
            console.log(`Deleting redundant org membership for user ${user.username}`);
            await prisma.userOrganization.delete({
               where: { id: membership.id }
            });
         }
      }
    }
  }
  console.log("Cleanup complete.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
