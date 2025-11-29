import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
const prisma = new PrismaClient();

async function main() {
    // Check if seeding is disabled via environment variable
    if (process.env.DISABLE_AUTO_SEED === 'true' || process.env.SKIP_SEED === 'true') {
      console.info('⏭️  Auto-seeding is disabled. Skipping seed process.');
      console.info('   To seed manually, run: npm run db:seed');
      return;
    }
  
    console.info('🌱 Seeding comprehensive test data...');
  
    // 0. Create initial Property Manager account
    console.info('👤 Creating initial property manager account...');
    const adminHashedPassword = await bcrypt.hash('Admin123!@#', 10);
    
    const adminUser = await prisma.user.upsert({
      where: { username: 'admin' },
      update: {
        password: adminHashedPassword,
        role: Role.PROPERTY_MANAGER,
        passwordUpdatedAt: new Date(),
      },
      create: {
        username: 'admin',
        password: adminHashedPassword,
        role: Role.PROPERTY_MANAGER,
        passwordUpdatedAt: new Date(),
      },
    })
  console.info(`✅ Property Manager created: ${adminUser.username} (ID: ${adminUser.id})`);
  console.info(`   Default password: Admin123!@# (Please change after first login)`);

};

main()