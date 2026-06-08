import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { LeaseModule } from '../lease/lease.module';
import { EsignatureModule } from '../esignature/esignature.module';
import { AuditLogModule } from '../shared/audit-log.module';
import { OperatorRenewalsController } from './operator-renewals.controller';
import { OperatorRenewalsService } from './operator-renewals.service';

@Module({
  imports: [PrismaModule, LeaseModule, EsignatureModule, AuditLogModule],
  controllers: [OperatorRenewalsController],
  providers: [OperatorRenewalsService],
  exports: [OperatorRenewalsService],
})
export class OperatorRenewalsModule {}
