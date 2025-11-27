
import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../../AuthContext';
import { createRecipientView, EsignEnvelope, EsignParticipant } from '../../../../services/EsignatureApi';
import { apiFetch } from '../../../../services/apiClient';

type LeaseStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'ACTIVE'
  | 'RENEWAL_PENDING'
  | 'NOTICE_GIVEN'
  | 'TERMINATING'
  | 'TERMINATED'
  | 'HOLDOVER'
  | 'CLOSED';

type LeaseRenewalStatus = 'OFFERED' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'WITHDRAWN';
type LeaseNoticeType = 'MOVE_OUT' | 'RENT_INCREASE' | 'OTHER';
type LeaseNoticeDeliveryMethod = 'EMAIL' | 'SMS' | 'PORTAL' | 'PRINT' | 'OTHER';

interface PaymentMethodSummary {
  provider: string;
  brand?: string | null;
  last4?: string | null;
}

interface AutopayEnrollment {
  active: boolean;
  maxAmount?: number | null;
  paymentMethod?: PaymentMethodSummary | null;
}

interface LeaseRenewalOffer {
  id: number;
  proposedRent: number;
  proposedStart: string;
  proposedEnd: string;
  escalationPercent?: number | null;
  message?: string | null;
  status: LeaseRenewalStatus;
  expiresAt?: string | null;
  respondedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface LeaseNotice {
  id: number;
  type: LeaseNoticeType;
  deliveryMethod: LeaseNoticeDeliveryMethod;
  sentAt: string;
  acknowledgedAt?: string | null;
  message?: string | null;
}

interface LeaseHistoryEntry {
  id: number;
  createdAt: string;
  note?: string | null;
  actor?: { id: number; username: string } | null;
  metadata?: Record<string, unknown> | null;
}

interface Lease {
  id: number;
  startDate: string;
  endDate: string;
  rentAmount: number;
  depositAmount: number;
  depositHeldAt?: string | null;
  depositReturnedAt?: string | null;
  depositDisposition?: 'HELD' | 'PARTIAL_RETURN' | 'RETURNED' | 'FORFEITED' | null;
  status: LeaseStatus;
  noticePeriodDays?: number | null;
  moveInAt?: string | null;
  moveOutAt?: string | null;
  autoRenew?: boolean;
  autoRenewLeadDays?: number | null;
  renewalDueAt?: string | null;
  renewalAcceptedAt?: string | null;
  currentBalance?: number | null;
  tenant?: { id: number; username: string };
  unit: { name: string; property?: { name: string } | null };
  renewalOffers?: LeaseRenewalOffer[];
  notices?: LeaseNotice[];
  autopayEnrollment?: AutopayEnrollment | null;
  history?: LeaseHistoryEntry[];
  esignEnvelopes?: EsignEnvelope[];
}

interface NoticeFormState {
  type: LeaseNoticeType;
  desiredMoveOut: string;
  message: string;
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

const statusLabels: Record<LeaseStatus, string> = {
  DRAFT: 'Draft',
  PENDING_APPROVAL: 'Pending Approval',
  ACTIVE: 'Active',
  RENEWAL_PENDING: 'Renewal Pending',
  NOTICE_GIVEN: 'Notice Given',
  TERMINATING: 'Terminating',
  TERMINATED: 'Terminated',
  HOLDOVER: 'Holdover',
  CLOSED: 'Closed',
};

const statusBadgeClasses: Partial<Record<LeaseStatus, string>> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  RENEWAL_PENDING: 'bg-amber-100 text-amber-700',
  NOTICE_GIVEN: 'bg-orange-100 text-orange-700',
  TERMINATING: 'bg-rose-100 text-rose-700',
  TERMINATED: 'bg-red-100 text-red-700',
};

const defaultNoticeForm = (): NoticeFormState => ({
  type: 'MOVE_OUT',
  desiredMoveOut: '',
  message: '',
});

const formatDate = (value?: string | null): string => {
  if (!value) {
    return '—';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return date.toLocaleDateString();
};

const formatDateTime = (value?: string | null): string => {
  if (!value) {
    return '—';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return date.toLocaleString();
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const describeHistoryMetadata = (metadata?: Record<string, unknown> | null): string[] => {
  if (!isRecord(metadata)) {
    return [];
  }

  const details: string[] = [];
  const { decision, renewalOfferId, respondedAt, noticeType, submittedAt, requestedMoveOut, message } = metadata;

  if (typeof decision === 'string') {
    details.push(`Decision: ${decision}`);
  }
  if (typeof renewalOfferId === 'number') {
    details.push(`Offer #${renewalOfferId}`);
  }
  if (typeof respondedAt === 'string') {
    details.push(`Responded ${formatDateTime(respondedAt)}`);
  }
  if (typeof noticeType === 'string') {
    details.push(`Notice type: ${noticeType.replace('_', ' ')}`);
  }
  if (typeof submittedAt === 'string') {
    details.push(`Submitted ${formatDateTime(submittedAt)}`);
  }
  if (typeof requestedMoveOut === 'string') {
    details.push(`Requested move-out: ${formatDate(requestedMoveOut)}`);
  }
  if (typeof message === 'string' && message.trim().length > 0) {
    details.push(`Note: ${message.trim()}`);
  }

  return details;
};

const formatCurrency = (value?: number | null) => {
  if (value === null || value === undefined) {
    return '—';
  }
  return currencyFormatter.format(value);
};

const MyLeasePage: React.FC = () => {
  const { token } = useAuth();
  const [lease, setLease] = useState<Lease | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [noticeForm, setNoticeForm] = useState<NoticeFormState>(defaultNoticeForm);
  const [noticeSubmitting, setNoticeSubmitting] = useState(false);
  const [responseSubmitting, setResponseSubmitting] = useState<number | null>(null);
  const [responseNotes, setResponseNotes] = useState<Record<number, string>>({});
  const [signingStatus, setSigningStatus] = useState<{ loading: boolean; message?: string | null; error?: string | null }>({
    loading: false,
    message: null,
    error: null,
  });


  useEffect(() => {
    const fetchLease = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = (await apiFetch('/leases/my-lease', { token })) as Lease;
        setLease(data);
        const notes: Record<number, string> = {};
        (data.renewalOffers ?? []).forEach((offer) => {
          notes[offer.id] = '';
        });
        setResponseNotes(notes);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load lease details.');
      } finally {
        setLoading(false);
      }
    };

    fetchLease();
  }, [token]);

  const launchSigningSession = async (envelopeId: number) => {
    if (!token) {
      return;
    }
    setSigningStatus({ loading: true, message: null, error: null });
    try {
      const url = await createRecipientView(token, envelopeId, window.location.href);
      window.open(url, '_blank');
      setSigningStatus({ loading: false, message: 'Signing session opened in a new tab.', error: null });
    } catch (err) {
      setSigningStatus({
        loading: false,
        message: null,
        error: err instanceof Error ? err.message : 'Unable to launch signing session.',
      });
    }
  };

  const activeOffers = useMemo(
    () => (lease?.renewalOffers ?? []).filter((offer) => offer.status === 'OFFERED'),
    [lease],
  );

  const historicalOffers = useMemo(
    () => (lease?.renewalOffers ?? []).filter((offer) => offer.status !== 'OFFERED'),
    [lease],
  );

  const recentHistory = useMemo(() => (lease?.history ?? []).slice(0, 5), [lease]);

  const handleResponseNoteChange = (offerId: number, value: string) => {
    setResponseNotes((prev) => ({ ...prev, [offerId]: value }));
    setFeedback(null);
    setError(null);
  };

  const handleRenewalDecision = async (offer: LeaseRenewalOffer, decision: 'ACCEPTED' | 'DECLINED') => {
    if (!lease || !token) {
      return;
    }
    setResponseSubmitting(offer.id);
    setFeedback(null);
    setError(null);
    try {
      const updated = (await apiFetch(
        `/leases/${lease.id}/renewal-offers/${offer.id}/respond`,
        {
          token,
          method: 'POST',
          body: {
            decision,
            message: responseNotes[offer.id]?.trim() || undefined,
          },
        },
      )) as Lease;
      setLease(updated);
      setFeedback(decision === 'ACCEPTED' ? 'Thanks! Your renewal acceptance was recorded.' : 'Your decline was submitted to the property manager.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit renewal response.');
    } finally {
      setResponseSubmitting(null);
    }
  };

  const handleNoticeChange = (field: keyof NoticeFormState, value: string) => {
    setNoticeForm((prev) => ({ ...prev, [field]: value }));
    setFeedback(null);
    setError(null);
  };

  const handleSubmitNotice = async () => {
    if (!lease || !token) {
      return;
    }
    if (!noticeForm.desiredMoveOut) {
      setError('Please choose a desired move-out date.');
      return;
    }
    setNoticeSubmitting(true);
    setFeedback(null);
    setError(null);
    try {
      const updated = (await apiFetch(`/leases/${lease.id}/tenant-notices`, {
        token,
        method: 'POST',
        body: {
          type: noticeForm.type,
          moveOutAt: noticeForm.desiredMoveOut,
          message: noticeForm.message.trim() || undefined,
        },
      })) as Lease;
      setLease(updated);
      setNoticeForm(defaultNoticeForm());
      setFeedback('Your move-out intent has been sent to the property team.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit your notice.');
    } finally {
      setNoticeSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-4 text-sm text-gray-600">Loading your lease…</div>;
  }

  if (error && !lease) {
    return (
      <div className="p-4 text-sm text-red-600">
        {error}
      </div>
    );
  }

  if (!lease) {
    return (
      <div className="p-4 text-sm text-gray-600">
        We could not find an active lease tied to your account. Please contact your property manager.
      </div>
    );
  }

  const statusBadgeClass = statusBadgeClasses[lease.status] ?? 'bg-gray-200 text-gray-700';

  return (
    <div className="container mx-auto space-y-6 p-4">
      <header className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div>
          <p className="text-sm uppercase tracking-wide text-gray-500">Current Lease</p>
          <h1 className="text-2xl font-semibold text-gray-900">
            {lease.unit.property ? `${lease.unit.property.name}` : 'Property'} · {lease.unit.name}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            {formatDate(lease.startDate)} – {formatDate(lease.endDate)} · {lease.noticePeriodDays ?? 30} day notice
          </p>
        </div>
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass}`}>
          {statusLabels[lease.status]}
        </span>
      </header>

      {(feedback || error) && (
        <div
          className={`rounded-md border px-4 py-3 text-sm ${
            feedback
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-rose-200 bg-rose-50 text-rose-700'
          }`}
        >
          {feedback ?? error}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-gray-500">Monthly Rent</p>
          <p className="mt-1 text-xl font-semibold text-gray-900">{formatCurrency(lease.rentAmount)}</p>
          <p className="mt-2 text-xs text-gray-500">Balance snapshot: {formatCurrency(lease.currentBalance)}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-gray-500">Security Deposit</p>
          <p className="mt-1 text-xl font-semibold text-gray-900">{formatCurrency(lease.depositAmount)}</p>
          <p className="mt-2 text-xs text-gray-500">
            {lease.depositHeldAt ? `Held since ${formatDate(lease.depositHeldAt)}` : 'Receipt pending'}
            {lease.depositReturnedAt && ` · Returned ${formatDate(lease.depositReturnedAt)}`}
          </p>
          {lease.depositDisposition && (
            <p className="mt-2 text-xs font-medium text-gray-600">
              Disposition: {lease.depositDisposition.replace('_', ' ')}
            </p>
          )}
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-gray-500">Autopay</p>
          {lease.autopayEnrollment ? (
            <>
              <p className="mt-1 text-xl font-semibold text-gray-900">
                {lease.autopayEnrollment.active ? 'Active' : 'Paused'}
              </p>
              <p className="mt-2 text-xs text-gray-500">
                {lease.autopayEnrollment.paymentMethod
                  ? `${lease.autopayEnrollment.paymentMethod.brand ?? lease.autopayEnrollment.paymentMethod.provider} ${
                      lease.autopayEnrollment.paymentMethod.last4
                        ? `• ${lease.autopayEnrollment.paymentMethod.last4}`
                        : ''
                    }`
                  : 'Payment method on file'}
              </p>
              {lease.autopayEnrollment.maxAmount != null && (
                <p className="mt-2 text-xs text-gray-500">
                  Max draft: {formatCurrency(lease.autopayEnrollment.maxAmount)}
                </p>
              )}
            </>
          ) : (
            <p className="mt-2 text-sm text-gray-600">Autopay not enrolled.</p>
          )}
          <p className="mt-2 text-xs text-gray-500">
            Auto-renew {lease.autoRenew ? 'enabled' : 'disabled'}
            {lease.autoRenewLeadDays != null && ` · Lead time ${lease.autoRenewLeadDays} days`}
          </p>
        </div>
      </section>

      <section className="space-y-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <header className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Digital Signatures</h2>
            <p className="text-xs text-gray-500">Track outstanding lease packets and launch signing sessions.</p>
          </div>
        </header>

        {signingStatus.error && (
          <p className="rounded border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700">{signingStatus.error}</p>
        )}
        {signingStatus.message && (
          <p className="rounded border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-700">{signingStatus.message}</p>
        )}

        {(lease?.esignEnvelopes ?? []).length === 0 ? (
          <p className="text-sm text-gray-600">No signature packets have been sent yet.</p>
        ) : (
          <div className="space-y-3">
            {lease?.esignEnvelopes?.map((envelope) => {
              const participant = envelope.participants?.find(
                (participant: EsignParticipant) =>
                  participant.userId === lease?.tenant?.id || participant.email === lease?.tenant?.username,
              );
              const isComplete = envelope.status === 'COMPLETED' || participant?.status === 'SIGNED';
              return (
                <div key={envelope.id} className="rounded border border-gray-200 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Envelope #{envelope.id}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(envelope.createdAt).toLocaleString()} · Provider {envelope.provider}
                      </p>
                    </div>
                    <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700">
                      {participant?.status ?? envelope.status}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-gray-500">Status: {envelope.status}</p>
                    {!isComplete && (
                      <button
                        type="button"
                        className="rounded bg-indigo-600 px-3 py-1 text-xs font-semibold text-white disabled:bg-indigo-300"
                        onClick={() => launchSigningSession(envelope.id)}
                        disabled={signingStatus.loading}
                      >
                        {signingStatus.loading ? 'Launching…' : 'Launch Signing Session'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <header className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Renewal Offers</h2>
            <p className="text-xs text-gray-500">
              Review terms and let us know if you plan to stay or move out.
            </p>
          </div>
          <span className="text-xs font-medium text-gray-500">
            Renewal decision due {formatDate(lease.renewalDueAt)}
          </span>
        </header>

        {activeOffers.length > 0 ? (
          <div className="space-y-3">
            {activeOffers.map((offer) => (
              <div key={offer.id} className="space-y-3 rounded border border-amber-200 bg-amber-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-amber-800">
                      {formatCurrency(offer.proposedRent)} per month
                    </p>
                    <p className="text-xs text-amber-700">
                      {formatDate(offer.proposedStart)} – {formatDate(offer.proposedEnd)}
                    </p>
                  </div>
                  <p className="text-xs text-amber-700">
                    Expires {formatDate(offer.expiresAt)} · Sent {formatDate(offer.createdAt)}
                  </p>
                </div>
                {offer.message && <p className="text-sm text-amber-900">{offer.message}</p>}
                <textarea
                  className="w-full rounded border border-amber-200 bg-white px-2 py-1 text-sm focus:border-amber-400 focus:outline-none"
                  placeholder="Add a note (optional)…"
                  value={responseNotes[offer.id] ?? ''}
                  onChange={(event) => handleResponseNoteChange(offer.id, event.target.value)}
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded bg-emerald-600 px-3 py-1 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-300"
                    onClick={() => handleRenewalDecision(offer, 'ACCEPTED')}
                    disabled={responseSubmitting === offer.id}
                  >
                    {responseSubmitting === offer.id ? 'Submitting…' : 'Accept offer'}
                  </button>
                  <button
                    type="button"
                    className="rounded border border-amber-500 px-3 py-1 text-sm font-semibold text-amber-700 hover:bg-amber-100 disabled:cursor-not-allowed disabled:border-amber-200 disabled:text-amber-300"
                    onClick={() => handleRenewalDecision(offer, 'DECLINED')}
                    disabled={responseSubmitting === offer.id}
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-600">No open renewal offers at this time.</p>
        )}

        {historicalOffers.length > 0 && (
          <div className="space-y-2 rounded border border-gray-200 bg-gray-50 p-3">
            <p className="text-xs font-semibold text-gray-600">Previous decisions</p>
            <ul className="space-y-2 text-xs text-gray-600">
              {historicalOffers.map((offer) => (
                <li key={offer.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    {formatCurrency(offer.proposedRent)} · {formatDate(offer.proposedStart)} –{' '}
                    {formatDate(offer.proposedEnd)}
                  </span>
                  <span className="font-medium">{offer.status}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <header>
          <h2 className="text-lg font-semibold text-gray-900">Plan a Move-Out</h2>
          <p className="text-xs text-gray-500">
            Submit your proposed move-out date so the property team can coordinate inspections and deposits.
          </p>
        </header>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-xs font-medium text-gray-700">
            Notice type
            <select
              className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
              value={noticeForm.type}
              onChange={(event) => handleNoticeChange('type', event.target.value as LeaseNoticeType)}
            >
              <option value="MOVE_OUT">Move-out</option>
              <option value="RENT_INCREASE">Rent concern</option>
              <option value="OTHER">Other</option>
            </select>
          </label>
          <input
            type="date"
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
            value={noticeForm.desiredMoveOut}
            onChange={(event) => handleNoticeChange('desiredMoveOut', event.target.value)}
            aria-label="Desired move-out date"
          />
          <textarea
            rows={3}
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm md:col-span-2"
            value={noticeForm.message}
            placeholder="Notes for the property team - Share any special considerations (cleaning, forwarding address, pets, etc.)"
            onChange={(event) => handleNoticeChange('message', event.target.value)}
            aria-label="Notes for the property team"
          />
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            className="rounded bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400"
            onClick={handleSubmitNotice}
            disabled={noticeSubmitting}
          >
            {noticeSubmitting ? 'Sending…' : 'Send notice'}
          </button>
        </div>

        <div className="space-y-2 rounded border border-gray-200 bg-gray-50 p-3">
          <p className="text-xs font-semibold text-gray-600">Your recent notices</p>
          {lease.notices && lease.notices.length > 0 ? (
            <ul className="space-y-2 text-xs text-gray-600">
              {lease.notices.map((notice) => (
                <li key={notice.id} className="flex flex-wrap justify-between gap-2">
                  <span>
                    {notice.type.replace('_', ' ')} · {formatDate(notice.sentAt)}
                    {notice.message && ` — ${notice.message}`}
                  </span>
                  <span>{notice.deliveryMethod.toLowerCase()}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-gray-500">No notices recorded yet.</p>
          )}
        </div>
      </section>

      <section className="space-y-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <header>
          <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
          <p className="text-xs text-gray-500">
            Track renewal decisions, notices, and other changes logged on your lease.
          </p>
        </header>
        {recentHistory.length > 0 ? (
          <ul className="space-y-3">
            {recentHistory.map((entry) => {
              const metadataDetails = describeHistoryMetadata(entry.metadata);
              return (
                <li key={entry.id} className="rounded border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-gray-800">{entry.note ?? 'Lease update recorded'}</span>
                    <span className="text-xs text-gray-500">{formatDateTime(entry.createdAt)}</span>
                  </div>
                  {entry.actor && (
                    <p className="mt-1 text-xs text-gray-500">Recorded by {entry.actor.username}</p>
                  )}
                  {metadataDetails.length > 0 && (
                    <ul className="mt-2 space-y-1 text-xs text-gray-600">
                      {metadataDetails.map((detail) => (
                        <li key={detail}>{detail}</li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-gray-600">No recent updates yet. Actions you take here will show up shortly.</p>
        )}
      </section>
    </div>
  );
};

export default MyLeasePage;
