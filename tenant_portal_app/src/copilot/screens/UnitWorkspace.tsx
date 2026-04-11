import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Home } from 'lucide-react';
import { Card, CardBody, Button, Divider } from '@nextui-org/react';
import { WorkspaceShell } from '../components/WorkspaceShell';
import { apiFetch } from '../../services/apiClient';

export default function UnitWorkspace() {
  const { id, unitId } = useParams();
  const [unit, setUnit] = useState<any>(null);
  const [rollup, setRollup] = useState<any>(null);

  useEffect(() => {
    if (id && unitId) {
      apiFetch(`/properties/${id}`).then((res: any) => {
        const found = res.units.find((u: any) => u.id === unitId);
        setUnit(found);
      });
      apiFetch(`/properties/units/${unitId}/rollup`).then((res: any) => setRollup(res));
    }
  }, [id, unitId]);

  if (!unit || !rollup) return <div className="text-gray-400 p-8">Loading Unit...</div>;

  return (
    <WorkspaceShell
      title={`Unit ${unit.name}`}
      subtitle={`${unit.status.toUpperCase()} · Next: Action required`}
      icon={Home}
    >
      <div className="flex gap-4 mb-8 bg-glass-surface p-4 rounded-xl border border-white/5">
        <Button size="sm" color="primary">Finish Turn</Button>
        <Button size="sm" variant="bordered">Adjust Rent</Button>
        <Button size="sm" variant="bordered">Publish Listing</Button>
        <Button size="sm" variant="bordered">Schedule Showing</Button>
        <Button size="sm" variant="bordered">Add Note</Button>
      </div>

      <div className="mb-8">
        <h4 className="text-xs uppercase font-mono tracking-widest text-gray-500 mb-2">Lifecycle Rail</h4>
        <div className="flex items-center gap-2 overflow-x-auto pb-4">
          {['VACANT', 'TURNING', 'LISTED', 'APPLIED', 'APPROVED', 'LEASED', 'OCCUPIED', 'RENEWAL_DUE'].map(state => (
            <div key={state} className={`flex items-center gap-2 ${unit.status === state ? 'text-neon-blue font-bold' : 'text-gray-500'}`}>
              <div className={`w-3 h-3 rounded-full ${unit.status === state ? 'bg-neon-blue shadow-[0_0_10px_#00f0ff]' : 'bg-gray-700'}`} />
              <span className="text-xs tracking-wider">{state}</span>
              {state !== 'RENEWAL_DUE' && <div className="w-8 h-px bg-gray-800 mx-1" />}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="bg-deep-800 border border-white/10">
          <CardBody>
            <h4 className="text-sm text-gray-400 mb-4">STATUS PANEL</h4>
            <p className="text-sm"><span className="text-gray-500">Occupancy:</span> {unit.status}</p>
            <p className="text-sm"><span className="text-gray-500">Beds/Baths:</span> {unit.bedrooms} / {unit.bathrooms}</p>
          </CardBody>
        </Card>

        <Card className="bg-deep-800 border border-white/10">
          <CardBody>
            <h4 className="text-sm text-gray-400 mb-4">FINANCIALS (YTD)</h4>
            <p className="text-sm"><span className="text-gray-500">Revenue:</span> ${rollup.revenueYtd}</p>
            <p className="text-sm"><span className="text-gray-500">Expenses:</span> ${rollup.expenses}</p>
            <Divider className="my-2 bg-gray-800" />
            <p className="text-sm font-bold text-neon-blue">Net: ${rollup.net}</p>
          </CardBody>
        </Card>

        <Card className="bg-deep-800 border border-white/10">
          <CardBody>
            <h4 className="text-sm text-gray-400 mb-4">MAINTENANCE</h4>
            <p className="text-sm"><span className="text-gray-500">Active Issues:</span> {rollup.activeIssues}</p>
            <Button size="sm" variant="light" color="danger" className="mt-2 text-xs">View Open Work Orders</Button>
          </CardBody>
        </Card>
      </div>
    </WorkspaceShell>
  );
}