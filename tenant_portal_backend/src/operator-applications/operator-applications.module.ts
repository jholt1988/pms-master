import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RentalApplicationModule } from '../rental-application/rental-application.module';
import { AuditLogModule } from '../shared/audit-log.module';
import { OperatorApplicationsController } from './operator-applications.controller';
import { OperatorApplicationsService } from './operator-applications.service';

@Module({
  imports: [PrismaModule, RentalApplicationModule, AuditLogModule],
  controllers: [OperatorApplicationsController],
  providers: [OperatorApplicationsService],
  exports: [OperatorApplicationsService],
})
export class OperatorApplicationsModule {}
