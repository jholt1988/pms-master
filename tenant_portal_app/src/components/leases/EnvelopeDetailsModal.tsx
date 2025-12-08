import React, { useEffect, useState } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Spinner } from '@nextui-org/react';
import {
  EsignEnvelope,
  EsignParticipant,
  getEnvelope,
  voidEnvelope,
  refreshEnvelopeStatus,
  resendNotifications,
  downloadSignedDocument,
  downloadCertificate,
} from '../../services/EsignatureApi';
import { ConfirmDialog } from '../ui/ConfirmDialog';

interface EnvelopeDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  envelopeId: number;
  token: string;
  onEnvelopeUpdated?: (envelope: EsignEnvelope) => void;
  canManage?: boolean; // Property manager can manage, tenant can only view
}

const statusColorClass: Record<string, string> = {
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  SENT: 'bg-blue-100 text-blue-700',
  DELIVERED: 'bg-indigo-100 text-indigo-700',
  DECLINED: 'bg-rose-100 text-rose-700',
  VOIDED: 'bg-gray-100 text-gray-700',
  ERROR: 'bg-amber-100 text-amber-700',
  CREATED: 'bg-gray-100 text-gray-700',
};

const participantStatusColorClass: Record<string, string> = {
  SIGNED: 'bg-emerald-100 text-emerald-700',
  SENT: 'bg-blue-100 text-blue-700',
  VIEWED: 'bg-indigo-100 text-indigo-700',
  DECLINED: 'bg-rose-100 text-rose-700',
  ERROR: 'bg-amber-100 text-amber-700',
  CREATED: 'bg-gray-100 text-gray-700',
};

