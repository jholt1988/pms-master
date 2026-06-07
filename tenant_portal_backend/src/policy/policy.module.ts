import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PolicyService } from './policy.service';
import { PolicyRunnerService } from './policy-runner.service';
import { WorkflowEventService } from './workflow-event.service';
import { WorkflowEventProcessor } from './workflow-event-processor.service';
import { RuleActionDispatcher } from './rule-action-dispatcher.service';
import { PolicyApprovalService } from './policy-approval.service';
import { PolicyController } from './policy.controller';
import { StateTransitionApplierService } from './state-transition-applier.service';
import { DecisionsModule } from '../decisions/decisions.module';

@Module({
  imports: [PrismaModule, DecisionsModule],
  controllers: [PolicyController],
  providers: [
    PolicyService,
    PolicyRunnerService,
    WorkflowEventService,
    WorkflowEventProcessor,
    RuleActionDispatcher,
    PolicyApprovalService,
    StateTransitionApplierService,
  ],
  exports: [PolicyService, PolicyRunnerService, WorkflowEventService, WorkflowEventProcessor, RuleActionDispatcher, PolicyApprovalService, StateTransitionApplierService],
})
export class PolicyModule {}
