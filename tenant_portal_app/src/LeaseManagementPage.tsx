import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { apiFetch } from './services/apiClient';

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
type LeaseTerminationParty = 'MANAGER' | 'TENANT' | 'SYSTEM';
type DepositDisposition = 'HELD' | 'PARTIAL_RETURN' | 'RETURNED' | 'FORFEITED';
type BillingFrequency = 'MONTHLY' | 'WEEKLY';

interface LeaseHistoryEntry {
  id: number;
  createdAt: string;
  fromStatus?: LeaseStatus | null;
  toStatus?: LeaseStatus | null;
  note?: string | null;
  rentAmount?: number | null;
  depositAmount?: number | null;
  actor?: { id: number; username: string } | null;
  metadata?: Record<string, unknown> | null;
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

interface RecurringInvoiceSchedule {
  id: number;
  amount: number;
  description: string;
  frequency: BillingFrequency;
  dayOfMonth?: number | null;
  dayOfWeek?: number | null;
  nextRun: string;
  lateFeeAmount?: number | null;
  lateFeeAfterDays?: number | null;
  active: boolean;
}

interface Lease {
  id: number;
  tenant: { id: number; username: string };
  unit: { name: string; property?: { name: string } | null };
  startDate: string;
  endDate: string;
  rentAmount: number;
  depositAmount: number;
  depositHeldAt?: string | null;
  depositReturnedAt?: string | null;
  depositDisposition?: DepositDisposition | null;
  status: LeaseStatus;
  noticePeriodDays?: number | null;
  moveInAt?: string | null;
  moveOutAt?: string | null;
  autoRenew?: boolean;
  autoRenewLeadDays?: number | null;
  renewalOfferedAt?: string | null;
  renewalDueAt?: string | null;
  renewalAcceptedAt?: string | null;
  terminationReason?: string | null;
  terminationRequestedBy?: LeaseTerminationParty | null;
  terminationEffectiveAt?: string | null;
  rentEscalationPercent?: number | null;
  rentEscalationEffectiveAt?: string | null;
  billingAlignment?: 'FULL_CYCLE' | 'PRORATE';
  currentBalance?: number | null;
  history?: LeaseHistoryEntry[];
  renewalOffers?: LeaseRenewalOffer[];
  notices?: LeaseNotice[];
  recurringSchedule?: RecurringInvoiceSchedule | null;
  autopayEnrollment?: AutopayEnrollment | null;
}

interface StatusFormState {
  status: LeaseStatus;
  moveInAt: string;
  moveOutAt: string;
  noticePeriodDays: string;
  renewalDueAt: string;
  renewalAcceptedAt: string;
  terminationEffectiveAt: string;
  terminationRequestedBy: LeaseTerminationParty | '';
  terminationReason: string;
  rentEscalationPercent: string;
  rentEscalationEffectiveAt: string;
  currentBalance: string;
  autoRenew: boolean;
}

interface RenewalFormState {
  proposedRent: string;
  proposedStart: string;
  proposedEnd: string;
  escalationPercent: string;
  message: string;
  expiresAt: string;
}

interface NoticeFormState {
  type: LeaseNoticeType;
  deliveryMethod: LeaseNoticeDeliveryMethod;
  message: string;
  acknowledgedAt: string;
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

const statusBadgeClasses: Record<LeaseStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  PENDING_APPROVAL: 'bg-sky-100 text-sky-700',
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  RENEWAL_PENDING: 'bg-amber-100 text-amber-700',
  NOTICE_GIVEN: 'bg-orange-100 text-orange-700',
  TERMINATING: 'bg-rose-100 text-rose-700',
  TERMINATED: 'bg-red-100 text-red-700',
  HOLDOVER: 'bg-purple-100 text-purple-700',
  CLOSED: 'bg-gray-200 text-gray-700',
};

const allStatuses: LeaseStatus[] = [
  'DRAFT',
  'PENDING_APPROVAL',
  'ACTIVE',
  'RENEWAL_PENDING',
  'NOTICE_GIVEN',
  'TERMINATING',
  'TERMINATED',
  'HOLDOVER',
  'CLOSED',
];

const terminationRequesterOptions: LeaseTerminationParty[] = ['MANAGER', 'TENANT', 'SYSTEM'];
const noticeTypeOptions: LeaseNoticeType[] = ['MOVE_OUT', 'RENT_INCREASE', 'OTHER'];
const noticeDeliveryOptions: LeaseNoticeDeliveryMethod[] = ['EMAIL', 'SMS', 'PORTAL', 'PRINT', 'OTHER'];

const LIFECYCLE_COLUMNS: {
  key: string;
  title: string;
  statuses: LeaseStatus[];
  description: string;
}[] = [
  {
    key: 'preparation',
    title: 'Preparation',
    statuses: ['DRAFT', 'PENDING_APPROVAL'],
    description: 'Drafts awaiting approval or move-in readiness.',
  },
  {
    key: 'active',
    title: 'Active',
    statuses: ['ACTIVE'],
    description: 'In-flight leases with ongoing obligations.',
  },
  {
    key: 'renewal',
    title: 'Renewal Pipeline',
    statuses: ['RENEWAL_PENDING'],
    description: 'Leases with renewal offers or responses in progress.',
  },
  {
    key: 'ending',
    title: 'Ending Soon',
    statuses: ['NOTICE_GIVEN', 'TERMINATING'],
    description: 'Move-out notices and termination workflows.',
  },
  {
    key: 'closed',
    title: 'Closed & Holdover',
    statuses: ['TERMINATED', 'HOLDOVER', 'CLOSED'],
    description: 'Finalized leases and holdovers under monitoring.',
  },
];

const formatDateForInput = (value?: Date | string | null): string => {
  if (!value) {
    return '';
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toISOString().slice(0, 10);
};

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

const formatCurrency = (value?: number | null): string => {
  if (value === null || value === undefined) {
    return '—';
  }
  return currencyFormatter.format(value);
};

const toIsoString = (value: string): string | undefined => {
  if (!value) {
    return undefined;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }
  return date.toISOString();
};

const differenceInDays = (value?: string | null): number | null => {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const comparison = new Date(date);
  comparison.setHours(0, 0, 0, 0);
  const diffMs = comparison.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
};

const createStatusFormState = (lease: Lease): StatusFormState => ({
  status: lease.status ?? 'ACTIVE',
  moveInAt: formatDateForInput(lease.moveInAt),
  moveOutAt: formatDateForInput(lease.moveOutAt),
  noticePeriodDays: lease.noticePeriodDays != null ? String(lease.noticePeriodDays) : '',
  renewalDueAt: formatDateForInput(lease.renewalDueAt),
  renewalAcceptedAt: formatDateForInput(lease.renewalAcceptedAt),
  terminationEffectiveAt: formatDateForInput(lease.terminationEffectiveAt),
  terminationRequestedBy: lease.terminationRequestedBy ?? '',
  terminationReason: lease.terminationReason ?? '',
  rentEscalationPercent:
    lease.rentEscalationPercent !== null && lease.rentEscalationPercent !== undefined
      ? lease.rentEscalationPercent.toString()
      : '',
  rentEscalationEffectiveAt: formatDateForInput(lease.rentEscalationEffectiveAt),
  currentBalance:
    lease.currentBalance !== null && lease.currentBalance !== undefined
      ? lease.currentBalance.toFixed(2)
      : '',
  autoRenew: Boolean(lease.autoRenew),
});

const createRenewalFormState = (lease: Lease): RenewalFormState => {
  const end = new Date(lease.endDate);
  const start = new Date(end);
  start.setDate(start.getDate() + 1);
  const proposedEnd = new Date(start);
  proposedEnd.setFullYear(proposedEnd.getFullYear() + 1);

  return {
    proposedRent: lease.rentAmount.toFixed(2),
    proposedStart: formatDateForInput(start),
    proposedEnd: formatDateForInput(proposedEnd),
    escalationPercent:
      lease.rentEscalationPercent !== null && lease.rentEscalationPercent !== undefined
        ? lease.rentEscalationPercent.toString()
        : '',
    message: '',
    expiresAt: formatDateForInput(lease.renewalDueAt),
  };
};

const createNoticeFormState = (): NoticeFormState => ({
  type: 'MOVE_OUT',
  deliveryMethod: 'EMAIL',
  message: '',
  acknowledgedAt: '',
});

// Error handling is now done by apiFetch

function LeaseManagementPage(): React.ReactElement {
  const { token } = useAuth();
  const [leases, setLeases] = useState<Lease[]>([]);
  const [statusForms, setStatusForms] = useState<Record<number, StatusFormState>>({});
  const [renewalForms, setRenewalForms] = useState<Record<number, RenewalFormState>>({});
  const [noticeForms, setNoticeForms] = useState<Record<number, NoticeFormState>>({});
  const [expandedCards, setExpandedCards] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [statusSavingId, setStatusSavingId] = useState<number | null>(null);
  const [renewalSavingId, setRenewalSavingId] = useState<number | null>(null);
  const [noticeSavingId, setNoticeSavingId] = useState<number | null>(null);

  const headers = useMemo(
    () => (token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : undefined),
    [token],
  );

  const hydrateForms = (data: Lease[]) => {
    const nextStatus: Record<number, StatusFormState> = {};
    const nextRenewal: Record<number, RenewalFormState> = {};
    const nextNotice: Record<number, NoticeFormState> = {};

    data.forEach((lease) => {
      nextStatus[lease.id] = createStatusFormState(lease);
      nextRenewal[lease.id] = createRenewalFormState(lease);
      nextNotice[lease.id] = createNoticeFormState();
    });

    setStatusForms(nextStatus);
    setRenewalForms(nextRenewal);
    setNoticeForms(nextNotice);
  };

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const data = (await apiFetch('/leases', { token })) as Lease[];
        if (!cancelled) {
          setLeases(data);
          hydrateForms(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load leases.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
     
  }, [token]);

  const applyLeaseUpdate = (updated: Lease) => {
    setLeases((prev) => {
      const exists = prev.some((lease) => lease.id === updated.id);
      if (exists) {
        return prev.map((lease) => (lease.id === updated.id ? updated : lease));
      }
      return [...prev, updated];
    });
    setStatusForms((prev) => ({
      ...prev,
      [updated.id]: createStatusFormState(updated),
    }));
    setRenewalForms((prev) => ({
      ...prev,
      [updated.id]: createRenewalFormState(updated),
    }));
    setNoticeForms((prev) => ({
      ...prev,
      [updated.id]: createNoticeFormState(),
    }));
  };

  const clearAlerts = () => {
    setError(null);
    setFeedback(null);
  };

  const handleStatusFieldChange = (lease: Lease, field: keyof StatusFormState, value: string | boolean) => {
    setStatusForms((prev) => ({
      ...prev,
      [lease.id]: {
        ...(prev[lease.id] ?? createStatusFormState(lease)),
        [field]: value as StatusFormState[keyof StatusFormState],
      },
    }));
    clearAlerts();
  };

  const handleRenewalFieldChange = (lease: Lease, field: keyof RenewalFormState, value: string) => {
    setRenewalForms((prev) => ({
      ...prev,
      [lease.id]: {
        ...(prev[lease.id] ?? createRenewalFormState(lease)),
        [field]: value,
      },
    }));
    clearAlerts();
  };

  const handleNoticeFieldChange = (lease: Lease, field: keyof NoticeFormState, value: string) => {
    setNoticeForms((prev) => ({
      ...prev,
      [lease.id]: {
        ...(prev[lease.id] ?? createNoticeFormState()),
        [field]: value,
      },
    }));
    clearAlerts();
  };

  const handleStatusSubmit = async (lease: Lease) => {
    if (!token) {
      return;
    }

    const form = statusForms[lease.id];
    if (!form) {
      return;
    }

    const payload: Record<string, unknown> = {
      status: form.status,
      autoRenew: form.autoRenew,
    };

    if (form.moveInAt) {
      const iso = toIsoString(form.moveInAt);
      if (!iso) {
        setError('Move-in date is invalid.');
        return;
      }
      payload.moveInAt = iso;
    }

    if (form.moveOutAt) {
      const iso = toIsoString(form.moveOutAt);
      if (!iso) {
        setError('Move-out date is invalid.');
        return;
      }
      payload.moveOutAt = iso;
    }

    if (form.noticePeriodDays.trim()) {
      const parsed = Number.parseInt(form.noticePeriodDays, 10);
      if (Number.isNaN(parsed)) {
        setError('Notice period must be a whole number.');
        return;
      }
      payload.noticePeriodDays = parsed;
    }

    if (form.renewalDueAt) {
      const iso = toIsoString(form.renewalDueAt);
      if (!iso) {
        setError('Renewal due date is invalid.');
        return;
      }
      payload.renewalDueAt = iso;
    }

    if (form.renewalAcceptedAt) {
      const iso = toIsoString(form.renewalAcceptedAt);
      if (!iso) {
        setError('Renewal accepted date is invalid.');
        return;
      }
      payload.renewalAcceptedAt = iso;
    }

    if (form.terminationEffectiveAt) {
      const iso = toIsoString(form.terminationEffectiveAt);
      if (!iso) {
        setError('Termination effective date is invalid.');
        return;
      }
      payload.terminationEffectiveAt = iso;
    }

    if (form.terminationRequestedBy) {
      payload.terminationRequestedBy = form.terminationRequestedBy;
    }

    if (form.terminationReason.trim()) {
      payload.terminationReason = form.terminationReason.trim();
    }

    if (form.rentEscalationPercent.trim()) {
      const parsed = Number.parseFloat(form.rentEscalationPercent);
      if (Number.isNaN(parsed)) {
        setError('Escalation percent must be numeric.');
        return;
      }
      payload.rentEscalationPercent = parsed;
    }

    if (form.rentEscalationEffectiveAt) {
      const iso = toIsoString(form.rentEscalationEffectiveAt);
      if (!iso) {
        setError('Escalation effective date is invalid.');
        return;
      }
      payload.rentEscalationEffectiveAt = iso;
    }

    if (form.currentBalance.trim()) {
      const parsed = Number.parseFloat(form.currentBalance);
      if (Number.isNaN(parsed)) {
        setError('Current balance must be numeric.');
        return;
      }
      payload.currentBalance = parsed;
    }

    setStatusSavingId(lease.id);
    setFeedback(null);
    setError(null);

    try {
      const updated = (await apiFetch(`/leases/${lease.id}/status`, {
        token,
        method: 'PUT',
        body: payload,
      })) as Lease;
      applyLeaseUpdate(updated);
      setFeedback(`Lease for ${lease.tenant.username} updated to ${statusLabels[updated.status]}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update status.');
    } finally {
      setStatusSavingId(null);
    }
  };

  const handleRenewalSubmit = async (lease: Lease) => {
    if (!token) {
      return;
    }

    const form = renewalForms[lease.id];
    if (!form) {
      return;
    }

    const proposedRent = Number.parseFloat(form.proposedRent);
    if (Number.isNaN(proposedRent)) {
      setError('Proposed rent must be numeric.');
      return;
    }

    const proposedStart = toIsoString(form.proposedStart);
    const proposedEnd = toIsoString(form.proposedEnd);
    if (!proposedStart || !proposedEnd) {
      setError('Proposed start and end dates are required.');
      return;
    }

    const payload: Record<string, unknown> = {
      proposedRent,
      proposedStart,
      proposedEnd,
    };

    if (form.escalationPercent.trim()) {
      const parsed = Number.parseFloat(form.escalationPercent);
      if (Number.isNaN(parsed)) {
        setError('Escalation percent must be numeric.');
        return;
      }
      payload.escalationPercent = parsed;
    }

    if (form.message.trim()) {
      payload.message = form.message.trim();
    }

    if (form.expiresAt) {
      const iso = toIsoString(form.expiresAt);
      if (!iso) {
        setError('Offer expiry date is invalid.');
        return;
      }
      payload.expiresAt = iso;
    }

    setRenewalSavingId(lease.id);
    setFeedback(null);
    setError(null);

    try {
      const updated = (await apiFetch(`/leases/${lease.id}/renewal-offers`, {
        token,
        method: 'POST',
        body: payload,
      })) as Lease;
      applyLeaseUpdate(updated);
      setFeedback(`Renewal offer sent to ${updated.tenant.username}.`);
      setExpandedCards((prev) => (prev.includes(lease.id) ? prev : [...prev, lease.id]));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create renewal offer.');
    } finally {
      setRenewalSavingId(null);
    }
  };

  const handleNoticeSubmit = async (lease: Lease) => {
    if (!token) {
      return;
    }

    const form = noticeForms[lease.id];
    if (!form) {
      return;
    }

    const payload: Record<string, unknown> = {
      type: form.type,
      deliveryMethod: form.deliveryMethod,
    };

    if (form.message.trim()) {
      payload.message = form.message.trim();
    }

    if (form.acknowledgedAt) {
      const iso = toIsoString(form.acknowledgedAt);
      if (!iso) {
        setError('Acknowledged date is invalid.');
        return;
      }
      payload.acknowledgedAt = iso;
    }

    setNoticeSavingId(lease.id);
    setFeedback(null);
    setError(null);

    try {
      const updated = (await apiFetch(`/leases/${lease.id}/notices`, {
        token,
        method: 'POST',
        body: payload,
      })) as Lease;
      applyLeaseUpdate(updated);
      setFeedback(`Notice recorded for ${updated.tenant.username}.`);
      setExpandedCards((prev) => (prev.includes(lease.id) ? prev : [...prev, lease.id]));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to record notice.');
    } finally {
      setNoticeSavingId(null);
    }
  };

  const toggleExpanded = (leaseId: number) => {
    setExpandedCards((prev) =>
      prev.includes(leaseId) ? prev.filter((id) => id !== leaseId) : [...prev, leaseId],
    );
  };

  const insights = useMemo(() => {
    const total = leases.length;
    const active = leases.filter((lease) => lease.status === 'ACTIVE').length;
    const moveOut = leases.filter(
      (lease) => lease.status === 'NOTICE_GIVEN' || lease.status === 'TERMINATING',
    ).length;
    const renewalDueSoon = leases.filter((lease) => {
      const diff = differenceInDays(lease.renewalDueAt);
      return diff !== null && diff <= 30 && diff >= 0;
    }).length;
    const renewalOverdue = leases.filter((lease) => {
      const diff = differenceInDays(lease.renewalDueAt);
      return diff !== null && diff < 0;
    }).length;
    return { total, active, moveOut, renewalDueSoon, renewalOverdue };
  }, [leases]);

  const boardData = useMemo(
    () =>
      LIFECYCLE_COLUMNS.map((column) => {
        const filtered = leases
          .filter((lease) => column.statuses.includes(lease.status))
          .sort(
            (a, b) =>
              new Date(a.endDate).getTime() -
              new Date(b.endDate).getTime(),
          );
        return { ...column, leases: filtered };
      }),
    [leases],
  );

  if (!token) {
    return <div className="p-4 text-sm text-gray-600">Please sign in to manage leases.</div>;
  }

  if (loading) {
    return <div className="p-4 text-sm text-gray-600">Loading lease lifecycle…</div>;
  }

  const renderLeaseCard = (lease: Lease) => {
    const statusForm = statusForms[lease.id] ?? createStatusFormState(lease);
    const renewalForm = renewalForms[lease.id] ?? createRenewalFormState(lease);
    const noticeForm = noticeForms[lease.id] ?? createNoticeFormState();
    const isExpanded = expandedCards.includes(lease.id);

    const daysToEnd = differenceInDays(lease.endDate);
    const daysToRenewalDue = differenceInDays(lease.renewalDueAt);
    const renewalIsOverdue = daysToRenewalDue !== null && daysToRenewalDue < 0;

    const schedule = lease.recurringSchedule;
    const autopay = lease.autopayEnrollment;

    return (
      <div key={lease.id} className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-gray-800">{lease.tenant.username}</div>
            <div className="text-xs text-gray-500">
              {lease.unit.property ? `${lease.unit.property.name} — ${lease.unit.name}` : lease.unit.name}
            </div>
          </div>
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClasses[lease.status]}`}
          >
            {statusLabels[lease.status]}
          </span>
        </div>

        <div className="grid gap-3 text-xs text-gray-600 sm:grid-cols-2">
          <div>
            <p className="font-medium text-gray-700">Term</p>
            <p>
              {formatDate(lease.startDate)} → {formatDate(lease.endDate)}
            </p>
            {typeof daysToEnd === 'number' && (
              <p className="mt-1 text-[11px] text-gray-500">
                {daysToEnd >= 0 ? `${daysToEnd} day${daysToEnd === 1 ? '' : 's'} remaining` : `Ended ${Math.abs(daysToEnd)} day${Math.abs(daysToEnd) === 1 ? '' : 's'} ago`}
              </p>
            )}
          </div>
          <div>
            <p className="font-medium text-gray-700">Rent</p>
            <p>{formatCurrency(lease.rentAmount)}</p>
            {lease.rentEscalationPercent && (
              <p className="mt-1 text-[11px] text-gray-500">
                Escalation {lease.rentEscalationPercent}% on {formatDate(lease.rentEscalationEffectiveAt)}
              </p>
            )}
          </div>
          <div>
            <p className="font-medium text-gray-700">Deposit</p>
            <p>
              {formatCurrency(lease.depositAmount)}{' '}
              {lease.depositDisposition ? `· ${lease.depositDisposition.replace('_', ' ')}` : ''}
            </p>
            <p className="mt-1 text-[11px] text-gray-500">
              {lease.depositHeldAt
                ? `Held ${formatDate(lease.depositHeldAt)}`
                : 'Deposit receipt not recorded'}
              {lease.depositReturnedAt && ` · Returned ${formatDate(lease.depositReturnedAt)}`}
            </p>
          </div>
          <div>
            <p className="font-medium text-gray-700">Renewal Due</p>
            <p className={renewalIsOverdue ? 'font-semibold text-red-600' : undefined}>
              {formatDate(lease.renewalDueAt)}
            </p>
            {typeof daysToRenewalDue === 'number' && (
              <p className={`mt-1 text-[11px] ${renewalIsOverdue ? 'text-red-600' : 'text-gray-500'}`}>
                {renewalIsOverdue
                  ? `Overdue by ${Math.abs(daysToRenewalDue)} day${Math.abs(daysToRenewalDue) === 1 ? '' : 's'}`
                  : `Due in ${daysToRenewalDue} day${daysToRenewalDue === 1 ? '' : 's'}`}
              </p>
            )}
          </div>
          <div>
            <p className="font-medium text-gray-700">Auto-Renew</p>
            <p>{lease.autoRenew ? 'Enabled' : 'Disabled'}</p>
            {lease.autoRenewLeadDays != null && (
              <p className="mt-1 text-[11px] text-gray-500">Lead time {lease.autoRenewLeadDays} days</p>
            )}
          </div>
          <div>
            <p className="font-medium text-gray-700">Balance Snapshot</p>
            <p>{formatCurrency(lease.currentBalance)}</p>
            {lease.terminationReason && (
              <p className="mt-1 text-[11px] text-gray-500">Termination reason: {lease.terminationReason}</p>
            )}
          </div>
        </div>

        {schedule && (
          <div className="rounded border border-dashed border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
            <div className="flex items-center justify-between">
              <p className="font-medium text-gray-700">Recurring Billing</p>
              <span className={`text-[11px] font-semibold ${schedule.active ? 'text-emerald-600' : 'text-gray-500'}`}>
                {schedule.active ? 'Active' : 'Paused'}
              </span>
            </div>
            <p className="mt-1">
              {formatCurrency(schedule.amount)} {schedule.frequency.toLowerCase()}
            </p>
            <p className="mt-1 text-[11px]">
              Next run {formatDate(schedule.nextRun)}
              {schedule.dayOfMonth != null && ` · Day ${schedule.dayOfMonth}`}
              {schedule.dayOfWeek != null && ` · Weekday ${schedule.dayOfWeek}`}
            </p>
            {schedule.lateFeeAmount != null && (
              <p className="mt-1 text-[11px]">
                Late fee {formatCurrency(schedule.lateFeeAmount)} after {schedule.lateFeeAfterDays ?? 0} day
                {(schedule.lateFeeAfterDays ?? 0) === 1 ? '' : 's'}
              </p>
            )}
          </div>
        )}

        {autopay && (
          <div className="rounded border border-dashed border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
            <p className="font-medium text-gray-700">Autopay</p>
            <p className="mt-1">
              {autopay.active ? 'Active' : 'Inactive'}
              {autopay.maxAmount != null && ` · Cap ${formatCurrency(autopay.maxAmount)}`}
            </p>
            {autopay.paymentMethod && (
              <p className="mt-1 text-[11px]">
                {autopay.paymentMethod.brand ?? autopay.paymentMethod.provider}{' '}
                {autopay.paymentMethod.last4 ? `•••• ${autopay.paymentMethod.last4}` : ''}
              </p>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={() => toggleExpanded(lease.id)}
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
        >
          {isExpanded ? 'Hide workflow' : 'Manage workflow'}
        </button>

        {isExpanded && (
          <div className="space-y-5 text-sm">
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-800">Status & Transitions</h3>
                <button
                  type="button"
                  onClick={() => handleStatusSubmit(lease)}
                  disabled={statusSavingId === lease.id}
                  className="rounded bg-gray-900 px-3 py-1 text-xs font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400"
                >
                  {statusSavingId === lease.id ? 'Saving…' : 'Update status'}
                </button>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-xs font-medium text-gray-700">
                  Status
                  <select
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    value={statusForm.status}
                    onChange={(event) =>
                      handleStatusFieldChange(lease, 'status', event.target.value as LeaseStatus)
                    }
                  >
                    {allStatuses.map((status) => (
                      <option key={status} value={status}>
                        {statusLabels[status]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-medium text-gray-700">
                  Notice period (days)
                  <input
                    type="number"
                    min={0}
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    value={statusForm.noticePeriodDays}
                    onChange={(event) => handleStatusFieldChange(lease, 'noticePeriodDays', event.target.value)}
                  />
                </label>
                <label className="text-xs font-medium text-gray-700">
                  Move-in date
                  <input
                    type="date"
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    value={statusForm.moveInAt}
                    onChange={(event) => handleStatusFieldChange(lease, 'moveInAt', event.target.value)}
                  />
                </label>
                <label className="text-xs font-medium text-gray-700">
                  Move-out date
                  <input
                    type="date"
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    value={statusForm.moveOutAt}
                    onChange={(event) => handleStatusFieldChange(lease, 'moveOutAt', event.target.value)}
                  />
                </label>
                <label className="text-xs font-medium text-gray-700">
                  Renewal due at
                  <input
                    type="date"
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    value={statusForm.renewalDueAt}
                    onChange={(event) => handleStatusFieldChange(lease, 'renewalDueAt', event.target.value)}
                  />
                </label>
                <label className="text-xs font-medium text-gray-700">
                  Renewal accepted at
                  <input
                    type="date"
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    value={statusForm.renewalAcceptedAt}
                    onChange={(event) =>
                      handleStatusFieldChange(lease, 'renewalAcceptedAt', event.target.value)
                    }
                  />
                </label>
                <label className="text-xs font-medium text-gray-700">
                  Termination effective
                  <input
                    type="date"
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    value={statusForm.terminationEffectiveAt}
                    onChange={(event) =>
                      handleStatusFieldChange(lease, 'terminationEffectiveAt', event.target.value)
                    }
                  />
                </label>
                <label className="text-xs font-medium text-gray-700">
                  Termination requested by
                  <select
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    value={statusForm.terminationRequestedBy}
                    onChange={(event) =>
                      handleStatusFieldChange(
                        lease,
                        'terminationRequestedBy',
                        event.target.value as LeaseTerminationParty | '',
                      )
                    }
                  >
                    <option value="">—</option>
                    {terminationRequesterOptions.map((option) => (
                      <option key={option} value={option}>
                        {option.charAt(0) + option.slice(1).toLowerCase()}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-medium text-gray-700 md:col-span-2">
                  Termination reason
                  <textarea
                    rows={2}
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    value={statusForm.terminationReason}
                    onChange={(event) => handleStatusFieldChange(lease, 'terminationReason', event.target.value)}
                  />
                </label>
                <label className="text-xs font-medium text-gray-700">
                  Rent escalation %
                  <input
                    type="number"
                    step="0.01"
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    value={statusForm.rentEscalationPercent}
                    onChange={(event) =>
                      handleStatusFieldChange(lease, 'rentEscalationPercent', event.target.value)
                    }
                  />
                </label>
                <label className="text-xs font-medium text-gray-700">
                  Escalation effective
                  <input
                    type="date"
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    value={statusForm.rentEscalationEffectiveAt}
                    onChange={(event) =>
                      handleStatusFieldChange(lease, 'rentEscalationEffectiveAt', event.target.value)
                    }
                  />
                </label>
                <label className="text-xs font-medium text-gray-700">
                  Current balance
                  <input
                    type="number"
                    step="0.01"
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    value={statusForm.currentBalance}
                    onChange={(event) => handleStatusFieldChange(lease, 'currentBalance', event.target.value)}
                  />
                </label>
                <label className="flex items-center gap-2 text-xs font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={statusForm.autoRenew}
                    onChange={(event) => handleStatusFieldChange(lease, 'autoRenew', event.target.checked)}
                  />
                  Auto-renew enabled
                </label>
              </div>
            </section>

            <section>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-800">Renewal Offer</h3>
                <button
                  type="button"
                  onClick={() => handleRenewalSubmit(lease)}
                  disabled={renewalSavingId === lease.id}
                  className="rounded bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300"
                >
                  {renewalSavingId === lease.id ? 'Sending…' : 'Send renewal offer'}
                </button>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-xs font-medium text-gray-700">
                  Proposed rent
                  <input
                    type="number"
                    step="0.01"
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    value={renewalForm.proposedRent}
                    onChange={(event) => handleRenewalFieldChange(lease, 'proposedRent', event.target.value)}
                  />
                </label>
                <label className="text-xs font-medium text-gray-700">
                  Escalation %
                  <input
                    type="number"
                    step="0.01"
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    value={renewalForm.escalationPercent}
                    onChange={(event) =>
                      handleRenewalFieldChange(lease, 'escalationPercent', event.target.value)
                    }
                  />
                </label>
                <label className="text-xs font-medium text-gray-700">
                  Proposed start
                  <input
                    type="date"
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    value={renewalForm.proposedStart}
                    onChange={(event) => handleRenewalFieldChange(lease, 'proposedStart', event.target.value)}
                  />
                </label>
                <label className="text-xs font-medium text-gray-700">
                  Proposed end
                  <input
                    type="date"
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    value={renewalForm.proposedEnd}
                    onChange={(event) => handleRenewalFieldChange(lease, 'proposedEnd', event.target.value)}
                  />
                </label>
                <label className="text-xs font-medium text-gray-700">
                  Offer expires
                  <input
                    type="date"
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    value={renewalForm.expiresAt}
                    onChange={(event) => handleRenewalFieldChange(lease, 'expiresAt', event.target.value)}
                  />
                </label>
                <label className="text-xs font-medium text-gray-700 md:col-span-2">
                  Message to tenant
                  <textarea
                    rows={2}
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    value={renewalForm.message}
                    onChange={(event) => handleRenewalFieldChange(lease, 'message', event.target.value)}
                  />
                </label>
              </div>
              <div className="mt-3 space-y-2">
                <p className="text-xs font-semibold text-gray-700">Recent renewal activity</p>
                {lease.renewalOffers && lease.renewalOffers.length > 0 ? (
                  <ul className="space-y-2">
                    {lease.renewalOffers.map((offer) => (
                      <li key={offer.id} className="rounded border border-gray-200 px-3 py-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-gray-700">{statusLabels.RENEWAL_PENDING}</span>
                          <span className="text-[11px] text-gray-500">{formatDateTime(offer.createdAt)}</span>
                        </div>
                        <p className="mt-1">
                          {formatCurrency(offer.proposedRent)} · {formatDate(offer.proposedStart)} →{' '}
                          {formatDate(offer.proposedEnd)}
                        </p>
                        <p className="mt-1 text-[11px] text-gray-500">
                          Status: {offer.status} · Expires {formatDate(offer.expiresAt)}
                        </p>
                        {offer.message && <p className="mt-1 text-[11px] text-gray-600">{offer.message}</p>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-gray-500">No renewal offers logged yet.</p>
                )}
              </div>
            </section>

            <section>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-800">Compliance Notices</h3>
                <button
                  type="button"
                  onClick={() => handleNoticeSubmit(lease)}
                  disabled={noticeSavingId === lease.id}
                  className="rounded bg-amber-600 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-500 disabled:cursor-not-allowed disabled:bg-amber-300"
                >
                  {noticeSavingId === lease.id ? 'Logging…' : 'Log notice'}
                </button>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-xs font-medium text-gray-700">
                  Notice type
                  <select
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    value={noticeForm.type}
                    onChange={(event) => handleNoticeFieldChange(lease, 'type', event.target.value as LeaseNoticeType)}
                  >
                    {noticeTypeOptions.map((option) => (
                      <option key={option} value={option}>
                        {option.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-medium text-gray-700">
                  Delivery method
                  <select
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    value={noticeForm.deliveryMethod}
                    onChange={(event) =>
                      handleNoticeFieldChange(lease, 'deliveryMethod', event.target.value as LeaseNoticeDeliveryMethod)
                    }
                  >
                    {noticeDeliveryOptions.map((option) => (
                      <option key={option} value={option}>
                        {option.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-medium text-gray-700">
                  Acknowledged at
                  <input
                    type="date"
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    value={noticeForm.acknowledgedAt}
                    onChange={(event) => handleNoticeFieldChange(lease, 'acknowledgedAt', event.target.value)}
                  />
                </label>
                <label className="text-xs font-medium text-gray-700 md:col-span-2">
                  Message
                  <textarea
                    rows={2}
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    value={noticeForm.message}
                    onChange={(event) => handleNoticeFieldChange(lease, 'message', event.target.value)}
                  />
                </label>
              </div>
              <div className="mt-3 space-y-2">
                <p className="text-xs font-semibold text-gray-700">Recent notices</p>
                {lease.notices && lease.notices.length > 0 ? (
                  <ul className="space-y-2">
                    {lease.notices.map((item) => (
                      <li key={item.id} className="rounded border border-gray-200 px-3 py-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-gray-700">{item.type.replace('_', ' ')}</span>
                          <span className="text-[11px] text-gray-500">{formatDateTime(item.sentAt)}</span>
                        </div>
                        <p className="mt-1 text-[11px] text-gray-500">
                          Delivered via {item.deliveryMethod.toLowerCase()}
                          {item.acknowledgedAt && ` · Acknowledged ${formatDate(item.acknowledgedAt)}`}
                        </p>
                        {item.message && <p className="mt-1 text-[11px] text-gray-600">{item.message}</p>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-gray-500">No notices recorded yet.</p>
                )}
              </div>
            </section>

            <section>
              <h3 className="mb-2 text-sm font-semibold text-gray-800">Recent History</h3>
              {lease.history && lease.history.length > 0 ? (
                <ul className="space-y-2 text-xs">
                  {lease.history.slice(0, 6).map((entry) => (
                    <li key={entry.id} className="rounded border border-gray-200 px-3 py-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-700">
                          {entry.fromStatus ? statusLabels[entry.fromStatus] : '—'} →{' '}
                          {entry.toStatus ? statusLabels[entry.toStatus] : '—'}
                        </span>
                        <span className="text-[11px] text-gray-500">{formatDateTime(entry.createdAt)}</span>
                      </div>
                      {entry.note && <p className="mt-1 text-[11px] text-gray-600">{entry.note}</p>}
                      <div className="mt-1 text-[11px] text-gray-500">
                        {entry.rentAmount != null && <span className="mr-2">Rent {formatCurrency(entry.rentAmount)}</span>}
                        {entry.depositAmount != null && (
                          <span className="mr-2">Deposit {formatCurrency(entry.depositAmount)}</span>
                        )}
                        {entry.actor && <span>By {entry.actor.username}</span>}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-gray-500">History will appear as actions are recorded.</p>
              )}
            </section>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-gray-900">Lease lifecycle manager</h1>
        <p className="text-sm text-gray-600">
          Track occupancy, renewals, and compliance so every lease stays on schedule.
        </p>
      </header>

      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}
      {feedback && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {feedback}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Total leases</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{insights.total}</p>
        </article>
        <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Active</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-600">{insights.active}</p>
        </article>
        <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Move-outs pending</p>
          <p className="mt-2 text-2xl font-semibold text-amber-600">{insights.moveOut}</p>
        </article>
        <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Renewals due ≤ 30d</p>
          <p className="mt-2 text-2xl font-semibold text-indigo-600">{insights.renewalDueSoon}</p>
          <p className="mt-1 text-xs text-gray-500">Overdue: {insights.renewalOverdue}</p>
        </article>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Pipeline overview</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {boardData.map((column) => (
            <article key={column.key} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">{column.title}</h3>
                <span className="text-xs font-medium text-gray-500">{column.leases.length}</span>
              </div>
              <p className="mt-1 text-xs text-gray-500">{column.description}</p>
              <ul className="mt-4 space-y-3 text-sm text-gray-700">
                {column.leases.length === 0 ? (
                  <li className="rounded border border-dashed border-gray-200 py-6 text-center text-xs text-gray-400">
                    Empty
                  </li>
                ) : (
                  column.leases.slice(0, 4).map((lease) => (
                    <li key={lease.id} className="rounded border border-gray-200 bg-gray-50 p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-900">{lease.tenant.username}</span>
                        <span className="text-[11px] text-gray-500">End {formatDate(lease.endDate)}</span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        {lease.unit.property ? `${lease.unit.property.name} · ` : ''}{lease.unit.name}
                      </p>
                      <button
                        type="button"
                        onClick={() => toggleExpanded(lease.id)}
                        className="mt-2 text-xs font-semibold text-indigo-600 hover:text-indigo-500"
                      >
                        Manage
                      </button>
                    </li>
                  ))
                )}
                {column.leases.length > 4 && (
                  <li className="text-center text-xs text-gray-500">
                    +{column.leases.length - 4} more
                  </li>
                )}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Lease workflows</h2>
          <p className="text-xs text-gray-500">Click a card to expand status, renewal, and notice actions.</p>
        </div>
        {leases.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white py-12 text-center text-sm text-gray-500">
            No leases found.
          </div>
        ) : (
          <div className="space-y-6">
            {leases.map((lease) => renderLeaseCard(lease))}
          </div>
        )}
      </section>
    </div>
  );
}

export default LeaseManagementPage;
