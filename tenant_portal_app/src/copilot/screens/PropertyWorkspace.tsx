import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import { Card, CardBody, Button } from '@nextui-org/react';
import { WorkspaceShell } from '../components/WorkspaceShell';
import { apiFetch } from '../../services/apiClient';

interface Unit {
  id: string;
  name: string;
  status: string;
}

export default function PropertyWorkspace() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [property, setProperty] = useState<any>(null);
  const [rollup, setRollup] = useState<any>(null);

  useEffect(() => {
    if (id) {
      apiFetch(`/properties/${id}`).then((res: any) => setProperty(res));
      apiFetch(`/properties/${id}/rollup`).then((res: any) => setRollup(res));
    }
  }, [id]);

  if (!property || !rollup) return <div className="text-gray-400 p-8">Loading Property...</div>;

  return (
    <WorkspaceShell
      title={property.name}
      subtitle={`${property.address} · ${rollup.totalUnits} Units · ${rollup.vacantCount} Vacant · ${rollup.expiringCount} Expiring · ${rollup.repairRiskCount} Risk`}
      icon={Building2}
    >
      <div className="flex gap-4 mb-8">
        <Button size="sm" variant="bordered">View Vacancy</Button>
        <Button size="sm" variant="bordered">Start Renewal</Button>
        <Button size="sm" variant="bordered">Open Maintenance</Button>
        <Button size="sm" variant="bordered">Review Financials</Button>
      </div>

      {rollup.signals && rollup.signals.length > 0 && (
        <div className="flex flex-col gap-2 mb-8 bg-red-900/20 p-4 rounded-xl border border-red-500/30">
          <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Active Signals</h4>
          {rollup.signals.map((sig: any, i: number) => (
            <div key={i} className="flex items-center gap-2 text-sm text-gray-200">
              {sig.type === 'CRITICAL' && <span className="text-red-500">⚠</span>}
              {sig.type === 'WARNING' && <span className="text-yellow-500">📅</span>}
              {sig.message} — Unit {sig.unitName}
            </div>
          ))}
        </div>
      )}

      <h3 className="text-lg font-bold text-white mb-4">Unit Grid</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {property.units.map((unit: Unit) => (
          <Card key={unit.id} isPressable onPress={() => navigate(`/properties/${id}/units/${unit.id}/workspace`)} className="hover:border-neon-blue border border-white/10 bg-deep-800">
            <CardBody>
              <h4 className="text-lg font-bold text-white mb-1">Unit {unit.name}</h4>
              <p className="text-sm text-neon-blue mb-4 uppercase">{unit.status}</p>
              
              <div className="flex gap-2 mt-2">
                <Button size="sm" color="primary" variant="flat">Take Action</Button>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </WorkspaceShell>
  );
}