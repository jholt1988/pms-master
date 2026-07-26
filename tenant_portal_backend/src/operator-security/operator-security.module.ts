import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SecurityEventsModule } from '../security-events/security-events.module';
import { OperatorSecurityController } from './operator-security.controller';
import { OperatorSecurityService } from './operator-security.service';

@Module({
  imports: [PrismaModule, SecurityEventsModule],
  controllers: [OperatorSecurityController],
  providers: [OperatorSecurityService],
  exports: [OperatorSecurityService],
})
export class OperatorSecurityModule {}
