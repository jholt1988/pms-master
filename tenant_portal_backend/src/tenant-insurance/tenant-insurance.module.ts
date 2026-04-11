import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TenantInsuranceController } from './tenant-insurance.controller';
import { TenantInsuranceService } from './tenant-insurance.service';
import { TenantInsuranceProcessor } from './tenant-insurance.processor';

@Module({
  imports: [PrismaModule],
  controllers: [TenantInsuranceController],
  providers: [TenantInsuranceService, TenantInsuranceProcessor],
  exports: [TenantInsuranceService],
})
export class TenantInsuranceModule {}
