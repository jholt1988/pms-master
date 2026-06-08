import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { OperatorWorkflowsController } from './operator-workflows.controller';
import { OperatorWorkflowsService } from './operator-workflows.service';

@Module({
  imports: [PrismaModule],
  controllers: [OperatorWorkflowsController],
  providers: [OperatorWorkflowsService],
  exports: [OperatorWorkflowsService],
})
export class OperatorWorkflowsModule {}
