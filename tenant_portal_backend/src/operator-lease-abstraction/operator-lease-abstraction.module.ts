import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { LeaseAbstractionModule } from '../lease-abstraction/lease-abstraction.module';
import { OperatorLeaseAbstractionController } from './operator-lease-abstraction.controller';
import { OperatorLeaseAbstractionService } from './operator-lease-abstraction.service';

@Module({
  imports: [PrismaModule, LeaseAbstractionModule],
  controllers: [OperatorLeaseAbstractionController],
  providers: [OperatorLeaseAbstractionService],
  exports: [OperatorLeaseAbstractionService],
})
export class OperatorLeaseAbstractionModule {}