export const EnvelopeDetailsModal: React.FC<EnvelopeDetailsModalProps> = ({
  isOpen,
  onClose,
  envelopeId,
  token,
  onEnvelopeUpdated,
  canManage = false,
}) => {
  const [envelope, setEnvelope] = useState<EsignEnvelope | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showVoidDialog, setShowVoidDialog] = useState(false);
  const [voidReason, setVoidReason] = useState('');

  useEffect(() => {
    if (isOpen && envelopeId) {
      loadEnvelope();
    }
  }, [isOpen, envelopeId]);

  const loadEnvelope = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getEnvelope(token, envelopeId);
      setEnvelope(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load envelope details');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!envelope) return;
    setActionLoading('refresh');
    try {
      const updated = await refreshEnvelopeStatus(token, envelope.id);
      setEnvelope(updated);
      onEnvelopeUpdated?.(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResend = async () => {
    if (!envelope) return;
    setActionLoading('resend');
    try {
      await resendNotifications(token, envelope.id);
      await loadEnvelope(); // Reload to get updated reminder count
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend notifications');
    } finally {
      setActionLoading(null);
    }
  };

  const handleVoid = async () => {
    if (!envelope) return;
    setActionLoading('void');
    try {
      const updated = await voidEnvelope(token, envelope.id, voidReason || undefined);
      setEnvelope(updated);
      setShowVoidDialog(false);
      setVoidReason('');
      onEnvelopeUpdated?.(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to void envelope');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDownloadSigned = async () => {
    if (!envelope) return;
    setActionLoading('download-signed');
    try {
      await downloadSignedDocument(token, envelope.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download document');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDownloadCertificate = async () => {
    if (!envelope) return;
    setActionLoading('download-cert');
    try {
      await downloadCertificate(token, envelope.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download certificate');
    } finally {
      setActionLoading(null);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size="2xl" scrollBehavior="inside">
        <ModalContent
          classNames={{
            base: "bg-deep-900 border border-white/10",
            backdrop: "bg-black/80 backdrop-blur-sm",
          }}
        >
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <h2 className="text-xl font-semibold">Envelope Details</h2>
                {envelope && (
                  <span
                    className={`inline-block w-fit rounded px-2 py-1 text-xs font-semibold ${
                      statusColorClass[envelope.status] || 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {envelope.status}
                  </span>
                )}
              </ModalHeader>
              <ModalBody>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Spinner size="lg" />
                  </div>
                ) : error ? (
                  <div className="rounded bg-rose-50 border border-rose-200 p-4">
                    <p className="text-rose-700 text-sm">{error}</p>
                    <Button
                      size="sm"
                      variant="flat"
                      color="danger"
                      className="mt-2"
                      onPress={loadEnvelope}
                    >
                      Retry
                    </Button>
                  </div>
                ) : envelope ? (
                  <div className="space-y-6">
                    {/* Basic Information */}
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-2">Basic Information</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-foreground-500">Envelope ID</p>
                          <p className="font-medium text-foreground">#{envelope.id}</p>
                        </div>
                        <div>
                          <p className="text-foreground-500">Provider</p>
                          <p className="font-medium text-foreground">{envelope.provider}</p>
                        </div>
                        <div>
                          <p className="text-foreground-500">Provider Envelope ID</p>
                          <p className="font-medium text-foreground font-mono text-xs">
                            {envelope.providerEnvelopeId}
                          </p>
                        </div>
                        <div>
                          <p className="text-foreground-500">Status</p>
                          <p className="font-medium text-foreground">{envelope.status}</p>
                        </div>
                        <div>
                          <p className="text-foreground-500">Created</p>
                          <p className="font-medium text-foreground">
                            {new Date(envelope.createdAt).toLocaleString()}
                          </p>
                        </div>
                        {envelope.updatedAt && (
                          <div>
                            <p className="text-foreground-500">Last Updated</p>
                            <p className="font-medium text-foreground">
                              {new Date(envelope.updatedAt).toLocaleString()}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Participants */}
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-2">
                        Participants ({envelope.participants?.length || 0})
                      </h3>
                      <div className="space-y-2">
                        {envelope.participants?.map((participant: EsignParticipant) => (
                          <div
                            key={participant.id}
                            className="rounded border border-default-200 p-3 bg-default-50"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <p className="font-medium text-foreground">{participant.name}</p>
                                <p className="text-xs text-foreground-500">{participant.email}</p>
                              </div>
                              <span
                                className={`rounded px-2 py-1 text-xs font-semibold ${
                                  participantStatusColorClass[participant.status] ||
                                  'bg-gray-100 text-gray-700'
                                }`}
                              >
                                {participant.status}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs text-foreground-500">
                              <div>
                                <span className="font-medium">Role:</span> {participant.role}
                              </div>
                              {participant.phone && (
                                <div>
                                  <span className="font-medium">Phone:</span> {participant.phone}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Documents */}
                    {envelope.status === 'COMPLETED' && (
                      <div>
                        <h3 className="text-sm font-semibold text-foreground mb-2">Documents</h3>
                        <div className="space-y-2">
                          {envelope.signedPdfDocument && (
                            <div className="flex items-center justify-between rounded border border-default-200 p-3 bg-default-50">
                              <div>
                                <p className="font-medium text-foreground">Signed PDF</p>
                                <p className="text-xs text-foreground-500">
                                  {envelope.signedPdfDocument.fileName}
                                </p>
                              </div>
                              <Button
                                size="sm"
                                color="primary"
                                variant="flat"
                                onPress={handleDownloadSigned}
                                isLoading={actionLoading === 'download-signed'}
                              >
                                Download
                              </Button>
                            </div>
                          )}
                          {envelope.auditTrailDocument && (
                            <div className="flex items-center justify-between rounded border border-default-200 p-3 bg-default-50">
                              <div>
                                <p className="font-medium text-foreground">Audit Certificate</p>
                                <p className="text-xs text-foreground-500">
                                  {envelope.auditTrailDocument.fileName}
                                </p>
                              </div>
                              <Button
                                size="sm"
                                color="primary"
                                variant="flat"
                                onPress={handleDownloadCertificate}
                                isLoading={actionLoading === 'download-cert'}
                              >
                                Download
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Metadata */}
                    {envelope.providerMetadata && (
                      <div>
                        <h3 className="text-sm font-semibold text-foreground mb-2">Additional Information</h3>
                        <div className="rounded border border-default-200 p-3 bg-default-50">
                          <pre className="text-xs text-foreground-600 overflow-auto max-h-32">
                            {JSON.stringify(envelope.providerMetadata, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </ModalBody>
              <ModalFooter>
                <div className="flex items-center justify-between w-full">
                  <Button variant="light" onPress={onClose}>
                    Close
                  </Button>
                  {canManage && envelope && (
                    <div className="flex gap-2">
                      {envelope.status !== 'COMPLETED' && envelope.status !== 'VOIDED' && (
                        <>
                          <Button
                            size="sm"
                            variant="flat"
                            color="primary"
                            onPress={handleResend}
                            isLoading={actionLoading === 'resend'}
                          >
                            Resend Notifications
                          </Button>
                          <Button
                            size="sm"
                            variant="flat"
                            color="danger"
                            onPress={() => setShowVoidDialog(true)}
                            isDisabled={envelope.status === 'COMPLETED'}
                          >
                            Void Envelope
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="flat"
                        color="default"
                        onPress={handleRefresh}
                        isLoading={actionLoading === 'refresh'}
                      >
                        Refresh Status
                      </Button>
                    </div>
                  )}
                </div>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Void Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showVoidDialog}
        onOpenChange={() => setShowVoidDialog(false)}
        title="Void Envelope"
        message="Are you sure you want to void this envelope? This action cannot be undone."
        confirmLabel="Void Envelope"
        cancelLabel="Cancel"
        confirmColor="danger"
        isLoading={actionLoading === 'void'}
        onConfirm={handleVoid}
      />
    </>
  );
};

