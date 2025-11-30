import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Input,
  Chip,
  Textarea,
  Select,
  SelectItem,
  Tabs,
  Tab,
} from '@nextui-org/react';
import { Building2, Plus, MapPin, ArrowLeft, Edit, DollarSign, Home, Image as ImageIcon } from 'lucide-react';
import { useAuth } from './AuthContext';
import { MasterDetailLayout } from './components/ui/MasterDetailLayout';
import { useMasterDetail } from './hooks/useMasterDetail';
import { useViewportCategory } from './hooks/useViewportCategory';
import { apiFetch } from './services/apiClient';
import { PropertyForm } from './components/properties/PropertyForm';
import { BulkUnitCreator } from './components/properties/BulkUnitCreator';
import { UnitEditor } from './components/properties/UnitEditor';

type AvailabilityStatus = 'AVAILABLE' | 'LIMITED' | 'WAITLISTED' | 'COMING_SOON' | 'UNAVAILABLE';

interface Property {
  id: number;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  unitCount?: number;
  propertyType?: string;
  description?: string;
  yearBuilt?: number;
  marketingProfile?: {
    availabilityStatus?: AvailabilityStatus;
    isSyndicationEnabled?: boolean;
    minRent?: number;
    maxRent?: number;
  };
  tags?: string[];
  units?: Unit[];
  photos?: Array<{ id?: number; url: string; caption?: string; isPrimary?: boolean }>;
  amenities?: Array<{ id?: number; key: string; label: string; value?: string; isFeatured?: boolean }>;
  taxId?: string;
  annualTaxAmount?: number;
  mortgageLender?: string;
  mortgageAccountNumber?: string;
  monthlyMortgagePayment?: number;
  mortgageInterestRate?: number;
}

interface Unit {
  id: number;
  name: string;
  propertyId: number;
  status?: string;
  rent?: number;
  bedrooms?: number;
  bathrooms?: number;
  squareFeet?: number;
  hasParking?: boolean;
  hasLaundry?: boolean;
  hasBalcony?: boolean;
  hasAC?: boolean;
  isFurnished?: boolean;
  petsAllowed?: boolean;
}

interface MarketingProfileResponse {
  property: {
    id: number;
    name: string;
    address?: string;
  };
  marketingProfile?: {
    minRent?: number;
    maxRent?: number;
    availabilityStatus?: AvailabilityStatus;
    marketingHeadline?: string;
    marketingDescription?: string;
    isSyndicationEnabled?: boolean;
    availableOn?: string;
    lastSyncedAt?: string;
  };
  photos?: Array<{ url: string; caption?: string }>;
  amenities?: Array<{
    id: number;
    key: string;
    label: string;
    description?: string;
    category?: string;
    isFeatured: boolean;
    value?: string;
  }>;
  unitCount: number;
}

interface MarketingFormState {
  minRent: string;
  maxRent: string;
  availabilityStatus: AvailabilityStatus;
  marketingHeadline: string;
  marketingDescription: string;
  isSyndicationEnabled: boolean;
}

interface SyndicationEntry {
  id: number;
  channel: ChannelEnum;
  status: string;
  lastAttemptAt?: string;
  lastError?: string;
}

interface ChannelCredentialForm {
  username: string;
  apiKey: string;
  isEnabled: boolean;
}

const CHANNEL_DEFINITIONS = [
  {
    key: 'zillow',
    label: 'Zillow',
    channel: 'ZILLOW',
    description: 'Sync listings to Zillow and Zillow Rentals',
  },
  {
    key: 'apartments',
    label: 'Apartments.com',
    channel: 'APARTMENTS_DOT_COM',
    description: 'Sync listings to Apartments.com and ApartmentGuide',
  },
] as const;

type ChannelDefinition = (typeof CHANNEL_DEFINITIONS)[number];
type ChannelKey = ChannelDefinition['key'];
type ChannelEnum = ChannelDefinition['channel'];

const CHANNEL_KEY_MAP: Record<ChannelEnum, ChannelKey> = CHANNEL_DEFINITIONS.reduce(
  (acc, definition) => {
    acc[definition.channel] = definition.key;
    return acc;
  },
  {} as Record<ChannelEnum, ChannelKey>,
);

const availabilityOptions: { value: AvailabilityStatus; label: string }[] = [
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'LIMITED', label: 'Limited' },
  { value: 'WAITLISTED', label: 'Waitlisted' },
  { value: 'COMING_SOON', label: 'Coming Soon' },
  { value: 'UNAVAILABLE', label: 'Unavailable' },
];

const createEmptyCredentialForms = (): Record<ChannelKey, ChannelCredentialForm> =>
  CHANNEL_DEFINITIONS.reduce((state, definition) => {
    state[definition.key] = { username: '', apiKey: '', isEnabled: false };
    return state;
  }, {} as Record<ChannelKey, ChannelCredentialForm>);

const formatCurrency = (value?: number | null) =>
  value != null
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(
        value,
      )
    : 'N/A';

const formatDateTime = (value?: string | null) =>
  value
    ? new Date(value).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
      })
    : 'n/a';

