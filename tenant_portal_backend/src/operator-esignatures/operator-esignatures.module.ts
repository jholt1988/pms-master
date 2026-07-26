import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EsignatureModule } from '../esignature/esignature.module';
import { AuditLogModule } from '../shared/audit-log.module';
import { OperatorEsignaturesController } from './operator-esignatures.controller';
import { OperatorEsignaturesService } from './operator-esignatures.service';

@Module({
  imports: [PrismaModule, EsignatureModule, AuditLogModule],
  controllers: [OperatorEsignaturesController],
  providers: [OperatorEsignaturesService],
  exports: [OperatorEsignaturesService],
})
export class OperatorEsignaturesModule {}
