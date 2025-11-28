import React, { useState } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Textarea,
  Select,
  SelectItem,
  Tabs,
  Tab,
  Chip,
  Card,
  CardBody,
} from '@nextui-org/react';
import { X, Plus, Upload, Image as ImageIcon } from 'lucide-react';

interface PropertyFormData {
  // Basic Info
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  propertyType: string;
  description: string;
  yearBuilt: string;
  
  // Financial
  taxId: string;
  annualTaxAmount: string;
  mortgageLender: string;
  mortgageAccountNumber: string;
  monthlyMortgagePayment: string;
  mortgageInterestRate: string;
  
  // Features & Amenities
  features: string[];
  amenities: Array<{ key: string; label: string; value?: string; isFeatured: boolean }>;
  
  // Photos
  photos: Array<{ url: string; caption: string; isPrimary: boolean }>;
  
  // Tags
  tags: string[];
}

interface PropertyFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PropertyFormData) => Promise<void>;
  initialData?: Partial<PropertyFormData>;
  isLoading?: boolean;
  error?: string | null;
}

const PROPERTY_TYPES = [
  'APARTMENT',
  'CONDO',
  'HOUSE',
  'TOWNHOUSE',
  'DUPLEX',
  'TRIPLEX',
  'QUADPLEX',
  'COMMERCIAL',
  'MIXED_USE',
];

const COMMON_AMENITIES = [
  { key: 'parking', label: 'Parking' },
  { key: 'laundry', label: 'Laundry' },
  { key: 'gym', label: 'Fitness Center' },
  { key: 'pool', label: 'Swimming Pool' },
  { key: 'elevator', label: 'Elevator' },
  { key: 'doorman', label: 'Doorman' },
  { key: 'rooftop', label: 'Rooftop Access' },
  { key: 'balcony', label: 'Balcony' },
  { key: 'dishwasher', label: 'Dishwasher' },
  { key: 'ac', label: 'Air Conditioning' },
  { key: 'heating', label: 'Heating' },
  { key: 'pet_friendly', label: 'Pet Friendly' },
  { key: 'furnished', label: 'Furnished' },
  { key: 'storage', label: 'Storage' },
  { key: 'garage', label: 'Garage' },
];

const COMMON_FEATURES = [
  'Hardwood Floors',
  'Carpet',
  'Tile Floors',
  'Granite Countertops',
  'Stainless Steel Appliances',
  'Walk-in Closet',
  'Fireplace',
  'High Ceilings',
  'Natural Light',
  'Updated Kitchen',
  'Updated Bathroom',
];

