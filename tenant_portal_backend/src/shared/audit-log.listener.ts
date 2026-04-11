// src/audit/audit-log.listener.ts
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class AuditLogListener {
  constructor(@InjectQueue('audit-queue') private auditQueue: Queue) {}

  @OnEvent('feed.action.executed')
  async handleFeedActionExecuted(payload: any) {
    await this.auditQueue.add('log-action', payload);
  }
}