const getSyndicationChipColor = (status: string) => {
  switch (status) {
    case 'SUCCESS':
      return 'success';
    case 'FAILED':
      return 'danger';
    case 'IN_PROGRESS':
      return 'warning';
    case 'PAUSED':
      return 'primary';
    default:
      return 'default';
  }
};

const formatAddress = (property?: Property) =>
  [property?.address, property?.city, property?.state].filter(Boolean).join(', ');

const PropertyManagementPage: React.FC = () => {
  const { token } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [marketingProfile, setMarketingProfile] = useState<MarketingProfileResponse | null>(null);
  const [marketingProfileLoading, setMarketingProfileLoading] = useState(false);
  const [marketingForm, setMarketingForm] = useState<MarketingFormState>({
    minRent: '',
    maxRent: '',
    availabilityStatus: 'AVAILABLE',
    marketingHeadline: '',
    marketingDescription: '',
    isSyndicationEnabled: true,
  });
  const [marketingSaving, setMarketingSaving] = useState(false);
  const [syndicationStatus, setSyndicationStatus] = useState<SyndicationEntry[]>([]);
  const [syndicationLoading, setSyndicationLoading] = useState(false);
  const [credentialForms, setCredentialForms] = useState<Record<ChannelKey, ChannelCredentialForm>>(
    createEmptyCredentialForms(),
  );
  const [savingCredential, setSavingCredential] = useState<ChannelKey | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [pausing, setPausing] = useState(false);
  const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);
  const [isEditingProperty, setIsEditingProperty] = useState(false);
  const [propertySaving, setPropertySaving] = useState(false);
  const [propertyModalError, setPropertyModalError] = useState<string | null>(null);
  const [isBulkUnitModalOpen, setIsBulkUnitModalOpen] = useState(false);
  const [isUnitEditorOpen, setIsUnitEditorOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [unitSaving, setUnitSaving] = useState(false);
  const [unitModalError, setUnitModalError] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState('overview');

  const { selectedItem: selectedProperty, showDetail, selectItem: selectProperty, clearSelection } =
    useMasterDetail<Property>();
  const viewport = useViewportCategory();

  const fetchProperties = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await apiFetch('/properties', { token });
      // Handle both array and object formats
      const properties = Array.isArray(data) ? data : (data?.data ?? data ?? []);
      setProperties(properties);
    } catch (error) {
      console.error('fetchProperties', error);
      setErrorMessage('Unable to load properties right now.');
      setProperties([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchMarketingProfile = useCallback(async () => {
    if (!token || !selectedProperty) {
      return;
    }
    setMarketingProfileLoading(true);
    setErrorMessage(null);
    try {
      const data: MarketingProfileResponse = await apiFetch(`/properties/${selectedProperty.id}/marketing`, { token });
      setMarketingProfile(data);
      const profile = data.marketingProfile ?? {};
      setMarketingForm((prev) => ({
        ...prev,
        minRent: profile.minRent != null ? String(Math.round(profile.minRent)) : '',
        maxRent: profile.maxRent != null ? String(Math.round(profile.maxRent)) : '',
        availabilityStatus: profile.availabilityStatus ?? prev.availabilityStatus,
        marketingHeadline: profile.marketingHeadline ?? '',
        marketingDescription: profile.marketingDescription ?? '',
        isSyndicationEnabled: profile.isSyndicationEnabled ?? prev.isSyndicationEnabled,
      }));
    } catch (error) {
      console.error('fetchMarketingProfile', error);
      setErrorMessage('Unable to load marketing information.');
    } finally {
      setMarketingProfileLoading(false);
    }
  }, [selectedProperty, token]);

  const fetchSyndicationStatus = useCallback(async () => {
    if (!token || !selectedProperty) {
      return;
    }
    setSyndicationLoading(true);
    setErrorMessage(null);
    try {
      const data = (await apiFetch(`/listings/syndication/${selectedProperty.id}/status`, { token })) as SyndicationEntry[];
      setSyndicationStatus(data);
    } catch (error) {
      console.error('fetchSyndicationStatus', error);
      setErrorMessage('Unable to load syndication data.');
    } finally {
      setSyndicationLoading(false);
    }
  }, [selectedProperty, token]);

  const fetchCredentials = useCallback(async () => {
    if (!token) {
      return;
    }
    try {
      const data: Array<{ channel: ChannelEnum; config: Record<string, unknown> }> = await apiFetch('/listings/syndication/credentials/all', { token });
      const normalized = data.reduce<Record<ChannelKey, ChannelCredentialForm>>((acc, entry) => {
        const channelKey = CHANNEL_KEY_MAP[entry.channel];
        if (!channelKey) {
          return acc;
        }
        acc[channelKey] = {
          username: (entry.config?.username ?? entry.config?.clientId ?? '') as string,
          apiKey: (entry.config?.apiKey ?? entry.config?.clientSecret ?? '') as string,
          isEnabled: Boolean(entry.config?.active),
        };
        return acc;
      }, createEmptyCredentialForms());
      setCredentialForms((prev) => ({ ...prev, ...normalized }));
    } catch (error) {
      console.error('fetchCredentials', error);
    }
  }, [token]);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  useEffect(() => {
    fetchCredentials();
  }, [fetchCredentials]);

  useEffect(() => {
    if (!selectedProperty) {
      setUnits([]);
      setMarketingProfile(null);
      setSyndicationStatus([]);
      return;
    }
    setUnits(selectedProperty.units ?? []);
    fetchMarketingProfile();
    fetchSyndicationStatus();
  }, [selectedProperty, fetchMarketingProfile, fetchSyndicationStatus]);

  const handleCreateOrUpdateProperty = async (formData: {
    name: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    propertyType: string;
    description: string;
    yearBuilt: string;
    taxId: string;
    annualTaxAmount: string;
    mortgageLender: string;
    mortgageAccountNumber: string;
    monthlyMortgagePayment: string;
    mortgageInterestRate: string;
    features: string[];
    amenities: Array<{ key: string; label: string; value?: string; isFeatured: boolean }>;
    photos: Array<{ url: string; caption: string; isPrimary: boolean }>;
    tags: string[];
  }) => {
    if (!token) {
      return;
    }
    setPropertySaving(true);
    setPropertyModalError(null);
    try {
      const propertyPayload: any = {
        name: formData.name.trim(),
        address: formData.address.trim(),
        city: formData.city.trim() || undefined,
        state: formData.state.trim() || undefined,
        zipCode: formData.zipCode.trim() || undefined,
        country: formData.country.trim() || undefined,
        propertyType: formData.propertyType || undefined,
        description: formData.description.trim() || undefined,
        yearBuilt: formData.yearBuilt ? parseInt(formData.yearBuilt) : undefined,
        tags: formData.tags || [],
      };

      // Create or update property
      let property;
      if (isEditingProperty && selectedProperty) {
        // Update existing property - would need PATCH endpoint
        property = await apiFetch(`/properties/${selectedProperty.id}`, {
          token,
          method: 'PATCH',
          body: propertyPayload,
        });
      } else {
        property = await apiFetch('/properties', {
          token,
          method: 'POST',
          body: propertyPayload,
        });
      }

      // Update marketing profile with photos, amenities, and financial info
      const marketingPayload: {
        photos?: Array<{ url: string; caption?: string; isPrimary?: boolean; displayOrder?: number }>;
        amenities?: Array<{ key: string; label: string; value?: string; isFeatured?: boolean }>;
      } = {
        photos: formData.photos.map((photo, index: number) => ({
          url: photo.url,
          caption: photo.caption || undefined,
          isPrimary: photo.isPrimary || index === 0,
          displayOrder: index,
        })),
        amenities: formData.amenities.map((amenity) => ({
          key: amenity.key,
          label: amenity.label,
          value: amenity.value || undefined,
          isFeatured: amenity.isFeatured || false,
        })),
      };

      // Update marketing profile with photos and amenities
      if (property.id) {
        await apiFetch(`/properties/${property.id}/marketing`, {
          token,
          method: 'POST',
          body: marketingPayload,
        });
      }

      await fetchProperties();
      setIsPropertyModalOpen(false);
      setIsEditingProperty(false);
    } catch (error) {
      console.error('handleCreateOrUpdateProperty', error);
      setPropertyModalError('Unable to save property right now.');
      throw error;
    } finally {
      setPropertySaving(false);
    }
  };

  const handleBulkCreateUnits = async (unitsData: Array<{
    name: string;
    bedrooms: string;
    bathrooms: string;
    squareFeet: string;
    rent: string;
    features: string[];
    amenities: string[];
  }>) => {
    if (!token || !selectedProperty) {
      return;
    }
    setUnitSaving(true);
    setUnitModalError(null);
    try {
      const createdUnits: Unit[] = [];
      
      // Create units one by one (or batch if backend supports it)
      for (const unitData of unitsData) {
        // Backend currently only accepts 'name' field in CreateUnitDto
        // Additional fields (bedrooms, bathrooms, features, etc.) would need backend DTO update
        const unitPayload = {
          name: unitData.name.trim(),
        };

        const createdUnit: Unit = await apiFetch(`/properties/${selectedProperty.id}/units`, {
          token,
          method: 'POST',
          body: unitPayload,
        });
        createdUnits.push(createdUnit);
      }

      const updatedUnits = [...units, ...createdUnits];
      setUnits(updatedUnits);
      selectProperty({ ...selectedProperty, units: updatedUnits });
      await fetchProperties();
      setIsBulkUnitModalOpen(false);
    } catch (error) {
      console.error('handleBulkCreateUnits', error);
      setUnitModalError('Unable to create units. Please try again.');
    } finally {
      setUnitSaving(false);
    }
  };

  const handleEditUnit = (unit: Unit) => {
    setEditingUnit(unit);
    setIsUnitEditorOpen(true);
    setUnitModalError(null);
  };

  const handleUpdateUnit = async (unitData: {
    name: string;
    bedrooms: string;
    bathrooms: string;
    squareFeet: string;
    rent: string;
    features: string[];
    amenities: string[];
  }) => {
    if (!token || !selectedProperty || !editingUnit) {
      return;
    }
    setUnitSaving(true);
    setUnitModalError(null);
    try {
      // Map features array to boolean fields
      const hasParking = unitData.features.includes('Parking');
      const hasLaundry = unitData.features.includes('Laundry');
      const hasBalcony = unitData.features.includes('Balcony');
      const hasAC = unitData.features.includes('AC');
      const isFurnished = unitData.features.includes('Furnished');
      const petsAllowed = unitData.features.includes('Pet Friendly');

      const unitPayload = {
        name: unitData.name.trim(),
        bedrooms: unitData.bedrooms ? parseFloat(unitData.bedrooms) : undefined,
        bathrooms: unitData.bathrooms ? parseFloat(unitData.bathrooms) : undefined,
        squareFeet: unitData.squareFeet ? parseInt(unitData.squareFeet) : undefined,
        hasParking,
        hasLaundry,
        hasBalcony,
        hasAC,
        isFurnished,
        petsAllowed,
      };

      const updatedUnit: Unit = await apiFetch(`/properties/${selectedProperty.id}/units/${editingUnit.id}`, {
        token,
        method: 'PATCH',
        body: unitPayload,
      });

      const updatedUnits = units.map((u) => (u.id === editingUnit.id ? updatedUnit : u));
      setUnits(updatedUnits);
      selectProperty({ ...selectedProperty, units: updatedUnits });
      await fetchProperties();
      setIsUnitEditorOpen(false);
      setEditingUnit(null);
    } catch (error) {
      console.error('handleUpdateUnit', error);
      setUnitModalError('Unable to update unit. Please try again.');
    } finally {
      setUnitSaving(false);
    }
  };

  const handleMarketingSave = async () => {
    if (!token || !selectedProperty) {
      return;
    }
    setMarketingSaving(true);
    setErrorMessage(null);
    try {
      const payload = {
        minRent: marketingForm.minRent.trim() ? Number(marketingForm.minRent) : undefined,
        maxRent: marketingForm.maxRent.trim() ? Number(marketingForm.maxRent) : undefined,
        availabilityStatus: marketingForm.availabilityStatus,
        marketingHeadline: marketingForm.marketingHeadline.trim() || undefined,
        marketingDescription: marketingForm.marketingDescription.trim() || undefined,
        isSyndicationEnabled: marketingForm.isSyndicationEnabled,
      };
      await apiFetch(`/properties/${selectedProperty.id}/marketing`, {
        token,
        method: 'POST',
        body: payload,
      });
      await fetchMarketingProfile();
    } catch (error) {
      console.error('handleMarketingSave', error);
      setErrorMessage('Unable to save marketing updates at this time.');
    } finally {
      setMarketingSaving(false);
    }
  };

  const handleTriggerSyndication = async () => {
    if (!token || !selectedProperty) {
      return;
    }
    setSyncing(true);
    setErrorMessage(null);
    try {
      await apiFetch(`/listings/syndication/${selectedProperty.id}/trigger`, {
        token,
        method: 'POST',
        body: {},
      });
      await fetchSyndicationStatus();
    } catch (error) {
      console.error('handleTriggerSyndication', error);
      setErrorMessage('Unable to trigger syndication at the moment.');
    } finally {
      setSyncing(false);
    }
  };

  const handlePauseSyndication = async () => {
    if (!token || !selectedProperty) {
      return;
    }
    setPausing(true);
    setErrorMessage(null);
    try {
      await apiFetch(`/listings/syndication/${selectedProperty.id}/pause`, {
        token,
        method: 'POST',
        body: {},
      });
      await fetchSyndicationStatus();
    } catch (error) {
      console.error('handlePauseSyndication', error);
      setErrorMessage('Unable to pause syndication at the moment.');
    } finally {
      setPausing(false);
    }
  };

  const handleChannelInput = (channelKey: ChannelKey, field: keyof ChannelCredentialForm, value: string) => {
    setCredentialForms((prev) => ({
      ...prev,
      [channelKey]: {
        ...prev[channelKey],
        [field]: value,
      },
    }));
  };

  const toggleChannelEnabled = (channelKey: ChannelKey) => {
    setCredentialForms((prev) => ({
      ...prev,
      [channelKey]: {
        ...prev[channelKey],
        isEnabled: !prev[channelKey].isEnabled,
      },
    }));
  };

  const handleCredentialSave = async (channelKey: ChannelKey) => {
    if (!token) {
      return;
    }
    const channelDefinition = CHANNEL_DEFINITIONS.find((definition) => definition.key === channelKey);
    if (!channelDefinition) {
      return;
    }
    setSavingCredential(channelKey);
    setErrorMessage(null);
    try {
      const form = credentialForms[channelKey];
      const payload: Record<string, unknown> = {
        channel: channelDefinition.channel,
        username: form.username || undefined,
        apiKey: form.apiKey || undefined,
        active: form.isEnabled,
      };
      await apiFetch('/listings/syndication/credentials', {
        token,
        method: 'POST',
        body: payload,
      });
      await fetchCredentials();
    } catch (error) {
      console.error('handleCredentialSave', error);
      setErrorMessage('Unable to save channel credential.');
    } finally {
      setSavingCredential(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-sm text-gray-300">Loading properties…</p>
      </div>
    );
  }
  const master = (
    <div className="p-4 sm:p-6 w-full flex flex-col gap-4">
      <div className="flex justify-between items-start gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Properties</h1>
          <p className="text-sm text-gray-300 mt-1">Maintain listings, units, and marketing feeds.</p>
        </div>
        <div className="flex gap-2">
          <Button
            color="primary"
            startContent={<Plus size={18} />}
            onClick={() => {
              setIsEditingProperty(false);
              setIsPropertyModalOpen(true);
            }}
          >
            Add Property
          </Button>
          {selectedProperty && (
            <Button
              variant="bordered"
              startContent={<Edit size={18} />}
              onClick={() => {
                setIsEditingProperty(true);
                setIsPropertyModalOpen(true);
              }}
            >
              Edit Property
            </Button>
          )}
        </div>
      </div>
      {errorMessage && (
        <p className="text-sm text-danger-600">{errorMessage}</p>
      )}
      <Card className="flex-1 overflow-hidden bg-white/5 border-white/10">
        <CardBody className="space-y-4 overflow-y-auto max-h-[calc(100vh-220px)]">
          {properties.length === 0 && (
            <div className="text-sm text-gray-300">
              No properties yet. Use the button above to add the first asset.
            </div>
          )}
          {properties.map((property) => {
            const isSelected = selectedProperty?.id === property.id;
            return (
              <Card
                key={property.id}
                isPressable
                className={`bg-white/5 border-white/10 border ${isSelected ? 'border-primary' : 'border-white/10'} transition`}
                onClick={() => selectProperty(property)}
              >
                <CardBody className="space-y-3 p-4">
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex items-start gap-3">
                      <Building2 size={24} className="text-gray-300 flex-shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="text-base font-bold text-white mb-1">{property.name}</p>
                        <p className="text-sm text-gray-300">
                          <MapPin size={14} className="inline mr-1" />
                          {formatAddress(property) || 'Address not set'}
                        </p>
                      </div>
                    </div>
                    <Chip
                      color={property.marketingProfile?.availabilityStatus === 'UNAVAILABLE' ? 'danger' : 'success'}
                      size="sm"
                      variant="flat"
                      className="flex-shrink-0"
                    >
                      {property.marketingProfile?.availabilityStatus ?? 'Unknown status'}
                    </Chip>
                  </div>
                  <div className="flex items-center justify-between text-base text-gray-300">
                    <span className="font-medium">
                      {property.units?.length ?? property.unitCount ?? 0} units
                    </span>
                    <span>{property.propertyType ?? 'Property'}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {property.tags?.slice(0, 3).map((tag) => (
                      <Chip key={`${property.id}-${tag}`} size="sm" variant="flat">
                        {tag}
                      </Chip>
                    ))}
                    <Chip
                      color={property.marketingProfile?.isSyndicationEnabled ? 'success' : 'default'}
                      size="sm"
                      variant="flat"
                    >
                      {property.marketingProfile?.isSyndicationEnabled ? 'Syndication enabled' : 'Syndication paused'}
                    </Chip>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </CardBody>
      </Card>
    </div>
  );

  const detail = (
    <div className="p-4 sm:p-6 h-full flex flex-col gap-4">
      {selectedProperty ? (
        <>
          {(viewport === 'mobile' || viewport === 'tablet-portrait') && (
            <Button
              isIconOnly
              variant="light"
              onClick={clearSelection}
              className="w-12"
            >
              <ArrowLeft size={20} />
            </Button>
          )}
          
          <Tabs
            selectedKey={detailTab}
            onSelectionChange={(key) => setDetailTab(key as string)}
            className="w-full"
          >
            <Tab key="overview" title="Overview">
              <Card className="bg-white/5 border-white/10">
            <CardHeader className="flex justify-between items-start gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-400">Property overview</p>
                <h2 className="text-xl font-semibold text-white">{selectedProperty.name}</h2>
                <p className="text-sm text-gray-300">
                  {formatAddress(selectedProperty) || 'Address not provided yet'}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Chip color="primary" variant="flat">
                  {selectedProperty.marketingProfile?.availabilityStatus ?? 'Unknown'}
                </Chip>
                <Chip color="success" variant="flat">
                  {marketingProfile?.unitCount ?? units.length} units
                </Chip>
              </div>
            </CardHeader>
            <CardBody className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-gray-400">Property type</p>
                <p className="text-sm text-white">{selectedProperty.propertyType ?? 'Residential'}</p>
                <div className="flex flex-wrap gap-2">
                  {selectedProperty.tags?.map((tag) => (
                    <Chip key={`tag-${tag}`} size="sm" variant="flat">
                      {tag}
                    </Chip>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-gray-400">Last synced</p>
                <p className="text-sm text-white">
                  {marketingProfile?.marketingProfile?.lastSyncedAt ?
                    formatDateTime(marketingProfile.marketingProfile.lastSyncedAt) : 'Not synced yet'}
                </p>
              </div>
            </CardBody>
          </Card>
            </Tab>

            <Tab key="financial" title="Financial">
              <div className="space-y-4">
                <Card className="bg-white/5 border-white/10">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <DollarSign size={18} className="text-gray-300" />
                      <h3 className="text-lg font-semibold text-white">Tax & Mortgage Information</h3>
                    </div>
                  </CardHeader>
                  <CardBody className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Tax ID / Parcel Number</p>
                        <p className="text-sm text-white">{selectedProperty.taxId || 'Not set'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Annual Tax Amount</p>
                        <p className="text-sm text-white">
                          {selectedProperty.annualTaxAmount 
                            ? formatCurrency(selectedProperty.annualTaxAmount) 
                            : 'Not set'}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Mortgage Lender</p>
                        <p className="text-sm text-white">{selectedProperty.mortgageLender || 'Not set'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Account Number</p>
                        <p className="text-sm text-white">{selectedProperty.mortgageAccountNumber || 'Not set'}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Monthly Payment</p>
                        <p className="text-sm text-white">
                          {selectedProperty.monthlyMortgagePayment 
                            ? formatCurrency(selectedProperty.monthlyMortgagePayment) 
                            : 'Not set'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Interest Rate</p>
                        <p className="text-sm text-white">
                          {selectedProperty.mortgageInterestRate 
                            ? `${selectedProperty.mortgageInterestRate}%` 
                            : 'Not set'}
                        </p>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </div>
            </Tab>

            <Tab key="photos" title="Photos">
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <ImageIcon size={18} className="text-gray-300" />
                      <h3 className="text-lg font-semibold text-white">Property Photos</h3>
                    </div>
                    <Chip size="sm" variant="flat">
                      {selectedProperty.photos?.length || 0} photos
                    </Chip>
                  </div>
                </CardHeader>
                <CardBody>
                  {selectedProperty.photos && selectedProperty.photos.length > 0 ? (
                    <div className="grid grid-cols-2 gap-4">
                      {selectedProperty.photos.map((photo, index) => (
                        <div key={index} className="relative">
                          <img
                            src={photo.url}
                            alt={photo.caption || `Photo ${index + 1}`}
                            className="w-full h-48 object-cover rounded-lg"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x200?text=Invalid+URL';
                            }}
                          />
                          {photo.isPrimary && (
                            <Chip size="sm" color="primary" className="absolute top-2 left-2">
                              Primary
                            </Chip>
                          )}
                          {photo.caption && (
                            <p className="text-xs text-gray-400 mt-2">{photo.caption}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-8">No photos added yet</p>
                  )}
                </CardBody>
              </Card>
            </Tab>

            <Tab key="amenities" title="Amenities">
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Home size={18} className="text-gray-300" />
                    <h3 className="text-lg font-semibold text-white">Property Features & Amenities</h3>
                  </div>
                </CardHeader>
                <CardBody>
                  {selectedProperty.amenities && selectedProperty.amenities.length > 0 ? (
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs text-gray-400 mb-2">Featured Amenities</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedProperty.amenities
                            .filter((a) => a.isFeatured)
                            .map((amenity) => (
                              <Chip key={amenity.key} color="primary" variant="flat">
                                {amenity.label}
                                {amenity.value && `: ${amenity.value}`}
                              </Chip>
                            ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-2">All Amenities</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedProperty.amenities.map((amenity) => (
                            <Chip
                              key={amenity.key}
                              variant="bordered"
                              color={amenity.isFeatured ? 'primary' : 'default'}
                            >
                              {amenity.label}
                              {amenity.value && `: ${amenity.value}`}
                            </Chip>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-8">No amenities added yet</p>
                  )}
                </CardBody>
              </Card>
            </Tab>
          </Tabs>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2 bg-white/5 border-white/10">
              <CardHeader className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-400">Units</p>
                  <h3 className="text-lg font-semibold text-white">Manage units</h3>
                </div>
                <Button 
                  size="sm" 
                  color="primary" 
                  onClick={() => setIsBulkUnitModalOpen(true)} 
                  startContent={<Plus size={16} />}
                >
                  Add Units
                </Button>
              </CardHeader>
              <CardBody className="space-y-3 max-h-[420px] overflow-y-auto">
                {units.length === 0 && (
                  <p className="text-sm text-gray-300">No units recorded yet.</p>
                )}
                {units.map((unit) => (
                  <div key={unit.id} className="flex items-center justify-between gap-3 border-b border-dashed border-foreground/20 py-2 last:border-none">
                    <div className="flex-1">
                      <p className="font-semibold text-white">{unit.name}</p>
                      <p className="text-xs text-gray-300">
                        {unit.status ?? 'Status pending'}
                        {unit.bedrooms && ` • ${unit.bedrooms} bed`}
                        {unit.bathrooms && ` • ${unit.bathrooms} bath`}
                        {unit.squareFeet && ` • ${unit.squareFeet} sq ft`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-sm font-medium text-white">
                        {unit.rent ? formatCurrency(unit.rent) : 'Rent TBD'}
                      </p>
                      <Button
                        size="sm"
                        variant="flat"
                        onClick={() => handleEditUnit(unit)}
                        startContent={<Edit size={14} />}
                      >
                        Edit
                      </Button>
                    </div>
                  </div>
                ))}
              </CardBody>
            </Card>

            <div className="space-y-4">
              <Card className="bg-white/5 border-white/10">
                <CardHeader className="flex justify-between items-center">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-400">Marketing</p>
                    <h3 className="text-lg font-semibold text-white">Listing details</h3>
                  </div>
                  <Chip color="secondary" variant="flat">
                    {marketingProfile?.marketingProfile?.availabilityStatus ?? 'Draft'}
                  </Chip>
                </CardHeader>
                <CardBody className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      label="Min rent"
                      type="number"
                      value={marketingForm.minRent}
                      onChange={(event) => setMarketingForm((prev) => ({ ...prev, minRent: event.target.value }))}
                      placeholder="0"
                    />
                    <Input
                      label="Max rent"
                      type="number"
                      value={marketingForm.maxRent}
                      onChange={(event) => setMarketingForm((prev) => ({ ...prev, maxRent: event.target.value }))}
                      placeholder="0"
                    />
                  </div>
                  <Select
                    label="Availability"
                    selectedKeys={marketingForm.availabilityStatus ? [marketingForm.availabilityStatus] : []}
                    onSelectionChange={(keys) => {
                      const selected = Array.from(keys)[0] as AvailabilityStatus | undefined;
                      setMarketingForm((prev) => ({
                        ...prev,
                        availabilityStatus: selected || ('' as AvailabilityStatus),
                      }));
                    }}
                  >
                    {availabilityOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </Select>
                  <Input
                    label="Marketing headline"
                    value={marketingForm.marketingHeadline}
                    onChange={(event) => setMarketingForm((prev) => ({ ...prev, marketingHeadline: event.target.value }))}
                  />
                  <Textarea
                    label="Marketing description"
                    minRows={3}
                    value={marketingForm.marketingDescription}
                    onChange={(event) => setMarketingForm((prev) => ({ ...prev, marketingDescription: event.target.value }))}
                  />
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-gray-300">
                      Auto-syndication is {marketingForm.isSyndicationEnabled ? 'Enabled' : 'Disabled'}
                    </p>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setMarketingForm((prev) => ({ ...prev, isSyndicationEnabled: !prev.isSyndicationEnabled }))
                      }
                    >
                      {marketingForm.isSyndicationEnabled ? 'Disable syndication' : 'Enable syndication'}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-400">Photos</p>
                      <p className="text-sm text-white">{marketingProfile?.photos?.length ?? 0} saved</p>
                      </div>
                      <div>
                      <p className="text-xs uppercase tracking-wide text-gray-400">Amenities</p>
                      <p className="text-sm text-white">{marketingProfile?.amenities?.length ?? 0} mapped</p>
                    </div>
                  </div>
                  <Button
                    color="primary"
                    onClick={handleMarketingSave}
                    isLoading={marketingSaving || marketingProfileLoading}
                    disabled={marketingProfileLoading}
                  >
                    Save marketing updates
                  </Button>
                </CardBody>
              </Card>

              <Card className="bg-white/5 border-white/10">
                <CardHeader className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-400">Listing syndication</p>
                    <h3 className="text-lg font-semibold text-white">Sync status</h3>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" color="primary" onClick={handleTriggerSyndication} isLoading={syncing}>
                      Sync now
                    </Button>
                    <Button size="sm" variant="bordered" onClick={handlePauseSyndication} isLoading={pausing}>
                      Pause
                    </Button>
                  </div>
                </CardHeader>
                <CardBody className="space-y-3">
                  {syndicationLoading ? (
                    <p className="text-sm text-gray-300">Refreshing syndication state...</p>
                  ) : syndicationStatus.length === 0 ? (
                    <p className="text-sm text-gray-300">No syndication history yet.</p>
                  ) : (
                    syndicationStatus.map((entry) => {
                      const channelLabel =
                        CHANNEL_DEFINITIONS.find((definition) => definition.channel === entry.channel)?.label ??
                        entry.channel;
                      return (
                        <div
                          key={entry.id}
                          className="flex items-center justify-between rounded-lg border border-foreground/10 p-3"
                        >
                          <div>
                            <p className="text-sm font-semibold text-white">{channelLabel}</p>
                            <p className="text-xs text-gray-300">
                              {entry.lastAttemptAt ? formatDateTime(entry.lastAttemptAt) : 'Awaiting first sync'}
                            </p>
                            {entry.lastError && (
                              <p className="text-xs text-danger-600">{entry.lastError}</p>
                            )}
                          </div>
                          <Chip size="sm" color={getSyndicationChipColor(entry.status)} variant="flat">
                            {entry.status.replace('_', ' ')}
                          </Chip>
                        </div>
                      );
                    })
                  )}
                </CardBody>
              </Card>
            </div>
          </div>

          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-400">Channel credentials</p>
                <h3 className="text-lg font-semibold text-white">Listing syndication APIs</h3>
              </div>
            </CardHeader>
            <CardBody className="space-y-6">
              {CHANNEL_DEFINITIONS.map((definition) => {
                const form = credentialForms[definition.key];
                return (
                  <div key={definition.key} className="space-y-3 rounded-lg border border-foreground/10 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-white">{definition.label}</p>
                        <p className="text-xs text-gray-300">{definition.description}</p>
                      </div>
                      <Chip color={form.isEnabled ? 'success' : 'default'} size="sm" variant="flat">
                        {form.isEnabled ? 'Enabled' : 'Disabled'}
                      </Chip>
                    </div>
                    <Input
                      label="Username or client ID"
                      value={form.username}
                      onChange={(event) => handleChannelInput(definition.key, 'username', event.target.value)}
                    />
                    <Input
                      label="API key or secret"
                      type="password"
                      value={form.apiKey}
                      onChange={(event) => handleChannelInput(definition.key, 'apiKey', event.target.value)}
                    />
                    <div className="flex items-center justify-between gap-3">
                      <Button size="sm" variant="ghost" onClick={() => toggleChannelEnabled(definition.key)}>
                        {form.isEnabled ? 'Turn off' : 'Enable'}
                      </Button>
                      <Button
                        size="sm"
                        color="primary"
                        onClick={() => handleCredentialSave(definition.key)}
                        isLoading={savingCredential === definition.key}
                      >
                        Save credentials
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardBody>
          </Card>
        </>
      ) : (
        <div className="flex items-center justify-center h-full">
          <p className="text-sm text-gray-300">Select a property to view and manage its marketing.</p>
        </div>
      )}
    </div>
  );
  return (
    <>
      <MasterDetailLayout master={master} detail={detail} showDetail={showDetail} />

      <PropertyForm
        isOpen={isPropertyModalOpen}
        onClose={() => {
          setIsPropertyModalOpen(false);
          setIsEditingProperty(false);
          setPropertyModalError(null);
        }}
        onSubmit={handleCreateOrUpdateProperty}
        initialData={isEditingProperty && selectedProperty ? {
          name: selectedProperty.name,
          address: selectedProperty.address || '',
          city: selectedProperty.city || '',
          state: selectedProperty.state || '',
          zipCode: selectedProperty.zipCode || '',
          country: selectedProperty.country || 'USA',
          propertyType: selectedProperty.propertyType || '',
          description: selectedProperty.description || '',
          yearBuilt: selectedProperty.yearBuilt?.toString() || '',
          taxId: selectedProperty.taxId || '',
          annualTaxAmount: selectedProperty.annualTaxAmount?.toString() || '',
          mortgageLender: selectedProperty.mortgageLender || '',
          mortgageAccountNumber: selectedProperty.mortgageAccountNumber || '',
          monthlyMortgagePayment: selectedProperty.monthlyMortgagePayment?.toString() || '',
          mortgageInterestRate: selectedProperty.mortgageInterestRate?.toString() || '',
          features: [],
          amenities: (selectedProperty.amenities || []).map(a => ({
            key: a.key,
            label: a.label,
            value: a.value,
            isFeatured: a.isFeatured ?? false,
          })),
          photos: (selectedProperty.photos || []).map(p => ({
            url: p.url,
            caption: p.caption || '',
            isPrimary: p.isPrimary ?? false,
          })),
          tags: selectedProperty.tags || [],
        } : undefined}
        isLoading={propertySaving}
        error={propertyModalError}
      />

      <BulkUnitCreator
        isOpen={isBulkUnitModalOpen}
        onClose={() => {
          setIsBulkUnitModalOpen(false);
          setUnitModalError(null);
        }}
        onSubmit={handleBulkCreateUnits}
        isLoading={unitSaving}
        error={unitModalError}
      />

      <UnitEditor
        isOpen={isUnitEditorOpen}
        onClose={() => {
          setIsUnitEditorOpen(false);
          setEditingUnit(null);
          setUnitModalError(null);
        }}
        onSubmit={handleUpdateUnit}
        initialData={editingUnit ? {
          name: editingUnit.name,
          bedrooms: editingUnit.bedrooms,
          bathrooms: editingUnit.bathrooms,
          squareFeet: editingUnit.squareFeet,
          rent: editingUnit.rent,
          hasParking: editingUnit.hasParking,
          hasLaundry: editingUnit.hasLaundry,
          hasBalcony: editingUnit.hasBalcony,
          hasAC: editingUnit.hasAC,
          isFurnished: editingUnit.isFurnished,
          petsAllowed: editingUnit.petsAllowed,
        } : undefined}
        isLoading={unitSaving}
        error={unitModalError}
      />
    </>
  );
};

export default PropertyManagementPage;
