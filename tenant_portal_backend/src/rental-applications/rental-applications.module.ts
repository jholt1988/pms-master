import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt.guard';
import { RentalApplicationsController } from './rental-applications.controller';
import { RentalApplicationsService } from './rental-applications.service';

@Module({
  imports: [PrismaModule],
  controllers: [RentalApplicationsController],
  providers: [RentalApplicationsService, OptionalJwtAuthGuard],
  exports: [RentalApplicationsService],
})
export class RentalApplicationsModule {}
