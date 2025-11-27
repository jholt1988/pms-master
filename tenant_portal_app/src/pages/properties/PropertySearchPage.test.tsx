import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { PropertySearchPage } from './PropertySearchPage';
import {
  fetchPropertySearch,
  fetchSavedFilters,
} from '../../services/propertySearch';

vi.mock('@nextui-org/react', () => {
  const React = require('react');

  const Div = ({ children }: any) => <div>{children}</div>;
  const Button = ({ children, onPress, onClick, isDisabled, startContent }: any) => (
    <button disabled={isDisabled} onClick={onPress || onClick}>
      {startContent}
      {children}
    </button>
  );
  const Input = React.forwardRef((props: React.InputHTMLAttributes<HTMLInputElement>, ref: React.ForwardedRef<HTMLInputElement>) => (
    <input {...props} ref={ref} />
  ));

  type MockSelectProps = {
    children: React.ReactNode;
    selectedKeys?: Set<React.Key>;
    isDisabled?: boolean;
    onChange?: React.ChangeEventHandler<HTMLSelectElement>;
  };

  const Select = ({ children, selectedKeys, isDisabled, onChange }: MockSelectProps) => {
    const selectedValue = selectedKeys ? Array.from(selectedKeys)[0] : undefined;
    return (
      <select
        disabled={isDisabled}
        value={selectedValue as string | number | readonly string[] | undefined}
        onChange={onChange}
      >
        {children}
      </select>
    );
  };

  const Chip = ({ children, onClose, onClick, 'data-testid': dataTestId }: any) => (
    <div data-testid={dataTestId} onClick={onClick}>
      {children}
      {onClose && (
        <button aria-label="remove" onClick={() => onClose()}>
          ×
        </button>
      )}
    </div>
  );

  const SelectItem = ({ children, value }: any) => <option value={value}>{children}</option>;
  const Pagination = ({ total, page, onChange, isDisabled }: any) => (
    <button disabled={isDisabled} onClick={() => onChange?.(page)} data-total={total} data-page={page}>
      pagination
    </button>
  );
  const Spinner = () => <div>loading</div>;

  return {
    __esModule: true,
    Button,
    Card: Div,
    CardBody: Div,
    CardHeader: Div,
    Chip,
    Divider: () => <hr />,
    Input,
    Pagination,
    Select,
    SelectItem,
    Spinner,
  };
});

vi.mock('../../AuthContext', () => ({
  useAuth: () => ({ token: 'test-token', user: { role: 'PROPERTY_MANAGER' }, login: vi.fn(), logout: vi.fn() }),
}));

vi.mock('../../services/propertySearch', () => ({
  fetchPropertySearch: vi.fn(),
  fetchSavedFilters: vi.fn(),
  savePropertyFilter: vi.fn(),
  deletePropertyFilter: vi.fn(),
}));

const mockResponse = {
  items: [
    {
      id: 1,
      name: 'Test Property',
      address: '123 Main St',
      city: 'Austin',
      state: 'TX',
      propertyType: 'Apartment',
      minRent: 1500,
      maxRent: 2200,
      bedrooms: 2,
      bathrooms: 2,
      tags: ['pet-friendly'],
      marketingProfile: { availabilityStatus: 'AVAILABLE', marketingHeadline: 'Brand new units' },
      amenities: [],
      photos: [],
    },
  ],
  total: 1,
  page: 1,
  pageSize: 12,
  totalPages: 1,
  sortBy: 'newest',
  sortOrder: 'desc',
};

const mockFetchPropertySearch = fetchPropertySearch as jest.MockedFunction<typeof fetchPropertySearch>;
const mockFetchSavedFilters = fetchSavedFilters as jest.MockedFunction<typeof fetchSavedFilters>;

beforeEach(() => {
  mockFetchPropertySearch.mockResolvedValue(mockResponse);
  mockFetchSavedFilters.mockResolvedValue([]);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('PropertySearchPage', () => {
  it('renders properties returned by the backend', async () => {
    render(<PropertySearchPage />);

    expect(await screen.findByText('Test Property')).toBeInTheDocument();
    expect(mockFetchPropertySearch).toHaveBeenCalledWith(expect.objectContaining({ page: 1, sortBy: 'newest' }), 'test-token');
  });

  it('applies a property type filter and shows filter chips', async () => {
    render(<PropertySearchPage />);
    await screen.findByText('Test Property');

    const apartmentOptions = screen.getAllByTestId('property-type-option-Apartment');
    fireEvent.click(apartmentOptions[0]);
    fireEvent.click(screen.getAllByText('Apply filters')[0]);

    await waitFor(() => expect(mockFetchPropertySearch).toHaveBeenCalledTimes(2));
    expect(mockFetchPropertySearch.mock.calls[1][0].propertyTypes).toContain('Apartment');
    await waitFor(() => expect(screen.getByText(/Type: Apartment/)).toBeInTheDocument());
  });
});
