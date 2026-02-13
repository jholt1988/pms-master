import React, { useState } from 'react';
import { Card, CardBody, CardHeader, Button, Chip } from '@nextui-org/react';
import { EsignEnvelope, EsignParticipant } from '../../services/EsignatureApi';
import { EnvelopeDetailsModal } from './EnvelopeDetailsModal';
import { Eye, Download, RefreshCw, Send, X } from 'lucide-react';

interface EnvelopeManagementCardProps {
  envelopes: EsignEnvelope[];
  token: string;
  onEnvelopeUpdated?: (envelope: EsignEnvelope) => void;
  canManage?: boolean;
  onRefresh?: () => void;
  onResend?: (envelopeId: number) => void;
  onVoid?: (envelopeId: number) => void;
  onDownloadSigned?: (envelopeId: number) => void;
  onDownloadCertificate?: (envelopeId: number) => void;
}

const statusColorClass: Record<string, string> = {
  COMPLETED: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  SENT: 'bg-blue-100 text-blue-700 border-blue-300',
  DELIVERED: 'bg-indigo-100 text-indigo-700 border-indigo-300',
  DECLINED: 'bg-rose-100 text-rose-700 border-rose-300',
  VOIDED: 'bg-gray-100 text-gray-700 border-gray-300',
  ERROR: 'bg-amber-100 text-amber-700 border-amber-300',
  CREATED: 'bg-gray-100 text-gray-700 border-gray-300',
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'COMPLETED':
      return '✓';
    case 'SENT':
    case 'DELIVERED':
      return '→';
    case 'DECLINED':
      return '✗';
    case 'VOIDED':
      return '⊘';
    case 'ERROR':
      return '⚠';
    default:
      return '○';
  }
};

