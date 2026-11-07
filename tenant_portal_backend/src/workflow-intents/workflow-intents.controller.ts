import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { listWorkflowIntents } from './workflow-intent.query';
import { WorkflowIntentStore } from './workflow-intent.store';

@Controller('workflow-intents')
@UseGuards(AuthGuard('jwt'))
export class WorkflowIntentsController {
  constructor(private readonly store: WorkflowIntentStore) {}

  @Get()
  list(@Query('tenantId') tenantId?: string, @Query('limit') limit?: string) {
    return listWorkflowIntents(this.store, { tenantId, limit });
  }
}
