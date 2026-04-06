import { Module } from '@nestjs/common';
import { MilService } from './mil.service';
import { CryptoService } from './crypto.service';
import { KeyringService } from './keyring.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditLogService } from '../shared/audit-log.service';
import { SecurityEventsModule } from '../security-events/security-events.module';
import { MilAccessPolicyService } from './mil-access-policy.service';
import { MilSecurityAuditWrapperService } from './mil-security-audit-wrapper.service';
import { ModelAccessTraceService } from './model-access-trace.service';
import { MilAuditEventService } from './mil-audit-event.service';
import { MilFeatureFlagsService } from './mil-feature-flags.service';
import { RabbitMQService } from './rabbitmq.service';

@Module({
  imports: [PrismaModule, SecurityEventsModule],
  providers: [
    MilService,
    CryptoService,
    KeyringService,
    AuditLogService,
    MilAccessPolicyService,
    MilSecurityAuditWrapperService,
    ModelAccessTraceService,
    MilAuditEventService,
    MilFeatureFlagsService,
    RabbitMQService,
  ],
  exports: [
    MilService,
    MilSecurityAuditWrapperService,
    ModelAccessTraceService,
    MilAuditEventService,
    MilFeatureFlagsService,
    RabbitMQService,
  ],
})
export class MilModule {}
