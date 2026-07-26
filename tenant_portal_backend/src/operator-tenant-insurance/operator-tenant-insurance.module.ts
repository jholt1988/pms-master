import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TenantInsuranceModule } from '../tenant-insurance/tenant-insurance.module';
import { OperatorTenantInsuranceController } from './operator-tenant-insurance.controller';
import { OperatorTenantInsuranceService } from './operator-tenant-insurance.service';

@Module({
  imports: [PrismaModule, TenantInsuranceModule],
  controllers: [OperatorTenantInsuranceController],
  providers: [OperatorTenantInsuranceService],
  exports: [OperatorTenantInsuranceService],
})
export class OperatorTenantInsuranceModule {}
