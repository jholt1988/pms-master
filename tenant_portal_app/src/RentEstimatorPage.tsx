
import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { apiFetch } from './services/apiClient';

const RentEstimatorPage = () => {
  const [properties, setProperties] = useState<any[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [units, setUnits] = useState<any[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const [estimatedRent, setEstimatedRent] = useState<number | null>(null);
  const [estimationDetails, setEstimationDetails] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [estimating, setEstimating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const auth = useAuth() as { token?: string } | null;
  const token = auth?.token;

  useEffect(() => {
    const fetchProperties = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const data = await apiFetch('/properties', { token });
        setProperties(data);
      } catch (error: any) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, [token]);

  useEffect(() => {
    if (selectedProperty) {
      const property = properties.find((p) => p.id === Number(selectedProperty));
      if (property) {
        setUnits(property.units);
      }
    }
  }, [selectedProperty, properties]);

  const handleEstimateRent = async () => {
    if (!token) {
      setError('Sign in to estimate rent.');
      return;
    }
    if (!selectedProperty || !selectedUnit) {
      setError('Select both a property and unit to run an estimate.');
      return;
    }
    setEstimating(true);
    setError(null);
    setEstimatedRent(null);
    setEstimationDetails(null);

    try {
      const data = await apiFetch(`/rent-estimator?propertyId=${selectedProperty}&unitId=${selectedUnit}`, { token });
      setEstimatedRent(data.estimatedRent);
      setEstimationDetails(data.details);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setEstimating(false);
    }
  };

  if (loading) {
    return <div className="p-4 text-sm text-gray-600">Loading property data…</div>;
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-gray-900">Rent estimator</h1>
        <p className="text-sm text-gray-600">
          Pair historical rent rolls with applicant data to forecast the optimal rate per unit.
        </p>
      </header>

      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Select a unit</h2>
          <p className="mt-1 text-sm text-gray-500">
            Choose a property and unit to benchmark rent against comparable leases.
          </p>

          <div className="mt-6 space-y-4 text-sm text-gray-700">
            <label className="block text-xs font-medium text-gray-700">
              Property
              <select
                value={selectedProperty}
                onChange={(event) => {
                  setSelectedProperty(event.target.value);
                  setSelectedUnit('');
                  setEstimatedRent(null);
                  setEstimationDetails(null);
                }}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">Select property</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name} {property.address ? `· ${property.address}` : ''}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs font-medium text-gray-700">
              Unit
              <select
                value={selectedUnit}
                onChange={(event) => {
                  setSelectedUnit(event.target.value);
                  setEstimatedRent(null);
                  setEstimationDetails(null);
                }}
                disabled={units.length === 0}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-100"
              >
                <option value="">Select unit</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name}
                  </option>
                ))}
              </select>
              {units.length === 0 && selectedProperty && (
                <span className="mt-1 block text-xs text-gray-500">No unit data available for this property.</span>
              )}
            </label>

            <button
              type="button"
              onClick={handleEstimateRent}
              disabled={estimating || !selectedProperty || !selectedUnit}
              className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300"
            >
              {estimating ? 'Estimating…' : 'Estimate rent'}
            </button>
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Benchmark results</h2>
          <p className="mt-1 text-sm text-gray-500">
            Forecasts blend market comps, income ratios, and debt-to-income thresholds.
          </p>

          {estimatedRent != null ? (
            <div className="mt-6 space-y-4">
              <div className="rounded-md border border-indigo-100 bg-indigo-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">Suggested monthly rent</p>
                <p className="mt-2 text-3xl font-semibold text-indigo-900">
                  ${estimatedRent.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                </p>
              </div>
              {estimationDetails && (
                <div className="rounded-md border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
                  {estimationDetails.split(/(?<=[.?!])\s+/).map((sentence, index) => (
                    <p key={index} className="mt-1 first:mt-0">
                      {sentence}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="mt-6 rounded border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-sm text-gray-500">
              Select a unit and run the estimator to see suggested rent and supporting rationale.
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default RentEstimatorPage;
