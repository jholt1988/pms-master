import { Module } from '@nestjs/common';
import { MaintenanceController } from './maintenance.controller';
import { MaintenanceService } from './maintenance.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MaintenanceLegacyController } from '../legacy/maintenance-legacy.controller';

@Module({
  imports: [PrismaModule],
  controllers: [MaintenanceController, MaintenanceLegacyController],
  providers: [MaintenanceService],
})
export class MaintenanceModule {}
