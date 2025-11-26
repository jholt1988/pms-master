import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { WorkflowEngineService } from './workflow-engine.service';

interface ScheduledWorkflow {
  id: string;
  workflowId: string;
  schedule: string; // Cron expression
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  input?: Record<string, any>;
}

@Injectable()
export class WorkflowSchedulerService {
  private readonly logger = new Logger(WorkflowSchedulerService.name);
  private scheduledWorkflows: Map<string, ScheduledWorkflow> = new Map();

  constructor(
    private readonly prisma: PrismaService,
    private readonly workflowEngine: WorkflowEngineService,
  ) {
    this.registerDefaultSchedules();
  }

  /**
   * Schedule a workflow to run on a cron schedule
   */
  scheduleWorkflow(
    workflowId: string,
    schedule: string,
    input?: Record<string, any>,
  ): string {
    const scheduleId = `sched-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const scheduled: ScheduledWorkflow = {
      id: scheduleId,
      workflowId,
      schedule,
      enabled: true,
      input: input || {},
    };

    this.scheduledWorkflows.set(scheduleId, scheduled);
    this.logger.log(`Scheduled workflow ${workflowId} with schedule ${schedule}`);

    return scheduleId;
  }

  /**
   * Unschedule a workflow
   */
  unscheduleWorkflow(scheduleId: string): void {
    const scheduled = this.scheduledWorkflows.get(scheduleId);
    if (scheduled) {
      scheduled.enabled = false;
      this.scheduledWorkflows.delete(scheduleId);
      this.logger.log(`Unscheduled workflow ${scheduleId}`);
    }
  }

  /**
   * Run scheduled workflows (called by cron)
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async runScheduledWorkflows(): Promise<void> {
    const now = new Date();

    for (const [scheduleId, scheduled] of this.scheduledWorkflows.entries()) {
      if (!scheduled.enabled) {
        continue;
      }

      // Check if it's time to run (simplified - in production, use a proper cron parser)
      if (this.shouldRun(scheduled, now)) {
        try {
          this.logger.log(`Running scheduled workflow: ${scheduled.workflowId}`);
          
          await this.workflowEngine.executeWorkflow(
            scheduled.workflowId,
            scheduled.input || {},
          );

          scheduled.lastRun = now;
          scheduled.nextRun = this.calculateNextRun(scheduled.schedule, now);
        } catch (error) {
          this.logger.error(
            `Error running scheduled workflow ${scheduled.workflowId}`,
            error,
          );
        }
      }
    }
  }

  /**
   * Check if a scheduled workflow should run
   */
  private shouldRun(scheduled: ScheduledWorkflow, now: Date): boolean {
    // Simplified check - in production, use a proper cron parser
    // For now, check if last run was more than the interval ago
    if (!scheduled.lastRun) {
      return true;
    }

    // Parse schedule (simplified - only handles simple intervals)
    const schedule = scheduled.schedule;

    if (schedule === CronExpression.EVERY_MINUTE) {
      return now.getTime() - scheduled.lastRun.getTime() >= 60000;
    } else if (schedule === CronExpression.EVERY_HOUR) {
      return now.getTime() - scheduled.lastRun.getTime() >= 3600000;
    } else if (schedule === CronExpression.EVERY_DAY_AT_MIDNIGHT) {
      const lastRunDate = new Date(scheduled.lastRun);
      lastRunDate.setHours(0, 0, 0, 0);
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);
      return today.getTime() > lastRunDate.getTime();
    }

    return false;
  }

  /**
   * Calculate next run time
   */
  private calculateNextRun(schedule: string, now: Date): Date {
    const nextRun = new Date(now);

    if (schedule === CronExpression.EVERY_MINUTE) {
      nextRun.setMinutes(nextRun.getMinutes() + 1);
    } else if (schedule === CronExpression.EVERY_HOUR) {
      nextRun.setHours(nextRun.getHours() + 1);
    } else if (schedule === CronExpression.EVERY_DAY_AT_MIDNIGHT) {
      nextRun.setDate(nextRun.getDate() + 1);
      nextRun.setHours(0, 0, 0, 0);
    }

    return nextRun;
  }

  /**
   * Register default scheduled workflows
   */
  private registerDefaultSchedules(): void {
    // Schedule lease renewal checks (daily at 8 AM)
    this.scheduleWorkflow('lease-renewal-check', CronExpression.EVERY_DAY_AT_8AM, {
      checkDaysAhead: 90,
    });

    // Schedule maintenance SLA monitoring (hourly)
    this.scheduleWorkflow('maintenance-sla-monitor', CronExpression.EVERY_HOUR, {});

    // Schedule payment processing (daily at 2 AM)
    this.scheduleWorkflow('payment-processing', '0 2 * * *', {});
  }

  /**
   * Trigger a workflow manually
   */
  async triggerWorkflow(
    workflowId: string,
    input?: Record<string, any>,
    userId?: number,
  ): Promise<any> {
    return await this.workflowEngine.executeWorkflow(workflowId, input || {}, userId);
  }

  /**
   * Get scheduled workflows
   */
  getScheduledWorkflows(): ScheduledWorkflow[] {
    return Array.from(this.scheduledWorkflows.values());
  }
}

