import React, { useMemo, useState } from 'react';
import { CreateEnvelopePayload, EsignEnvelope, EnvelopeRecipientInput, createEnvelope } from '../../services/EsignatureApi';

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
      setFeedback('Signature packet sent successfully.');
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
          sortedEnvelopes.map((envelope) => (
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
            </div>
          ))
        )}
      </div>
    </div>
  );
};
