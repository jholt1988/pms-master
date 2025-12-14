import React, { useMemo, useState } from 'react';
import {
  CreateEnvelopePayload,
  EsignEnvelope,
  EnvelopeRecipientInput,
  createEnvelope,
  voidEnvelope,
  refreshEnvelopeStatus,
  resendNotifications,
  downloadSignedDocument,
  downloadCertificate,
  getEnvelope,
  createRecipientView,
} from '../../services/EsignatureApi';
import { EnvelopeDetailsModal } from './EnvelopeDetailsModal';
import { Button } from '@nextui-org/react';
import { Eye } from 'lucide-react';

interface LeaseEsignPanelProps {
  token: string;
  leaseId: number;
  tenantName?: string | null;
  tenantEmail?: string | null;
  tenantId?: number;
  envelopes?: EsignEnvelope[];
  onEnvelopeCreated?: (envelope: EsignEnvelope) => void;
}

interface AdditionalRecipient extends EnvelopeRecipientInput {
  id: number;
}

const statusColorClass: Record<string, string> = {
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  SENT: 'bg-blue-100 text-blue-700',
  DELIVERED: 'bg-indigo-100 text-indigo-700',
  DECLINED: 'bg-rose-100 text-rose-700',
  VOIDED: 'bg-gray-100 text-gray-700',
  ERROR: 'bg-amber-100 text-amber-700',
};

