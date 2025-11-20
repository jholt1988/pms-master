
import { Module } from '@nestjs/common';
import { RentalApplicationController } from './rental-application.controller';
import { RentalApplicationService } from './rental-application.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SecurityEventsModule } from '../security-events/security-events.module';

@Module({
  imports: [PrismaModule, SecurityEventsModule],
  controllers: [RentalApplicationController],
  providers: [RentalApplicationService],
})
export class RentalApplicationModule {}