export const EnvelopeManagementCard: React.FC<EnvelopeManagementCardProps> = ({
  envelopes,
  token,
  onEnvelopeUpdated,
  canManage = false,
  onRefresh,
  onResend,
  onVoid,
  onDownloadSigned,
  onDownloadCertificate,
}) => {
  const [selectedEnvelopeId, setSelectedEnvelopeId] = useState<number | null>(null);
  const [loadingEnvelopes, setLoadingEnvelopes] = useState<Set<number>>(new Set());

  const handleAction = async (
    envelopeId: number,
    action: () => void | Promise<void>,
    actionName: string,
  ) => {
    setLoadingEnvelopes((prev) => new Set(prev).add(envelopeId));
    try {
      await Promise.resolve(action());
    } catch (error) {
      console.error(`Failed to ${actionName}:`, error);
    } finally {
      setLoadingEnvelopes((prev) => {
        const next = new Set(prev);
        next.delete(envelopeId);
        return next;
      });
    }
  };

  if (envelopes.length === 0) {
    return (
      <Card>
        <CardBody>
          <div className="text-center py-8">
            <p className="text-foreground-500 text-sm">No signature envelopes found</p>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Signature Envelopes</h3>
          <Chip size="sm" variant="flat">
            {envelopes.length} {envelopes.length === 1 ? 'envelope' : 'envelopes'}
          </Chip>
        </CardHeader>
        <CardBody>
          <div className="space-y-3">
            {envelopes.map((envelope) => {
              const isLoading = loadingEnvelopes.has(envelope.id);
              const canVoid = canManage && envelope.status !== 'COMPLETED' && envelope.status !== 'VOIDED';
              const canResend = canManage && envelope.status !== 'COMPLETED' && envelope.status !== 'VOIDED';
              const canDownload = envelope.status === 'COMPLETED' && envelope.signedPdfDocument;
              const pendingParticipants = envelope.participants?.filter(
                (p: EsignParticipant) => p.status !== 'SIGNED' && p.status !== 'DECLINED',
              ).length || 0;

              return (
                <div
                  key={envelope.id}
                  className="rounded-lg border border-default-200 bg-default-50 p-4 hover:border-default-300 transition-colors"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{getStatusIcon(envelope.status)}</span>
                        <h4 className="font-semibold text-foreground">Envelope #{envelope.id}</h4>
                        <Chip
                          size="sm"
                          variant="flat"
                          className={statusColorClass[envelope.status] || 'bg-gray-100 text-gray-700'}
                        >
                          {envelope.status}
                        </Chip>
                      </div>
                      <div className="text-xs text-foreground-500 space-y-1">
                        <p>
                          Created: {new Date(envelope.createdAt).toLocaleDateString()} at{' '}
                          {new Date(envelope.createdAt).toLocaleTimeString()}
                        </p>
                        <p>Provider: {envelope.provider}</p>
                        {pendingParticipants > 0 && (
                          <p className="text-amber-600 font-medium">
                            {pendingParticipants} pending {pendingParticipants === 1 ? 'signer' : 'signers'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Participants Summary */}
                  {envelope.participants && envelope.participants.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-medium text-foreground-500 mb-1">Participants:</p>
                      <div className="flex flex-wrap gap-1">
                        {envelope.participants.map((participant: EsignParticipant) => (
                          <Chip
                            key={participant.id}
                            size="sm"
                            variant="flat"
                            className={
                              participant.status === 'SIGNED'
                                ? 'bg-emerald-100 text-emerald-700'
                                : participant.status === 'DECLINED'
                                  ? 'bg-rose-100 text-rose-700'
                                  : 'bg-blue-100 text-blue-700'
                            }
                          >
                            {participant.name} ({participant.status})
                          </Chip>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-default-200">
                    <Button
                      size="sm"
                      variant="light"
                      startContent={<Eye size={14} />}
                      onPress={() => setSelectedEnvelopeId(envelope.id)}
                    >
                      View Details
                    </Button>

                    {canDownload && (
                      <>
                        {envelope.signedPdfDocument && (
                          <Button
                            size="sm"
                            variant="light"
                            color="success"
                            startContent={<Download size={14} />}
                            onPress={() =>
                              onDownloadSigned &&
                              handleAction(
                                envelope.id,
                                () => onDownloadSigned(envelope.id),
                                'download signed document',
                              )
                            }
                            isLoading={isLoading}
                          >
                            Download PDF
                          </Button>
                        )}
                        {envelope.auditTrailDocument && (
                          <Button
                            size="sm"
                            variant="light"
                            color="primary"
                            startContent={<Download size={14} />}
                            onPress={() =>
                              onDownloadCertificate &&
                              handleAction(
                                envelope.id,
                                () => onDownloadCertificate(envelope.id),
                                'download certificate',
                              )
                            }
                            isLoading={isLoading}
                          >
                            Certificate
                          </Button>
                        )}
                      </>
                    )}

                    {canManage && (
                      <>
                        {canResend && (
                          <Button
                            size="sm"
                            variant="light"
                            color="primary"
                            startContent={<Send size={14} />}
                            onPress={() =>
                              onResend &&
                              handleAction(
                                envelope.id,
                                () => onResend(envelope.id),
                                'resend notifications',
                              )
                            }
                            isLoading={isLoading}
                          >
                            Resend
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="light"
                          color="default"
                          startContent={<RefreshCw size={14} />}
                          onPress={() =>
                            onRefresh &&
                            handleAction(
                              envelope.id,
                              () => onRefresh(),
                              'refresh status',
                            )
                          }
                          isLoading={isLoading}
                        >
                          Refresh
                        </Button>
                        {canVoid && (
                          <Button
                            size="sm"
                            variant="light"
                            color="danger"
                            startContent={<X size={14} />}
                            onPress={() =>
                              onVoid &&
                              handleAction(
                                envelope.id,
                                () => onVoid(envelope.id),
                                'void envelope',
                              )
                            }
                            isLoading={isLoading}
                          >
                            Void
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>

      {/* Envelope Details Modal */}
      {selectedEnvelopeId && (
        <EnvelopeDetailsModal
          isOpen={!!selectedEnvelopeId}
          onClose={() => setSelectedEnvelopeId(null)}
          envelopeId={selectedEnvelopeId}
          token={token}
          canManage={canManage}
          onEnvelopeUpdated={(updated) => {
            onEnvelopeUpdated?.(updated);
            setSelectedEnvelopeId(null);
          }}
        />
      )}
    </>
  );
};

