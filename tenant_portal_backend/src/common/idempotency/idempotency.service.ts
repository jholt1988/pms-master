import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export type IdempotencyRecord<T = unknown> = {
  key: string;
  scope: string;
  status: 'RESERVED' | 'COMPLETED' | 'FAILED';
  firstSeenAt: Date;
  completedAt?: Date;
  result?: T;
  error?: string;
};

@Injectable()
export class IdempotencyService {
  constructor(private readonly prisma: PrismaService) {}

  async reserve(scope: string, key: string, organizationId?: string): Promise<IdempotencyRecord> {
    const existing = await this.prisma.idempotencyRecord.findUnique({
      where: { scope_key: { scope, key } },
    });

    if (existing?.status === 'COMPLETED') {
      return this.toRecord(existing);
    }

    if (existing?.status === 'RESERVED') {
      throw new ConflictException('Duplicate operation is already in progress');
    }

    const record = await this.prisma.idempotencyRecord.upsert({
      where: { scope_key: { scope, key } },
      create: {
        scope,
        key,
        organizationId,
        status: 'RESERVED',
      },
      update: {
        organizationId,
        status: 'RESERVED',
        error: null,
        result: undefined,
        completedAt: null,
      },
    });

    return this.toRecord(record);
  }

  async complete<T>(scope: string, key: string, result: T): Promise<IdempotencyRecord<T>> {
    const completed = await this.prisma.idempotencyRecord.upsert({
      where: { scope_key: { scope, key } },
      create: {
        key,
        scope,
        status: 'COMPLETED',
        completedAt: new Date(),
        result: result as any,
      },
      update: {
        status: 'COMPLETED',
        completedAt: new Date(),
        result: result as any,
        error: null,
      },
    });
    return this.toRecord(completed) as IdempotencyRecord<T>;
  }

  async fail(scope: string, key: string, error: string): Promise<IdempotencyRecord> {
    const failed = await this.prisma.idempotencyRecord.upsert({
      where: { scope_key: { scope, key } },
      create: {
        key,
        scope,
        status: 'FAILED',
        completedAt: new Date(),
        error,
      },
      update: {
        status: 'FAILED',
        completedAt: new Date(),
        error,
      },
    });
    return this.toRecord(failed);
  }

  async get(scope: string, key: string) {
    const record = await this.prisma.idempotencyRecord.findUnique({
      where: { scope_key: { scope, key } },
    });
    return record ? this.toRecord(record) : undefined;
  }

  private toRecord(record: any): IdempotencyRecord {
    return {
      key: record.key,
      scope: record.scope,
      status: record.status,
      firstSeenAt: record.firstSeenAt,
      completedAt: record.completedAt ?? undefined,
      result: record.result ?? undefined,
      error: record.error ?? undefined,
    };
  }
}
