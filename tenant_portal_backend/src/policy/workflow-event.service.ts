import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export interface EmitWorkflowEventInput {
  propertyId: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
  idempotencyKey?: string;
}

@Injectable()
export class WorkflowEventService {
  constructor(private readonly prisma: PrismaService) {}

  async emit(input: EmitWorkflowEventInput) {
    const payload = input.idempotencyKey
      ? { ...input.payload, idempotencyKey: input.idempotencyKey }
      : input.payload;

    return this.prisma.policyWorkflowEvent.create({
      data: {
        propertyId: input.propertyId,
        aggregateType: input.aggregateType,
        aggregateId: input.aggregateId,
        eventType: input.eventType,
        payload: payload as Prisma.InputJsonValue,
      },
    });
  }

  async emitIfNotExists(input: EmitWorkflowEventInput) {
    if (!input.idempotencyKey) {
      return this.emit(input);
    }

    const existing = await this.prisma.policyWorkflowEvent.findFirst({
      where: {
        eventType: input.eventType,
        aggregateId: input.aggregateId,
        payload: {
          path: ['idempotencyKey'],
          equals: input.idempotencyKey,
        },
      },
    });

    if (existing) {
      return existing;
    }

    return this.emit(input);
  }
}
