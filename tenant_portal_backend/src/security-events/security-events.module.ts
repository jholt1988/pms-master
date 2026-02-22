import { Module } from '@nestjs/common';
import { SecurityEventsService } from './security-events.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SecurityEventsController } from './security-events.controller';
import { OrgContextGuard } from '../common/org-context/org-context.guard';

@Module({
  imports: [PrismaModule],
  providers: [SecurityEventsService, OrgContextGuard],
  controllers: [SecurityEventsController],
  exports: [SecurityEventsService],
})
export class SecurityEventsModule {}
