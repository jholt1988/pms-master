import { randomUUID } from 'crypto';

export type EventEnvelope<TPayload = unknown> = {
  id: string;
  type: string;
  version: 1;
  source: string;
  occurredAt: string;
  organizationId?: string;
  actorId?: string;
  correlationId?: string;
  idempotencyKey?: string;
  subject?: {
    type: string;
    id: string;
  };
  payload: TPayload;
};

export function createEventEnvelope<TPayload>(input: Omit<EventEnvelope<TPayload>, 'id' | 'version' | 'occurredAt'> & {
  id?: string;
  occurredAt?: string;
}): EventEnvelope<TPayload> {
  return {
    ...input,
    id: input.id ?? randomUUID(),
    version: 1,
    occurredAt: input.occurredAt ?? new Date().toISOString(),
  };
}
