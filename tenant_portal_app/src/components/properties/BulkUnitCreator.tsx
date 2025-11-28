import React, { useState } from 'react';
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
  Checkbox,
} from '@nextui-org/react';
import { Plus, X, Trash2 } from 'lucide-react';

interface UnitFormData {
  name: string;
  bedrooms: string;
  bathrooms: string;
  squareFeet: string;
  rent: string;
  features: string[];
  amenities: string[];
}

interface BulkUnitCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (units: UnitFormData[]) => Promise<void>;
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

export const BulkUnitCreator: React.FC<BulkUnitCreatorProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
  error,
}) => {
  const [units, setUnits] = useState<UnitFormData[]>([
    {
      name: '',
      bedrooms: '',
      bathrooms: '',
      squareFeet: '',
      rent: '',
      features: [],
      amenities: [],
    },
  ]);

  const [bulkPattern, setBulkPattern] = useState({
    prefix: '',
    startNumber: 1,
    count: 1,
    suffix: '',
  });

  const addUnit = () => {
    setUnits([
      ...units,
      {
        name: '',
        bedrooms: '',
        bathrooms: '',
        squareFeet: '',
        rent: '',
        features: [],
        amenities: [],
      },
    ]);
  };

  const removeUnit = (index: number) => {
    setUnits(units.filter((_, i) => i !== index));
  };

  const updateUnit = (index: number, field: keyof UnitFormData, value: any) => {
    setUnits(units.map((unit, i) => (i === index ? { ...unit, [field]: value } : unit)));
  };

  const toggleUnitFeature = (unitIndex: number, feature: string) => {
    const unit = units[unitIndex];
    if (unit.features.includes(feature)) {
      updateUnit(unitIndex, 'features', unit.features.filter((f) => f !== feature));
    } else {
      updateUnit(unitIndex, 'features', [...unit.features, feature]);
    }
  };

  const toggleUnitAmenity = (unitIndex: number, amenity: string) => {
    const unit = units[unitIndex];
    if (unit.amenities.includes(amenity)) {
      updateUnit(unitIndex, 'amenities', unit.amenities.filter((a) => a !== amenity));
    } else {
      updateUnit(unitIndex, 'amenities', [...unit.amenities, amenity]);
    }
  };

  const generateBulkUnits = () => {
    const newUnits: UnitFormData[] = [];
    for (let i = 0; i < bulkPattern.count; i++) {
      const number = bulkPattern.startNumber + i;
      const name = `${bulkPattern.prefix}${number}${bulkPattern.suffix}`;
      newUnits.push({
        name,
        bedrooms: '',
        bathrooms: '',
        squareFeet: '',
        rent: '',
        features: [],
        amenities: [],
      });
    }
    setUnits([...units, ...newUnits]);
    setBulkPattern({ prefix: '', startNumber: 1, count: 1, suffix: '' });
  };

  const handleSubmit = async () => {
    const validUnits = units.filter((u) => u.name.trim());
    if (validUnits.length === 0) {
      return;
    }
    await onSubmit(validUnits);
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
        <ModalHeader>Bulk Create Units</ModalHeader>
        <ModalBody>
          {error && (
            <div className="p-3 rounded-lg bg-danger-50 border border-danger-200">
              <p className="text-sm text-danger-700">{error}</p>
            </div>
          )}

          <Card className="bg-white/5 mb-4">
            <CardBody>
              <h3 className="text-sm font-semibold text-white mb-3">Quick Generate Units</h3>
              <div className="grid grid-cols-4 gap-2">
                <Input
                  size="sm"
                  label="Prefix"
                  value={bulkPattern.prefix}
                  onChange={(e) => setBulkPattern({ ...bulkPattern, prefix: e.target.value })}
                  placeholder="Unit "
                />
                <Input
                  size="sm"
                  label="Start Number"
                  type="number"
                  value={bulkPattern.startNumber.toString()}
                  onChange={(e) =>
                    setBulkPattern({ ...bulkPattern, startNumber: parseInt(e.target.value) || 1 })
                  }
                />
                <Input
                  size="sm"
                  label="Count"
                  type="number"
                  value={bulkPattern.count.toString()}
                  onChange={(e) =>
                    setBulkPattern({ ...bulkPattern, count: parseInt(e.target.value) || 1 })
                  }
                />
                <Input
                  size="sm"
                  label="Suffix"
                  value={bulkPattern.suffix}
                  onChange={(e) => setBulkPattern({ ...bulkPattern, suffix: e.target.value })}
                  placeholder="A"
                />
              </div>
              <Button
                size="sm"
                color="primary"
                onClick={generateBulkUnits}
                className="mt-2"
                startContent={<Plus size={16} />}
              >
                Generate Units
              </Button>
            </CardBody>
          </Card>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {units.map((unit, index) => (
              <Card key={index} className="bg-white/5">
                <CardBody className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-white">Unit {index + 1}</h4>
                    {units.length > 1 && (
                      <Button
                        size="sm"
                        variant="flat"
                        color="danger"
                        onClick={() => removeUnit(index)}
                        startContent={<Trash2 size={14} />}
                      >
                        Remove
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      size="sm"
                      label="Unit Name"
                      value={unit.name}
                      onChange={(e) => updateUnit(index, 'name', e.target.value)}
                      placeholder="e.g., 101, 2A"
                      isRequired
                    />
                    <Input
                      size="sm"
                      label="Rent"
                      type="number"
                      value={unit.rent}
                      onChange={(e) => updateUnit(index, 'rent', e.target.value)}
                      placeholder="0.00"
                      startContent={<span className="text-gray-400">$</span>}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <Input
                      size="sm"
                      label="Bedrooms"
                      type="number"
                      value={unit.bedrooms}
                      onChange={(e) => updateUnit(index, 'bedrooms', e.target.value)}
                      placeholder="0"
                    />
                    <Input
                      size="sm"
                      label="Bathrooms"
                      type="number"
                      value={unit.bathrooms}
                      onChange={(e) => updateUnit(index, 'bathrooms', e.target.value)}
                      placeholder="0"
                    />
                    <Input
                      size="sm"
                      label="Square Feet"
                      type="number"
                      value={unit.squareFeet}
                      onChange={(e) => updateUnit(index, 'squareFeet', e.target.value)}
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <p className="text-xs text-gray-400 mb-2">Features</p>
                    <div className="flex flex-wrap gap-2">
                      {UNIT_FEATURES.map((feature) => (
                        <Chip
                          key={feature}
                          size="sm"
                          onClick={() => toggleUnitFeature(index, feature)}
                          variant={unit.features.includes(feature) ? 'solid' : 'bordered'}
                          color={unit.features.includes(feature) ? 'primary' : 'default'}
                          className="cursor-pointer"
                        >
                          {feature}
                        </Chip>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400 mb-2">Amenities</p>
                    <div className="flex flex-wrap gap-2">
                      {UNIT_AMENITIES.map((amenity) => (
                        <Chip
                          key={amenity}
                          size="sm"
                          onClick={() => toggleUnitAmenity(index, amenity)}
                          variant={unit.amenities.includes(amenity) ? 'solid' : 'bordered'}
                          color={unit.amenities.includes(amenity) ? 'primary' : 'default'}
                          className="cursor-pointer"
                        >
                          {amenity}
                        </Chip>
                      ))}
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>

          <Button
            variant="bordered"
            onClick={addUnit}
            startContent={<Plus size={16} />}
            className="mt-4"
          >
            Add Another Unit
          </Button>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            color="primary"
            onClick={handleSubmit}
            isLoading={isLoading}
            isDisabled={units.filter((u) => u.name.trim()).length === 0}
          >
            Create {units.filter((u) => u.name.trim()).length} Unit(s)
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

