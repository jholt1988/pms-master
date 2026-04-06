import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PrivacyController } from './privacy.controller';
import { PrivacyService } from './privacy.service';
import { AuditLogService } from '../shared/audit-log.service';

@Module({
  imports: [PrismaModule],
  controllers: [PrivacyController],
  providers: [PrivacyService, AuditLogService],
  exports: [PrivacyService],
})
export class PrivacyModule {}