export const LeaseEsignPanel: React.FC<LeaseEsignPanelProps> = ({
  token,
  leaseId,
  tenantName,
  tenantEmail,
  tenantId,
  envelopes = [],
  onEnvelopeCreated,
}) => {
  const [templateId, setTemplateId] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [additionalRecipients, setAdditionalRecipients] = useState<AdditionalRecipient[]>([]);
  const [loadingEnvelopes, setLoadingEnvelopes] = useState<Set<number>>(new Set());
  const [voidReason, setVoidReason] = useState<{ [key: number]: string }>({});
  const [showVoidDialog, setShowVoidDialog] = useState<number | null>(null);
  const [selectedEnvelopeId, setSelectedEnvelopeId] = useState<number | null>(null);

  const sortedEnvelopes = useMemo(
    () => [...envelopes].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [envelopes],
  );

  const formRecipients: EnvelopeRecipientInput[] = useMemo(() => {
    const list: EnvelopeRecipientInput[] = [];
    if (tenantEmail) {
      list.push({ name: tenantName || tenantEmail, email: tenantEmail, role: 'TENANT', userId: tenantId });
    }
    additionalRecipients.forEach((recipient) => {
      if (recipient.email && recipient.name) {
        list.push({ name: recipient.name, email: recipient.email, role: recipient.role || 'COSIGNER' });
      }
    });
    return list;
  }, [tenantEmail, tenantName, tenantId, additionalRecipients]);

  const addRecipient = () => {
    setAdditionalRecipients((prev) => [
      ...prev,
      { id: Date.now(), name: '', email: '', role: 'COSIGNER' },
    ]);
  };

  const updateRecipient = (id: number, field: keyof EnvelopeRecipientInput, value: string) => {
    setAdditionalRecipients((prev) => prev.map((recipient) => (recipient.id === id ? { ...recipient, [field]: value } : recipient)));
  };

  const removeRecipient = (id: number) => {
    setAdditionalRecipients((prev) => prev.filter((recipient) => recipient.id !== id));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);
    setError(null);

    const payload: CreateEnvelopePayload = {
      templateId,
      message: message || undefined,
      recipients: formRecipients,
    };

    if (payload.recipients.length === 0) {
      setSaving(false);
      setError('Please provide at least one signer before sending.');
      return;
    }

    try {
      const envelope = await createEnvelope(token, leaseId, payload);
      onEnvelopeCreated?.(envelope);
      setFeedback('Signature packet created successfully.');

      // Attempt immediate embedded signing if the tenant is a signer
      const tenantRecipient = envelope.participants.find(p => p.role === 'TENANT' || p.role === 'SIGNER');
      if (tenantRecipient && tenantId && (tenantRecipient.userId === tenantId || tenantRecipient.email === tenantEmail)) {
        setFeedback('Redirecting to signing session...');
        const currentUrl = window.location.href;
        const returnUrl = currentUrl.includes('?') ? `${currentUrl}&signed=true` : `${currentUrl}?signed=true`;

        try {
          const signingUrl = await createRecipientView(token, envelope.id, returnUrl);
          window.location.href = signingUrl;
          return; // Stop here, page will redirect
        } catch (signError) {
          console.error('Failed to get embedded signing URL:', signError);
          setFeedback('Envelope created, but failed to start signing session. Please check your email.');
        }
      }

      setTemplateId('');
      setMessage('');
      setAdditionalRecipients([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send signature request.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-4 rounded-lg border border-default-200 bg-default-50 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">Digital Signatures</p>
          <p className="text-xs text-foreground-500">Launch DocuSign/HelloSign envelopes and track signer status.</p>
        </div>
        <button
          type="button"
          onClick={addRecipient}
          className="text-xs font-medium text-primary"
        >
          + Add Additional Signer
        </button>
      </div>

      <form className="mt-3 space-y-3" onSubmit={handleSubmit}>
        {feedback && <p className="rounded bg-success-100 p-2 text-xs text-success-800">{feedback}</p>}
        {error && <p className="rounded bg-danger-100 p-2 text-xs text-danger-800">{error}</p>}

        <div>
          <label className="text-xs font-medium text-foreground" htmlFor={`template-${leaseId}`}>
            Template ID
          </label>
          <input
            id={`template-${leaseId}`}
            type="text"
            value={templateId}
            onChange={(event) => setTemplateId(event.target.value)}
            className="mt-1 w-full rounded border border-default-300 p-2 text-sm"
            placeholder="e.g., STANDARD-LEASE"
            required
          />
        </div>

        <div>
          <label className="text-xs font-medium text-foreground" htmlFor={`message-${leaseId}`}>
            Message to signers
          </label>
          <textarea
            id={`message-${leaseId}`}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            className="mt-1 w-full rounded border border-default-300 p-2 text-sm"
            rows={3}
            placeholder="Share any notes for the recipients"
          />
        </div>

        {additionalRecipients.length > 0 && (
          <div className="space-y-2">
            {additionalRecipients.map((recipient) => (
              <div key={recipient.id} className="rounded border border-default-200 p-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={recipient.name}
                    onChange={(event) => updateRecipient(recipient.id, 'name', event.target.value)}
                    className="w-1/2 rounded border border-default-300 p-2 text-sm"
                    placeholder="Signer name"
                  />
                  <input
                    type="email"
                    value={recipient.email}
                    onChange={(event) => updateRecipient(recipient.id, 'email', event.target.value)}
                    className="w-1/2 rounded border border-default-300 p-2 text-sm"
                    placeholder="email@example.com"
                  />
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <input
                    type="text"
                    value={recipient.role}
                    onChange={(event) => updateRecipient(recipient.id, 'role', event.target.value)}
                    className="w-1/2 rounded border border-default-300 p-2 text-sm"
                    placeholder="Role (e.g., GUARANTOR)"
                  />
                  <button
                    type="button"
                    onClick={() => removeRecipient(recipient.id)}
                    className="text-xs font-medium text-danger"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {saving ? 'Sending…' : 'Send Signature Request'}
        </button>
      </form>

      <div className="mt-5 space-y-3">
        {sortedEnvelopes.length === 0 ? (
          <p className="text-xs text-foreground-500">No signature packets have been sent yet.</p>
        ) : (
          sortedEnvelopes.map((envelope) => {
            const isLoading = loadingEnvelopes.has(envelope.id);
            const canVoid = envelope.status !== 'COMPLETED' && envelope.status !== 'VOIDED';
            const canResend = envelope.status !== 'COMPLETED' && envelope.status !== 'VOIDED';
            const canDownload = envelope.status === 'COMPLETED' && envelope.signedPdfDocument;

            return (
              <div key={envelope.id} className="rounded border border-default-200 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Envelope #{envelope.id}</p>
                    <p className="text-xs text-foreground-500">
                      {new Date(envelope.createdAt).toLocaleString()} • Provider {envelope.provider}
                    </p>
                  </div>
                  <span className={`rounded px-2 py-1 text-xs font-semibold ${statusColorClass[envelope.status] || 'bg-default-200 text-default-700'}`}>
                    {envelope.status}
                  </span>
                </div>
                <div className="mt-3 space-y-1 text-xs">
                  {envelope.participants.map((participant) => (
                    <div key={participant.id} className="flex items-center justify-between">
                      <span>
                        {participant.name} • {participant.role}
                      </span>
                      <span className="font-semibold text-foreground-600">{participant.status}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
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
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            setLoadingEnvelopes((prev) => new Set(prev).add(envelope.id));
                            await downloadSignedDocument(token, envelope.id);
                            setFeedback('Signed document downloaded successfully.');
                          } catch (err) {
                            setError(err instanceof Error ? err.message : 'Failed to download document.');
                          } finally {
                            setLoadingEnvelopes((prev) => {
                              const next = new Set(prev);
                              next.delete(envelope.id);
                              return next;
                            });
                          }
                        }}
                        disabled={isLoading}
                        className="rounded bg-emerald-600 px-3 py-1 text-xs font-medium text-white disabled:opacity-60 hover:bg-emerald-700"
                      >
                        {isLoading ? 'Downloading…' : 'Download PDF'}
                      </button>
                      {envelope.auditTrailDocument && (
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              setLoadingEnvelopes((prev) => new Set(prev).add(envelope.id));
                              await downloadCertificate(token, envelope.id);
                              setFeedback('Certificate downloaded successfully.');
                            } catch (err) {
                              setError(err instanceof Error ? err.message : 'Failed to download certificate.');
                            } finally {
                              setLoadingEnvelopes((prev) => {
                                const next = new Set(prev);
                                next.delete(envelope.id);
                                return next;
                              });
                            }
                          }}
                          disabled={isLoading}
                          className="rounded bg-indigo-600 px-3 py-1 text-xs font-medium text-white disabled:opacity-60 hover:bg-indigo-700"
                        >
                          {isLoading ? 'Downloading…' : 'Certificate'}
                        </button>
                      )}
                    </>
                  )}
                  {canResend && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          setLoadingEnvelopes((prev) => new Set(prev).add(envelope.id));
                          const result = await resendNotifications(token, envelope.id);
                          setFeedback(`Notifications resent to ${result.participantsNotified} participant(s).`);
                          if (onEnvelopeCreated) {
                            const updated = await getEnvelope(token, envelope.id);
                            onEnvelopeCreated(updated);
                          }
                        } catch (err) {
                          setError(err instanceof Error ? err.message : 'Failed to resend notifications.');
                        } finally {
                          setLoadingEnvelopes((prev) => {
                            const next = new Set(prev);
                            next.delete(envelope.id);
                            return next;
                          });
                        }
                      }}
                      disabled={isLoading}
                      className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white disabled:opacity-60 hover:bg-blue-700"
                    >
                      {isLoading ? 'Sending…' : 'Resend'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        setLoadingEnvelopes((prev) => new Set(prev).add(envelope.id));
                        const updated = await refreshEnvelopeStatus(token, envelope.id);
                        setFeedback('Envelope status refreshed.');
                        if (onEnvelopeCreated) {
                          onEnvelopeCreated(updated);
                        }
                      } catch (err) {
                        setError(err instanceof Error ? err.message : 'Failed to refresh status.');
                      } finally {
                        setLoadingEnvelopes((prev) => {
                          const next = new Set(prev);
                          next.delete(envelope.id);
                          return next;
                        });
                      }
                    }}
                    disabled={isLoading}
                    className="rounded bg-gray-600 px-3 py-1 text-xs font-medium text-white disabled:opacity-60 hover:bg-gray-700"
                  >
                    {isLoading ? 'Refreshing…' : 'Refresh'}
                  </button>
                  {canVoid && (
                    <>
                      {showVoidDialog === envelope.id ? (
                        <div className="mt-2 flex flex-col gap-2 rounded border border-rose-200 bg-rose-50 p-2">
                          <input
                            type="text"
                            placeholder="Reason for voiding (optional)"
                            value={voidReason[envelope.id] || ''}
                            onChange={(e) =>
                              setVoidReason((prev) => ({
                                ...prev,
                                [envelope.id]: e.target.value,
                              }))
                            }
                            className="w-full rounded border border-rose-300 p-1 text-xs"
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  setLoadingEnvelopes((prev) => new Set(prev).add(envelope.id));
                                  const updated = await voidEnvelope(token, envelope.id, voidReason[envelope.id]);
                                  setFeedback('Envelope voided successfully.');
                                  setShowVoidDialog(null);
                                  setVoidReason((prev) => {
                                    const next = { ...prev };
                                    delete next[envelope.id];
                                    return next;
                                  });
                                  if (onEnvelopeCreated) {
                                    onEnvelopeCreated(updated);
                                  }
                                } catch (err) {
                                  setError(err instanceof Error ? err.message : 'Failed to void envelope.');
                                } finally {
                                  setLoadingEnvelopes((prev) => {
                                    const next = new Set(prev);
                                    next.delete(envelope.id);
                                    return next;
                                  });
                                }
                              }}
                              disabled={isLoading}
                              className="rounded bg-rose-600 px-3 py-1 text-xs font-medium text-white disabled:opacity-60 hover:bg-rose-700"
                            >
                              {isLoading ? 'Voiding…' : 'Confirm Void'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setShowVoidDialog(null);
                                setVoidReason((prev) => {
                                  const next = { ...prev };
                                  delete next[envelope.id];
                                  return next;
                                });
                              }}
                              className="rounded bg-gray-400 px-3 py-1 text-xs font-medium text-white hover:bg-gray-500"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowVoidDialog(envelope.id)}
                          disabled={isLoading}
                          className="rounded bg-rose-600 px-3 py-1 text-xs font-medium text-white disabled:opacity-60 hover:bg-rose-700"
                        >
                          Void
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Envelope Details Modal */}
      {selectedEnvelopeId && (
        <EnvelopeDetailsModal
          isOpen={!!selectedEnvelopeId}
          onClose={() => setSelectedEnvelopeId(null)}
          envelopeId={selectedEnvelopeId}
          token={token}
          canManage={true}
          onEnvelopeUpdated={(updated) => {
            onEnvelopeCreated?.(updated);
            setSelectedEnvelopeId(null);
          }}
        />
      )}
    </div>
  );
};
