import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import BulkMessageComposer from './BulkMessageComposer';
import * as apiClient from '../../services/apiClient';

describe('BulkMessageComposer', () => {
  const mockApiFetch = vi.fn();

  beforeEach(() => {
    vi.spyOn(apiClient, 'apiFetch').mockImplementation(mockApiFetch);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('submits preview payload with selected filters and merge fields', async () => {
    mockApiFetch.mockResolvedValue({
      totalRecipients: 2,
      sample: [],
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

    // Wait for the preview to complete and check the payload
    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalled();
    }, { timeout: 3000 });
    
    const [endpoint, options] = mockApiFetch.mock.calls[0];
    expect(endpoint).toBe('/messaging/bulk/preview');
    expect(options.body.filters.roles).toEqual(expect.arrayContaining(['TENANT', 'PROPERTY_MANAGER']));
    expect(options.body.filters.propertyIds).toEqual([5, 6]);
    expect(options.body.templateId).toBe(1);
    
    // Wait for the preview text to appear
    await waitFor(() => {
      expect(screen.getByText(/will reach/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});
