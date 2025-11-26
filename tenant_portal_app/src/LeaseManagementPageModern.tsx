import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { apiFetch } from './services/apiClient';
import { StatsCard, PageHeader, LeaseCard } from './components/ui';
import { Card, CardBody, Button } from '@nextui-org/react';
import { LeaseEsignPanel } from './components/leases/LeaseEsignPanel';
import { EsignEnvelope } from './services/EsignatureApi';
import { MasterDetailLayout } from './components/ui/MasterDetailLayout';
import { useMasterDetail } from './hooks/useMasterDetail';
import { useViewportCategory } from './hooks/useViewportCategory';
import { ArrowLeft } from 'lucide-react';

interface Lease {
  id: number;
  startDate: string;
  endDate: string;
  rentAmount: number;
  depositAmount: number;
  status: string;
  tenant?: {
    id?: number;
    username: string;
  };
  unit: {
    name: string;
    property?: {
      name: string;
    } | null;
  };
  esignEnvelopes?: EsignEnvelope[];
}

const LeaseManagementPageModern = () => {
  const { token } = useAuth();
  const [leases, setLeases] = useState<Lease[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { selectedItem: selectedLease, showDetail, selectItem: selectLease, clearSelection } = useMasterDetail<Lease>();
  const viewport = useViewportCategory();

  // ... (insights and boardData memos remain the same)

  const fetchLeases = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (!token) {
      setLeases([]);
      setLoading(false);
      return;
    }

    try {
      const data = await apiFetch('/leases', { token });
      setLeases(data?.data ?? data ?? []);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load leases');
      setLeases([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchLeases();
  }, [token, fetchLeases]);

  const handleBackClick = () => {
    clearSelection();
  };

  const handleEnvelopeCreated = (leaseId: number, envelope: EsignEnvelope) => {
    setLeases(prev =>
      prev.map(existing =>
        existing.id === leaseId
          ? { ...existing, esignEnvelopes: [envelope, ...(existing.esignEnvelopes ?? [])] }
          : existing,
      ),
    );
  };

  const breadcrumbs = [
    { label: 'Dashboard', href: '/' },
    { label: 'Lease Management' }
  ];

  const master = (
    <div className="p-4 sm:p-6">
      <PageHeader
        title="Lease Lifecycle Manager"
        subtitle="Track occupancy, renewals, and compliance so every lease stays on schedule."
        breadcrumbs={breadcrumbs}
      />

      {error && (
        <Card className="border-danger-200 bg-danger-50">
          <CardBody>
            <p className="text-sm text-danger-700">{error}</p>
          </CardBody>
        </Card>
      )}

      {/* Stats Cards */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 my-8">
        {/* ... (StatsCard components remain the same) */}
      </section>

      {/* Leases List */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">All Leases</h2>
        </div>
        
        {loading ? (
          <Card className="border-dashed">
            <CardBody className="py-12 text-center">
              <p className="text-sm text-foreground-500">Loading leases…</p>
            </CardBody>
          </Card>
        ) : leases.length === 0 ? (
          <Card className="border-dashed">
            <CardBody className="py-12 text-center">
              <p className="text-sm text-foreground-500">No leases found.</p>
            </CardBody>
          </Card>
        ) : (
          <div className="space-y-4">
            {leases.map((lease) => (
              <div key={lease.id} onClick={() => selectLease(lease)}>
                <LeaseCard
                  lease={lease}
                  onManage={() => {}}
                />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );

  const detail = (
    <div className="p-4 sm:p-6">
      {selectedLease ? (
        <>
          {(viewport === 'mobile' || viewport === 'tablet-portrait') && (
            <Button
              isIconOnly
              variant="light"
              onClick={handleBackClick}
              className="mb-4"
            >
              <ArrowLeft size={20} />
            </Button>
          )}
          <Card>
            <CardBody>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Lease Details</h4>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">Start Date:</span> {new Date(selectedLease.startDate).toLocaleDateString()}</p>
                    <p><span className="font-medium">End Date:</span> {new Date(selectedLease.endDate).toLocaleDateString()}</p>
                    <p><span className="font-medium">Rent:</span> ${selectedLease.rentAmount.toLocaleString()}/month</p>
                    <p><span className="font-medium">Deposit:</span> ${selectedLease.depositAmount.toLocaleString()}</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Actions</h4>
                  <p className="text-sm text-foreground-500">
                    Lease management actions will be available here based on the current status.
                  </p>
                  {token && (
                    <LeaseEsignPanel
                      token={token}
                      leaseId={selectedLease.id}
                      tenantEmail={selectedLease.tenant?.username}
                      tenantName={selectedLease.tenant?.username}
                      tenantId={selectedLease.tenant?.id}
                      envelopes={selectedLease.esignEnvelopes ?? []}
                      onEnvelopeCreated={(envelope) => handleEnvelopeCreated(selectedLease.id, envelope)}
                    />
                  )}
                </div>
              </div>
            </CardBody>
          </Card>
        </>
      ) : (
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500">Select a lease to see the details</p>
        </div>
      )}
    </div>
  );

  return (
    <MasterDetailLayout
      master={master}
      detail={detail}
      showDetail={showDetail}
    />
  );
};

export default LeaseManagementPageModern;
