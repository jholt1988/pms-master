import { describe, it, expect } from 'vitest';
import { sortMaintenanceRequestsNewestFirst } from './MaintenancePage';

describe('sortMaintenanceRequestsNewestFirst', () => {
  it('sorts requests by createdAt in descending order (newest first)', () => {
    const sorted = sortMaintenanceRequestsNewestFirst([
      {
        id: 1,
        title: 'Old request',
        description: 'desc',
        status: 'PENDING',
        priority: 'LOW',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 2,
        title: 'Newest request',
        description: 'desc',
        status: 'PENDING',
        priority: 'HIGH',
        createdAt: '2026-02-01T00:00:00.000Z',
      },
      {
        id: 3,
        title: 'Middle request',
        description: 'desc',
        status: 'PENDING',
        priority: 'MEDIUM',
        createdAt: '2026-01-15T00:00:00.000Z',
      },
    ]);

    expect(sorted.map((req) => req.id)).toEqual([2, 3, 1]);
  });

  it('handles invalid timestamps by pushing them to the end', () => {
    const sorted = sortMaintenanceRequestsNewestFirst([
      {
        id: 1,
        title: 'Bad date',
        description: 'desc',
        status: 'PENDING',
        priority: 'LOW',
        createdAt: 'not-a-date',
      },
      {
        id: 2,
        title: 'Valid date',
        description: 'desc',
        status: 'PENDING',
        priority: 'HIGH',
        createdAt: '2026-02-01T00:00:00.000Z',
      },
    ]);

    expect(sorted.map((req) => req.id)).toEqual([2, 1]);
  });
});
