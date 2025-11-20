import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BulkMessageComposer from './BulkMessageComposer';

describe('BulkMessageComposer', () => {
  const mockFetch = jest.fn();

  beforeEach(() => {
    mockFetch.mockReset();
    (global as any).fetch = mockFetch;
  });

  it('submits preview payload with selected filters and merge fields', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ totalRecipients: 2, sample: [] }),
      text: async () => '',
    });

    render(
      <BulkMessageComposer
        token="token"
        templates={[{ id: 1, name: 'Reminder', body: 'Hello {{username}}' }]}
      />,
    );

    await userEvent.selectOptions(screen.getByLabelText(/Template/i), ['1']);
    await userEvent.type(screen.getByLabelText(/Subject/i), 'Rent notice');
    await userEvent.type(screen.getByLabelText(/Property IDs/i), '5,6');
    await userEvent.click(screen.getByLabelText(/Property managers/i));
    await userEvent.click(screen.getByRole('button', { name: /Preview recipients/i }));

    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    const [, options] = mockFetch.mock.calls[0];
    const payload = JSON.parse((options as RequestInit).body as string);
    expect(payload.filters.roles).toEqual(expect.arrayContaining(['TENANT', 'PROPERTY_MANAGER']));
    expect(payload.filters.propertyIds).toEqual([5, 6]);
    expect(payload.templateId).toBe(1);
    await screen.findByText(/will reach/i);
  });
});
