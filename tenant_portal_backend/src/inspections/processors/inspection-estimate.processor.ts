// apps/api/src/inspections/processors/inspection-estimate.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { HttpService } from '@nestjs/axios';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { firstValueFrom } from 'rxjs';

@Processor('inspection-estimation')
export class InspectionEstimateProcessor extends WorkerHost {
  constructor(
    private readonly httpService: HttpService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    super();
  }

  async process(job: Job<{ inspectionId: string; rawData: any }>) {
    if (job.name !== 'calculate-estimate') {
      return;
    }

    const { inspectionId, rawData } = job.data;

    try {
      // 1. Call the Brain (Python Actuarial Service)
      const { data } = await firstValueFrom(
        this.httpService.post(`http://ml-service:8000/actuarial/estimate`, {
          inspectionId,
          data: rawData,
        })
      );

      // 2. Emit the Synapse Event
      // This is the "Nerve" firing to the FeedAggregator
      this.eventEmitter.emit('inspection.estimated', {
        ...data,
        timestamp: new Date(),
      });

      return data;
    } catch (error) {
      // Fallback: If Python service is down, mark for manual review
      this.eventEmitter.emit('orchestrator.halt', {
        source: 'InspectionEstimateProcessor',
        reason: 'Actuarial Service Unreachable',
        inspectionId,
      });
      throw error; // Trigger BullMQ retry with backoff
    }
  }
}
