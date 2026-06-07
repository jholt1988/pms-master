import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { LeaseModule } from '../lease/lease.module';
import { EsignatureModule } from '../esignature/esignature.module';
import { AuditLogModule } from '../shared/audit-log.module';
import { OperatorLeaseSigningController } from './operator-lease-signing.controller';
import { OperatorLeaseSigningService } from './operator-lease-signing.service';

@Module({
  imports: [PrismaModule, LeaseModule, EsignatureModule, AuditLogModule],
  controllers: [OperatorLeaseSigningController],
  providers: [OperatorLeaseSigningService],
  exports: [OperatorLeaseSigningService],
})
export class OperatorLeaseSigningModule {}