export const PropertyForm: React.FC<PropertyFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isLoading = false,
  error,
}) => {
  const [activeTab, setActiveTab] = useState('basic');
  const [formData, setFormData] = useState<PropertyFormData>({
    name: initialData?.name || '',
    address: initialData?.address || '',
    city: initialData?.city || '',
    state: initialData?.state || '',
    zipCode: initialData?.zipCode || '',
    country: initialData?.country || 'USA',
    propertyType: initialData?.propertyType || '',
    description: initialData?.description || '',
    yearBuilt: initialData?.yearBuilt || '',
    taxId: initialData?.taxId || '',
    annualTaxAmount: initialData?.annualTaxAmount || '',
    mortgageLender: initialData?.mortgageLender || '',
    mortgageAccountNumber: initialData?.mortgageAccountNumber || '',
    monthlyMortgagePayment: initialData?.monthlyMortgagePayment || '',
    mortgageInterestRate: initialData?.mortgageInterestRate || '',
    features: initialData?.features || [],
    amenities: initialData?.amenities || [],
    photos: initialData?.photos || [],
    tags: initialData?.tags || [],
  });

  const [newTag, setNewTag] = useState('');
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [newPhotoCaption, setNewPhotoCaption] = useState('');

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.address.trim()) {
      return;
    }
    await onSubmit(formData);
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, newTag.trim()] });
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter((t) => t !== tag) });
  };

  const toggleFeature = (feature: string) => {
    if (formData.features.includes(feature)) {
      setFormData({ ...formData, features: formData.features.filter((f) => f !== feature) });
    } else {
      setFormData({ ...formData, features: [...formData.features, feature] });
    }
  };

  const toggleAmenity = (amenityKey: string, amenityLabel: string) => {
    const existing = formData.amenities.find((a) => a.key === amenityKey);
    if (existing) {
      setFormData({
        ...formData,
        amenities: formData.amenities.filter((a) => a.key !== amenityKey),
      });
    } else {
      setFormData({
        ...formData,
        amenities: [...formData.amenities, { key: amenityKey, label: amenityLabel, isFeatured: false }],
      });
    }
  };

  const updateAmenityValue = (key: string, value: string) => {
    setFormData({
      ...formData,
      amenities: formData.amenities.map((a) => (a.key === key ? { ...a, value } : a)),
    });
  };

  const toggleAmenityFeatured = (key: string) => {
    setFormData({
      ...formData,
      amenities: formData.amenities.map((a) => (a.key === key ? { ...a, isFeatured: !a.isFeatured } : a)),
    });
  };

  const addPhoto = () => {
    if (newPhotoUrl.trim()) {
      const isFirstPhoto = formData.photos.length === 0;
      setFormData({
        ...formData,
        photos: [
          ...formData.photos,
          { url: newPhotoUrl.trim(), caption: newPhotoCaption.trim(), isPrimary: isFirstPhoto },
        ],
      });
      setNewPhotoUrl('');
      setNewPhotoCaption('');
    }
  };

  const removePhoto = (index: number) => {
    const newPhotos = formData.photos.filter((_, i) => i !== index);
    if (newPhotos.length > 0 && !newPhotos.some((p) => p.isPrimary)) {
      newPhotos[0].isPrimary = true;
    }
    setFormData({ ...formData, photos: newPhotos });
  };

  const setPrimaryPhoto = (index: number) => {
    setFormData({
      ...formData,
      photos: formData.photos.map((p, i) => ({ ...p, isPrimary: i === index })),
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="5xl"
      scrollBehavior="inside"
      className="max-h-[90vh]"
    >
      <ModalContent>
        <ModalHeader>
          {initialData?.name ? 'Edit Property' : 'Create New Property'}
        </ModalHeader>
        <ModalBody>
          {error && (
            <div className="p-3 rounded-lg bg-danger-50 border border-danger-200">
              <p className="text-sm text-danger-700">{error}</p>
            </div>
          )}

          <Tabs
            selectedKey={activeTab}
            onSelectionChange={(key) => setActiveTab(key as string)}
            className="w-full"
          >
            <Tab key="basic" title="Basic Info">
              <div className="space-y-4 pt-4">
                <Input
                  label="Property Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  isRequired
                  placeholder="e.g., Maple Street Apartments"
                />
                <Input
                  label="Address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  isRequired
                  placeholder="123 Main Street"
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="City"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Springfield"
                  />
                  <Input
                    label="State"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="CA"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="ZIP Code"
                    value={formData.zipCode}
                    onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                    placeholder="12345"
                  />
                  <Input
                    label="Country"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    placeholder="USA"
                  />
                </div>
                <Select
                  label="Property Type"
                  value={formData.propertyType}
                  onChange={(e) => setFormData({ ...formData, propertyType: e.target.value })}
                  placeholder="Select property type"
                >
                  {PROPERTY_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </Select>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Year Built"
                    type="number"
                    value={formData.yearBuilt}
                    onChange={(e) => setFormData({ ...formData, yearBuilt: e.target.value })}
                    placeholder="2020"
                  />
                </div>
                <Textarea
                  label="Description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Property description..."
                  minRows={3}
                />
              </div>
            </Tab>

            <Tab key="financial" title="Financial">
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-white">Tax Information</h3>
                  <Input
                    label="Tax ID / Parcel Number"
                    value={formData.taxId}
                    onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                    placeholder="123-456-789"
                  />
                  <Input
                    label="Annual Tax Amount"
                    type="number"
                    value={formData.annualTaxAmount}
                    onChange={(e) => setFormData({ ...formData, annualTaxAmount: e.target.value })}
                    placeholder="0.00"
                    startContent={<span className="text-gray-400">$</span>}
                  />
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-white">Mortgage Information</h3>
                  <Input
                    label="Lender Name"
                    value={formData.mortgageLender}
                    onChange={(e) => setFormData({ ...formData, mortgageLender: e.target.value })}
                    placeholder="Bank Name"
                  />
                  <Input
                    label="Account Number"
                    value={formData.mortgageAccountNumber}
                    onChange={(e) => setFormData({ ...formData, mortgageAccountNumber: e.target.value })}
                    placeholder="Account #"
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Monthly Payment"
                      type="number"
                      value={formData.monthlyMortgagePayment}
                      onChange={(e) => setFormData({ ...formData, monthlyMortgagePayment: e.target.value })}
                      placeholder="0.00"
                      startContent={<span className="text-gray-400">$</span>}
                    />
                    <Input
                      label="Interest Rate"
                      type="number"
                      value={formData.mortgageInterestRate}
                      onChange={(e) => setFormData({ ...formData, mortgageInterestRate: e.target.value })}
                      placeholder="0.00"
                      endContent={<span className="text-gray-400">%</span>}
                    />
                  </div>
                </div>
              </div>
            </Tab>

            <Tab key="features" title="Features & Amenities">
              <div className="space-y-6 pt-4">
                <div>
                  <h3 className="text-sm font-semibold text-white mb-3">Property Features</h3>
                  <div className="flex flex-wrap gap-2">
                    {COMMON_FEATURES.map((feature) => (
                      <Chip
                        key={feature}
                        onClick={() => toggleFeature(feature)}
                        variant={formData.features.includes(feature) ? 'solid' : 'bordered'}
                        color={formData.features.includes(feature) ? 'primary' : 'default'}
                        className="cursor-pointer"
                      >
                        {feature}
                      </Chip>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-white mb-3">Amenities</h3>
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2 mb-4">
                      {COMMON_AMENITIES.map((amenity) => {
                        const isSelected = formData.amenities.some((a) => a.key === amenity.key);
                        return (
                          <Chip
                            key={amenity.key}
                            onClick={() => toggleAmenity(amenity.key, amenity.label)}
                            variant={isSelected ? 'solid' : 'bordered'}
                            color={isSelected ? 'primary' : 'default'}
                            className="cursor-pointer"
                          >
                            {amenity.label}
                          </Chip>
                        );
                      })}
                    </div>

                    {formData.amenities.length > 0 && (
                      <Card className="bg-white/5">
                        <CardBody className="space-y-3">
                          <p className="text-xs text-gray-400 mb-2">Selected Amenities</p>
                          {formData.amenities.map((amenity) => (
                            <div key={amenity.key} className="flex items-center gap-3">
                              <div className="flex-1">
                                <p className="text-sm text-white">{amenity.label}</p>
                                <Input
                                  size="sm"
                                  placeholder="Value (optional)"
                                  value={amenity.value || ''}
                                  onChange={(e) => updateAmenityValue(amenity.key, e.target.value)}
                                  className="mt-1"
                                />
                              </div>
                              <Chip
                                size="sm"
                                variant={amenity.isFeatured ? 'solid' : 'bordered'}
                                color={amenity.isFeatured ? 'primary' : 'default'}
                                onClick={() => toggleAmenityFeatured(amenity.key)}
                                className="cursor-pointer"
                              >
                                Featured
                              </Chip>
                            </div>
                          ))}
                        </CardBody>
                      </Card>
                    )}
                  </div>
                </div>
              </div>
            </Tab>

            <Tab key="photos" title="Photos">
              <div className="space-y-4 pt-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Photo URL"
                    value={newPhotoUrl}
                    onChange={(e) => setNewPhotoUrl(e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    placeholder="Caption (optional)"
                    value={newPhotoCaption}
                    onChange={(e) => setNewPhotoCaption(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={addPhoto} startContent={<Plus size={16} />}>
                    Add
                  </Button>
                </div>

                {formData.photos.length > 0 && (
                  <div className="grid grid-cols-2 gap-4">
                    {formData.photos.map((photo, index) => (
                      <Card key={index} className="bg-white/5">
                        <CardBody>
                          <div className="relative">
                            <img
                              src={photo.url}
                              alt={photo.caption || `Photo ${index + 1}`}
                              className="w-full h-32 object-cover rounded-lg"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x200?text=Invalid+URL';
                              }}
                            />
                            {photo.isPrimary && (
                              <Chip size="sm" color="primary" className="absolute top-2 left-2">
                                Primary
                              </Chip>
                            )}
                          </div>
                          <div className="mt-2 space-y-2">
                            {photo.caption && (
                              <p className="text-xs text-gray-300">{photo.caption}</p>
                            )}
                            <div className="flex gap-2">
                              {!photo.isPrimary && (
                                <Button
                                  size="sm"
                                  variant="flat"
                                  onClick={() => setPrimaryPhoto(index)}
                                >
                                  Set Primary
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="flat"
                                color="danger"
                                onClick={() => removePhoto(index)}
                                startContent={<X size={14} />}
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                        </CardBody>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </Tab>

            <Tab key="tags" title="Tags">
              <div className="space-y-4 pt-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Add tag"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                    className="flex-1"
                  />
                  <Button onClick={addTag} startContent={<Plus size={16} />}>
                    Add Tag
                  </Button>
                </div>
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag) => (
                      <Chip
                        key={tag}
                        onClose={() => removeTag(tag)}
                        variant="flat"
                        color="primary"
                      >
                        {tag}
                      </Chip>
                    ))}
                  </div>
                )}
              </div>
            </Tab>
          </Tabs>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            color="primary"
            onClick={handleSubmit}
            isLoading={isLoading}
            isDisabled={!formData.name.trim() || !formData.address.trim()}
          >
            {initialData?.name ? 'Update Property' : 'Create Property'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

