// apps/api/src/swarm/property-ops-swarm.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SWARM_THRESHOLDS } from './swarm.config';

@Injectable()
export class PropertyOpsSwarmService {
  private readonly logger = new Logger(PropertyOpsSwarmService.name);

  constructor(private eventEmitter: EventEmitter2) {}

  @OnEvent('inspection.estimated')
  async evaluateInspection(payload: any) {
    this.logger.log(`Swarm evaluating inspection: ${payload.inspectionId}`);

    const shouldHalt = 
      payload.totalEstimatedCost > SWARM_THRESHOLDS.MAX_REPAIR_ESTIMATE || 
      payload.priority === 'CRITICAL';

    if (shouldHalt) {
      this.triggerHalt(
        'inspection.estimated', 
        payload.inspectionId, 
        `High repair cost: $${payload.totalEstimatedCost}`
      );
    }
  }

  @OnEvent('application.scored')
  async evaluateApplication(payload: any) {
    if (payload.score < SWARM_THRESHOLDS.MIN_PRESCREEN_SCORE) {
      this.triggerHalt(
        'application.scored', 
        payload.applicationId, 
        `Low AI Prescreen Score: ${payload.score}%`
      );
    }
  }

  private triggerHalt(source: string, referenceId: string, reason: string) {
    this.logger.warn(`SWARM HALT TRIGGERED: ${reason}`);
    
    // The "Nerve" firing back to stop the automated workflow
    this.eventEmitter.emit('orchestrator.halt', {
      source,
      referenceId,
      reason,
      timestamp: new Date(),
      requiresRole: 'SENIOR_ADJUSTER' // Leveraging your background logic
    });
  }
}