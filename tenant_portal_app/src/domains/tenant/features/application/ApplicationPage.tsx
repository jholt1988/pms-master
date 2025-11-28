import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardBody,
  CardHeader,
  Input,
  Select,
  SelectItem,
  Textarea,
  Button,
  Divider,
  Spinner,
  Checkbox,
  Tabs,
  Tab,
} from '@nextui-org/react';
import { 
  CheckCircle2, 
  AlertCircle, 
  Building2, 
  User, 
  Briefcase, 
  DollarSign,
  FileText,
  Users,
  Home,
  Car,
  Dog,
  Upload,
  X,
  Plus,
  Shield,
  Info
} from 'lucide-react';
import { baseColors } from '../../../../design-tokens/colors';
import { spacing } from '../../../../design-tokens/spacing';
import { fontSize, fontWeight } from '../../../../design-tokens/typography';
import { elevation } from '../../../../design-tokens/shadows';
import { apiFetch } from '../../../../services/apiClient';

interface Property {
  id: number;
  name: string;
  address: string;
  units: Unit[];
}

interface Unit {
  id: number;
  name: string;
  rent?: number;
}

interface Reference {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  email: string;
  yearsKnown: string;
}

interface PastLandlord {
  id: string;
  name: string;
  phone: string;
  email: string;
  propertyAddress: string;
  startDate: string;
  endDate: string;
  monthlyRent: string;
  reasonForLeaving: string;
}

interface Employment {
  id: string;
  employerName: string;
  jobTitle: string;
  supervisorName: string;
  phone: string;
  email: string;
  startDate: string;
  monthlyIncome: string;
  employmentType: string;
}

interface AdditionalIncome {
  id: string;
  source: string;
  amount: string;
  frequency: string;
}

interface Pet {
  id: string;
  type: string;
  breed: string;
  name: string;
  weight: string;
  age: string;
  vaccinated: boolean;
  spayedNeutered: boolean;
}

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: string;
  color: string;
  licensePlate: string;
  registeredOwner: string;
}

/**
 * Enhanced rental application page with comprehensive sections
 * Features: Individual sections for references, landlords, employment, pets, vehicles, documents
 */
