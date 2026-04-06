import React, { useEffect, useMemo, useState } from 'react';
import { Select, SelectItem, Slider } from '@nextui-org/react';
import { useAuth } from '../../../../AuthContext';
import { GlassCard } from '../../../../components/ui/GlassCard';
import { PageHeader } from '../../../../components/ui/PageHeader';
import { getSeasonalPricingMatrix, type SeasonalPricingMatrix } from '../../services/managerApi';

const defaultUnits = [
  { id: '1', name: 'Unit 1' },
  { id: '2', name: 'Unit 2' },
  { id: '3', name: 'Unit 3' },
];

export const LeasePricingPage: React.FC = () => {
  const { token } = useAuth();
  const [unitId, setUnitId] = useState<string>(defaultUnits[0].id);
  const [baseRent, setBaseRent] = useState<number>(1800);
  const [termMonths, setTermMonths] = useState<number>(12);
  const [matrix, setMatrix] = useState<SeasonalPricingMatrix | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      setLoading(true);
      try {
        const next = await getSeasonalPricingMatrix(token, unitId, baseRent);
        setMatrix(next);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [token, unitId, baseRent]);

  const visibleOptions = useMemo(() => {
    return (matrix?.options ?? []).filter((option) => option.termMonths === termMonths);
  }, [matrix, termMonths]);

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Lease Term Pricing"
        subtitle="SEASONAL RENEWAL STRATEGY"
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <GlassCard className="lg:col-span-1">
          <div className="space-y-5">
            <Select
              label="Unit"
              selectedKeys={[unitId]}
              onSelectionChange={(keys) => {
                const next = Array.from(keys)[0];
                if (typeof next === 'string') setUnitId(next);
              }}
              className="text-white"
            >
              {defaultUnits.map((unit) => (
                <SelectItem key={unit.id}>{unit.name}</SelectItem>
              ))}
            </Select>

            <div>
              <p className="text-sm text-gray-300 mb-3">Base Rent</p>
              <Slider
                minValue={900}
                maxValue={4000}
                step={25}
                value={baseRent}
                onChange={(value) => setBaseRent(Array.isArray(value) ? value[0] : value)}
                formatOptions={{ style: 'currency', currency: 'USD' }}
              />
            </div>

            <div>
              <p className="text-sm text-gray-300 mb-3">Lease Term</p>
              <Slider
                minValue={6}
                maxValue={18}
                step={3}
                marks={[
                  { value: 6, label: '6 mo' },
                  { value: 9, label: '9 mo' },
                  { value: 12, label: '12 mo' },
                  { value: 15, label: '15 mo' },
                  { value: 18, label: '18 mo' },
                ]}
                value={termMonths}
                onChange={(value) => setTermMonths(Array.isArray(value) ? value[0] : value)}
              />
            </div>
          </div>
        </GlassCard>

        <GlassCard className="lg:col-span-3" title="Seasonal Pricing Matrix" subtitle="BEST START MONTH BY TERM" glowColor="purple">
          {loading ? (
            <p className="text-sm text-gray-400">Generating pricing scenarios...</p>
          ) : visibleOptions.length === 0 ? (
            <p className="text-sm text-gray-400">No pricing options available.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {visibleOptions.map((option) => (
                <div
                  key={`${option.targetStartMonth}-${option.termMonths}`}
                  className={`rounded-2xl border p-4 ${
                    option.recommended
                      ? 'border-neon-blue/40 bg-neon-blue/10'
                      : 'border-white/10 bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-medium">{option.targetStartMonthLabel}</h3>
                      <p className="text-xs text-gray-400">{option.termMonths}-month term</p>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-white">${option.monthlyRent}</div>
                      <div className={`text-xs ${option.seasonalAdjustmentPercent >= 0 ? 'text-emerald-300' : 'text-amber-300'}`}>
                        {option.seasonalAdjustmentPercent >= 0 ? '+' : ''}
                        {option.seasonalAdjustmentPercent}%
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-300 mt-4">{option.reason}</p>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
};

export default LeasePricingPage;
