
import { Module } from '@nestjs/common';
import { LeaseController } from './lease.controller';
import { LeaseService } from './lease.service';
import { PrismaModule } from '../prisma/prisma.module';
import { LeaseTasksService } from './lease.tasks';

@Module({
  imports: [PrismaModule],
  controllers: [LeaseController],
  providers: [LeaseService, LeaseTasksService],
})
export class LeaseModule {}
