import { Injectable } from '@nestjs/common';
import { Prisma, Status } from '@prisma/client';
import {
  buildMaintenanceTimeline,
  normalizeMaintenanceStatus,
  normalizePriorityScore,
  safeHoursBetween,
  toOptionalTimestamp,
} from './maintenance-data-contracts';

export interface MaintenanceModelFeatures {
  requestId: string;
  status: Status;
  lifecycleStage: ReturnType<typeof normalizeMaintenanceStatus>;
  priorityScore: number;
  requestAgeHours: number | null;
  timeToAcknowledgeHours: number | null;
  timeToCompleteHours: number | null;
  hasAssetLinked: boolean;
  hasAssignee: boolean;
  hasLeaseLinked: boolean;
  hasUnitLinked: boolean;
  hasPropertyLinked: boolean;
  hasSlaPolicy: boolean;
  noteCount: number;
  photoCount: number;
  historyCount: number;
  timelineEventCount: number;
  hasTimelineAnomaly: boolean;
  timestamps: {
    createdAt: number | null;
    acknowledgedAt: number | null;
    completedAt: number | null;
    dueAt: number | null;
    responseDueAt: number | null;
  };
}

export type MaintenanceFeatureRequest = Prisma.MaintenanceRequestGetPayload<{
  include: {
    history: true;
    notes: true;
    photos: true;
  };
}>;

@Injectable()
export class MaintenanceFeatureExtractionService {
  extractFeatures(request: MaintenanceFeatureRequest, now: Date = new Date()): MaintenanceModelFeatures {
    const timeline = buildMaintenanceTimeline(request);

    const requestAgeHours = safeHoursBetween(request.createdAt, now);
    const timeToAcknowledgeHours = safeHoursBetween(request.createdAt, request.acknowledgedAt);
    const timeToCompleteHours = safeHoursBetween(request.createdAt, request.completedAt);

    const hasTimelineAnomaly = timeline.some((event, index) => {
      if (index === 0) {
        return false;
      }
      return event.occurredAt.getTime() < timeline[index - 1].occurredAt.getTime();
    }) || (!!request.completedAt && request.completedAt.getTime() < request.createdAt.getTime());

    return {
      requestId: request.id,
      status: request.status,
      lifecycleStage: normalizeMaintenanceStatus(request.status),
      priorityScore: normalizePriorityScore(request.priority),
      requestAgeHours,
      timeToAcknowledgeHours,
      timeToCompleteHours,
      hasAssetLinked: request.assetId !== null,
      hasAssignee: request.assigneeId !== null,
      hasLeaseLinked: request.leaseId !== null,
      hasUnitLinked: request.unitId !== null,
      hasPropertyLinked: request.propertyId !== null,
      hasSlaPolicy: request.slaPolicyId !== null,
      noteCount: request.notes?.length ?? 0,
      photoCount: request.photos?.length ?? 0,
      historyCount: request.history?.length ?? 0,
      timelineEventCount: timeline.length,
      hasTimelineAnomaly,
      timestamps: {
        createdAt: toOptionalTimestamp(request.createdAt),
        acknowledgedAt: toOptionalTimestamp(request.acknowledgedAt),
        completedAt: toOptionalTimestamp(request.completedAt),
        dueAt: toOptionalTimestamp(request.dueAt),
        responseDueAt: toOptionalTimestamp(request.responseDueAt),
      },
    };
  }
}
