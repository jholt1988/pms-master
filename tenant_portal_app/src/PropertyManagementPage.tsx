import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Input,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Chip,
  Textarea,
  Select,
  SelectItem,
} from '@nextui-org/react';
import { Building2, Plus, MapPin, ArrowLeft } from 'lucide-react';
import { useAuth } from './AuthContext';
import { MasterDetailLayout } from './components/ui/MasterDetailLayout';
import { useMasterDetail } from './hooks/useMasterDetail';
import { useViewportCategory } from './hooks/useViewportCategory';
import { apiFetch } from './services/apiClient';

type AvailabilityStatus = 'AVAILABLE' | 'LIMITED' | 'WAITLISTED' | 'COMING_SOON' | 'UNAVAILABLE';

interface Property {
  id: number;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  unitCount?: number;
  propertyType?: string;
  marketingProfile?: {
    availabilityStatus?: AvailabilityStatus;
    isSyndicationEnabled?: boolean;
    minRent?: number;
    maxRent?: number;
  };
  tags?: string[];
  units?: Unit[];
}

interface Unit {
  id: number;
  name: string;
  propertyId: number;
  status?: string;
  rent?: number;
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
  const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
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
  const [newPropertyForm, setNewPropertyForm] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
  });
  const [propertySaving, setPropertySaving] = useState(false);
  const [propertyModalError, setPropertyModalError] = useState<string | null>(null);
  const [newUnitName, setNewUnitName] = useState('');
  const [unitSaving, setUnitSaving] = useState(false);
  const [unitModalError, setUnitModalError] = useState<string | null>(null);

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
      setProperties(data);
    } catch (error) {
      console.error('fetchProperties', error);
      setErrorMessage('Unable to load properties right now.');
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

  const handleCreateProperty = async () => {
    if (!token) {
      return;
    }
    if (!newPropertyForm.name.trim() || !newPropertyForm.address.trim()) {
      setPropertyModalError('Property name and address are required.');
      return;
    }
    setPropertySaving(true);
    setPropertyModalError(null);
    try {
      await apiFetch('/properties', {
        token,
        method: 'POST',
        body: {
          name: newPropertyForm.name.trim(),
          address: newPropertyForm.address.trim(),
          city: newPropertyForm.city.trim() || undefined,
          state: newPropertyForm.state.trim() || undefined,
        },
      });
      await fetchProperties();
      setIsPropertyModalOpen(false);
      setNewPropertyForm({ name: '', address: '', city: '', state: '' });
    } catch (error) {
      console.error('handleCreateProperty', error);
      setPropertyModalError('Unable to create property right now.');
    } finally {
      setPropertySaving(false);
    }
  };

  const handleAddUnit = async () => {
    if (!token || !selectedProperty) {
      return;
    }
    if (!newUnitName.trim()) {
      setUnitModalError('Unit name is required.');
      return;
    }
    setUnitSaving(true);
    setUnitModalError(null);
    try {
      const createdUnit: Unit = await apiFetch(`/properties/${selectedProperty.id}/units`, {
        token,
        method: 'POST',
        body: { name: newUnitName.trim() },
      });
      const updatedUnits = [...units, createdUnit];
      setUnits(updatedUnits);
      selectProperty({ ...selectedProperty, units: updatedUnits });
      await fetchProperties();
      setNewUnitName('');
      setIsUnitModalOpen(false);
    } catch (error) {
      console.error('handleAddUnit', error);
      setUnitModalError('Unable to save the new unit.');
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
        <p className="text-sm text-foreground-500">Loading properties…</p>
      </div>
    );
  }
  const master = (
    <div className="p-4 sm:p-6 h-full flex flex-col gap-4">
      <div className="flex justify-between items-start gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Properties</h1>
          <p className="text-sm text-foreground-500 mt-1">Maintain listings, units, and marketing feeds.</p>
        </div>
        <Button
          color="primary"
          startContent={<Plus size={18} />}
          onClick={() => setIsPropertyModalOpen(true)}
        >
          Add Property
        </Button>
      </div>
      {errorMessage && (
        <p className="text-sm text-danger-600">{errorMessage}</p>
      )}
      <Card className="flex-1 overflow-hidden">
        <CardBody className="space-y-4 overflow-y-auto max-h-[calc(100vh-220px)]">
          {properties.length === 0 && (
            <div className="text-sm text-foreground-500">
              No properties yet. Use the button above to add the first asset.
            </div>
          )}
          {properties.map((property) => {
            const isSelected = selectedProperty?.id === property.id;
            return (
              <Card
                key={property.id}
                isPressable
                className={`border ${isSelected ? 'border-primary' : 'border-transparent'} transition`}
                onClick={() => selectProperty(property)}
              >
                <CardBody className="space-y-2">
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex items-start gap-3">
                      <Building2 size={20} className="text-foreground-500" />
                      <div>
                        <p className="text-base font-semibold text-foreground">{property.name}</p>
                        <p className="text-xs text-foreground-500">
                          <MapPin size={12} className="inline mr-1" />
                          {formatAddress(property) || 'Address not set'}
                        </p>
                      </div>
                    </div>
                    <Chip
                      color={property.marketingProfile?.availabilityStatus === 'UNAVAILABLE' ? 'danger' : 'success'}
                      size="sm"
                      variant="flat"
                    >
                      {property.marketingProfile?.availabilityStatus ?? 'Unknown status'}
                    </Chip>
                  </div>
                  <div className="flex items-center justify-between text-sm text-foreground-500">
                    <span>
                      {property.units?.length ?? property.unitCount ?? 0} units
                    </span>
                    <span>{property.propertyType ?? 'Property'}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
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
          <Card>
            <CardHeader className="flex justify-between items-start gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-foreground-500">Property overview</p>
                <h2 className="text-2xl font-semibold text-foreground">{selectedProperty.name}</h2>
                <p className="text-sm text-foreground-500">
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
                <p className="text-xs uppercase tracking-wide text-foreground-500">Property type</p>
                <p className="text-sm text-foreground">{selectedProperty.propertyType ?? 'Residential'}</p>
                <div className="flex flex-wrap gap-2">
                  {selectedProperty.tags?.map((tag) => (
                    <Chip key={`tag-${tag}`} size="sm" variant="flat">
                      {tag}
                    </Chip>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-foreground-500">Last synced</p>
                <p className="text-sm text-foreground">
                  {marketingProfile?.marketingProfile?.lastSyncedAt ?
                    formatDateTime(marketingProfile.marketingProfile.lastSyncedAt) : 'Not synced yet'}
                </p>
              </div>
            </CardBody>
          </Card>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-foreground-500">Units</p>
                  <h3 className="text-lg font-semibold text-foreground">Manage units</h3>
                </div>
                <Button size="sm" color="primary" onClick={() => setIsUnitModalOpen(true)} startContent={<Plus size={16} />}>
                  Add unit
                </Button>
              </CardHeader>
              <CardBody className="space-y-3 max-h-[420px] overflow-y-auto">
                {units.length === 0 && (
                  <p className="text-sm text-foreground-500">No units recorded yet.</p>
                )}
                {units.map((unit) => (
                  <div key={unit.id} className="flex items-center justify-between gap-3 border-b border-dashed border-foreground/20 py-2 last:border-none">
                    <div>
                      <p className="font-semibold text-foreground">{unit.name}</p>
                      <p className="text-xs text-foreground-500">
                        {unit.status ?? 'Status pending'}
                      </p>
                    </div>
                    <p className="text-sm font-medium text-foreground">
                      {unit.rent ? formatCurrency(unit.rent) : 'Rent TBD'}
                    </p>
                  </div>
                ))}
              </CardBody>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader className="flex justify-between items-center">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-foreground-500">Marketing</p>
                    <h3 className="text-lg font-semibold text-foreground">Listing details</h3>
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
                    value={marketingForm.availabilityStatus}
                    onChange={(event) =>
                      setMarketingForm((prev) => ({
                        ...prev,
                        availabilityStatus: event.target.value as AvailabilityStatus,
                      }))
                    }
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
                    <p className="text-sm text-foreground-500">
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
                      <p className="text-xs uppercase tracking-wide text-foreground-500">Photos</p>
                      <p className="text-sm text-foreground">{marketingProfile?.photos?.length ?? 0} saved</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-foreground-500">Amenities</p>
                      <p className="text-sm text-foreground">{marketingProfile?.amenities?.length ?? 0} mapped</p>
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

              <Card>
                <CardHeader className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-foreground-500">Listing syndication</p>
                    <h3 className="text-lg font-semibold text-foreground">Sync status</h3>
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
                    <p className="text-sm text-foreground-500">Refreshing syndication state...</p>
                  ) : syndicationStatus.length === 0 ? (
                    <p className="text-sm text-foreground-500">No syndication history yet.</p>
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
                            <p className="text-sm font-semibold text-foreground">{channelLabel}</p>
                            <p className="text-xs text-foreground-500">
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

          <Card>
            <CardHeader>
              <div>
                <p className="text-xs uppercase tracking-wide text-foreground-500">Channel credentials</p>
                <h3 className="text-lg font-semibold text-foreground">Listing syndication APIs</h3>
              </div>
            </CardHeader>
            <CardBody className="space-y-6">
              {CHANNEL_DEFINITIONS.map((definition) => {
                const form = credentialForms[definition.key];
                return (
                  <div key={definition.key} className="space-y-3 rounded-lg border border-foreground/10 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-foreground">{definition.label}</p>
                        <p className="text-xs text-foreground-500">{definition.description}</p>
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
          <p className="text-sm text-foreground-500">Select a property to view and manage its marketing.</p>
        </div>
      )}
    </div>
  );
  return (
    <>
      <MasterDetailLayout master={master} detail={detail} showDetail={showDetail} />

      <Modal
        isOpen={isPropertyModalOpen}
        onClose={() => {
          setIsPropertyModalOpen(false);
          setPropertyModalError(null);
        }}
      >
        <ModalContent>
          <ModalHeader>
            Add new property
          </ModalHeader>
          <ModalBody className="space-y-4">
            {propertyModalError && (
              <p className="text-sm text-danger-600">{propertyModalError}</p>
            )}
            <Input
              label="Property name"
              value={newPropertyForm.name}
              onChange={(event) => setNewPropertyForm((prev) => ({ ...prev, name: event.target.value }))}
            />
            <Input
              label="Address"
              value={newPropertyForm.address}
              onChange={(event) => setNewPropertyForm((prev) => ({ ...prev, address: event.target.value }))}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="City"
                value={newPropertyForm.city}
                onChange={(event) => setNewPropertyForm((prev) => ({ ...prev, city: event.target.value }))}
              />
              <Input
                label="State"
                value={newPropertyForm.state}
                onChange={(event) => setNewPropertyForm((prev) => ({ ...prev, state: event.target.value }))}
              />
            </div>
          </ModalBody>
          <ModalFooter className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setIsPropertyModalOpen(false)}>
              Cancel
            </Button>
            <Button color="primary" onClick={handleCreateProperty} isDisabled={propertySaving} isLoading={propertySaving}>
              Save property
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal
        isOpen={isUnitModalOpen}
        onClose={() => {
          setIsUnitModalOpen(false);
          setUnitModalError(null);
        }}
      >
        <ModalContent>
          <ModalHeader>Add unit</ModalHeader>
          <ModalBody className="space-y-4">
            {unitModalError && (
              <p className="text-sm text-danger-600">{unitModalError}</p>
            )}
            <Input
              label="Unit name"
              value={newUnitName}
              onChange={(event) => setNewUnitName(event.target.value)}
            />
          </ModalBody>
          <ModalFooter className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setIsUnitModalOpen(false)}>
              Cancel
            </Button>
            <Button color="primary" onClick={handleAddUnit} isDisabled={unitSaving} isLoading={unitSaving}>
              Add unit
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default PropertyManagementPage;