const RentalApplicationPage: React.FC = () => {
  const navigate = useNavigate();
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [units, setUnits] = useState<Unit[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  
  // Personal Information
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [previousAddress, setPreviousAddress] = useState('');
  
  // References
  const [references, setReferences] = useState<Reference[]>([
    { id: '1', name: '', relationship: '', phone: '', email: '', yearsKnown: '' }
  ]);
  
  // Past Landlords
  const [pastLandlords, setPastLandlords] = useState<PastLandlord[]>([
    { id: '1', name: '', phone: '', email: '', propertyAddress: '', startDate: '', endDate: '', monthlyRent: '', reasonForLeaving: '' }
  ]);
  
  // Employment
  const [employments, setEmployments] = useState<Employment[]>([
    { id: '1', employerName: '', jobTitle: '', supervisorName: '', phone: '', email: '', startDate: '', monthlyIncome: '', employmentType: '' }
  ]);
  
  // Additional Income
  const [additionalIncomes, setAdditionalIncomes] = useState<AdditionalIncome[]>([]);
  
  // Financial
  const [creditScore, setCreditScore] = useState('');
  const [monthlyDebt, setMonthlyDebt] = useState('');
  
  // Pets
  const [pets, setPets] = useState<Pet[]>([]);
  
  // Vehicles
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  
  // Documents
  const [ssCardFile, setSsCardFile] = useState<File | null>(null);
  const [dlIdFile, setDlIdFile] = useState<File | null>(null);
  
  // Authorizations
  const [authorizeCreditCheck, setAuthorizeCreditCheck] = useState(false);
  const [authorizeBackgroundCheck, setAuthorizeBackgroundCheck] = useState(false);
  const [authorizeEmploymentVerification, setAuthorizeEmploymentVerification] = useState(false);
  
  // Negative Aspects Explanation
  const [negativeAspectsExplanation, setNegativeAspectsExplanation] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('property');

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const data = await apiFetch('/properties/public');
        setProperties(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, []);

  useEffect(() => {
    if (selectedProperty) {
      const property = properties.find((p) => p.id === Number(selectedProperty));
      if (property) {
        setUnits(property.units);
      }
    }
  }, [selectedProperty, properties]);

  const addReference = () => {
    setReferences([...references, { id: Date.now().toString(), name: '', relationship: '', phone: '', email: '', yearsKnown: '' }]);
  };

  const removeReference = (id: string) => {
    if (references.length > 1) {
      setReferences(references.filter(r => r.id !== id));
    }
  };

  const updateReference = (id: string, field: keyof Reference, value: string) => {
    setReferences(references.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const addPastLandlord = () => {
    setPastLandlords([...pastLandlords, { id: Date.now().toString(), name: '', phone: '', email: '', propertyAddress: '', startDate: '', endDate: '', monthlyRent: '', reasonForLeaving: '' }]);
  };

  const removePastLandlord = (id: string) => {
    if (pastLandlords.length > 1) {
      setPastLandlords(pastLandlords.filter(l => l.id !== id));
    }
  };

  const updatePastLandlord = (id: string, field: keyof PastLandlord, value: string) => {
    setPastLandlords(pastLandlords.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  const addEmployment = () => {
    setEmployments([...employments, { id: Date.now().toString(), employerName: '', jobTitle: '', supervisorName: '', phone: '', email: '', startDate: '', monthlyIncome: '', employmentType: '' }]);
  };

  const removeEmployment = (id: string) => {
    if (employments.length > 1) {
      setEmployments(employments.filter(e => e.id !== id));
    }
  };

  const updateEmployment = (id: string, field: keyof Employment, value: string) => {
    setEmployments(employments.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const addAdditionalIncome = () => {
    setAdditionalIncomes([...additionalIncomes, { id: Date.now().toString(), source: '', amount: '', frequency: 'monthly' }]);
  };

  const removeAdditionalIncome = (id: string) => {
    setAdditionalIncomes(additionalIncomes.filter(i => i.id !== id));
  };

  const updateAdditionalIncome = (id: string, field: keyof AdditionalIncome, value: string) => {
    setAdditionalIncomes(additionalIncomes.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const addPet = () => {
    setPets([...pets, { id: Date.now().toString(), type: '', breed: '', name: '', weight: '', age: '', vaccinated: false, spayedNeutered: false }]);
  };

  const removePet = (id: string) => {
    setPets(pets.filter(p => p.id !== id));
  };

  const updatePet = (id: string, field: keyof Pet, value: string | boolean) => {
    setPets(pets.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const addVehicle = () => {
    setVehicles([...vehicles, { id: Date.now().toString(), make: '', model: '', year: '', color: '', licensePlate: '', registeredOwner: '' }]);
  };

  const removeVehicle = (id: string) => {
    setVehicles(vehicles.filter(v => v.id !== id));
  };

  const updateVehicle = (id: string, field: keyof Vehicle, value: string) => {
    setVehicles(vehicles.map(v => v.id === id ? { ...v, [field]: value } : v));
  };

  const handleFileUpload = (type: 'ssCard' | 'dlId', file: File | null) => {
    if (type === 'ssCard') {
      setSsCardFile(file);
    } else {
      setDlIdFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(false);

    // Validate required authorizations
    if (!authorizeCreditCheck || !authorizeBackgroundCheck || !authorizeEmploymentVerification) {
      setError('Please authorize all required checks to proceed.');
      setSubmitting(false);
      return;
    }

    try {
      // Calculate total income
      const employmentIncome = employments.reduce((sum, e) => sum + (parseFloat(e.monthlyIncome) || 0), 0);
      const additionalIncomeTotal = additionalIncomes
        .filter(i => i.frequency === 'monthly')
        .reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);
      const totalMonthlyIncome = employmentIncome + additionalIncomeTotal;

      const data = await apiFetch('/rental-applications', {
        method: 'POST',
        body: {
          propertyId: Number(selectedProperty),
          unitId: Number(selectedUnit),
          fullName,
          email,
          phoneNumber,
          previousAddress,
          income: totalMonthlyIncome,
          creditScore: creditScore ? Number(creditScore) : undefined,
          monthlyDebt: monthlyDebt ? Number(monthlyDebt) : undefined,
          references: references.filter(r => r.name.trim()),
          pastLandlords: pastLandlords.filter(l => l.name.trim()),
          employments: employments.filter(e => e.employerName.trim()),
          additionalIncomes: additionalIncomes.filter(i => i.source.trim()),
          pets: pets.filter(p => p.type.trim()),
          vehicles: vehicles.filter(v => v.make.trim()),
          authorizeCreditCheck,
          authorizeBackgroundCheck,
          authorizeEmploymentVerification,
          negativeAspectsExplanation: negativeAspectsExplanation.trim() || undefined,
          // Note: File uploads would need to be handled via FormData in a real implementation
          ssCardUploaded: !!ssCardFile,
          dlIdUploaded: !!dlIdFile,
        },
      });

      const applicationId = data?.id || 'APP-' + Date.now().toString().slice(-6);
      navigate(`/rental-application/confirmation?id=${applicationId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" label="Loading properties..." />
      </div>
    );
  }

  const selectedUnitData = units.find((u) => u.id === Number(selectedUnit));

  return (
    <div 
      className="container mx-auto p-6 max-w-5xl"
      style={{ padding: spacing[6] }}
    >
      {/* Header */}
      <div className="mb-6">
        <h1 
          style={{ 
            fontSize: fontSize['3xl'],
            fontWeight: fontWeight.bold,
            color: baseColors.neutral[900],
            marginBottom: spacing[2]
          }}
        >
          Rental Application
        </h1>
        <p style={{ fontSize: fontSize.base, color: baseColors.neutral[600] }}>
          Complete all sections below to apply for your new home
        </p>
      </div>

      {/* Success Message */}
      {success && (
        <Card className="mb-6" style={{ backgroundColor: baseColors.success[50], border: `1px solid ${baseColors.success[200]}` }}>
          <CardBody>
            <div className="flex items-center gap-3">
              <CheckCircle2 size={24} style={{ color: baseColors.success[600] }} />
              <div>
                <p style={{ fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: baseColors.success[900] }}>
                  Application submitted successfully!
                </p>
                <p style={{ fontSize: fontSize.sm, color: baseColors.success[700] }}>
                  We&apos;ll review your application and contact you soon.
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Error Message */}
      {error && (
        <Card className="mb-6" style={{ backgroundColor: baseColors.danger[50], border: `1px solid ${baseColors.danger[200]}` }}>
          <CardBody>
            <div className="flex items-start gap-3">
              <AlertCircle size={24} style={{ color: baseColors.danger[600], flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: baseColors.danger[900] }}>
                  Error submitting application
                </p>
                <p style={{ fontSize: fontSize.sm, color: baseColors.danger[700] }}>
                  {error}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Tabs
          selectedKey={activeTab}
          onSelectionChange={(key) => setActiveTab(key as string)}
          className="w-full"
        >
          {/* Property Selection Tab */}
          <Tab key="property" title="Property">
            <Card shadow="sm" style={{ boxShadow: elevation.card }} className="mt-4">
              <CardHeader style={{ padding: spacing[4] }}>
                <div className="flex items-center gap-2">
                  <Building2 size={20} style={{ color: baseColors.primary[600] }} />
                  <h2 style={{ fontSize: fontSize.lg, fontWeight: fontWeight.semibold }}>
                    Property Information
                  </h2>
                </div>
              </CardHeader>
              <Divider />
              <CardBody style={{ padding: spacing[4] }} className="space-y-4">
                <Select
                  placeholder="Choose a property"
                  selectedKeys={selectedProperty ? [selectedProperty] : []}
                  onChange={(e) => setSelectedProperty(e.target.value)}
                  isRequired
                  variant="bordered"
                  size="lg"
                >
                  {properties.map((property) => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.name} - {property.address}
                    </SelectItem>
                  ))}
                </Select>

                <Select
                  placeholder="Choose a unit"
                  selectedKeys={selectedUnit ? [selectedUnit] : []}
                  onChange={(e) => setSelectedUnit(e.target.value)}
                  isRequired
                  isDisabled={!selectedProperty}
                  variant="bordered"
                  size="lg"
                  description={selectedUnitData?.rent ? `Rent: $${selectedUnitData.rent}/month` : undefined}
                >
                  {units.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id}>
                      {unit.name}
                    </SelectItem>
                  ))}
                </Select>
              </CardBody>
            </Card>
          </Tab>

          {/* Personal Information Tab */}
          <Tab key="personal" title="Personal Info">
            <Card shadow="sm" style={{ boxShadow: elevation.card }} className="mt-4">
              <CardHeader style={{ padding: spacing[4] }}>
                <div className="flex items-center gap-2">
                  <User size={20} style={{ color: baseColors.primary[600] }} />
                  <h2 style={{ fontSize: fontSize.lg, fontWeight: fontWeight.semibold }}>
                    Personal Information
                  </h2>
                </div>
              </CardHeader>
              <Divider />
              <CardBody style={{ padding: spacing[4] }} className="space-y-4">
                <Input
                  placeholder="Enter your full legal name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  isRequired
                  variant="bordered"
                  size="lg"
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    type="email"
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    isRequired
                    variant="bordered"
                    size="lg"
                  />

                  <Input
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    isRequired
                    variant="bordered"
                    size="lg"
                  />
                </div>

                <Textarea
                  placeholder="Enter your current or most recent address"
                  value={previousAddress}
                  onChange={(e) => setPreviousAddress(e.target.value)}
                  isRequired
                  variant="bordered"
                  minRows={3}
                />
              </CardBody>
            </Card>
          </Tab>

          {/* References Tab */}
          <Tab key="references" title="References">
            <Card shadow="sm" style={{ boxShadow: elevation.card }} className="mt-4">
              <CardHeader style={{ padding: spacing[4] }}>
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <Users size={20} style={{ color: baseColors.primary[600] }} />
                    <h2 style={{ fontSize: fontSize.lg, fontWeight: fontWeight.semibold }}>
                      Personal References
                    </h2>
                  </div>
                  <Button
                    size="sm"
                    variant="flat"
                    onClick={addReference}
                    startContent={<Plus size={16} />}
                  >
                    Add Reference
                  </Button>
                </div>
              </CardHeader>
              <Divider />
              <CardBody style={{ padding: spacing[4] }} className="space-y-4">
                {references.map((ref, index) => (
                  <Card key={ref.id} className="bg-white/5 border border-white/10">
                    <CardBody className="space-y-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-white">Reference {index + 1}</h3>
                        {references.length > 1 && (
                          <Button
                            size="sm"
                            variant="light"
                            color="danger"
                            onClick={() => removeReference(ref.id)}
                            startContent={<X size={14} />}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Input
                          placeholder="Full Name"
                          value={ref.name}
                          onChange={(e) => updateReference(ref.id, 'name', e.target.value)}
                          variant="bordered"
                          size="md"
                          classNames={{
                            input: "text-white",
                            inputWrapper: "bg-white/5 border-white/10"
                          }}
                        />
                        <Input
                          placeholder="Relationship (e.g., Friend, Colleague, Family)"
                          value={ref.relationship}
                          onChange={(e) => updateReference(ref.id, 'relationship', e.target.value)}
                          variant="bordered"
                          size="md"
                          classNames={{
                            input: "text-white",
                            inputWrapper: "bg-white/5 border-white/10"
                          }}
                        />
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Input
                          placeholder="Phone Number"
                          value={ref.phone}
                          onChange={(e) => updateReference(ref.id, 'phone', e.target.value)}
                          variant="bordered"
                          size="md"
                          classNames={{
                            input: "text-white",
                            inputWrapper: "bg-white/5 border-white/10"
                          }}
                        />
                        <Input
                          type="email"
                          placeholder="Email Address"
                          value={ref.email}
                          onChange={(e) => updateReference(ref.id, 'email', e.target.value)}
                          variant="bordered"
                          size="md"
                          classNames={{
                            input: "text-white",
                            inputWrapper: "bg-white/5 border-white/10"
                          }}
                        />
                      </div>
                      <Input
                        placeholder="Years Known"
                        value={ref.yearsKnown}
                        onChange={(e) => updateReference(ref.id, 'yearsKnown', e.target.value)}
                        variant="bordered"
                        size="md"
                        classNames={{
                          input: "text-white",
                          inputWrapper: "bg-white/5 border-white/10"
                        }}
                      />
                    </CardBody>
                  </Card>
                ))}
              </CardBody>
            </Card>
          </Tab>

          {/* Past Landlords Tab */}
          <Tab key="landlords" title="Past Landlords">
            <Card shadow="sm" style={{ boxShadow: elevation.card }} className="mt-4">
              <CardHeader style={{ padding: spacing[4] }}>
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <Home size={20} style={{ color: baseColors.primary[600] }} />
                    <h2 style={{ fontSize: fontSize.lg, fontWeight: fontWeight.semibold }}>
                      Past Landlords
                    </h2>
                  </div>
                  <Button
                    size="sm"
                    variant="flat"
                    onClick={addPastLandlord}
                    startContent={<Plus size={16} />}
                  >
                    Add Landlord
                  </Button>
                </div>
              </CardHeader>
              <Divider />
              <CardBody style={{ padding: spacing[4] }} className="space-y-4">
                {pastLandlords.map((landlord, index) => (
                  <Card key={landlord.id} className="bg-white/5 border border-white/10">
                    <CardBody className="space-y-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-white">Landlord {index + 1}</h3>
                        {pastLandlords.length > 1 && (
                          <Button
                            size="sm"
                            variant="light"
                            color="danger"
                            onClick={() => removePastLandlord(landlord.id)}
                            startContent={<X size={14} />}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Input
                          placeholder="Landlord Name"
                          value={landlord.name}
                          onChange={(e) => updatePastLandlord(landlord.id, 'name', e.target.value)}
                          variant="bordered"
                          size="md"
                          classNames={{
                            input: "text-white",
                            inputWrapper: "bg-white/5 border-white/10"
                          }}
                        />
                        <Input
                          placeholder="Phone Number"
                          value={landlord.phone}
                          onChange={(e) => updatePastLandlord(landlord.id, 'phone', e.target.value)}
                          variant="bordered"
                          size="md"
                          classNames={{
                            input: "text-white",
                            inputWrapper: "bg-white/5 border-white/10"
                          }}
                        />
                      </div>
                      <Input
                        type="email"
                        placeholder="Email Address"
                        value={landlord.email}
                        onChange={(e) => updatePastLandlord(landlord.id, 'email', e.target.value)}
                        variant="bordered"
                        size="md"
                        classNames={{
                          input: "text-white",
                          inputWrapper: "bg-white/5 border-white/10"
                        }}
                      />
                      <Textarea
                        placeholder="Property Address"
                        value={landlord.propertyAddress}
                        onChange={(e) => updatePastLandlord(landlord.id, 'propertyAddress', e.target.value)}
                        variant="bordered"
                        minRows={2}
                        classNames={{
                          input: "text-white",
                          inputWrapper: "bg-white/5 border-white/10"
                        }}
                      />
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Input
                          type="date"
                          placeholder="Start Date"
                          value={landlord.startDate}
                          onChange={(e) => updatePastLandlord(landlord.id, 'startDate', e.target.value)}
                          variant="bordered"
                          size="md"
                          classNames={{
                            input: "text-white",
                            inputWrapper: "bg-white/5 border-white/10"
                          }}
                        />
                        <Input
                          type="date"
                          placeholder="End Date"
                          value={landlord.endDate}
                          onChange={(e) => updatePastLandlord(landlord.id, 'endDate', e.target.value)}
                          variant="bordered"
                          size="md"
                          classNames={{
                            input: "text-white",
                            inputWrapper: "bg-white/5 border-white/10"
                          }}
                        />
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Input
                          type="number"
                          placeholder="Monthly Rent"
                          value={landlord.monthlyRent}
                          onChange={(e) => updatePastLandlord(landlord.id, 'monthlyRent', e.target.value)}
                          variant="bordered"
                          size="md"
                          startContent={<span className="text-gray-400">$</span>}
                          classNames={{
                            input: "text-white",
                            inputWrapper: "bg-white/5 border-white/10"
                          }}
                        />
                        <Input
                          placeholder="Reason for Leaving (e.g., End of lease, Relocation)"
                          value={landlord.reasonForLeaving}
                          onChange={(e) => updatePastLandlord(landlord.id, 'reasonForLeaving', e.target.value)}
                          variant="bordered"
                          size="md"
                          classNames={{
                            input: "text-white",
                            inputWrapper: "bg-white/5 border-white/10"
                          }}
                        />
                      </div>
                    </CardBody>
                  </Card>
                ))}
              </CardBody>
            </Card>
          </Tab>

          {/* Employment Tab */}
          <Tab key="employment" title="Employment">
            <Card shadow="sm" style={{ boxShadow: elevation.card }} className="mt-4">
              <CardHeader style={{ padding: spacing[4] }}>
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <Briefcase size={20} style={{ color: baseColors.primary[600] }} />
                    <h2 style={{ fontSize: fontSize.lg, fontWeight: fontWeight.semibold }}>
                      Employment Details
                    </h2>
                  </div>
                  <Button
                    size="sm"
                    variant="flat"
                    onClick={addEmployment}
                    startContent={<Plus size={16} />}
                  >
                    Add Employment
                  </Button>
                </div>
              </CardHeader>
              <Divider />
              <CardBody style={{ padding: spacing[4] }} className="space-y-4">
                {employments.map((emp, index) => (
                  <Card key={emp.id} className="bg-white/5 border border-white/10">
                    <CardBody className="space-y-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-white">Employment {index + 1}</h3>
                        {employments.length > 1 && (
                          <Button
                            size="sm"
                            variant="light"
                            color="danger"
                            onClick={() => removeEmployment(emp.id)}
                            startContent={<X size={14} />}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Input
                          placeholder="Employer Name"
                          value={emp.employerName}
                          onChange={(e) => updateEmployment(emp.id, 'employerName', e.target.value)}
                          variant="bordered"
                          size="md"
                          isRequired={index === 0}
                          classNames={{
                            input: "text-white",
                            inputWrapper: "bg-white/5 border-white/10"
                          }}
                        />
                        <Input
                          placeholder="Job Title"
                          value={emp.jobTitle}
                          onChange={(e) => updateEmployment(emp.id, 'jobTitle', e.target.value)}
                          variant="bordered"
                          size="md"
                          classNames={{
                            input: "text-white",
                            inputWrapper: "bg-white/5 border-white/10"
                          }}
                        />
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Input
                          placeholder="Supervisor Name"
                          value={emp.supervisorName}
                          onChange={(e) => updateEmployment(emp.id, 'supervisorName', e.target.value)}
                          variant="bordered"
                          size="md"
                          classNames={{
                            input: "text-white",
                            inputWrapper: "bg-white/5 border-white/10"
                          }}
                        />
                        <Input
                          placeholder="Phone Number"
                          value={emp.phone}
                          onChange={(e) => updateEmployment(emp.id, 'phone', e.target.value)}
                          variant="bordered"
                          size="md"
                          classNames={{
                            input: "text-white",
                            inputWrapper: "bg-white/5 border-white/10"
                          }}
                        />
                      </div>
                      <Input
                        type="email"
                        placeholder="Email Address"
                        value={emp.email}
                        onChange={(e) => updateEmployment(emp.id, 'email', e.target.value)}
                        variant="bordered"
                        size="md"
                        classNames={{
                          input: "text-white",
                          inputWrapper: "bg-white/5 border-white/10"
                        }}
                      />
                      <div className="grid gap-4 sm:grid-cols-3">
                        <Input
                          type="date"
                          placeholder="Start Date"
                          value={emp.startDate}
                          onChange={(e) => updateEmployment(emp.id, 'startDate', e.target.value)}
                          variant="bordered"
                          size="md"
                          classNames={{
                            input: "text-white",
                            inputWrapper: "bg-white/5 border-white/10"
                          }}
                        />
                        <Select
                          placeholder="Employment Type"
                          selectedKeys={emp.employmentType ? [emp.employmentType] : []}
                          onSelectionChange={(keys) => {
                            const value = Array.from(keys)[0] as string;
                            updateEmployment(emp.id, 'employmentType', value || '');
                          }}
                          variant="bordered"
                          size="md"
                          classNames={{
                            trigger: "bg-white/5 border-white/10",
                            value: "text-white"
                          }}
                        >
                          <SelectItem key="full-time" value="full-time">Full-time</SelectItem>
                          <SelectItem key="part-time" value="part-time">Part-time</SelectItem>
                          <SelectItem key="contract" value="contract">Contract</SelectItem>
                          <SelectItem key="self-employed" value="self-employed">Self-employed</SelectItem>
                          <SelectItem key="retired" value="retired">Retired</SelectItem>
                          <SelectItem key="unemployed" value="unemployed">Unemployed</SelectItem>
                        </Select>
                        <Input
                          type="number"
                          placeholder="Monthly Income"
                          value={emp.monthlyIncome}
                          onChange={(e) => updateEmployment(emp.id, 'monthlyIncome', e.target.value)}
                          variant="bordered"
                          size="md"
                          startContent={<span className="text-gray-400">$</span>}
                          isRequired={index === 0}
                          classNames={{
                            input: "text-white",
                            inputWrapper: "bg-white/5 border-white/10"
                          }}
                        />
                      </div>
                    </CardBody>
                  </Card>
                ))}
              </CardBody>
            </Card>
          </Tab>

          {/* Additional Income Tab */}
          <Tab key="additional-income" title="Additional Income">
            <Card shadow="sm" style={{ boxShadow: elevation.card }} className="mt-4">
              <CardHeader style={{ padding: spacing[4] }}>
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <DollarSign size={20} style={{ color: baseColors.primary[600] }} />
                    <h2 style={{ fontSize: fontSize.lg, fontWeight: fontWeight.semibold }}>
                      Additional Income
                    </h2>
                  </div>
                  <Button
                    size="sm"
                    variant="flat"
                    onClick={addAdditionalIncome}
                    startContent={<Plus size={16} />}
                  >
                    Add Income Source
                  </Button>
                </div>
              </CardHeader>
              <Divider />
              <CardBody style={{ padding: spacing[4] }} className="space-y-4">
                {additionalIncomes.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No additional income sources added. Click &quot;Add Income Source&quot; to add one.</p>
                ) : (
                  additionalIncomes.map((income) => (
                    <Card key={income.id} className="bg-white/5 border border-white/10">
                      <CardBody>
                        <div className="flex items-start justify-between gap-4">
                          <div className="grid gap-4 sm:grid-cols-3 flex-1">
                            <Input
                              placeholder="Income Source (e.g., Investments, Alimony, Benefits)"
                              value={income.source}
                              onChange={(e) => updateAdditionalIncome(income.id, 'source', e.target.value)}
                              variant="bordered"
                              size="md"
                              classNames={{
                                input: "text-white",
                                inputWrapper: "bg-white/5 border-white/10"
                              }}
                            />
                            <Input
                              type="number"
                              placeholder="Amount"
                              value={income.amount}
                              onChange={(e) => updateAdditionalIncome(income.id, 'amount', e.target.value)}
                              variant="bordered"
                              size="md"
                              startContent={<span className="text-gray-400">$</span>}
                              classNames={{
                                input: "text-white",
                                inputWrapper: "bg-white/5 border-white/10"
                              }}
                            />
                            <Select
                              placeholder="Frequency"
                              selectedKeys={income.frequency ? [income.frequency] : []}
                              onSelectionChange={(keys) => {
                                const value = Array.from(keys)[0] as string;
                                updateAdditionalIncome(income.id, 'frequency', value || '');
                              }}
                              variant="bordered"
                              size="md"
                              classNames={{
                                trigger: "bg-white/5 border-white/10",
                                value: "text-white"
                              }}
                            >
                              <SelectItem key="monthly" value="monthly">Monthly</SelectItem>
                              <SelectItem key="weekly" value="weekly">Weekly</SelectItem>
                              <SelectItem key="yearly" value="yearly">Yearly</SelectItem>
                            </Select>
                          </div>
                          <Button
                            size="sm"
                            variant="light"
                            color="danger"
                            onClick={() => removeAdditionalIncome(income.id)}
                            startContent={<X size={14} />}
                          >
                            Remove
                          </Button>
                        </div>
                      </CardBody>
                    </Card>
                  ))
                )}
              </CardBody>
            </Card>
          </Tab>

          {/* Financial Information Tab */}
          <Tab key="financial" title="Financial">
            <Card shadow="sm" style={{ boxShadow: elevation.card }} className="mt-4">
              <CardHeader style={{ padding: spacing[4] }}>
                <div className="flex items-center gap-2">
                  <DollarSign size={20} style={{ color: baseColors.primary[600] }} />
                  <h2 style={{ fontSize: fontSize.lg, fontWeight: fontWeight.semibold }}>
                    Financial Information
                  </h2>
                </div>
              </CardHeader>
              <Divider />
              <CardBody style={{ padding: spacing[4] }} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    type="number"
                    placeholder="Credit Score (300-850)"
                    value={creditScore}
                    onChange={(e) => setCreditScore(e.target.value)}
                    variant="bordered"
                    min={300}
                    max={850}
                    description="Optional"
                  />
                  <Input
                    type="number"
                    placeholder="Monthly Debt"
                    value={monthlyDebt}
                    onChange={(e) => setMonthlyDebt(e.target.value)}
                    variant="bordered"
                    min={0}
                    startContent={<span className="text-gray-400">$</span>}
                    description="Optional"
                  />
                </div>
              </CardBody>
            </Card>
          </Tab>

          {/* Pets Tab */}
          <Tab key="pets" title="Pets">
            <Card shadow="sm" style={{ boxShadow: elevation.card }} className="mt-4">
              <CardHeader style={{ padding: spacing[4] }}>
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <Dog size={20} style={{ color: baseColors.primary[600] }} />
                    <h2 style={{ fontSize: fontSize.lg, fontWeight: fontWeight.semibold }}>
                      Pet Information
                    </h2>
                  </div>
                  <Button
                    size="sm"
                    variant="flat"
                    onClick={addPet}
                    startContent={<Plus size={16} />}
                  >
                    Add Pet
                  </Button>
                </div>
              </CardHeader>
              <Divider />
              <CardBody style={{ padding: spacing[4] }} className="space-y-4">
                {pets.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No pets added. Click &quot;Add Pet&quot; if you have pets.</p>
                ) : (
                  pets.map((pet) => (
                    <Card key={pet.id} className="bg-white/5 border border-white/10">
                      <CardBody className="space-y-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-white">Pet Details</h3>
                          <Button
                            size="sm"
                            variant="light"
                            color="danger"
                            onClick={() => removePet(pet.id)}
                            startContent={<X size={14} />}
                          >
                            Remove
                          </Button>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <Input
                            placeholder="Pet Type (e.g., Dog, Cat, Bird)"
                            value={pet.type}
                            onChange={(e) => updatePet(pet.id, 'type', e.target.value)}
                            variant="bordered"
                            size="md"
                            classNames={{
                              input: "text-white",
                              inputWrapper: "bg-white/5 border-white/10"
                            }}
                          />
                          <Input
                            placeholder="Breed"
                            value={pet.breed}
                            onChange={(e) => updatePet(pet.id, 'breed', e.target.value)}
                            variant="bordered"
                            size="md"
                            classNames={{
                              input: "text-white",
                              inputWrapper: "bg-white/5 border-white/10"
                            }}
                          />
                        </div>
                        <div className="grid gap-4 sm:grid-cols-3">
                          <Input
                            placeholder="Pet Name"
                            value={pet.name}
                            onChange={(e) => updatePet(pet.id, 'name', e.target.value)}
                            variant="bordered"
                            size="md"
                            classNames={{
                              input: "text-white",
                              inputWrapper: "bg-white/5 border-white/10"
                            }}
                          />
                          <Input
                            placeholder="Weight (lbs)"
                            type="number"
                            value={pet.weight}
                            onChange={(e) => updatePet(pet.id, 'weight', e.target.value)}
                            variant="bordered"
                            size="md"
                            classNames={{
                              input: "text-white",
                              inputWrapper: "bg-white/5 border-white/10"
                            }}
                          />
                          <Input
                            placeholder="Age"
                            value={pet.age}
                            onChange={(e) => updatePet(pet.id, 'age', e.target.value)}
                            variant="bordered"
                            size="md"
                            classNames={{
                              input: "text-white",
                              inputWrapper: "bg-white/5 border-white/10"
                            }}
                          />
                        </div>
                        <div className="flex gap-4">
                          <Checkbox
                            isSelected={pet.vaccinated}
                            onValueChange={(checked) => updatePet(pet.id, 'vaccinated', checked)}
                          >
                            Vaccinated
                          </Checkbox>
                          <Checkbox
                            isSelected={pet.spayedNeutered}
                            onValueChange={(checked) => updatePet(pet.id, 'spayedNeutered', checked)}
                          >
                            Spayed/Neutered
                          </Checkbox>
                        </div>
                      </CardBody>
                    </Card>
                  ))
                )}
              </CardBody>
            </Card>
          </Tab>

          {/* Vehicles Tab */}
          <Tab key="vehicles" title="Vehicles">
            <Card shadow="sm" style={{ boxShadow: elevation.card }} className="mt-4">
              <CardHeader style={{ padding: spacing[4] }}>
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <Car size={20} style={{ color: baseColors.primary[600] }} />
                    <h2 style={{ fontSize: fontSize.lg, fontWeight: fontWeight.semibold }}>
                      Vehicle Information
                    </h2>
                  </div>
                  <Button
                    size="sm"
                    variant="flat"
                    onClick={addVehicle}
                    startContent={<Plus size={16} />}
                  >
                    Add Vehicle
                  </Button>
                </div>
              </CardHeader>
              <Divider />
              <CardBody style={{ padding: spacing[4] }} className="space-y-4">
                {vehicles.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No vehicles added. Click &quot;Add Vehicle&quot; if you have vehicles.</p>
                ) : (
                  vehicles.map((vehicle) => (
                    <Card key={vehicle.id} className="bg-white/5 border border-white/10">
                      <CardBody className="space-y-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-white">Vehicle Details</h3>
                          <Button
                            size="sm"
                            variant="light"
                            color="danger"
                            onClick={() => removeVehicle(vehicle.id)}
                            startContent={<X size={14} />}
                          >
                            Remove
                          </Button>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-3">
                          <Input
                            placeholder="Make"
                            value={vehicle.make}
                            onChange={(e) => updateVehicle(vehicle.id, 'make', e.target.value)}
                            variant="bordered"
                            size="md"
                            classNames={{
                              input: "text-white",
                              inputWrapper: "bg-white/5 border-white/10"
                            }}
                          />
                          <Input
                            placeholder="Model"
                            value={vehicle.model}
                            onChange={(e) => updateVehicle(vehicle.id, 'model', e.target.value)}
                            variant="bordered"
                            size="md"
                            classNames={{
                              input: "text-white",
                              inputWrapper: "bg-white/5 border-white/10"
                            }}
                          />
                          <Input
                            placeholder="Year"
                            value={vehicle.year}
                            onChange={(e) => updateVehicle(vehicle.id, 'year', e.target.value)}
                            variant="bordered"
                            size="md"
                            classNames={{
                              input: "text-white",
                              inputWrapper: "bg-white/5 border-white/10"
                            }}
                          />
                        </div>
                        <div className="grid gap-4 sm:grid-cols-3">
                          <Input
                            placeholder="Color"
                            value={vehicle.color}
                            onChange={(e) => updateVehicle(vehicle.id, 'color', e.target.value)}
                            variant="bordered"
                            size="md"
                            classNames={{
                              input: "text-white",
                              inputWrapper: "bg-white/5 border-white/10"
                            }}
                          />
                          <Input
                            placeholder="License Plate"
                            value={vehicle.licensePlate}
                            onChange={(e) => updateVehicle(vehicle.id, 'licensePlate', e.target.value)}
                            variant="bordered"
                            size="md"
                            classNames={{
                              input: "text-white",
                              inputWrapper: "bg-white/5 border-white/10"
                            }}
                          />
                          <Input
                            placeholder="Registered Owner"
                            value={vehicle.registeredOwner}
                            onChange={(e) => updateVehicle(vehicle.id, 'registeredOwner', e.target.value)}
                            variant="bordered"
                            size="md"
                            classNames={{
                              input: "text-white",
                              inputWrapper: "bg-white/5 border-white/10"
                            }}
                          />
                        </div>
                      </CardBody>
                    </Card>
                  ))
                )}
              </CardBody>
            </Card>
          </Tab>

          {/* Documents Tab */}
          <Tab key="documents" title="Documents">
            <Card shadow="sm" style={{ boxShadow: elevation.card }} className="mt-4">
              <CardHeader style={{ padding: spacing[4] }}>
                <div className="flex items-center gap-2">
                  <FileText size={20} style={{ color: baseColors.primary[600] }} />
                  <h2 style={{ fontSize: fontSize.lg, fontWeight: fontWeight.semibold }}>
                    Document Uploads
                  </h2>
                </div>
              </CardHeader>
              <Divider />
              <CardBody style={{ padding: spacing[4] }} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Social Security Card Photo
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    {ssCardFile ? (
                      <div className="space-y-2">
                        <FileText size={48} className="mx-auto text-gray-400" />
                        <p className="text-sm font-medium">{ssCardFile.name}</p>
                        <Button
                          size="sm"
                          variant="light"
                          color="danger"
                          onClick={() => handleFileUpload('ssCard', null)}
                        >
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload size={48} className="mx-auto text-gray-400" />
                        <p className="text-sm text-gray-500">Upload a clear photo of your Social Security Card</p>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload('ssCard', file);
                          }}
                          className="hidden"
                          id="ssCard-upload"
                        />
                        <label htmlFor="ssCard-upload">
                          <Button
                            as="span"
                            size="sm"
                            variant="flat"
                            startContent={<Upload size={16} />}
                          >
                            Choose File
                          </Button>
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Driver&apos;s License or ID Photo
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    {dlIdFile ? (
                      <div className="space-y-2">
                        <FileText size={48} className="mx-auto text-gray-400" />
                        <p className="text-sm font-medium">{dlIdFile.name}</p>
                        <Button
                          size="sm"
                          variant="light"
                          color="danger"
                          onClick={() => handleFileUpload('dlId', null)}
                        >
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload size={48} className="mx-auto text-gray-400" />
                        <p className="text-sm text-gray-500">Upload a clear photo of your Driver&apos;s License or ID</p>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload('dlId', file);
                          }}
                          className="hidden"
                          id="dlId-upload"
                        />
                        <label htmlFor="dlId-upload">
                          <Button
                            as="span"
                            size="sm"
                            variant="flat"
                            startContent={<Upload size={16} />}
                          >
                            Choose File
                          </Button>
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>
          </Tab>

          {/* Authorizations & Additional Info Tab */}
          <Tab key="authorizations" title="Authorizations">
            <div className="space-y-6 mt-4">
              {/* Authorizations Card */}
              <Card shadow="sm" style={{ boxShadow: elevation.card }}>
                <CardHeader style={{ padding: spacing[4] }}>
                  <div className="flex items-center gap-2">
                    <Shield size={20} style={{ color: baseColors.primary[600] }} />
                    <h2 style={{ fontSize: fontSize.lg, fontWeight: fontWeight.semibold }}>
                      Authorizations & Consents
                    </h2>
                  </div>
                </CardHeader>
                <Divider />
                <CardBody style={{ padding: spacing[4] }} className="space-y-4">
                  <div className="space-y-3">
                    <Checkbox
                      isSelected={authorizeCreditCheck}
                      onValueChange={setAuthorizeCreditCheck}
                      isRequired
                    >
                      <div>
                        <p className="font-medium">I authorize a credit check</p>
                        <p className="text-sm text-gray-500">I understand that a credit check will be performed as part of the application process.</p>
                      </div>
                    </Checkbox>

                    <Checkbox
                      isSelected={authorizeBackgroundCheck}
                      onValueChange={setAuthorizeBackgroundCheck}
                      isRequired
                    >
                      <div>
                        <p className="font-medium">I authorize a criminal background check</p>
                        <p className="text-sm text-gray-500">I understand that a criminal background check will be performed as part of the application process.</p>
                      </div>
                    </Checkbox>

                    <Checkbox
                      isSelected={authorizeEmploymentVerification}
                      onValueChange={setAuthorizeEmploymentVerification}
                      isRequired
                    >
                      <div>
                        <p className="font-medium">I authorize employment verification</p>
                        <p className="text-sm text-gray-500">I authorize my current and previous employers to verify my employment information.</p>
                      </div>
                    </Checkbox>
                  </div>
                </CardBody>
              </Card>

              {/* Negative Aspects Explanation Card */}
              <Card shadow="sm" style={{ boxShadow: elevation.card }}>
                <CardHeader style={{ padding: spacing[4] }}>
                  <div className="flex items-center gap-2">
                    <Info size={20} style={{ color: baseColors.primary[600] }} />
                    <h2 style={{ fontSize: fontSize.lg, fontWeight: fontWeight.semibold }}>
                      Additional Information
                    </h2>
                  </div>
                </CardHeader>
                <Divider />
                <CardBody style={{ padding: spacing[4] }} className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex gap-2 mb-2">
                      <Info size={20} className="text-blue-600" />
                      <p className="font-semibold text-blue-900">Important Notice</p>
                    </div>
                    <p className="text-sm text-blue-800">
                      Past issues (such as evictions, late payments, or credit problems) are not automatic disqualifiers. 
                      However, <strong>omission of these facts may be</strong>. Please provide a complete and honest explanation 
                      of any negative aspects of your rental or credit history below.
                    </p>
                  </div>
                  <Textarea
                    placeholder="Explain any negative aspects of your past (evictions, late payments, credit problems, criminal history, etc.). Be as detailed as possible."
                    value={negativeAspectsExplanation}
                    onChange={(e) => setNegativeAspectsExplanation(e.target.value)}
                    variant="bordered"
                    minRows={6}
                    description="This information helps us make a fair assessment of your application."
                  />
                </CardBody>
              </Card>
            </div>
          </Tab>
        </Tabs>

        {/* Submit Button */}
        <div className="flex justify-end gap-4 mt-6">
          <Button
            type="submit"
            color="primary"
            size="lg"
            isLoading={submitting}
            isDisabled={!authorizeCreditCheck || !authorizeBackgroundCheck || !authorizeEmploymentVerification}
            style={{
              fontSize: fontSize.base,
              fontWeight: fontWeight.semibold,
              paddingLeft: spacing[8],
              paddingRight: spacing[8],
            }}
          >
            {submitting ? 'Submitting Application...' : 'Submit Application'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default RentalApplicationPage;
