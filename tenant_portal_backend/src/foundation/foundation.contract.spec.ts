import { ConflictException } from '@nestjs/common';
import { apiFail, apiOk } from '../common/api-envelope';
import { createEventEnvelope } from '../common/events/event-envelope';
import { IdempotencyService } from '../common/idempotency/idempotency.service';

describe('Phase 1 foundation contracts', () => {
  it('creates canonical success and error envelopes', () => {
    expect(apiOk({ ready: true }, { requestId: 'req-1' })).toEqual({
      data: { ready: true },
      meta: { requestId: 'req-1' },
      errors: [],
    });

    expect(apiFail([{ code: 'TEST', message: 'failed' }])).toEqual({
      data: null,
      meta: {},
      errors: [{ code: 'TEST', message: 'failed' }],
    });
  });

  it('creates versioned event envelopes with required metadata', () => {
    const event = createEventEnvelope({
      type: 'workflow.started',
      source: 'test',
      organizationId: 'org-1',
      subject: { type: 'workflow', id: 'wf-1' },
      payload: { workflowId: 'wf-1' },
    });

    expect(event.version).toBe(1);
    expect(event.id).toBeTruthy();
    expect(event.occurredAt).toBeTruthy();
    expect(event.payload).toEqual({ workflowId: 'wf-1' });
  });

  it('reserves, completes, and rejects duplicate in-flight idempotency keys', async () => {
    const prisma = {
      idempotencyRecord: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
    };
    const service = new IdempotencyService(prisma as any);

    prisma.idempotencyRecord.findUnique.mockResolvedValueOnce(null);
    prisma.idempotencyRecord.upsert.mockResolvedValueOnce({
      key: 'key-1',
      scope: 'payments',
      status: 'RESERVED',
      firstSeenAt: new Date(),
    });
    await expect(service.reserve('payments', 'key-1')).resolves.toMatchObject({ status: 'RESERVED' });

    prisma.idempotencyRecord.findUnique.mockResolvedValueOnce({
      key: 'key-1',
      scope: 'payments',
      status: 'RESERVED',
      firstSeenAt: new Date(),
    });
    await expect(service.reserve('payments', 'key-1')).rejects.toThrow(ConflictException);

    prisma.idempotencyRecord.upsert.mockResolvedValueOnce({
      key: 'key-1',
      scope: 'payments',
      status: 'COMPLETED',
      firstSeenAt: new Date(),
      completedAt: new Date(),
      result: { id: 1 },
    });
    await expect(service.complete('payments', 'key-1', { id: 1 })).resolves.toMatchObject({ status: 'COMPLETED' });
  });
});
