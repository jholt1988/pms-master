import { ApprovalTaskStatus, PolicyRuleApprovalStatus, Role } from '@prisma/client';
import { PolicyApprovalService } from './policy-approval.service';

describe('PolicyApprovalService', () => {
  it('creates a decision record when an approval task is rejected', async () => {
    const task = {
      id: '7b0fbdb1-e9f8-41f6-9fbb-6175ad0035b1',
      status: ApprovalTaskStatus.PENDING,
      title: 'Approve delinquency follow-up',
      summary: 'Tenant message requires review.',
      propertyId: '0c7b5d93-f79e-4987-956d-a2876b6418f4',
      leaseId: '3d59b842-3f37-4571-9e14-17450ade2470',
      workOrderId: null,
      actions: {
        evaluationId: 'eval-1',
        workflowEventId: 'workflow-event-1',
        ruleName: 'Kansas notice gate',
        actions: [],
      },
    };

    const prisma = {
      approvalTask: {
        findFirst: jest.fn().mockResolvedValue(task),
        update: jest.fn().mockResolvedValue({ ...task, status: ApprovalTaskStatus.REJECTED }),
      },
      policyRuleApproval: {
        create: jest.fn().mockResolvedValue({ id: 'approval-1' }),
      },
    };
    const auditLogService = { record: jest.fn().mockResolvedValue(undefined) };
    const actionDispatcher = { dispatch: jest.fn() };
    const stateTransitionApplier = { applyTransitions: jest.fn() };
    const decisionRecordService = { create: jest.fn().mockResolvedValue({ id: 'decision-1' }) };

    const service = new PolicyApprovalService(
      prisma as any,
      auditLogService as any,
      actionDispatcher as any,
      stateTransitionApplier as any,
      decisionRecordService as any,
    );

    await service.decideTask(
      task.id,
      { decision: 'REJECT', reason: 'Insufficient evidence' },
      { userId: '9f77885c-7784-4f22-9ba5-a7516c18c4d0', role: Role.PROPERTY_MANAGER },
      'a887ef54-1a60-44e5-849a-2f6d76695b73',
    );

    expect(prisma.policyRuleApproval.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: PolicyRuleApprovalStatus.REJECTED,
        reason: 'Insufficient evidence',
      }),
    });
    expect(decisionRecordService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        approvalTaskId: task.id,
        entityType: 'ApprovalTask',
        entityId: task.id,
        result: 'REJECT',
        rationale: expect.arrayContaining(['Operator reason: Insufficient evidence']),
      }),
    );
    expect(actionDispatcher.dispatch).not.toHaveBeenCalled();
  });
});
