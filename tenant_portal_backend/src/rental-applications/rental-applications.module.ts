import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt.guard';
import { OrgContextGuard } from '../common/org-context/org-context.guard';
import { RentalApplicationsController } from './rental-applications.controller';
import { RentalApplicationsService } from './rental-applications.service';

@Module({
  imports: [PrismaModule],
  controllers: [RentalApplicationsController],
  providers: [RentalApplicationsService, OptionalJwtAuthGuard, OrgContextGuard],
  exports: [RentalApplicationsService],
})
export class RentalApplicationsModule {}
