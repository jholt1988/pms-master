import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';

interface Invoice {
  id: number;
  amount: number;
  dueDate: string;
  status: string;
}

interface Payment {
  id: number;
  amount: number;
  paymentDate: string;
  status: string;
}

interface PaymentMethod {
  id: number;
  type: string;
  provider: string;
  last4?: string;
  brand?: string;
  expMonth?: number;
  expYear?: number;
  createdAt: string;
}

interface AutopayStatus {
  leaseId: number;
  enrollment?: {
    id: number;
    active: boolean;
    maxAmount?: number | null;
    paymentMethodId: number;
    paymentMethod?: PaymentMethod | null;
  } | null;
}

const defaultMethodForm = {
  type: 'CARD',
  provider: 'STRIPE',
  last4: '',
  brand: '',
  expMonth: '',
  expYear: '',
  providerCustomerId: '',
  providerPaymentMethodId: '',
};

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

const formatCurrency = (value?: number | null): string => {
  if (value === null || value === undefined) {
    return '—';
  }
  return currencyFormatter.format(value);
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

const invoiceStatusBadge = (status: string): string => {
  switch (status.toUpperCase()) {
    case 'PAID':
      return 'bg-emerald-100 text-emerald-700';
    case 'OVERDUE':
      return 'bg-rose-100 text-rose-700';
    case 'PENDING':
    case 'DUE':
      return 'bg-amber-100 text-amber-700';
    default:
      return 'bg-gray-100 text-gray-600';
  }
};

const paymentStatusBadge = (status: string): string => {
  switch (status.toUpperCase()) {
    case 'COMPLETED':
    case 'SETTLED':
      return 'bg-emerald-100 text-emerald-700';
    case 'FAILED':
      return 'bg-rose-100 text-rose-700';
    case 'PROCESSING':
    case 'PENDING':
      return 'bg-sky-100 text-sky-700';
    default:
      return 'bg-gray-100 text-gray-600';
  }
};

export default function PaymentsPage(): React.ReactElement {
  const { token } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [methodForm, setMethodForm] = useState(defaultMethodForm);
  const [autopay, setAutopay] = useState<AutopayStatus | null>(null);
  const [leaseId, setLeaseId] = useState<number | null>(null);
  const [autopayMaxAmount, setAutopayMaxAmount] = useState<string>('');
  const [selectedMethodId, setSelectedMethodId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const authHeaders = useMemo(
    () =>
      token
        ? {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        : undefined,
    [token],
  );

  const loadInvoicesAndPayments = async () => {
    if (!token) {
      return;
    }

    const invoicesRes = await fetch('/api/payments/invoices', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const paymentsRes = await fetch('/api/payments', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!invoicesRes.ok || !paymentsRes.ok) {
      throw new Error('Failed to fetch payment information');
    }

    const [invoicesData, paymentsData] = await Promise.all([
      invoicesRes.json(),
      paymentsRes.json(),
    ]);

    setInvoices(invoicesData);
    setPayments(paymentsData);
  };

  const loadBillingExtras = async () => {
    if (!token) {
      return;
    }

    const methodsRes = await fetch('/api/payment-methods', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (methodsRes.ok) {
      setPaymentMethods(await methodsRes.json());
    }

    const autopayRes = await fetch('/api/billing/autopay', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (autopayRes.ok) {
      const data = (await autopayRes.json()) as AutopayStatus;
      setAutopay(data);
      setLeaseId(data.leaseId);
      if (data.enrollment?.paymentMethodId) {
        setSelectedMethodId(String(data.enrollment.paymentMethodId));
      }
      if (typeof data.enrollment?.maxAmount === 'number') {
        setAutopayMaxAmount(String(data.enrollment.maxAmount));
      }
    } else if (autopayRes.status === 404) {
      setAutopay(null);
      // get lease id if missing
      const leaseRes = await fetch('/api/leases/my-lease', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (leaseRes.ok) {
        const leaseData = await leaseRes.json();
        setLeaseId(leaseData.id);
      }
    } else {
      const msg = await autopayRes.text();
      throw new Error(msg || 'Failed to fetch autopay status');
    }
  };

  useEffect(() => {
    const fetchAll = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        await Promise.all([loadInvoicesAndPayments(), loadBillingExtras()]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const refreshBillingExtras = async () => {
    try {
      await loadBillingExtras();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  const handleMethodFormChange = (field: keyof typeof methodForm, value: string) => {
    setMethodForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddPaymentMethod = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!authHeaders) {
      return;
    }
    setActionLoading(true);
    setNotice(null);
    setError(null);

    try {
      const payload = {
        type: methodForm.type,
        provider: methodForm.provider,
        last4: methodForm.last4 || undefined,
        brand: methodForm.brand || undefined,
        providerCustomerId: methodForm.providerCustomerId || undefined,
        providerPaymentMethodId: methodForm.providerPaymentMethodId || undefined,
        expMonth: methodForm.expMonth ? Number(methodForm.expMonth) : undefined,
        expYear: methodForm.expYear ? Number(methodForm.expYear) : undefined,
      };

      const response = await fetch('/api/payment-methods', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const msg = await response.text();
        throw new Error(msg || 'Failed to add payment method');
      }

      setMethodForm(defaultMethodForm);
      setNotice('Payment method saved.');
      await refreshBillingExtras();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add payment method');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeletePaymentMethod = async (id: number) => {
    if (!token) {
      return;
    }
    setActionLoading(true);
    setNotice(null);
    setError(null);

    try {
      const res = await fetch(`/api/payment-methods/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || 'Failed to delete payment method');
      }

      setNotice('Payment method removed.');
      await refreshBillingExtras();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete payment method');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEnableAutopay = async () => {
    if (!authHeaders || !leaseId || !selectedMethodId) {
      setError('Select a payment method to enable autopay.');
      return;
    }

    setActionLoading(true);
    setNotice(null);
    setError(null);

    try {
      const payload = {
        leaseId,
        paymentMethodId: Number(selectedMethodId),
        active: true,
        maxAmount: autopayMaxAmount ? Number(autopayMaxAmount) : undefined,
      };

      const res = await fetch('/api/billing/autopay', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || 'Failed to configure autopay');
      }

      setNotice('Autopay enabled.');
      await refreshBillingExtras();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to enable autopay');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisableAutopay = async () => {
    if (!token || !leaseId) {
      return;
    }
    setActionLoading(true);
    setNotice(null);
    setError(null);

    try {
      const res = await fetch(`/api/billing/autopay/${leaseId}/disable`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || 'Failed to disable autopay');
      }

      setNotice('Autopay disabled.');
      setSelectedMethodId('');
      setAutopayMaxAmount('');
      await refreshBillingExtras();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to disable autopay');
    } finally {
      setActionLoading(false);
    }
  };

  const openInvoices = useMemo(
    () =>
      invoices.filter((invoice) => (invoice.status ?? '').toUpperCase() !== 'PAID'),
    [invoices],
  );

  const totalDue = useMemo(
    () =>
      openInvoices.reduce((sum, invoice) => sum + (Number.isFinite(invoice.amount) ? invoice.amount : 0), 0),
    [openInvoices],
  );

  const nextInvoice = useMemo(() => {
    if (openInvoices.length === 0) {
      return undefined;
    }
    return [...openInvoices].sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
    )[0];
  }, [openInvoices]);

  const lastPayment = useMemo(() => {
    if (payments.length === 0) {
      return undefined;
    }
    return [...payments].sort(
      (a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime(),
    )[0];
  }, [payments]);

  const autopayEnrollment = autopay?.enrollment ?? null;
  const autopayActive = Boolean(autopayEnrollment?.active);
  const autopayMethod =
    autopayEnrollment?.paymentMethod ??
    paymentMethods.find((method) => method.id === autopayEnrollment?.paymentMethodId);

  if (!token) {
    return <div className="p-4 text-sm text-gray-600">Please sign in to view payments.</div>;
  }

  if (loading) {
    return <div className="p-4 text-sm text-gray-600">Loading billing data…</div>;
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-gray-900">Payments & billing</h1>
        <p className="text-sm text-gray-600">
          Review open invoices, payment history, and manage autopay preferences for your lease.
        </p>
      </header>

      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      {notice && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {notice}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Balance due</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{formatCurrency(totalDue)}</p>
          <p className="mt-1 text-xs text-gray-500">
            {openInvoices.length} open invoice{openInvoices.length === 1 ? '' : 's'}
          </p>
        </article>
        <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Next due date</p>
          <p className="mt-2 text-2xl font-semibold text-amber-600">
            {nextInvoice ? formatDate(nextInvoice.dueDate) : '—'}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {nextInvoice ? `Amount ${formatCurrency(nextInvoice.amount)}` : 'No upcoming invoices'}
          </p>
        </article>
        <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Last payment</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-600">
            {lastPayment ? formatCurrency(lastPayment.amount) : '—'}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {lastPayment ? `Paid ${formatDate(lastPayment.paymentDate)}` : 'No payment history yet'}
          </p>
        </article>
      </section>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="space-y-6">
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 px-4 py-3">
              <h2 className="text-lg font-semibold text-gray-900">Invoices</h2>
              <p className="text-sm text-gray-500">Statements generated for your lease.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <tr>
                    <th scope="col" className="px-4 py-3">Invoice</th>
                    <th scope="col" className="px-4 py-3">Due date</th>
                    <th scope="col" className="px-4 py-3">Amount</th>
                    <th scope="col" className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {invoices.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-sm text-gray-500">
                        No invoices have been generated yet.
                      </td>
                    </tr>
                  ) : (
                    invoices.map((invoice) => (
                      <tr key={invoice.id}>
                        <td className="px-4 py-3 text-gray-600">#{invoice.id}</td>
                        <td className="px-4 py-3 text-gray-600">{formatDate(invoice.dueDate)}</td>
                        <td className="px-4 py-3 text-gray-900 font-medium">{formatCurrency(invoice.amount)}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${invoiceStatusBadge(invoice.status)}`}
                          >
                            {invoice.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 px-4 py-3">
              <h2 className="text-lg font-semibold text-gray-900">Payment history</h2>
              <p className="text-sm text-gray-500">Card and ACH activity captured for this account.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <tr>
                    <th scope="col" className="px-4 py-3">Payment</th>
                    <th scope="col" className="px-4 py-3">Date</th>
                    <th scope="col" className="px-4 py-3">Amount</th>
                    <th scope="col" className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-sm text-gray-500">
                        No payments recorded yet.
                      </td>
                    </tr>
                  ) : (
                    payments.map((payment) => (
                      <tr key={payment.id}>
                        <td className="px-4 py-3 text-gray-600">#{payment.id}</td>
                        <td className="px-4 py-3 text-gray-600">{formatDate(payment.paymentDate)}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{formatCurrency(payment.amount)}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${paymentStatusBadge(payment.status)}`}
                          >
                            {payment.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Autopay</h2>
            <p className="mt-1 text-sm text-gray-500">
              {autopayActive
                ? 'Payments will be drafted automatically on the due date.'
                : 'Enroll in autopay to avoid late fees and simplify your billing.'}
            </p>

            <div className="mt-4 space-y-4 text-sm text-gray-600">
              <label className="block text-xs font-medium text-gray-700">
                Payment method
                <select
                  value={selectedMethodId}
                  onChange={(event) => setSelectedMethodId(event.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">Select a saved method</option>
                  {paymentMethods.map((method) => (
                    <option key={method.id} value={method.id}>
                      {method.type} · {method.brand ?? method.provider} {method.last4 ? `••••${method.last4}` : ''}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-medium text-gray-700">
                Maximum draft amount
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={autopayMaxAmount}
                  onChange={(event) => setAutopayMaxAmount(event.target.value)}
                  placeholder="Optional limit"
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </label>

              <div className="rounded-md border border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-600">
                <p className="font-semibold text-gray-700">Status</p>
                <p className="mt-1">
                  {autopayActive ? 'Autopay is currently enabled.' : 'Autopay is not enabled.'}
                </p>
                {autopayMethod && (
                  <p className="mt-1">
                    Drafting from {autopayMethod.brand ?? autopayMethod.provider}{' '}
                    {autopayMethod.last4 ? `ending in ${autopayMethod.last4}` : ''}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleEnableAutopay}
                disabled={actionLoading}
                className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300"
              >
                {actionLoading ? 'Saving…' : autopayActive ? 'Update autopay' : 'Enable autopay'}
              </button>
              {autopayActive && (
                <button
                  type="button"
                  onClick={handleDisableAutopay}
                  disabled={actionLoading}
                  className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:bg-gray-100"
                >
                  Disable autopay
                </button>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Saved payment methods</h2>
            <p className="mt-1 text-sm text-gray-500">
              Use one of your saved methods for quick payments or autopay.
            </p>

            {paymentMethods.length === 0 ? (
              <p className="mt-4 text-sm text-gray-500">No payment methods on file.</p>
            ) : (
              <ul className="mt-4 space-y-3 text-sm text-gray-700">
                {paymentMethods.map((method) => (
                  <li key={method.id} className="flex items-start justify-between rounded border border-gray-200 px-3 py-2">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {method.type} · {method.brand ?? method.provider}
                      </p>
                      <p className="text-xs text-gray-500">
                        {method.last4 ? `••••${method.last4}` : 'Details on file'} · Added{' '}
                        {formatDate(method.createdAt)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeletePaymentMethod(method.id)}
                      disabled={actionLoading}
                      className="text-xs font-semibold text-rose-600 hover:text-rose-500 disabled:cursor-not-allowed disabled:text-rose-300"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Add payment method</h2>
            <p className="mt-1 text-sm text-gray-500">Store a new card or bank account for future payments.</p>
            <form className="mt-4 grid gap-4 text-sm text-gray-600" onSubmit={handleAddPaymentMethod}>
              <label className="text-xs font-medium text-gray-700">
                Method type
                <select
                  value={methodForm.type}
                  onChange={(event) => handleMethodFormChange('type', event.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="CARD">Card</option>
                  <option value="ACH">Bank Account</option>
                  <option value="CHECK">Check</option>
                </select>
              </label>
              <label className="text-xs font-medium text-gray-700">
                Provider
                <input
                  value={methodForm.provider}
                  onChange={(event) => handleMethodFormChange('provider', event.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="Stripe, Dwolla, etc."
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-medium text-gray-700">
                  Brand
                  <input
                    value={methodForm.brand}
                    onChange={(event) => handleMethodFormChange('brand', event.target.value)}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="Visa, Mastercard…"
                  />
                </label>
                <label className="text-xs font-medium text-gray-700">
                  Last 4 digits
                  <input
                    value={methodForm.last4}
                    onChange={(event) => handleMethodFormChange('last4', event.target.value)}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="1234"
                  />
                </label>
                <label className="text-xs font-medium text-gray-700">
                  Expiry month
                  <input
                    value={methodForm.expMonth}
                    onChange={(event) => handleMethodFormChange('expMonth', event.target.value)}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="MM"
                  />
                </label>
                <label className="text-xs font-medium text-gray-700">
                  Expiry year
                  <input
                    value={methodForm.expYear}
                    onChange={(event) => handleMethodFormChange('expYear', event.target.value)}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="YYYY"
                  />
                </label>
              </div>
              <label className="text-xs font-medium text-gray-700">
                Provider customer ID
                <input
                  value={methodForm.providerCustomerId}
                  onChange={(event) => handleMethodFormChange('providerCustomerId', event.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="External reference"
                />
              </label>
              <label className="text-xs font-medium text-gray-700">
                Provider method ID
                <input
                  value={methodForm.providerPaymentMethodId}
                  onChange={(event) => handleMethodFormChange('providerPaymentMethodId', event.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="Token or reference"
                />
              </label>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300"
              >
                {actionLoading ? 'Saving…' : 'Save payment method'}
              </button>
            </form>
          </section>
        </aside>
      </div>
    </div>
  );
}
