
import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { apiFetch } from './services/apiClient';
import { ApplicationLifecycleTimeline } from './components/ui/ApplicationLifecycleTimeline';

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

const formatNumber = (value?: number | null): string => {
  if (value === null || value === undefined) {
    return '—';
  }
  return value.toLocaleString();
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

const statusOptions = [
  { value: 'PENDING', label: 'Pending review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
];

const statusBadgeClasses: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-rose-100 text-rose-700',
};

const qualificationLabels: Record<string, string> = {
  QUALIFIED: 'Qualified',
  NOT_QUALIFIED: 'Not qualified',
};

const recommendationLabels: Record<string, string> = {
  RECOMMEND_RENT: 'Recommend',
  DO_NOT_RECOMMEND_RENT: 'Do not recommend',
};

const RentalApplicationsManagementPage = () => {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<number, string>>({});
  const [savingNoteId, setSavingNoteId] = useState<number | null>(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState<number | null>(null);
  const [screeningId, setScreeningId] = useState<number | null>(null);
  const { token } = useAuth();

  useEffect(() => {
    const fetchApplications = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const data = await apiFetch('/rental-applications', { token });
        setApplications(data);
      } catch (error: any) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, [token]);

  const handleStatusChange = async (id: number, status: string) => {
    if (!token) return;
    setError(null);
    try {
      setStatusUpdatingId(id);
      await apiFetch(`/rental-applications/${id}/status`, {
        token,
        method: 'PUT',
        body: { status },
      });

      // Update the local state
      setApplications((prevApplications) =>
        prevApplications.map((app) => (app.id === id ? { ...app, status } : app))
      );
    } catch (error: any) {
      setError(error.message);
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const handleScreenApplication = async (id: number) => {
    if (!token) return;
    setError(null);
    try {
      setScreeningId(id);
      const updatedApplication = await apiFetch(`/rental-applications/${id}/screen`, {
        token,
        method: 'POST',
      });
      updateLocalApplication(updatedApplication);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setScreeningId(null);
    }
  };

  const handleAddNote = async (id: number) => {
    if (!token || !noteDrafts[id] || !noteDrafts[id].trim()) {
      return;
    }
    try {
      setSavingNoteId(id);
      setError(null);
      const note = await apiFetch(`/rental-applications/${id}/notes`, {
        token,
        method: 'POST',
        body: { body: noteDrafts[id] },
      });
      setApplications((prev) =>
        prev.map((app) =>
          app.id === id
            ? { ...app, manualNotes: [note, ...(app.manualNotes ?? [])] }
            : app,
        ),
      );
      setNoteDrafts((prev) => ({ ...prev, [id]: '' }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingNoteId(null);
    }
  };

  const updateLocalApplication = (updatedApplication: any) => {
    setApplications((prevApplications) =>
      prevApplications.map((app) => (app.id === updatedApplication.id ? updatedApplication : app)),
    );
  };

  const toggleExpanded = (id: number) => {
    setExpanded((current) => (current === id ? null : id));
  };

  const stats = useMemo(() => {
    const pending = applications.filter((app) => app.status === 'PENDING').length;
    const approved = applications.filter((app) => app.status === 'APPROVED').length;
    const rejected = applications.filter((app) => app.status === 'REJECTED').length;
    const screened = applications.filter((app) => Boolean(app.screenedAt)).length;
    const qualified = applications.filter((app) => app.qualificationStatus === 'QUALIFIED').length;
    return {
      total: applications.length,
      pending,
      approved,
      rejected,
      screened,
      qualified,
    };
  }, [applications]);

  if (loading) {
    return <div className="p-4 text-sm text-gray-600">Loading rental applications…</div>;
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-gray-900">Rental applications</h1>
        <p className="text-sm text-gray-600">
          Compare applicant profiles, run screening, and document decisions for every unit.
        </p>
      </header>

      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      <section className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Applications received</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{stats.total}</p>
        </article>
        <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Pending review</p>
          <p className="mt-2 text-2xl font-semibold text-amber-600">{stats.pending}</p>
        </article>
        <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Screened</p>
          <p className="mt-2 text-2xl font-semibold text-indigo-600">{stats.screened}</p>
        </article>
        <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Approved</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-600">{stats.approved}</p>
        </article>
        <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Rejected</p>
          <p className="mt-2 text-2xl font-semibold text-rose-600">{stats.rejected}</p>
        </article>
        <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Qualified</p>
          <p className="mt-2 text-2xl font-semibold text-sky-600">{stats.qualified}</p>
        </article>
      </section>

      <section className="space-y-4">
        {applications.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white py-12 text-center text-sm text-gray-500">
            No applications submitted yet.
          </div>
        ) : (
          applications.map((application) => {
            const isExpanded = expanded === application.id;
            const noteDraft = noteDrafts[application.id] ?? '';
            const screeningReasons: string[] = Array.isArray(application.screeningReasons)
              ? application.screeningReasons
              : [];
            const statusClass = statusBadgeClasses[application.status] ?? 'bg-gray-100 text-gray-600';

            return (
              <article
                key={application.id}
                className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">{application.fullName}</h2>
                    <p className="mt-1 text-xs text-gray-500">
                      Applied {formatDateTime(application.createdAt)}
                    </p>
                    <p className="mt-1 text-sm text-gray-600">
                      {application.email} · {application.phoneNumber ?? 'No phone'}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {application.property?.name ?? 'Unknown property'} ·{' '}
                      {application.unit?.name ?? 'Unit pending'}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2 text-sm">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusClass}`}
                    >
                      {statusOptions.find((option) => option.value === application.status)?.label ??
                        application.status}
                    </span>
                    {application.qualificationStatus && (
                      <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-semibold text-sky-700">
                        {qualificationLabels[application.qualificationStatus] ??
                          application.qualificationStatus}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleExpanded(application.id)}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-500"
                    >
                      {isExpanded ? 'Hide details' : 'View details'}
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 text-xs text-gray-600 sm:grid-cols-3">
                  <div>
                    <p className="font-medium text-gray-700">Monthly income</p>
                    <p>{formatCurrency(application.income)}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-700">Employment status</p>
                    <p>{application.employmentStatus ?? '—'}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-700">Credit score</p>
                    <p>{formatNumber(application.creditScore)}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 border-t border-gray-100 pt-3 text-xs text-gray-600">
                  <label className="flex items-center gap-2">
                    <span className="font-medium text-gray-700">Status</span>
                    <select
                      value={application.status}
                      onChange={(event) => handleStatusChange(application.id, event.target.value)}
                      disabled={statusUpdatingId === application.id}
                      className="rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-100"
                    >
                      {statusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    onClick={() => handleScreenApplication(application.id)}
                    disabled={screeningId === application.id}
                    className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:bg-gray-100"
                  >
                    {screeningId === application.id
                      ? 'Screening…'
                      : application.screenedAt
                        ? 'Re-run screening'
                        : 'Run screening'}
                  </button>
                </div>

                {isExpanded && (
                  <div className="space-y-4 border-t border-gray-100 pt-4 text-sm text-gray-700">
                    <section className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
                        <h3 className="text-sm font-semibold text-gray-900">Applicant profile</h3>
                        <dl className="mt-3 space-y-2 text-xs text-gray-600">
                          <div>
                            <dt className="font-medium text-gray-700">Previous address</dt>
                            <dd>{application.previousAddress ?? '—'}</dd>
                          </div>
                          <div>
                            <dt className="font-medium text-gray-700">Monthly debt</dt>
                            <dd>{formatCurrency(application.monthlyDebt)}</dd>
                          </div>
                          <div>
                            <dt className="font-medium text-gray-700">Bankruptcy filed</dt>
                            <dd>{application.bankruptcyFiledYear ?? '—'}</dd>
                          </div>
                          <div>
                            <dt className="font-medium text-gray-700">Rental history</dt>
                            <dd>{application.rentalHistoryComments ?? '—'}</dd>
                          </div>
                        </dl>
                      </div>

                      <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
                        <h3 className="text-sm font-semibold text-gray-900">Screening insights</h3>
                        {application.screenedAt ? (
                          <dl className="mt-3 space-y-2 text-xs text-gray-600">
                            <div>
                              <dt className="font-medium text-gray-700">Score</dt>
                              <dd>{application.screeningScore ?? '—'}</dd>
                            </div>
                            <div>
                              <dt className="font-medium text-gray-700">Recommendation</dt>
                              <dd>
                                {recommendationLabels[application.recommendation] ??
                                  application.recommendation ??
                                  '—'}
                              </dd>
                            </div>
                            <div>
                              <dt className="font-medium text-gray-700">Evaluated</dt>
                              <dd>{formatDateTime(application.screenedAt)}</dd>
                            </div>
                            {application.screeningDetails && (
                              <div>
                                <dt className="font-medium text-gray-700">Summary</dt>
                                <dd>{application.screeningDetails}</dd>
                              </div>
                            )}
                            {screeningReasons.length > 0 && (
                              <div>
                                <dt className="font-medium text-gray-700">Reasons</dt>
                                <dd>
                                  <ul className="mt-1 list-disc space-y-1 pl-4">
                                    {screeningReasons.map((reason, index) => (
                                      <li key={index}>{reason}</li>
                                    ))}
                                  </ul>
                                </dd>
                              </div>
                            )}
                          </dl>
                        ) : (
                          <p className="mt-3 text-xs text-gray-500">
                            Screening has not been run yet. Capture income, credit, and debt to score
                            the application.
                          </p>
                        )}
                      </div>
                    </section>

                    <section className="space-y-3">
                      <h3 className="text-sm font-semibold text-gray-900">Application Lifecycle</h3>
                      <ApplicationLifecycleTimeline applicationId={application.id} />
                    </section>

                    <section className="space-y-3">
                      <h3 className="text-sm font-semibold text-gray-900">Notes</h3>
                      {application.manualNotes && application.manualNotes.length > 0 ? (
                        <ul className="space-y-2 text-xs">
                          {application.manualNotes.map((note: any) => (
                            <li key={note.id} className="rounded border border-gray-200 px-3 py-2">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-gray-700">
                                  {note.author?.username ?? note.author?.name ?? 'System'}
                                </span>
                                <span className="text-[11px] text-gray-500">{formatDateTime(note.createdAt)}</span>
                              </div>
                              <p className="mt-1 text-[12px] text-gray-600">{note.body}</p>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-gray-500">No notes logged yet.</p>
                      )}
                      <div className="rounded border border-gray-200 bg-white p-3 text-xs">
                        <textarea
                          rows={2}
                          value={noteDraft}
                          onChange={(event) =>
                            setNoteDrafts((prev) => ({ ...prev, [application.id]: event.target.value }))
                          }
                          placeholder="Add an internal note for your team…"
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <div className="mt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleAddNote(application.id)}
                            disabled={savingNoteId === application.id || !noteDraft.trim()}
                            className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300"
                          >
                            {savingNoteId === application.id ? 'Saving…' : 'Add note'}
                          </button>
                        </div>
                      </div>
                    </section>
                  </div>
                )}
              </article>
            );
          })
        )}
      </section>
    </div>
  );
};

export default RentalApplicationsManagementPage;
