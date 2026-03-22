/**
 * Property Manager Dashboard
 * Overview page for property manager users showing key metrics and pending tasks
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Chip,
  Progress
} from '@nextui-org/react';
import {
  Building2,
  Wrench,
  DollarSign,
  FileText,
  AlertTriangle,
  TrendingUp,
  Calendar,
  Plus,
  Users,
  Search,
  BarChart3,
  FileCheck,
  Settings,
  MapPin
} from 'lucide-react';

import { useAuth } from './AuthContext';
import { PageHeader } from './components/ui/PageHeader';
import { apiFetch } from './services/apiClient';

interface PropertyLocation {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  latitude: number;
  longitude: number;
  unitCount: number;
}

interface MissingPropertyLocation {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  unitCount: number;
}

interface PropertyLocationsResponse {
  totalProperties: number;
  mappedProperties: number;
  missingCoordinates: number;
  properties: PropertyLocation[];
  missingProperties: MissingPropertyLocation[];
}

interface DashboardMetrics {
  occupancy: {
    total: number;
    occupied: number;
    vacant: number;
    percentage: number;
  };
  financials: {
    monthlyRevenue: number;
    collectedThisMonth: number;
    outstanding: number;
  };
  maintenance: {
    total: number;
    pending: number;
    inProgress: number;
    overdue: number;
  };
  applications: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
  recentActivity: Array<{
    id: number;
    type: 'maintenance' | 'application' | 'payment' | 'lease';
    title: string;
    date: string;
    priority?: 'high' | 'medium' | 'low';
  }>;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0
  }).format(amount);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

const buildOsmEmbedUrl = (locations: PropertyLocation[], focused?: PropertyLocation | null) => {
  if (!locations.length) {
    return null;
  }

  const lats = locations.map((location) => location.latitude);
  const lngs = locations.map((location) => location.longitude);

  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const latPadding = Math.max((maxLat - minLat) * 0.2, 0.02);
  const lngPadding = Math.max((maxLng - minLng) * 0.2, 0.02);

  const left = minLng - lngPadding;
  const bottom = minLat - latPadding;
  const right = maxLng + lngPadding;
  const top = maxLat + latPadding;

  const markerParam = focused ? `&marker=${focused.latitude}%2C${focused.longitude}` : '';
  return `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik${markerParam}`;
};

export const PropertyManagerDashboard: React.FC = () => {
  const { token } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [propertyLocations, setPropertyLocations] = useState<PropertyLocationsResponse | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeResult, setGeocodeResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = async (authToken: string) => {
    const [metricsData, locationsData] = await Promise.all([
      apiFetch('/dashboard/metrics', { token: authToken }),
      apiFetch('/dashboard/property-locations', { token: authToken })
    ]);
    setMetrics(metricsData);
    setPropertyLocations(locationsData);
  };

  useEffect(() => {
    const fetchMetrics = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        await loadDashboardData(token);
      } catch (error) {
        console.error('Error fetching dashboard metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [token]);

  const handleGeocodeMissing = async () => {
    if (!token) {
      return;
    }

    setGeocoding(true);
    setGeocodeResult(null);

    try {
      const result = await apiFetch('/dashboard/property-locations/geocode-missing', {
        token,
        method: 'POST',
      });

      await loadDashboardData(token);
      setGeocodeResult(`Geocoding complete: ${result.updated}/${result.attempted} properties updated.`);
    } catch (error) {
      console.error('Error geocoding properties:', error);
      setGeocodeResult('Geocoding failed. Please try again.');
    } finally {
      setGeocoding(false);
    }
  };

  if (loading) {
    return <p>Loading dashboard...</p>;
  }

  if (!metrics) {
    return <p>Could not load dashboard metrics.</p>;
  }

  const collectionRate = metrics.financials?.monthlyRevenue
    ? Math.round((metrics.financials?.collectedThisMonth / metrics.financials?.monthlyRevenue) * 100)
    : 0;
  const mappedLocations = propertyLocations?.properties ?? [];
  const missingLocations = propertyLocations?.missingProperties ?? [];
  const selectedProperty = mappedLocations.find((property) => property.id === selectedPropertyId) ?? mappedLocations[0] ?? null;
  const mapEmbedUrl = buildOsmEmbedUrl(mappedLocations, selectedProperty);
  const mapOpenUrl = selectedProperty
    ? `https://www.openstreetmap.org/?mlat=${selectedProperty.latitude}&mlon=${selectedProperty.longitude}#map=14/${selectedProperty.latitude}/${selectedProperty.longitude}`
    : 'https://www.openstreetmap.org';

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Dashboard"
        subtitle="Property management overview and key metrics"
      />

      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-foreground-500">Portfolio Map</p>
            <p className="text-lg font-semibold text-foreground">Organization properties</p>
          </div>
          <Chip variant="flat" color="primary" startContent={<MapPin className="w-4 h-4" />}>
            {(propertyLocations?.mappedProperties ?? 0)} mapped
          </Chip>
        </CardHeader>
        <CardBody className="space-y-3">
          {mappedLocations.length > 0 && mapEmbedUrl ? (
            <>
              <div className="h-64 rounded-large border border-divider overflow-hidden bg-content2">
                <iframe
                  title="Portfolio map"
                  src={mapEmbedUrl}
                  className="w-full h-full"
                  loading="lazy"
                />
              </div>
              <div className="flex items-center gap-2 text-xs text-foreground-500 flex-wrap">
                <span>{propertyLocations?.totalProperties ?? 0} total properties</span>
                <span>•</span>
                <span>{propertyLocations?.mappedProperties ?? 0} with coordinates</span>
                {(propertyLocations?.missingCoordinates ?? 0) > 0 && (
                  <>
                    <span>•</span>
                    <span>{propertyLocations?.missingCoordinates ?? 0} missing coordinates</span>
                  </>
                )}
                <span>•</span>
                <a
                  href={mapOpenUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  Open full map
                </a>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div className="rounded-large border border-divider p-3">
                  <p className="text-xs uppercase tracking-wider text-foreground-500 mb-2">Mapped properties</p>
                  <div className="max-h-40 overflow-auto space-y-2">
                    {mappedLocations.map((location) => {
                      const isSelected = selectedProperty?.id === location.id;
                      return (
                        <button
                          key={location.id}
                          type="button"
                          onClick={() => setSelectedPropertyId(location.id)}
                          className={`w-full text-left rounded-medium px-3 py-2 border transition ${isSelected ? 'border-primary bg-primary-50' : 'border-divider hover:bg-content2'}`}
                        >
                          <p className="text-sm font-semibold text-foreground">{location.name}</p>
                          <p className="text-xs text-foreground-500">
                            {[location.address, location.city, location.state].filter(Boolean).join(', ')}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-large border border-divider p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs uppercase tracking-wider text-foreground-500">Missing coordinates</p>
                    <Button
                      size="sm"
                      color="warning"
                      variant="flat"
                      isLoading={geocoding}
                      onPress={handleGeocodeMissing}
                      isDisabled={missingLocations.length === 0}
                    >
                      Geocode missing
                    </Button>
                  </div>
                  {geocodeResult && (
                    <p className="text-xs text-foreground-500">{geocodeResult}</p>
                  )}
                  {missingLocations.length > 0 ? (
                    <div className="max-h-40 overflow-auto space-y-2">
                      {missingLocations.slice(0, 10).map((location) => (
                        <div key={location.id} className="rounded-medium border border-warning-200 bg-warning-50 px-3 py-2">
                          <p className="text-sm font-semibold text-foreground">{location.name}</p>
                          <p className="text-xs text-foreground-600">
                            {[location.address, location.city, location.state].filter(Boolean).join(', ') || 'Address not set'}
                          </p>
                        </div>
                      ))}
                      {missingLocations.length > 10 && (
                        <p className="text-xs text-foreground-500">+ {missingLocations.length - 10} more missing coordinates</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-success-600">All properties have coordinates.</p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-foreground-500">No property coordinates found yet. Add latitude/longitude to properties to render the map.</p>
          )}
        </CardBody>
      </Card>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Occupancy Rate */}
        <Link to="/properties">
          <Card className="border-l-4 border-l-success">
            <CardBody className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-foreground-500">Occupancy Rate</p>
                  <p className="text-2xl font-semibold text-foreground">{metrics.occupancy?.percentage}%</p>
                </div>
                <Chip color="success" variant="flat">Live</Chip>
              </div>
              <p className="text-sm text-foreground-500 mt-3">
                {metrics.occupancy?.occupied} of {metrics.occupancy?.total} units occupied ({metrics.occupancy?.vacant} vacant)
              </p>
              <Progress
                value={metrics.occupancy?.percentage}
                size="sm"
                className="mt-4"
              />
            </CardBody>
          </Card>
        </Link>

        {/* Monthly Revenue */}
        <Link to="/reporting">
          <Card className="border-l-4 border-l-primary">
            <CardBody className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-foreground-500">Monthly Revenue</p>
                  <p className="text-2xl font-semibold text-foreground">{formatCurrency(metrics.financials.monthlyRevenue)}</p>
                </div>
                <Chip color="primary" variant="flat">{collectionRate}% collected</Chip>
              </div>
              <div className="mt-3">
                <p className="text-sm text-foreground-500">Collected: {formatCurrency(metrics.financials.collectedThisMonth)}</p>
                <p className="text-sm text-foreground-500">Outstanding: {formatCurrency(metrics.financials.outstanding)}</p>
              </div>
              <Progress
                value={Math.min(collectionRate, 100)}
                size="sm"
                className="mt-4"
              />
            </CardBody>
          </Card>
        </Link>

        {/* Maintenance Requests */}
        <Link to="/maintenance-management">
          <Card className="border-l-4 border-l-warning">
            <CardBody className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-foreground-500">Maintenance Requests</p>
                  <p className="text-2xl font-semibold text-foreground">{metrics.maintenance?.total}</p>
                </div>
                <Chip color="warning" variant="flat">{metrics.maintenance?.overdue} overdue</Chip>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
                <div className="text-center">
                  <p className="text-foreground-500">Pending</p>
                  <p className="font-semibold text-foreground">{metrics.maintenance?.pending}</p>
                </div>
                <div className="text-center">
                  <p className="text-foreground-500">In progress</p>
                  <p className="font-semibold text-foreground">{metrics.maintenance?.inProgress}</p>
                </div>
                <div className="text-center">
                  <p className="text-foreground-500">Overdue</p>
                  <p className="font-semibold text-foreground">{metrics.maintenance?.overdue}</p>
                </div>
              </div>
            </CardBody>
          </Card>
        </Link>

        {/* Applications */}
        <Link to="/rental-applications-management">
          <Card className="border-l-4 border-l-secondary">
            <CardBody className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-foreground-500">Rental Applications</p>
                  <p className="text-2xl font-semibold text-foreground">{metrics.applications.total}</p>
                </div>
                <Chip color="secondary" variant="flat">{metrics.applications.pending} pending</Chip>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
                <div className="text-center">
                  <p className="text-foreground-500">Approved</p>
                  <p className="font-semibold text-foreground">{metrics.applications.approved}</p>
                </div>
                <div className="text-center">
                  <p className="text-foreground-500">Rejected</p>
                  <p className="font-semibold text-foreground">{metrics.applications.rejected}</p>
                </div>
                <div className="text-center">
                  <p className="text-foreground-500">Pending</p>
                  <p className="font-semibold text-foreground">{metrics.applications.pending}</p>
                </div>
              </div>
            </CardBody>
          </Card>
        </Link>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <div>
            <p className="text-xs uppercase tracking-wider text-foreground-500">Quick Actions</p>
            <p className="text-lg font-semibold text-foreground">Common tasks and shortcuts</p>
          </div>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <Link to="/properties">
              <Button
                variant="flat"
                className="w-full h-auto flex-col gap-2 py-4"
                startContent={<Building2 className="w-5 h-5" />}
              >
                <span className="text-sm">Properties</span>
              </Button>
            </Link>
            <Link to="/lease-management">
              <Button
                variant="flat"
                className="w-full h-auto flex-col gap-2 py-4"
                startContent={<FileText className="w-5 h-5" />}
              >
                <span className="text-sm">Leases</span>
              </Button>
            </Link>
            <Link to="/rental-applications-management">
              <Button
                variant="flat"
                className="w-full h-auto flex-col gap-2 py-4"
                startContent={<Users className="w-5 h-5" />}
              >
                <span className="text-sm">Applications</span>
              </Button>
            </Link>
            <Link to="/maintenance-management">
              <Button
                variant="flat"
                className="w-full h-auto flex-col gap-2 py-4"
                startContent={<Wrench className="w-5 h-5" />}
              >
                <span className="text-sm">Maintenance</span>
              </Button>
            </Link>
            <Link to="/properties/search">
              <Button
                variant="flat"
                className="w-full h-auto flex-col gap-2 py-4"
                startContent={<Search className="w-5 h-5" />}
              >
                <span className="text-sm">Search</span>
              </Button>
            </Link>
            <Link to="/rent-optimization">
              <Button
                variant="flat"
                className="w-full h-auto flex-col gap-2 py-4"
                startContent={<TrendingUp className="w-5 h-5" />}
              >
                <span className="text-sm">Rent Analysis</span>
              </Button>
            </Link>
            <Link to="/expense-tracker">
              <Button
                variant="flat"
                className="w-full h-auto flex-col gap-2 py-4"
                startContent={<DollarSign className="w-5 h-5" />}
              >
                <span className="text-sm">Expenses</span>
              </Button>
            </Link>
            <Link to="/inspection-management">
              <Button
                variant="flat"
                className="w-full h-auto flex-col gap-2 py-4"
                startContent={<FileCheck className="w-5 h-5" />}
              >
                <span className="text-sm">Inspections</span>
              </Button>
            </Link>
            <Link to="/documents">
              <Button
                variant="flat"
                className="w-full h-auto flex-col gap-2 py-4"
                startContent={<FileText className="w-5 h-5" />}
              >
                <span className="text-sm">Documents</span>
              </Button>
            </Link>
            <Link to="/reporting">
              <Button
                variant="flat"
                className="w-full h-auto flex-col gap-2 py-4"
                startContent={<BarChart3 className="w-5 h-5" />}
              >
                <span className="text-sm">Reports</span>
              </Button>
            </Link>
            <Link to="/user-management">
              <Button
                variant="flat"
                className="w-full h-auto flex-col gap-2 py-4"
                startContent={<Users className="w-5 h-5" />}
              >
                <span className="text-sm">Users</span>
              </Button>
            </Link>
            <Link to="/schedule">
              <Button
                variant="flat"
                className="w-full h-auto flex-col gap-2 py-4"
                startContent={<Calendar className="w-5 h-5" />}
              >
                <span className="text-sm">Schedule</span>
              </Button>
            </Link>
          </div>
        </CardBody>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <div>
            <p className="text-xs uppercase tracking-wider text-foreground-500">Recent Activity</p>
            <p className="text-lg font-semibold text-foreground">Latest updates from operations</p>
          </div>
          <Button size="sm" variant="flat">
            View all
          </Button>
        </CardHeader>
        <CardBody className="space-y-4">
          {metrics.recentActivity.map((activity) => (
            <div key={activity.id} className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-foreground">{activity.title}</p>
                <p className="text-xs text-foreground-500">{formatDate(activity.date)}</p>
              </div>
              <Chip color={activity.priority === 'high' ? 'danger' : activity.priority === 'medium' ? 'warning' : 'default'} variant="flat">
                {activity.type}
              </Chip>
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
};

export default PropertyManagerDashboard;
