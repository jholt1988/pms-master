import React, { useState, useEffect } from 'react';
import { Card, CardBody, Button, Chip } from '@nextui-org/react';
import { useNavigate } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import { WorkspaceShell } from '../components/WorkspaceShell';
import { apiFetch } from '../../services/apiClient';

interface PropertyRollup {
  id: string;
  name: string;
  address: string;
  totalUnits: number;
  vacantCount: number;
  expiringCount: number;
  repairRiskCount: number;
  overdueAmount: number;
  signals: { type: string; message: string; unitId: string; unitName: string }[];
}

export default function PortfolioWorkspace() {
  const navigate = useNavigate();
  const [properties, setProperties] = useState<PropertyRollup[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    fetchPortfolio();
  }, []);

  const fetchPortfolio = async () => {
    try {
      setLoading(true);
      const propsRes: any = await apiFetch('/properties');
      const data = propsRes.data || [];
      
      const enriched = await Promise.all(data.map(async (p: any) => {
        const rollupRes: any = await apiFetch(`/properties/${p.id}/rollup`);
        return {
          id: p.id,
          name: p.name,
          address: p.address,
          ...rollupRes
        };
      }));
      setProperties(enriched);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredProperties = properties.filter(p => {
    if (filter === 'Vacancies') return p.vacantCount > 0;
    if (filter === 'Risks') return p.repairRiskCount > 0 || p.overdueAmount > 0;
    return true;
  });

  return (
    <WorkspaceShell
      title="Portfolio Control Index"
      subtitle="Command index of all assets"
      icon={Building2}
    >
      <div className="flex gap-4 mb-6">
        <Button size="sm" color={filter === 'All' ? 'primary' : 'default'} variant={filter === 'All' ? 'solid' : 'bordered'} onPress={() => setFilter('All')}>All Properties</Button>
        <Button size="sm" color={filter === 'Vacancies' ? 'primary' : 'default'} variant={filter === 'Vacancies' ? 'solid' : 'bordered'} onPress={() => setFilter('Vacancies')}>Vacancies</Button>
        <Button size="sm" color={filter === 'Risks' ? 'primary' : 'default'} variant={filter === 'Risks' ? 'solid' : 'bordered'} onPress={() => setFilter('Risks')}>Units Needing Action</Button>
      </div>

      {loading ? (
        <div className="text-gray-400">Loading portfolio...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProperties.map(p => (
            <Card key={p.id} isPressable onPress={() => navigate(`/properties/${p.id}/workspace`)} className="hover:border-neon-blue transition-colors border border-white/10 bg-deep-800">
              <CardBody>
                <h3 className="text-xl font-bold text-white mb-2">{p.name}</h3>
                <p className="text-sm text-gray-400 mb-4">{p.totalUnits} Units · {p.vacantCount} Vacant · {p.expiringCount} Expiring · {p.repairRiskCount} Risk</p>
                
                <div className="space-y-2">
                  {p.signals.slice(0, 3).map((sig, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      {sig.type === 'CRITICAL' && <span className="text-red-500">⚠</span>}
                      {sig.type === 'WARNING' && <span className="text-yellow-500">📅</span>}
                      {sig.type === 'INFO' && <span className="text-blue-500">ℹ</span>}
                      <span className="text-gray-300">{sig.message}</span>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </WorkspaceShell>
  );
}