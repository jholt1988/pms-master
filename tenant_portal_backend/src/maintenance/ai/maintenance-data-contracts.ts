import { MaintenancePriority, Prisma, Status } from '@prisma/client';

export type MaintenanceLifecycleStage = 'OPEN' | 'ACTIVE' | 'RESOLVED';

export type MaintenanceTimelineEventType =
  | 'REQUEST_CREATED'
  | 'STATUS_CHANGED'
  | 'ASSIGNED'
  | 'ACKNOWLEDGED'
  | 'COMPLETED'
  | 'NOTE_ADDED'
  | 'PHOTO_ADDED';

export interface MaintenanceTimelineEvent {
  eventType: MaintenanceTimelineEventType;
  occurredAt: Date;
  status?: Status;
  fromStatus?: Status | null;
  toStatus?: Status | null;
  fromAssigneeId?: number | null;
  toAssigneeId?: number | null;
  source: 'request' | 'history' | 'note' | 'photo';
}

export type MaintenanceRequestWithRelations = Prisma.MaintenanceRequestGetPayload<{
  include: {
    history: true;
    notes: true;
    photos: true;
  };
}>;

export function normalizeMaintenanceStatus(status: Status | null | undefined): MaintenanceLifecycleStage {
  switch (status) {
    case Status.IN_PROGRESS:
      return 'ACTIVE';
    case Status.COMPLETED:
      return 'RESOLVED';
    case Status.PENDING:
    default:
      return 'OPEN';
  }
}

export function normalizePriorityScore(priority: MaintenancePriority | null | undefined): number {
  switch (priority) {
    case MaintenancePriority.HIGH:
      return 1;
    case MaintenancePriority.MEDIUM:
      return 0.5;
    case MaintenancePriority.LOW:
    default:
      return 0;
  }
}

export function toOptionalTimestamp(value?: Date | string | null): number | null {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  const time = date.getTime();
  return Number.isFinite(time) ? time : null;
}

export function safeHoursBetween(start?: Date | string | null, end?: Date | string | null): number | null {
  const startTs = toOptionalTimestamp(start);
  const endTs = toOptionalTimestamp(end);
  if (startTs === null || endTs === null) {
    return null;
  }
  if (endTs < startTs) {
    return null;
  }
  return (endTs - startTs) / (1000 * 60 * 60);
}

export function buildMaintenanceTimeline(request: MaintenanceRequestWithRelations): MaintenanceTimelineEvent[] {
  const events: MaintenanceTimelineEvent[] = [];

  events.push({
    eventType: 'REQUEST_CREATED',
    occurredAt: request.createdAt,
    status: request.status,
    source: 'request',
  });

  if (request.acknowledgedAt) {
    events.push({
      eventType: 'ACKNOWLEDGED',
      occurredAt: request.acknowledgedAt,
      status: Status.IN_PROGRESS,
      source: 'request',
    });
  }

  if (request.completedAt) {
    events.push({
      eventType: 'COMPLETED',
      occurredAt: request.completedAt,
      status: Status.COMPLETED,
      source: 'request',
    });
  }

  for (const item of request.history ?? []) {
    const isAssignment = item.fromAssigneeId !== item.toAssigneeId;
    const isStatusChange = item.fromStatus !== item.toStatus;

    if (isAssignment) {
      events.push({
        eventType: 'ASSIGNED',
        occurredAt: item.createdAt,
        fromAssigneeId: item.fromAssigneeId,
        toAssigneeId: item.toAssigneeId,
        fromStatus: item.fromStatus,
        toStatus: item.toStatus,
        source: 'history',
      });
    }

    if (isStatusChange) {
      const eventType = item.toStatus === Status.COMPLETED ? 'COMPLETED' : 'STATUS_CHANGED';
      events.push({
        eventType,
        occurredAt: item.createdAt,
        status: item.toStatus ?? undefined,
        fromStatus: item.fromStatus,
        toStatus: item.toStatus,
        fromAssigneeId: item.fromAssigneeId,
        toAssigneeId: item.toAssigneeId,
        source: 'history',
      });
    }
  }

  for (const note of request.notes ?? []) {
    events.push({
      eventType: 'NOTE_ADDED',
      occurredAt: note.createdAt,
      source: 'note',
    });
  }

  for (const photo of request.photos ?? []) {
    events.push({
      eventType: 'PHOTO_ADDED',
      occurredAt: photo.createdAt,
      source: 'photo',
    });
  }

  return events
    .filter((event) => Number.isFinite(event.occurredAt?.getTime?.() ?? Number.NaN))
    .sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
}
