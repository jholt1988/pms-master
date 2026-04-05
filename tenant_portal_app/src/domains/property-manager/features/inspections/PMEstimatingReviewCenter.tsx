import React, { useEffect, useState } from 'react';
import { Card, CardBody, Button, Divider, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, Chip } from '@nextui-org/react';
import { useAuth } from '../../../../AuthContext';
import { apiFetch } from '../../../../services/apiClient';

function unwrapApi<T>(resp: any): T {
  if (resp && typeof resp === 'object' && 'data' in resp) return (resp as any).data as T;
  if (Array.isArray(resp)) return resp as unknown as T;
  return resp as T;
}

interface RepairEstimate {
  id: string;
  totalLaborCost: number;
  totalMaterialCost: number;
  totalProjectCost: number;
  totalLaborHours: number;
  stepByStepPlan: string;
}

export default function PMEstimatingReviewCenter(): React.ReactElement {
  const { token } = useAuth();
  const [inspections, setInspections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeEstimate, setActiveEstimate] = useState<RepairEstimate | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [approvingId, setApprovingId] = useState<number | null>(null);

  const fetchInspections = React.useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      // Fetch both COMPLETED (needs approval) and APPROVED (already processed)
      const data = unwrapApi<any[]>(await apiFetch('/inspections?take=50', { token }));
      const relevant = (Array.isArray(data) ? data : []).filter(i => i.status === 'COMPLETED' || i.status === 'APPROVED');
      setInspections(relevant);
    } catch (err: any) {
      setError(err.message || 'Failed to load inspections');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchInspections();
  }, [fetchInspections]);

  const handleApprove = async (id: number) => {
    if (!token) return;
    setApprovingId(id);
    setError(null);
    try {
      const response = await apiFetch(`/inspections/${id}/approve`, {
        token,
        method: 'PUT',
      });
      
      const payload: any = response;
      if (payload && payload.generatedEstimate) {
        setActiveEstimate(payload.generatedEstimate);
        onOpen();
      }
      
      await fetchInspections();
    } catch (err: any) {
      setError(err.message || 'Failed to approve inspection');
    } finally {
      setApprovingId(null);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Inspection Estimating Center</h1>
        <p className="text-foreground-500">Review completed tenant inspections and auto-generate step-by-step repair estimates.</p>
      </div>

      {error && (
        <Card className="border-rose-500/50 bg-rose-500/10">
          <CardBody>
            <p className="text-rose-500">{error}</p>
          </CardBody>
        </Card>
      )}

      {loading ? (
        <p className="text-foreground-500 animate-pulse">Loading inspections...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {inspections.length === 0 && <p className="text-foreground-500">No inspections pending review or approved.</p>}
          
          {inspections.map((inspection) => (
            <Card key={inspection.id} className="relative overflow-hidden group hover:border-primary/50 transition-colors border border-white/10 dark:bg-zinc-900/50 backdrop-blur-md">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
              <CardBody className="gap-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-lg">{inspection.type} Inspection</h3>
                    <p className="text-xs text-foreground-400 font-mono">ID: {inspection.id}</p>
                  </div>
                  <Chip color={inspection.status === 'APPROVED' ? 'success' : 'warning'} variant="flat" size="sm">
                    {inspection.status}
                  </Chip>
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm"><span className="text-foreground-500">Scheduled:</span> {new Date(inspection.scheduledDate).toLocaleDateString()}</p>
                  <p className="text-sm"><span className="text-foreground-500">Unit:</span> {inspection.unit?.name || 'Unknown'}</p>
                  <p className="text-sm"><span className="text-foreground-500">Property:</span> {inspection.unit?.property?.name || 'Unknown'}</p>
                </div>

                <Divider className="my-2" />

                {inspection.status === 'COMPLETED' ? (
                  <Button 
                    color="primary" 
                    variant="shadow" 
                    className="w-full font-semibold"
                    isLoading={approvingId === inspection.id}
                    onPress={() => handleApprove(inspection.id)}
                  >
                    Approve & Generate Estimate
                  </Button>
                ) : (
                  <Button 
                    color="success" 
                    variant="flat" 
                    className="w-full opacity-75 cursor-default"
                    disableRipple
                  >
                    Estimate Generated
                  </Button>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={isOpen} onClose={onClose} size="3xl" scrollBehavior="inside" backdrop="blur">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent">Repair Estimate Generated</h2>
                <p className="text-sm text-foreground-500 font-normal">Automated Cost & Resource Breakdown</p>
              </ModalHeader>
              <ModalBody>
                {activeEstimate && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <Card className="bg-primary/5 border-primary/20">
                        <CardBody className="p-4 text-center">
                          <p className="text-xs text-primary/80 uppercase tracking-wider font-semibold">Total Labor</p>
                          <p className="text-2xl font-bold">${activeEstimate.totalLaborCost?.toFixed(2)}</p>
                        </CardBody>
                      </Card>
                      <Card className="bg-secondary/5 border-secondary/20">
                        <CardBody className="p-4 text-center">
                          <p className="text-xs text-secondary/80 uppercase tracking-wider font-semibold">Total Material</p>
                          <p className="text-2xl font-bold">${activeEstimate.totalMaterialCost?.toFixed(2)}</p>
                        </CardBody>
                      </Card>
                      <Card className="bg-success/5 border-success/20">
                        <CardBody className="p-4 text-center">
                          <p className="text-xs text-success/80 uppercase tracking-wider font-semibold">Project Cost</p>
                          <p className="text-2xl font-bold">${activeEstimate.totalProjectCost?.toFixed(2)}</p>
                        </CardBody>
                      </Card>
                      <Card className="bg-warning/5 border-warning/20">
                        <CardBody className="p-4 text-center">
                          <p className="text-xs text-warning/80 uppercase tracking-wider font-semibold">SLA Target Time</p>
                          <p className="text-2xl font-bold">{activeEstimate.totalLaborHours} hrs</p>
                        </CardBody>
                      </Card>
                    </div>

                    <Card className="bg-zinc-900/50 border-white/10">
                      <CardBody className="p-6">
                        <div 
                          className="prose prose-invert prose-sm max-w-none prose-headings:text-emerald-400 prose-a:text-emerald-300"
                          dangerouslySetInnerHTML={{ __html: activeEstimate.stepByStepPlan ? activeEstimate.stepByStepPlan.replace(/\\n/g, '<br/>') : 'No repairs required.' }}
                        />
                      </CardBody>
                    </Card>
                  </div>
                )}
              </ModalBody>
              <ModalFooter>
                <Button color="primary" variant="flat" onPress={onClose}>
                  Done
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
