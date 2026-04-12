import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { LeaseAbstractionController } from './lease-abstraction.controller';
import { LeaseAbstractionService } from './lease-abstraction.service';
import { OrgContextGuard } from '../common/org-context/org-context.guard';

@Module({
  imports: [PrismaModule],
  controllers: [LeaseAbstractionController],
  providers: [LeaseAbstractionService, OrgContextGuard],
  exports: [LeaseAbstractionService],
})
export class LeaseAbstractionModule {}
