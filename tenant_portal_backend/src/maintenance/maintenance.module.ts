import { Module } from '@nestjs/common';
import { MaintenanceController } from './maintenance.controller';
import { MaintenanceService } from './maintenance.service';
import { AIMaintenanceService } from './ai-maintenance.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MaintenanceLegacyController } from '../legacy/maintenance-legacy.controller';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [MaintenanceController, MaintenanceLegacyController],
  providers: [MaintenanceService, AIMaintenanceService],
  exports: [MaintenanceService, AIMaintenanceService],
})
export class MaintenanceModule {}
