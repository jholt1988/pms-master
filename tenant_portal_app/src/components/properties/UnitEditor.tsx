import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Card,
  CardBody,
  Chip,
} from '@nextui-org/react';

interface UnitFormData {
  name: string;
  bedrooms: string;
  bathrooms: string;
  squareFeet: string;
  rent: string;
  features: string[];
  amenities: string[];
}

interface UnitEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (unit: UnitFormData) => Promise<void>;
  initialData?: {
    name: string;
    bedrooms?: number;
    bathrooms?: number;
    squareFeet?: number;
    rent?: number;
    hasParking?: boolean;
    hasLaundry?: boolean;
    hasBalcony?: boolean;
    hasAC?: boolean;
    isFurnished?: boolean;
    petsAllowed?: boolean;
  };
  isLoading?: boolean;
  error?: string | null;
}

const UNIT_FEATURES = [
  'Parking',
  'Laundry',
  'Balcony',
  'AC',
  'Furnished',
  'Pet Friendly',
  'Storage',
  'Garage',
];

const UNIT_AMENITIES = [
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

export const UnitEditor: React.FC<UnitEditorProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isLoading = false,
  error,
}) => {
  const [formData, setFormData] = useState<UnitFormData>({
    name: '',
    bedrooms: '',
    bathrooms: '',
    squareFeet: '',
    rent: '',
    features: [],
    amenities: [],
  });

  useEffect(() => {
    if (initialData) {
      const features: string[] = [];
      if (initialData.hasParking) features.push('Parking');
      if (initialData.hasLaundry) features.push('Laundry');
      if (initialData.hasBalcony) features.push('Balcony');
      if (initialData.hasAC) features.push('AC');
      if (initialData.isFurnished) features.push('Furnished');
      if (initialData.petsAllowed) features.push('Pet Friendly');

      setFormData({
        name: initialData.name || '',
        bedrooms: initialData.bedrooms?.toString() || '',
        bathrooms: initialData.bathrooms?.toString() || '',
        squareFeet: initialData.squareFeet?.toString() || '',
        rent: initialData.rent?.toString() || '',
        features,
        amenities: [], // Amenities would need to come from backend if available
      });
    } else {
      setFormData({
        name: '',
        bedrooms: '',
        bathrooms: '',
        squareFeet: '',
        rent: '',
        features: [],
        amenities: [],
      });
    }
  }, [initialData, isOpen]);

  const toggleFeature = (feature: string) => {
    if (formData.features.includes(feature)) {
      setFormData({
        ...formData,
        features: formData.features.filter((f) => f !== feature),
      });
    } else {
      setFormData({
        ...formData,
        features: [...formData.features, feature],
      });
    }
  };

  const toggleAmenity = (amenity: string) => {
    if (formData.amenities.includes(amenity)) {
      setFormData({
        ...formData,
        amenities: formData.amenities.filter((a) => a !== amenity),
      });
    } else {
      setFormData({
        ...formData,
        amenities: [...formData.amenities, amenity],
      });
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      return;
    }
    await onSubmit(formData);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="3xl"
      scrollBehavior="inside"
      className="max-h-[90vh]"
      classNames={{
        backdrop: "bg-black/80",
        base: "bg-[#0a0a0a]",
        wrapper: "bg-black/80",
      }}
    >
      <ModalContent className="bg-[#0a0a0a] border border-white/20">
        <ModalHeader className="text-xl font-bold text-white bg-[#0a0a0a] border-b border-white/10">
          {initialData ? 'Edit Unit' : 'Create Unit'}
        </ModalHeader>
        <ModalBody className="bg-[#0a0a0a]">
          {error && (
            <div className="p-3 rounded-lg bg-danger-50 border border-danger-200">
              <p className="text-sm text-danger-700">{error}</p>
            </div>
          )}

          <Card className="bg-[#1a1a1a] border-white/30">
            <CardBody className="space-y-4 p-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  size="md"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Unit Name (e.g., 101, 2A)"
                  isRequired
                  classNames={{
                    input: "text-white",
                  }}
                />
                <Input
                  size="md"
                  type="number"
                  value={formData.rent}
                  onChange={(e) => setFormData({ ...formData, rent: e.target.value })}
                  placeholder="Rent ($)"
                  startContent={<span className="text-gray-300">$</span>}
                  classNames={{
                    input: "text-white",
                  }}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Input
                  size="md"
                  type="number"
                  value={formData.bedrooms}
                  onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
                  placeholder="Bedrooms"
                  classNames={{
                    input: "text-white",
                  }}
                />
                <Input
                  size="md"
                  type="number"
                  value={formData.bathrooms}
                  onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
                  placeholder="Bathrooms"
                  classNames={{
                    input: "text-white",
                  }}
                />
                <Input
                  size="md"
                  type="number"
                  value={formData.squareFeet}
                  onChange={(e) => setFormData({ ...formData, squareFeet: e.target.value })}
                  placeholder="Square Feet"
                  classNames={{
                    input: "text-white",
                  }}
                />
              </div>

              <div>
                <p className="text-sm font-medium text-gray-300 mb-3">Features</p>
                <div className="flex flex-wrap gap-2">
                  {UNIT_FEATURES.map((feature) => {
                    const isSelected = formData.features.includes(feature);
                    return (
                      <Chip
                        key={feature}
                        size="md"
                        onClick={() => toggleFeature(feature)}
                        variant={isSelected ? 'solid' : 'bordered'}
                        color={isSelected ? 'primary' : 'default'}
                        className={`cursor-pointer transition-all ${
                          isSelected 
                            ? 'bg-primary-500 text-white font-semibold border-2 border-primary-400' 
                            : 'bg-transparent text-gray-300 border-gray-500 hover:border-gray-400'
                        }`}
                      >
                        {isSelected && '✓ '}
                        {feature}
                      </Chip>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-300 mb-3">Amenities</p>
                <div className="flex flex-wrap gap-2">
                  {UNIT_AMENITIES.map((amenity) => {
                    const isSelected = formData.amenities.includes(amenity);
                    return (
                      <Chip
                        key={amenity}
                        size="md"
                        onClick={() => toggleAmenity(amenity)}
                        variant={isSelected ? 'solid' : 'bordered'}
                        color={isSelected ? 'primary' : 'default'}
                        className={`cursor-pointer transition-all ${
                          isSelected 
                            ? 'bg-primary-500 text-white font-semibold border-2 border-primary-400' 
                            : 'bg-transparent text-gray-300 border-gray-500 hover:border-gray-400'
                        }`}
                      >
                        {isSelected && '✓ '}
                        {amenity}
                      </Chip>
                    );
                  })}
                </div>
              </div>
            </CardBody>
          </Card>
        </ModalBody>
        <ModalFooter className="bg-[#0a0a0a] border-t border-white/10">
          <Button variant="ghost" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button
            color="primary"
            size="md"
            onClick={handleSubmit}
            isLoading={isLoading}
            isDisabled={!formData.name.trim()}
          >
            {initialData ? 'Update Unit' : 'Create Unit'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

