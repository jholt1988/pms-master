import { MaintenancePriority, Status } from '@prisma/client';
import {
  buildMaintenanceTimeline,
  normalizeMaintenanceStatus,
  normalizePriorityScore,
  safeHoursBetween,
  toOptionalTimestamp,
} from './maintenance-data-contracts';

describe('maintenance-data-contracts', () => {
  it('normalizes lifecycle status correctly', () => {
    expect(normalizeMaintenanceStatus(Status.PENDING)).toBe('OPEN');
    expect(normalizeMaintenanceStatus(Status.IN_PROGRESS)).toBe('ACTIVE');
    expect(normalizeMaintenanceStatus(Status.COMPLETED)).toBe('RESOLVED');
    expect(normalizeMaintenanceStatus(undefined)).toBe('OPEN');
  });

  it('normalizes priority score correctly', () => {
    expect(normalizePriorityScore(MaintenancePriority.HIGH)).toBe(1);
    expect(normalizePriorityScore(MaintenancePriority.MEDIUM)).toBe(0.5);
    expect(normalizePriorityScore(MaintenancePriority.LOW)).toBe(0);
    expect(normalizePriorityScore(undefined)).toBe(0);
  });

  it('handles timestamp conversion and hour deltas safely', () => {
    const start = new Date('2026-01-01T00:00:00Z');
    const end = new Date('2026-01-01T06:00:00Z');

    expect(toOptionalTimestamp(start)).toBe(start.getTime());
    expect(toOptionalTimestamp('2026-01-01T00:00:00Z')).toBe(start.getTime());
    expect(toOptionalTimestamp(null)).toBeNull();

    expect(safeHoursBetween(start, end)).toBe(6);
    expect(safeHoursBetween(end, start)).toBeNull();
    expect(safeHoursBetween(start, null)).toBeNull();
  });

  it('builds a stable sorted timeline from request + relations', () => {
    const request: any = {
      id: 'req-1',
      createdAt: new Date('2026-01-01T00:00:00Z'),
      acknowledgedAt: new Date('2026-01-01T01:00:00Z'),
      completedAt: new Date('2026-01-01T04:00:00Z'),
      status: Status.COMPLETED,
      history: [
        {
          createdAt: new Date('2026-01-01T02:00:00Z'),
          fromAssigneeId: null,
          toAssigneeId: 12,
          fromStatus: Status.PENDING,
          toStatus: Status.IN_PROGRESS,
        },
        {
          createdAt: new Date('2026-01-01T03:00:00Z'),
          fromAssigneeId: 12,
          toAssigneeId: 12,
          fromStatus: Status.IN_PROGRESS,
          toStatus: Status.COMPLETED,
        },
      ],
      notes: [{ createdAt: new Date('2026-01-01T02:30:00Z') }],
      photos: [{ createdAt: new Date('2026-01-01T02:45:00Z') }],
    };

    const timeline = buildMaintenanceTimeline(request);

    expect(timeline.length).toBeGreaterThanOrEqual(6);
    expect(timeline[0].eventType).toBe('REQUEST_CREATED');
    expect(timeline.some((e) => e.eventType === 'ASSIGNED')).toBe(true);
    expect(timeline.some((e) => e.eventType === 'NOTE_ADDED')).toBe(true);
    expect(timeline.some((e) => e.eventType === 'PHOTO_ADDED')).toBe(true);

    for (let i = 1; i < timeline.length; i += 1) {
      expect(timeline[i].occurredAt.getTime()).toBeGreaterThanOrEqual(timeline[i - 1].occurredAt.getTime());
    }
  });
});
