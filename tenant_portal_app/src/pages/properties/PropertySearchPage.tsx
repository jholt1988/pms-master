import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Divider,
  Input,
  Pagination,
  Select,
  SelectItem,
  Spinner,
} from '@nextui-org/react';
import { Filter, MapPin, Search, SlidersHorizontal, Star, Trash2 } from 'lucide-react';
import { useAuth } from '../../AuthContext';
import {
  PropertySearchFilters,
  PropertySearchResponse,
  SavedPropertyFilter,
  fetchPropertySearch,
  fetchSavedFilters,
  savePropertyFilter,
  deletePropertyFilter,
} from '../../services/propertySearch';

interface FilterFormState {
  searchTerm: string;
  propertyTypes: string[];
  availabilityStatuses: string[];
  amenityKeys: string[];
  minRent: string;
  maxRent: string;
  bedroomsMin: string;
  bedroomsMax: string;
  bathroomsMin: string;
  bathroomsMax: string;
  cityInput: string;
  stateInput: string;
  tagsInput: string;
}

const PROPERTY_TYPES = ['Apartment', 'Condo', 'Townhome', 'Loft', 'Single Family'];
const AMENITY_OPTIONS = [
  { label: 'Pool', value: 'pool' },
  { label: 'Fitness Center', value: 'gym' },
  { label: 'Parking', value: 'parking' },
  { label: 'Pet Friendly', value: 'pet_friendly' },
  { label: 'EV Charging', value: 'ev_charging' },
];
const AVAILABILITY_OPTIONS = ['AVAILABLE', 'LIMITED', 'WAITLISTED', 'COMING_SOON'];

const DEFAULT_FORM_STATE: FilterFormState = {
  searchTerm: '',
  propertyTypes: [],
  availabilityStatuses: [],
  amenityKeys: [],
  minRent: '',
  maxRent: '',
  bedroomsMin: '',
  bedroomsMax: '',
  bathroomsMin: '',
  bathroomsMax: '',
  cityInput: '',
  stateInput: '',
  tagsInput: '',
};

const parseCsv = (value: string): string[] =>
  value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

