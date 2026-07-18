import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { OrganizationSettingsController } from './organization-settings.controller';

/**
 * Registers the previously-orphaned OrganizationSettingsController so that the
 * /api/settings routes are actually mounted (see #75). PrismaService is global
 * via PrismaModule; auth and single-org context are enforced by global guards,
 * so no module-level guard providers are needed.
 */
@Module({
  imports: [PrismaModule],
  controllers: [OrganizationSettingsController],
})
export class SettingsModule {}
