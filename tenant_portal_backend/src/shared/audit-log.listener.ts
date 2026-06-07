// src/audit/audit-log.listener.ts
import { Injectable, Optional } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class AuditLogListener {
  constructor(
    @Optional()
    @InjectQueue('audit-queue')
    private auditQueue?: Queue,
  ) {}

  @OnEvent('feed.action.executed')
  async handleFeedActionExecuted(payload: any) {
    if (!this.auditQueue) return;
    await this.auditQueue.add('log-action', payload);
  }
}