const parseNumber = (value: string): number | undefined => {
  if (!value) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const formatCurrencyRange = (min?: number, max?: number) => {
  if (min === undefined && max === undefined) {
    return 'Pricing TBD';
  }

  const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  if (min !== undefined && max !== undefined) {
    return `${formatter.format(min)} - ${formatter.format(max)}`;
  }

  return `${formatter.format((min ?? max) ?? 0)}`;
};

export const PropertySearchPage: React.FC = () => {
  const { token } = useAuth();
  const [formState, setFormState] = useState<FilterFormState>(DEFAULT_FORM_STATE);
  const [appliedFilters, setAppliedFilters] = useState<PropertySearchFilters>({
    page: 1,
    pageSize: 12,
    sortBy: 'newest',
    sortOrder: 'desc',
  });
  const [results, setResults] = useState<PropertySearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFilters, setSavedFilters] = useState<SavedPropertyFilter[]>([]);
  const [selectedFilterId, setSelectedFilterId] = useState<string>('');
  const [filterName, setFilterName] = useState('');
  const [filterDescription, setFilterDescription] = useState('');
  const [savingFilter, setSavingFilter] = useState(false);
  const [deletingFilter, setDeletingFilter] = useState(false);

  const loadResults = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchPropertySearch(appliedFilters, token || undefined);
      setResults(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load properties');
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, token]);

  useEffect(() => {
    loadResults();
  }, [loadResults]);

  const loadSavedFilters = useCallback(async () => {
    if (!token) {
      setSavedFilters([]);
      return;
    }
    try {
      const data = await fetchSavedFilters(token);
      setSavedFilters(data);
    } catch (err) {
      console.error('Failed to load saved filters', err);
    }
  }, [token]);

  useEffect(() => {
    loadSavedFilters();
  }, [loadSavedFilters]);

  const updateFormState = (patch: Partial<FilterFormState>) => {
    setFormState((prev) => ({ ...prev, ...patch }));
  };

  const toggleMultiValue = (field: keyof Pick<FilterFormState, 'propertyTypes' | 'availabilityStatuses' | 'amenityKeys'>, value: string) => {
    updateFormState({
      [field]: formState[field].includes(value)
        ? formState[field].filter((entry) => entry !== value)
        : [...formState[field], value],
    });
  };

  const applyFilters = () => {
    const nextFilters: PropertySearchFilters = {
      ...appliedFilters,
      searchTerm: formState.searchTerm || undefined,
      propertyTypes: formState.propertyTypes,
      availabilityStatuses: formState.availabilityStatuses,
      amenityKeys: formState.amenityKeys,
      cities: parseCsv(formState.cityInput),
      states: parseCsv(formState.stateInput),
      tags: parseCsv(formState.tagsInput).map((tag) => tag.toLowerCase()),
      minRent: parseNumber(formState.minRent),
      maxRent: parseNumber(formState.maxRent),
      bedroomsMin: parseNumber(formState.bedroomsMin),
      bedroomsMax: parseNumber(formState.bedroomsMax),
      bathroomsMin: parseNumber(formState.bathroomsMin),
      bathroomsMax: parseNumber(formState.bathroomsMax),
      page: 1,
    };

    setAppliedFilters(nextFilters);
  };

  const resetFilters = () => {
    setFormState(DEFAULT_FORM_STATE);
    setAppliedFilters((prev) => ({
      sortBy: prev.sortBy,
      sortOrder: prev.sortOrder,
      page: 1,
      pageSize: prev.pageSize,
    }));
  };

  const removeChip = (type: string, value?: string) => {
    const removeFromArray = (arr: string[] = [], target?: string) => arr.filter((entry) => entry !== target);

    switch (type) {
      case 'search':
        updateFormState({ searchTerm: '' });
        setAppliedFilters((prev) => ({ ...prev, searchTerm: undefined, page: 1 }));
        break;
      case 'propertyType':
        updateFormState({ propertyTypes: removeFromArray(formState.propertyTypes, value) });
        setAppliedFilters((prev) => ({
          ...prev,
          propertyTypes: removeFromArray(prev.propertyTypes, value),
          page: 1,
        }));
        break;
      case 'availability':
        updateFormState({ availabilityStatuses: removeFromArray(formState.availabilityStatuses, value) });
        setAppliedFilters((prev) => ({
          ...prev,
          availabilityStatuses: removeFromArray(prev.availabilityStatuses, value),
          page: 1,
        }));
        break;
      case 'amenity':
        updateFormState({ amenityKeys: removeFromArray(formState.amenityKeys, value) });
        setAppliedFilters((prev) => ({
          ...prev,
          amenityKeys: removeFromArray(prev.amenityKeys, value),
          page: 1,
        }));
        break;
      case 'rent':
        updateFormState({ minRent: '', maxRent: '' });
        setAppliedFilters((prev) => ({ ...prev, minRent: undefined, maxRent: undefined, page: 1 }));
        break;
      case 'bedrooms':
        updateFormState({ bedroomsMin: '', bedroomsMax: '' });
        setAppliedFilters((prev) => ({ ...prev, bedroomsMin: undefined, bedroomsMax: undefined, page: 1 }));
        break;
      case 'bathrooms':
        updateFormState({ bathroomsMin: '', bathroomsMax: '' });
        setAppliedFilters((prev) => ({ ...prev, bathroomsMin: undefined, bathroomsMax: undefined, page: 1 }));
        break;
      case 'city':
        updateFormState({ cityInput: '' });
        setAppliedFilters((prev) => ({ ...prev, cities: undefined, page: 1 }));
        break;
      case 'state':
        updateFormState({ stateInput: '' });
        setAppliedFilters((prev) => ({ ...prev, states: undefined, page: 1 }));
        break;
      case 'tag':
        const updatedTags = (appliedFilters.tags || []).filter((tag) => tag !== value);
        updateFormState({
          tagsInput: updatedTags.join(', '),
        });
        setAppliedFilters((prev) => ({ ...prev, tags: updatedTags, page: 1 }));
        break;
      default:
        break;
    }
  };

  const activeChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; type: string; value?: string }> = [];
    if (appliedFilters.searchTerm) {
      chips.push({ key: 'search', label: `Search: ${appliedFilters.searchTerm}`, type: 'search' });
    }
    appliedFilters.propertyTypes?.forEach((type) =>
      chips.push({ key: `type-${type}`, label: `Type: ${type}`, type: 'propertyType', value: type }),
    );
    appliedFilters.availabilityStatuses?.forEach((status) =>
      chips.push({ key: `availability-${status}`, label: `Status: ${status}`, type: 'availability', value: status }),
    );
    appliedFilters.amenityKeys?.forEach((amenity) =>
      chips.push({ key: `amenity-${amenity}`, label: `Amenity: ${amenity}`, type: 'amenity', value: amenity }),
    );
    if (appliedFilters.minRent || appliedFilters.maxRent) {
      chips.push({ key: 'rent', label: `Rent ${formatCurrencyRange(appliedFilters.minRent, appliedFilters.maxRent)}`, type: 'rent' });
    }
    if (appliedFilters.bedroomsMin || appliedFilters.bedroomsMax) {
      chips.push({
        key: 'bedrooms',
        label: `Bedrooms ${appliedFilters.bedroomsMin ?? '0'}-${appliedFilters.bedroomsMax ?? '4+'}`,
        type: 'bedrooms',
      });
    }
    if (appliedFilters.bathroomsMin || appliedFilters.bathroomsMax) {
      chips.push({
        key: 'bathrooms',
        label: `Baths ${appliedFilters.bathroomsMin ?? '0'}-${appliedFilters.bathroomsMax ?? '4+'}`,
        type: 'bathrooms',
      });
    }
    if (appliedFilters.cities?.length) {
      chips.push({ key: 'city', label: `Cities: ${appliedFilters.cities.join(', ')}`, type: 'city' });
    }
    if (appliedFilters.states?.length) {
      chips.push({ key: 'state', label: `States: ${appliedFilters.states.join(', ')}`, type: 'state' });
    }
    appliedFilters.tags?.forEach((tag) => chips.push({ key: `tag-${tag}`, label: `Tag: ${tag}`, type: 'tag', value: tag }));
    return chips;
  }, [appliedFilters]);

  const handleSortChange = (value: string) => {
    setAppliedFilters((prev) => ({ ...prev, sortBy: value as PropertySearchFilters['sortBy'], page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setAppliedFilters((prev) => ({ ...prev, page }));
  };

  const handleSavedFilterSelect = (id: string) => {
    setSelectedFilterId(id);
    const next = savedFilters.find((filter) => filter.id.toString() === id);
    if (!next) {
      return;
    }
    const hydratedForm: FilterFormState = {
      ...DEFAULT_FORM_STATE,
      searchTerm: next.filters.searchTerm || '',
      propertyTypes: next.filters.propertyTypes || [],
      availabilityStatuses: next.filters.availabilityStatuses || [],
      amenityKeys: next.filters.amenityKeys || [],
      minRent: next.filters.minRent ? String(next.filters.minRent) : '',
      maxRent: next.filters.maxRent ? String(next.filters.maxRent) : '',
      bedroomsMin: next.filters.bedroomsMin ? String(next.filters.bedroomsMin) : '',
      bedroomsMax: next.filters.bedroomsMax ? String(next.filters.bedroomsMax) : '',
      bathroomsMin: next.filters.bathroomsMin ? String(next.filters.bathroomsMin) : '',
      bathroomsMax: next.filters.bathroomsMax ? String(next.filters.bathroomsMax) : '',
      cityInput: (next.filters.cities || []).join(', '),
      stateInput: (next.filters.states || []).join(', '),
      tagsInput: (next.filters.tags || []).join(', '),
    };
    setFormState(hydratedForm);
    setAppliedFilters((prev) => ({
      ...prev,
      ...next.filters,
      sortBy: (next.sortBy as PropertySearchFilters['sortBy']) || prev.sortBy,
      sortOrder: (next.sortOrder as PropertySearchFilters['sortOrder']) || prev.sortOrder,
      page: 1,
    }));
  };

  const handleSaveFilter = async () => {
    if (!token || !filterName.trim()) {
      return;
    }
    setSavingFilter(true);
    try {
      await savePropertyFilter(token, {
        name: filterName.trim(),
        description: filterDescription.trim() || undefined,
        filters: appliedFilters,
      });
      setFilterName('');
      setFilterDescription('');
      await loadSavedFilters();
    } catch (err) {
      console.error('Failed to save filter', err);
    } finally {
      setSavingFilter(false);
    }
  };

  const handleDeleteFilter = async () => {
    if (!token || !selectedFilterId) {
      return;
    }
    setDeletingFilter(true);
    try {
      await deletePropertyFilter(token, Number(selectedFilterId));
      setSelectedFilterId('');
      await loadSavedFilters();
    } catch (err) {
      console.error('Failed to delete filter', err);
    } finally {
      setDeletingFilter(false);
    }
  };

  const renderResults = () => {
    if (loading) {
      return (
        <div className="flex justify-center py-12">
          <Spinner label="Searching listings..." color="primary" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-10 text-danger font-medium">
          {error}
        </div>
      );
    }

    if (!results || results.items.length === 0) {
      return (
        <div className="text-center py-12 text-default-500">
          No properties matched your filters. Try broadening your search.
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {results.items.map((property) => (
          <Card key={property.id} className="border border-default-200">
            <CardBody className="grid gap-4 lg:grid-cols-[200px_1fr]">
              <div className="rounded-lg bg-default-100 h-48 flex items-center justify-center overflow-hidden">
                {property.photos?.length ? (
                  <img
                    src={property.photos[0].url}
                    alt={property.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-default-500 text-sm">No photo</div>
                )}
              </div>
              <div className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-lg font-semibold text-default-900">{property.name}</p>
                    <p className="text-sm text-default-500 flex items-center gap-1">
                      <MapPin size={16} />
                      {property.address}
                      {property.city && `, ${property.city}`}
                      {property.state && `, ${property.state}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-primary">{formatCurrencyRange(property.minRent, property.maxRent)}</p>
                    <p className="text-xs text-default-500">per month</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {property.propertyType && <Chip variant="flat">{property.propertyType}</Chip>}
                  {property.bedrooms && <Chip variant="flat">{property.bedrooms} beds</Chip>}
                  {property.bathrooms && <Chip variant="flat">{property.bathrooms} baths</Chip>}
                  {property.marketingProfile?.availabilityStatus && (
                    <Chip color="success" variant="flat">
                      {property.marketingProfile.availabilityStatus}
                    </Chip>
                  )}
                </div>
                {property.marketingProfile?.marketingHeadline && (
                  <p className="text-sm text-default-600">{property.marketingProfile.marketingHeadline}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {(property.tags || []).slice(0, 3).map((tag) => (
                    <Chip key={tag} size="sm" variant="bordered">
                      #{tag}
                    </Chip>
                  ))}
                  {(property.amenities || [])
                    .slice(0, 3)
                    .map((amenity) => (
                      <Chip key={`${property.id}-${amenity.id}`} size="sm" variant="light">
                        {amenity.amenity?.label || amenity.amenity?.key}
                      </Chip>
                    ))}
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <Card>
        <CardBody className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <Input
              startContent={<Search size={16} />}
              label="Search"
              placeholder="Search by name, address or description"
              value={formState.searchTerm}
              onChange={(event) => updateFormState({ searchTerm: event.target.value })}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  applyFilters();
                }
              }}
              className="flex-1"
            />
            <Select
              label="Sort by"
              selectedKeys={new Set([appliedFilters.sortBy || 'newest'])}
              onChange={(event) => handleSortChange(event.target.value)}
            >
              <SelectItem key="newest" value="newest">
                Newest
              </SelectItem>
              <SelectItem key="price" value="price">
                Price
              </SelectItem>
              <SelectItem key="bedrooms" value="bedrooms">
                Bedrooms
              </SelectItem>
              <SelectItem key="bathrooms" value="bathrooms">
                Bathrooms
              </SelectItem>
            </Select>
            <Button color="primary" variant="shadow" startContent={<Filter size={16} />} onPress={applyFilters}>
              Apply search
            </Button>
          </div>
          <Divider />
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <Select
              label="Saved filters"
              placeholder="Select saved filter"
              selectedKeys={selectedFilterId ? new Set([selectedFilterId]) : undefined}
              onChange={(event) => handleSavedFilterSelect(event.target.value)}
              className="lg:w-1/3"
              disabled={!savedFilters.length}
            >
              {savedFilters.map((filter) => (
                <SelectItem key={filter.id.toString()} value={filter.id.toString()}>
                  {filter.name}
                </SelectItem>
              ))}
            </Select>
            <Input
              label="Filter name"
              placeholder="Name to save current filters"
              value={filterName}
              onChange={(event) => setFilterName(event.target.value)}
              className="flex-1"
            />
            <Input
              label="Filter description"
              placeholder="Optional description"
              value={filterDescription}
              onChange={(event) => setFilterDescription(event.target.value)}
              className="flex-1"
            />
            <div className="flex gap-2">
              <Button
                color="secondary"
                variant="flat"
                startContent={<SlidersHorizontal size={16} />}
                onPress={handleSaveFilter}
                isDisabled={!token || !filterName.trim()}
                isLoading={savingFilter}
              >
                Save filter
              </Button>
              <Button
                color="danger"
                variant="flat"
                startContent={<Trash2 size={16} />}
                onPress={handleDeleteFilter}
                isDisabled={!token || !selectedFilterId}
                isLoading={deletingFilter}
              >
                Delete
              </Button>
            </div>
          </div>
          {activeChips.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {activeChips.map((chip) => (
                <Chip key={chip.key} variant="flat" onClose={() => removeChip(chip.type, chip.value)}>
                  {chip.label}
                </Chip>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card className="h-fit">
          <CardHeader className="flex items-center gap-2 text-base font-semibold">
            <SlidersHorizontal size={18} /> Filters
          </CardHeader>
          <Divider />
          <CardBody className="space-y-4">
            <section>
              <p className="text-sm font-semibold mb-2">Property type</p>
              <div className="flex flex-wrap gap-2">
                {PROPERTY_TYPES.map((type) => (
                  <Chip
                    key={type}
                    variant={formState.propertyTypes.includes(type) ? 'solid' : 'bordered'}
                    color={formState.propertyTypes.includes(type) ? 'primary' : 'default'}
                    onClick={() => toggleMultiValue('propertyTypes', type)}
                    className="cursor-pointer"
                    data-testid={`property-type-option-${type}`}
                  >
                    {type}
                  </Chip>
                ))}
              </div>
            </section>
            <section>
              <p className="text-sm font-semibold mb-2">Availability</p>
              <div className="flex flex-wrap gap-2">
                {AVAILABILITY_OPTIONS.map((status) => (
                  <Chip
                    key={status}
                    variant={formState.availabilityStatuses.includes(status) ? 'solid' : 'bordered'}
                    color={formState.availabilityStatuses.includes(status) ? 'success' : 'default'}
                    onClick={() => toggleMultiValue('availabilityStatuses', status)}
                    className="cursor-pointer"
                  >
                    {status}
                  </Chip>
                ))}
              </div>
            </section>
            <section>
              <p className="text-sm font-semibold mb-2">Amenities</p>
              <div className="flex flex-wrap gap-2">
                {AMENITY_OPTIONS.map((amenity) => (
                  <Chip
                    key={amenity.value}
                    variant={formState.amenityKeys.includes(amenity.value) ? 'solid' : 'bordered'}
                    color={formState.amenityKeys.includes(amenity.value) ? 'warning' : 'default'}
                    onClick={() => toggleMultiValue('amenityKeys', amenity.value)}
                    className="cursor-pointer"
                    startContent={<Star size={14} />}
                  >
                    {amenity.label}
                  </Chip>
                ))}
              </div>
            </section>
            <section className="grid grid-cols-2 gap-3">
              <Input
                label="Min rent"
                placeholder="e.g. 1200"
                value={formState.minRent}
                onChange={(event) => updateFormState({ minRent: event.target.value })}
              />
              <Input
                label="Max rent"
                placeholder="e.g. 2800"
                value={formState.maxRent}
                onChange={(event) => updateFormState({ maxRent: event.target.value })}
              />
              <Input
                label="Min beds"
                placeholder="2"
                value={formState.bedroomsMin}
                onChange={(event) => updateFormState({ bedroomsMin: event.target.value })}
              />
              <Input
                label="Max beds"
                placeholder="4"
                value={formState.bedroomsMax}
                onChange={(event) => updateFormState({ bedroomsMax: event.target.value })}
              />
              <Input
                label="Min baths"
                placeholder="1"
                value={formState.bathroomsMin}
                onChange={(event) => updateFormState({ bathroomsMin: event.target.value })}
              />
              <Input
                label="Max baths"
                placeholder="3"
                value={formState.bathroomsMax}
                onChange={(event) => updateFormState({ bathroomsMax: event.target.value })}
              />
            </section>
            <section className="grid gap-3">
              <Input
                label="Cities"
                placeholder="Austin, Dallas"
                value={formState.cityInput}
                onChange={(event) => updateFormState({ cityInput: event.target.value })}
              />
              <Input
                label="States"
                placeholder="TX, CA"
                value={formState.stateInput}
                onChange={(event) => updateFormState({ stateInput: event.target.value })}
              />
              <Input
                label="Tags"
                placeholder="luxury, pet-friendly"
                value={formState.tagsInput}
                onChange={(event) => updateFormState({ tagsInput: event.target.value })}
              />
            </section>
            <div className="flex gap-3">
              <Button fullWidth color="primary" onPress={applyFilters}>
                Apply filters
              </Button>
              <Button fullWidth variant="bordered" onPress={resetFilters}>
                Reset
              </Button>
            </div>
          </CardBody>
        </Card>
        <div className="space-y-4">
          {renderResults()}
          <div className="flex justify-between items-center">
            <p className="text-sm text-default-500">
              {results ? `${results.total} properties found` : 'Loading results...'}
            </p>
            <Pagination
              total={Math.max(1, results?.totalPages || 1)}
              page={appliedFilters.page || 1}
              isDisabled={!results || results.totalPages === 0}
              onChange={handlePageChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertySearchPage;
