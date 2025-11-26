
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
  Chip,
  Spinner,
} from '@nextui-org/react';
import { CheckCircle2, AlertCircle, Building2, User } from 'lucide-react';
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

/**
 * Modern rental application page with NextUI components
 * Features: Multi-step form sections, real-time validation, better UX
 */
const RentalApplicationPage: React.FC = () => {
  const navigate = useNavigate();
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [units, setUnits] = useState<Unit[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [income, setIncome] = useState('');
  const [creditScore, setCreditScore] = useState('');
  const [monthlyDebt, setMonthlyDebt] = useState('');
  const [bankruptcyFiledYear, setBankruptcyFiledYear] = useState('');
  const [rentalHistoryComments, setRentalHistoryComments] = useState('');
  const [employmentStatus, setEmploymentStatus] = useState('');
  const [previousAddress, setPreviousAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const data = await apiFetch('/properties/public');
        setProperties(data);
      } catch (error: any) {
        setError(error.message);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      await apiFetch('/rental-applications', {
        method: 'POST',
        body: {
          propertyId: Number(selectedProperty),
          unitId: Number(selectedUnit),
          fullName,
          email,
          phoneNumber,
          income: parseFloat(income),
          employmentStatus,
          previousAddress,
          creditScore: creditScore ? Number(creditScore) : undefined,
          monthlyDebt: monthlyDebt ? Number(monthlyDebt) : undefined,
          bankruptcyFiledYear: bankruptcyFiledYear ? Number(bankruptcyFiledYear) : undefined,
          rentalHistoryComments: rentalHistoryComments || undefined,
        },
      });

      const applicationId = data?.id || 'APP-' + Date.now().toString().slice(-6);

      // Navigate to confirmation page with application ID
      navigate(`/rental-application/confirmation?id=${applicationId}`);
    } catch (error: any) {
      setError(error.message);
      setLoading(false);
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
      className="container mx-auto p-6 max-w-4xl"
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
          Complete the form below to apply for your new home
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
                  We'll review your application and contact you soon.
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
        {/* Property Selection Section */}
        <Card shadow="sm" style={{ boxShadow: elevation.card }}>
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
              label="Select Property"
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
              label="Select Unit"
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

        {/* Personal Information Section */}
        <Card shadow="sm" style={{ boxShadow: elevation.card }}>
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
            <div className="grid gap-4 sm:grid-cols-1">
              <Input
                label="Full Name"
                placeholder="Enter your full legal name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                isRequired
                variant="bordered"
                size="lg"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                type="email"
                label="Email Address"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                isRequired
                variant="bordered"
                size="lg"
              />

              <Input
                type="tel"
                label="Phone Number"
                placeholder="(555) 123-4567"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                isRequired
                variant="bordered"
                size="lg"
              />
            </div>

            <Textarea
              label="Previous Address"
              placeholder="Enter your current or most recent address"
              value={previousAddress}
              onChange={(e) => setPreviousAddress(e.target.value)}
              isRequired
              variant="bordered"
              minRows={3}
            />
          </CardBody>
        </Card>

        {/* Financial Information Section */}
        <Card shadow="sm" style={{ boxShadow: elevation.card }}>
          <CardHeader style={{ padding: spacing[4] }}>
            <div className="flex items-between w-full">
              <h2 style={{ fontSize: fontSize.lg, fontWeight: fontWeight.semibold }}>
                Financial Information
              </h2>
              <Chip size="sm" variant="flat" color="primary">
                Required for approval
              </Chip>
            </div>
          </CardHeader>
          <Divider />
          <CardBody style={{ padding: spacing[4] }} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                type="number"
                label="Monthly Income"
                placeholder="0.00"
                value={income}
                onChange={(e) => setIncome(e.target.value)}
                isRequired
                variant="bordered"
                size="lg"
                startContent={
                  <div style={{ color: baseColors.neutral[400] }}>$</div>
                }
              />

              <Input
                label="Employment Status"
                placeholder="e.g., Full-time, Self-employed"
                value={employmentStatus}
                onChange={(e) => setEmploymentStatus(e.target.value)}
                isRequired
                variant="bordered"
                size="lg"
              />
            </div>

            <Divider />
            
            <div className="space-y-2">
              <p style={{ fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: baseColors.neutral[700] }}>
                Optional Financial Details
              </p>
              <p style={{ fontSize: fontSize.xs, color: baseColors.neutral[500] }}>
                Providing these details may help strengthen your application
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Input
                type="number"
                label="Credit Score"
                placeholder="300-850"
                value={creditScore}
                onChange={(e) => setCreditScore(e.target.value)}
                variant="bordered"
                min={300}
                max={850}
                description="Optional"
              />

              <Input
                type="number"
                label="Monthly Debt"
                placeholder="0.00"
                value={monthlyDebt}
                onChange={(e) => setMonthlyDebt(e.target.value)}
                variant="bordered"
                min={0}
                startContent={
                  <div style={{ color: baseColors.neutral[400] }}>$</div>
                }
                description="Optional"
              />

              <Input
                type="number"
                label="Bankruptcy Year"
                placeholder="YYYY"
                value={bankruptcyFiledYear}
                onChange={(e) => setBankruptcyFiledYear(e.target.value)}
                variant="bordered"
                min={1900}
                max={new Date().getFullYear()}
                description="If applicable"
              />
            </div>
          </CardBody>
        </Card>

        {/* Additional Information Section */}
        <Card shadow="sm" style={{ boxShadow: elevation.card }}>
          <CardHeader style={{ padding: spacing[4] }}>
            <h2 style={{ fontSize: fontSize.lg, fontWeight: fontWeight.semibold }}>
              Additional Information
            </h2>
          </CardHeader>
          <Divider />
          <CardBody style={{ padding: spacing[4] }}>
            <Textarea
              label="Rental History & References"
              placeholder="Share information about previous landlords, references, or any additional context about your rental history..."
              value={rentalHistoryComments}
              onChange={(e) => setRentalHistoryComments(e.target.value)}
              variant="bordered"
              minRows={4}
              description="Optional but recommended"
            />
          </CardBody>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <Button
            type="submit"
            color="primary"
            size="lg"
            isLoading={submitting}
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
