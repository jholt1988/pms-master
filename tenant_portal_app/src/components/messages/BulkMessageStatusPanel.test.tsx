import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BulkMessageStatusPanel from './BulkMessageStatusPanel';

describe('BulkMessageStatusPanel', () => {
  const mockFetch = jest.fn();

  beforeEach(() => {
    mockFetch.mockReset();
    (global as any).fetch = mockFetch;
  });

  it('loads recipient statuses when selecting a batch', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { id: 1, status: 'SENT', user: { id: 2, username: 'tenant_user' }, renderedContent: 'Hi' },
        ],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ summary: { total: 1, sent: 1, failed: 0, pending: 0 }, failures: [] }),
      });

    render(
      <BulkMessageStatusPanel
        token="token"
        batches={[{
          id: 10,
          title: 'Announcement',
          status: 'QUEUED',
          createdAt: new Date().toISOString(),
          deliverySummary: { total: 0, sent: 0, failed: 0, pending: 0 },
        }]}
        onRefresh={jest.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /Announcement/i }));
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
    expect(mockFetch.mock.calls[0][0]).toContain('/api/messaging/bulk/10/recipients');
    expect(mockFetch.mock.calls[1][0]).toContain('/api/messaging/bulk/10/report');
  });
});
