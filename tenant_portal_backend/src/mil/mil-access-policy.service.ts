import { Injectable } from '@nestjs/common';

export interface MilAccessPolicyInput {
  operation: 'encrypt' | 'decrypt' | 'model_invoke';
  tenantId: string;
  orgId?: string;
  actorUserId?: string | null;
  actorRole?: string | null;
}

@Injectable()
export class MilAccessPolicyService {
  async assertAllowed(input: MilAccessPolicyInput): Promise<void> {
    // Phase 0 baseline policy:
    // - actor must exist for decrypt/model invocation
    // - tenantId must always be present
    if (!input.tenantId) {
      throw new Error('MIL policy violation: tenantId required');
    }

    if (input.operation === 'decrypt' && !input.actorUserId) {
      throw new Error('MIL policy violation: actor required for decrypt');
    }

    if (input.operation === 'model_invoke' && !input.actorUserId && !input.orgId) {
      throw new Error('MIL policy violation: model invocation requires actor or org scope');
    }
  }
}
