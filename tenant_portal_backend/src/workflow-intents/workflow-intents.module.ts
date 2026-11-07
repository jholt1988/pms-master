import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkflowIntentStore } from './workflow-intent.store';
import { WorkflowIntentsController } from './workflow-intents.controller';

@Module({
  imports: [PrismaModule],
  controllers: [WorkflowIntentsController],
  providers: [WorkflowIntentStore],
})
export class WorkflowIntentsModule {}
