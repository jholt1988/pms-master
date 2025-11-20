import { Module } from '@nestjs/common';
import { SecurityEventsService } from './security-events.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SecurityEventsController } from './security-events.controller';

@Module({
  imports: [PrismaModule],
  providers: [SecurityEventsService],
  controllers: [SecurityEventsController],
  exports: [SecurityEventsService],
})
export class SecurityEventsModule {}
