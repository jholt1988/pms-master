import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import TenantInspectionDetailPage from './TenantInspectionDetailPage';
import { apiFetch } from '../../../../services/apiClient';

vi.mock('../../../../AuthContext', () => ({
  useAuth: () => ({ token: 'fake-token' }),
}));

vi.mock('../../../../services/apiClient', () => ({
  apiFetch: vi.fn(),
}));

const inspectionResponse = {
  id: 101,
  type: 'MOVE_IN',
  status: 'IN_PROGRESS',
  unitId: 55,
  rooms: [
    {
      id: 900,
      name: 'Living Room',
      roomType: 'LIVING_ROOM',
      checklistItems: [
        {
          id: 501,
          itemName: 'Wall paint',
          requiresAction: false,
          notes: '',
          condition: 'GOOD',
          photos: [],
        },
      ],
    },
  ],
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/tenant/inspections/101']}>
      <Routes>
        <Route path="/tenant/inspections/:id" element={<TenantInspectionDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('TenantInspectionDetailPage draft recovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('restores checklist and photo drafts from localStorage and shows restore notice', async () => {
    localStorage.setItem(
      'tenant-inspection-draft:101',
      JSON.stringify({
        draftByItemId: {
          501: {
            requiresAction: true,
            notes: 'Scratch near switch panel',
            condition: 'POOR',
          },
        },
        photoDraftByItemId: {
          501: {
            url: 'https://cdn.example.com/photo.jpg',
            caption: 'North wall damage',
          },
        },
      }),
    );

    vi.mocked(apiFetch)
      .mockResolvedValueOnce(inspectionResponse)
      .mockResolvedValueOnce([]);

    renderPage();

    await screen.findByText('Restored draft (1 checklist item, 1 photo entry).');
    expect(screen.getByDisplayValue('Scratch near switch panel')).toBeInTheDocument();
    expect(screen.getByDisplayValue('https://cdn.example.com/photo.jpg')).toBeInTheDocument();
    expect(screen.getByDisplayValue('North wall damage')).toBeInTheDocument();
  });

  it('submits restored checklist values when saving a room', async () => {
    localStorage.setItem(
      'tenant-inspection-draft:101',
      JSON.stringify({
        draftByItemId: {
          501: {
            requiresAction: true,
            notes: 'Restored note to submit',
            condition: 'DAMAGED',
          },
        },
      }),
    );

    vi.mocked(apiFetch)
      .mockResolvedValueOnce(inspectionResponse)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce(inspectionResponse)
      .mockResolvedValueOnce([]);

    renderPage();
    await screen.findByText('Living Room');

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(vi.mocked(apiFetch)).toHaveBeenCalledWith('/inspections/rooms/900/items', expect.objectContaining({
        method: 'PATCH',
        token: 'fake-token',
        body: [
          {
            itemId: 501,
            requiresAction: true,
            condition: 'DAMAGED',
            notes: 'Restored note to submit',
          },
        ],
      }));
    });
  });
});
