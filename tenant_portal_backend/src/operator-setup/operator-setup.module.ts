import { Module } from '@nestjs/common';
import { PropertyModule } from '../property/property.module';
import { AuditLogModule } from '../shared/audit-log.module';
import { PrismaModule } from '../prisma/prisma.module';
import { OperatorSetupController } from './operator-setup.controller';
import { OperatorSetupService } from './operator-setup.service';

@Module({
  imports: [PrismaModule, PropertyModule, AuditLogModule],
  controllers: [OperatorSetupController],
  providers: [OperatorSetupService],
  exports: [OperatorSetupService],
})
export class OperatorSetupModule {}
