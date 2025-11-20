export type SortOption = 'newest' | 'price' | 'bedrooms' | 'bathrooms';

export interface PropertySearchFilters {
  searchTerm?: string;
  cities?: string[];
  states?: string[];
  propertyTypes?: string[];
  availabilityStatuses?: string[];
  amenityKeys?: string[];
  tags?: string[];
  minRent?: number;
  maxRent?: number;
  bedroomsMin?: number;
  bedroomsMax?: number;
  bathroomsMin?: number;
  bathroomsMax?: number;
  page?: number;
  pageSize?: number;
  sortBy?: SortOption;
  sortOrder?: 'asc' | 'desc';
}

export interface PropertyAmenitySummary {
  id: number;
  amenityId?: number;
  isFeatured?: boolean;
  value?: string;
  amenity?: {
    key: string;
    label: string;
    description?: string;
  };
}

export interface PropertyPhotoSummary {
  id: number;
  url: string;
  caption?: string;
  isPrimary?: boolean;
}

export interface PropertyMarketingSummary {
  minRent?: number;
  maxRent?: number;
  availabilityStatus?: string;
  marketingHeadline?: string;
  marketingDescription?: string;
}

export interface PropertySearchResult {
  id: number;
  name: string;
  address: string;
  city?: string;
  state?: string;
  zipCode?: string;
  propertyType?: string;
  minRent?: number;
  maxRent?: number;
  bedrooms?: number;
  bathrooms?: number;
  tags?: string[];
  marketingProfile?: PropertyMarketingSummary | null;
  amenities?: PropertyAmenitySummary[];
  photos?: PropertyPhotoSummary[];
}

export interface PropertySearchResponse {
  items: PropertySearchResult[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  sortBy: string;
  sortOrder: string;
}

export interface SavedPropertyFilter {
  id: number;
  name: string;
  description?: string | null;
  filters: PropertySearchFilters;
  sortBy?: string | null;
  sortOrder?: string | null;
}

export interface SaveFilterPayload {
  name: string;
  description?: string;
  filters: PropertySearchFilters;
}

const API_BASE = 'http://localhost:3000/api/properties';

const buildQueryString = (filters: PropertySearchFilters) => {
  const params = new URLSearchParams();
  const setArrayParam = (key: string, values?: string[]) => {
    if (values && values.length) {
      params.set(key, values.join(','));
    }
  };
  const setNumberParam = (key: string, value?: number) => {
    if (typeof value === 'number' && !Number.isNaN(value)) {
      params.set(key, String(value));
    }
  };

  if (filters.searchTerm) {
    params.set('searchTerm', filters.searchTerm);
  }

  setArrayParam('cities', filters.cities);
  setArrayParam('states', filters.states);
  setArrayParam('propertyTypes', filters.propertyTypes);
  setArrayParam('availabilityStatuses', filters.availabilityStatuses);
  setArrayParam('amenityKeys', filters.amenityKeys);
  setArrayParam('tags', filters.tags);

  setNumberParam('minRent', filters.minRent);
  setNumberParam('maxRent', filters.maxRent);
  setNumberParam('bedroomsMin', filters.bedroomsMin);
  setNumberParam('bedroomsMax', filters.bedroomsMax);
  setNumberParam('bathroomsMin', filters.bathroomsMin);
  setNumberParam('bathroomsMax', filters.bathroomsMax);

  if (filters.page) {
    params.set('page', String(filters.page));
  }

  if (filters.pageSize) {
    params.set('pageSize', String(filters.pageSize));
  }

  if (filters.sortBy) {
    params.set('sortBy', filters.sortBy);
  }

  if (filters.sortOrder) {
    params.set('sortOrder', filters.sortOrder);
  }

  return params.toString();
};

const buildHeaders = (token?: string) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
};

export const fetchPropertySearch = async (
  filters: PropertySearchFilters,
  token?: string,
): Promise<PropertySearchResponse> => {
  const query = buildQueryString(filters);
  const url = `${API_BASE}/search${query ? `?${query}` : ''}`;
  const response = await fetch(url, {
    headers: buildHeaders(token),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch property listings');
  }

  return response.json();
};

export const fetchSavedFilters = async (token: string): Promise<SavedPropertyFilter[]> => {
  const response = await fetch(`${API_BASE}/saved-filters`, {
    headers: buildHeaders(token),
  });

  if (!response.ok) {
    throw new Error('Failed to load saved filters');
  }

  return response.json();
};

export const savePropertyFilter = async (token: string, payload: SaveFilterPayload) => {
  const response = await fetch(`${API_BASE}/saved-filters`, {
    method: 'POST',
    headers: buildHeaders(token),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Failed to save property filter');
  }

  return response.json();
};

export const deletePropertyFilter = async (token: string, filterId: number) => {
  const response = await fetch(`${API_BASE}/saved-filters/${filterId}`, {
    method: 'DELETE',
    headers: buildHeaders(token),
  });

  if (!response.ok) {
    throw new Error('Failed to delete property filter');
  }
};
