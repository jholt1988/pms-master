import React from 'react';
import { Chip } from '@nextui-org/react';
import { GlassCard } from '../../../../components/ui/GlassCard';
import type { PortfolioHeatmapRow } from '../../services/managerApi';

const tierClass: Record<PortfolioHeatmapRow['tier'], string> = {
  HEALTHY: 'from-emerald-500/25 to-emerald-400/10 border-emerald-400/30',
  WATCH: 'from-amber-500/25 to-amber-400/10 border-amber-400/30',
  CRITICAL: 'from-rose-500/25 to-rose-400/10 border-rose-400/30',
};

export const PortfolioHeatmap: React.FC<{
  rows: PortfolioHeatmapRow[];
  loading?: boolean;
}> = ({ rows, loading }) => {
  return (
    <GlassCard title="Portfolio Health Heatmap" subtitle="FINANCIAL / OCCUPANCY / OPERATIONS" glowColor="blue">
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-32 rounded-2xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-400">No portfolio health data is available yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {rows.map((row) => (
            <div
              key={row.propertyId}
              className={`rounded-2xl border bg-gradient-to-br p-4 ${tierClass[row.tier]}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-white font-medium">{row.propertyName}</h4>
                  <p className="text-xs text-gray-300 mt-1">
                    {row.occupiedUnits}/{row.totalUnits} occupied
                  </p>
                </div>
                <Chip size="sm" variant="flat" className="text-white bg-white/10">
                  {row.tier}
                </Chip>
              </div>

              <div className="mt-4 flex items-end gap-2">
                <div className="text-3xl font-bold text-white">{row.compositeScore}</div>
                <div className="text-xs text-gray-300 uppercase tracking-wider mb-1">Composite</div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl bg-black/15 p-2">
                  <div className="text-xs text-gray-300 uppercase">Occupancy</div>
                  <div className="text-lg font-semibold text-white">{row.occupancyRate}%</div>
                </div>
                <div className="rounded-xl bg-black/15 p-2">
                  <div className="text-xs text-gray-300 uppercase">Collections</div>
                  <div className="text-lg font-semibold text-white">{row.collectionRate}%</div>
                </div>
                <div className="rounded-xl bg-black/15 p-2">
                  <div className="text-xs text-gray-300 uppercase">Ops</div>
                  <div className="text-lg font-semibold text-white">{row.maintenanceHealth}%</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
};

export default PortfolioHeatmap;
