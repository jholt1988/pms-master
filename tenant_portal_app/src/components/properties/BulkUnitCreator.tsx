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
      classNames={{
        backdrop: "bg-black/80",
        base: "bg-[#0a0a0a]",
        wrapper: "bg-black/80",
      }}
    >
      <ModalContent className="bg-[#0a0a0a] border border-white/20">
        <ModalHeader className="text-xl font-bold text-white bg-[#0a0a0a] border-b border-white/10">Bulk Create Units</ModalHeader>
        <ModalBody className="bg-[#0a0a0a]">
          {error && (
            <div className="p-3 rounded-lg bg-danger-50 border border-danger-200">
              <p className="text-sm text-danger-700">{error}</p>
            </div>
          )}

          <Card className="bg-[#1a1a1a] border-white/30 mb-4">
            <CardBody>
              <h3 className="text-base font-semibold text-white mb-3">Quick Generate Units</h3>
              <div className="grid grid-cols-4 gap-3">
                <Input
                  size="md"
                  value={bulkPattern.prefix}
                  onChange={(e) => setBulkPattern({ ...bulkPattern, prefix: e.target.value })}
                  placeholder="Prefix (e.g., Unit )"
                  classNames={{
                    input: "text-white",
                  }}
                />
                <Input
                  size="md"
                  type="number"
                  value={bulkPattern.startNumber.toString()}
                  onChange={(e) =>
                    setBulkPattern({ ...bulkPattern, startNumber: parseInt(e.target.value) || 1 })
                  }
                  placeholder="Start Number"
                  classNames={{
                    input: "text-white",
                  }}
                />
                <Input
                  size="md"
                  type="number"
                  value={bulkPattern.count.toString()}
                  onChange={(e) =>
                    setBulkPattern({ ...bulkPattern, count: parseInt(e.target.value) || 1 })
                  }
                  placeholder="Count"
                  classNames={{
                    input: "text-white",
                  }}
                />
                <Input
                  size="md"
                  value={bulkPattern.suffix}
                  onChange={(e) => setBulkPattern({ ...bulkPattern, suffix: e.target.value })}
                  placeholder="Suffix (e.g., A)"
                  classNames={{
                    input: "text-white",
                  }}
                />
              </div>
              <Button
                size="md"
                color="primary"
                onClick={generateBulkUnits}
                className="mt-3"
                startContent={<Plus size={18} />}
              >
                Generate Units
              </Button>
            </CardBody>
          </Card>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {units.map((unit, index) => (
              <Card key={index} className="bg-[#1a1a1a] border-white/30">
                <CardBody className="space-y-4 p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-base font-bold text-white">Unit {index + 1}</h4>
                    {units.length > 1 && (
                      <Button
                        size="md"
                        variant="flat"
                        color="danger"
                        onClick={() => removeUnit(index)}
                        startContent={<Trash2 size={16} />}
                      >
                        Remove
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      size="md"
                      value={unit.name}
                      onChange={(e) => updateUnit(index, 'name', e.target.value)}
                      placeholder="Unit Name (e.g., 101, 2A)"
                      isRequired
                      classNames={{
                        input: "text-white",
                      }}
                    />
                    <Input
                      size="md"
                      type="number"
                      value={unit.rent}
                      onChange={(e) => updateUnit(index, 'rent', e.target.value)}
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
                      value={unit.bedrooms}
                      onChange={(e) => updateUnit(index, 'bedrooms', e.target.value)}
                      placeholder="Bedrooms"
                      classNames={{
                        input: "text-white",
                      }}
                    />
                    <Input
                      size="md"
                      type="number"
                      value={unit.bathrooms}
                      onChange={(e) => updateUnit(index, 'bathrooms', e.target.value)}
                      placeholder="Bathrooms"
                      classNames={{
                        input: "text-white",
                      }}
                    />
                    <Input
                      size="md"
                      type="number"
                      value={unit.squareFeet}
                      onChange={(e) => updateUnit(index, 'squareFeet', e.target.value)}
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
                        const isSelected = unit.features.includes(feature);
                        return (
                          <Chip
                            key={feature}
                            size="md"
                            onClick={() => toggleUnitFeature(index, feature)}
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
                        const isSelected = unit.amenities.includes(amenity);
                        return (
                          <Chip
                            key={amenity}
                            size="md"
                            onClick={() => toggleUnitAmenity(index, amenity)}
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
            ))}
          </div>

          <Button
            variant="bordered"
            size="md"
            onClick={addUnit}
            startContent={<Plus size={18} />}
            className="mt-4"
          >
            Add Another Unit
          </Button>
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
            isDisabled={units.filter((u) => u.name.trim()).length === 0}
          >
            Create {units.filter((u) => u.name.trim()).length} Unit(s)
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

