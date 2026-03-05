import { MaintenancePriority, Status } from '@prisma/client';
import { MaintenanceFeatureExtractionService } from './maintenance-feature-extraction.service';

describe('MaintenanceFeatureExtractionService', () => {
  const service = new MaintenanceFeatureExtractionService();

  it('extracts stable maintenance feature payload', () => {
    const now = new Date('2026-01-01T08:00:00Z');
    const request: any = {
      id: 'req-1',
      status: Status.IN_PROGRESS,
      priority: MaintenancePriority.HIGH,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      acknowledgedAt: new Date('2026-01-01T01:00:00Z'),
      completedAt: null,
      dueAt: new Date('2026-01-02T00:00:00Z'),
      responseDueAt: null,
      assetId: 'asset-1',
      assigneeId: 99,
      leaseId: 'lease-1',
      unitId: 'unit-1',
      propertyId: 'property-1',
      slaPolicyId: 'sla-1',
      history: [
        {
          createdAt: new Date('2026-01-01T02:00:00Z'),
          fromAssigneeId: null,
          toAssigneeId: 99,
          fromStatus: Status.PENDING,
          toStatus: Status.IN_PROGRESS,
        },
      ],
      notes: [{ createdAt: new Date('2026-01-01T03:00:00Z') }],
      photos: [{ createdAt: new Date('2026-01-01T04:00:00Z') }],
    };

    const features = service.extractFeatures(request, now);

    expect(features.requestId).toBe('req-1');
    expect(features.lifecycleStage).toBe('ACTIVE');
    expect(features.priorityScore).toBe(1);
    expect(features.requestAgeHours).toBe(8);
    expect(features.timeToAcknowledgeHours).toBe(1);
    expect(features.timeToCompleteHours).toBeNull();
    expect(features.hasAssetLinked).toBe(true);
    expect(features.hasTimelineAnomaly).toBe(false);
    expect(features.noteCount).toBe(1);
    expect(features.photoCount).toBe(1);
    expect(features.historyCount).toBe(1);
    expect(features.timelineEventCount).toBeGreaterThanOrEqual(4);
    expect(features.timestamps.createdAt).toBe(request.createdAt.getTime());
  });

  it('flags chronology anomaly when completedAt predates createdAt', () => {
    const request: any = {
      id: 'req-2',
      status: Status.COMPLETED,
      priority: MaintenancePriority.LOW,
      createdAt: new Date('2026-01-01T05:00:00Z'),
      acknowledgedAt: null,
      completedAt: new Date('2026-01-01T04:00:00Z'),
      dueAt: null,
      responseDueAt: null,
      assetId: null,
      assigneeId: null,
      leaseId: null,
      unitId: null,
      propertyId: null,
      slaPolicyId: null,
      history: [],
      notes: [],
      photos: [],
    };

    const features = service.extractFeatures(request, new Date('2026-01-01T06:00:00Z'));

    expect(features.hasTimelineAnomaly).toBe(true);
    expect(features.timeToCompleteHours).toBeNull();
    expect(features.hasLeaseLinked).toBe(false);
    expect(features.lifecycleStage).toBe('RESOLVED');
  });
});
