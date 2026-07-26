import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MessagingModule } from '../messaging/messaging.module';
import { AuditLogModule } from '../shared/audit-log.module';
import { OperatorMessagingController } from './operator-messaging.controller';
import { OperatorMessagingService } from './operator-messaging.service';

@Module({
  imports: [PrismaModule, MessagingModule, AuditLogModule],
  controllers: [OperatorMessagingController],
  providers: [OperatorMessagingService],
  exports: [OperatorMessagingService],
})
export class OperatorMessagingModule {}
