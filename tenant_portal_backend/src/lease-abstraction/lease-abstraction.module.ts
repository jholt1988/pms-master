import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { LeaseAbstractionController } from './lease-abstraction.controller';
import { LeaseAbstractionService } from './lease-abstraction.service';

@Module({
  imports: [PrismaModule],
  controllers: [LeaseAbstractionController],
  providers: [LeaseAbstractionService],
  exports: [LeaseAbstractionService],
})
export class LeaseAbstractionModule {}
