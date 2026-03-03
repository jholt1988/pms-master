import React, { useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { apiFetch } from './services/apiClient';
import { EmptyState, LoadingState, FeedbackBanner } from './components/ui';

interface SecurityEvent {
  id: number;
  type: string;
  success: boolean;
  username?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: unknown;
  createdAt: string;
}

const formatDateTime = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
};

const EventDescription = ({ event }: { event: SecurityEvent }) => (
  <div className="space-y-2">
    <div className="font-medium text-gray-900">{event.type}</div>
    {event.metadata ? (
      <details className="text-xs text-gray-500">
        <summary className="cursor-pointer text-xs font-semibold text-indigo-600">View metadata</summary>
        <pre className="mt-1 max-h-40 overflow-auto rounded bg-gray-50 p-2 text-[11px] leading-relaxed">
          {JSON.stringify(event.metadata, null, 2)}
        </pre>
      </details>
    ) : null}
  </div>
);

type AuditPreset = 'ALL' | 'PROPERTY_OS';

const PROPERTY_OS_EVENT_TYPES = new Set([
  'PROPERTY_OS_ANALYSIS_REQUEST',
  'PROPERTY_OS_ANALYSIS_SUCCESS',
  'PROPERTY_OS_ANALYSIS_FAILURE',
]);

export default function AuditLogPage(): React.ReactElement {
  const { token } = useAuth();
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preset, setPreset] = useState<AuditPreset>('ALL');

  useEffect(() => {
    const loadEvents = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      setError(null);
      try {
        const data = await apiFetch('/security-events?limit=200', { token });
        setEvents(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load audit events');
      } finally {
        setLoading(false);
      }
    };
    loadEvents();
  }, [token]);

  const filteredEvents = [...events]
    .filter((event) => (preset === 'PROPERTY_OS' ? PROPERTY_OS_EVENT_TYPES.has(event.type) : true))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (!token) {
    return <EmptyState variant="inline" title="Sign in required" message="Please sign in as a property manager to view audit logs." />;
  }

  if (loading) {
    return <LoadingState variant="inline" message="Loading audit logs…" />;
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-gray-900">Security audit trail</h1>
        <p className="text-sm text-gray-600">
          Monitor authentication activity, configuration changes, and other sensitive operations.
        </p>
      </header>

      {error && <FeedbackBanner tone="error" message={error} />}

      <section className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setPreset('ALL')}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            preset === 'ALL' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'
          }`}
        >
          All events
        </button>
        <button
          type="button"
          onClick={() => setPreset('PROPERTY_OS')}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            preset === 'PROPERTY_OS' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'
          }`}
        >
          Property OS only
        </button>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Events captured</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{filteredEvents.length}</p>
        </article>
        <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Successful</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-600">
            {filteredEvents.filter((event) => event.success).length}
          </p>
        </article>
        <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Failed</p>
          <p className="mt-2 text-2xl font-semibold text-rose-600">
            {filteredEvents.filter((event) => !event.success).length}
          </p>
        </article>
      </section>

      <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th scope="col" className="px-4 py-3">Event</th>
                <th scope="col" className="px-4 py-3">Actor</th>
                <th scope="col" className="px-4 py-3">IP address</th>
                <th scope="col" className="px-4 py-3">User agent</th>
                <th scope="col" className="px-4 py-3">Result</th>
                <th scope="col" className="px-4 py-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">
                    <EmptyState variant="inline" title="No audit activity yet" message="Security and operational events will appear here once activity occurs." />
                  </td>
                </tr>
              ) : (
                filteredEvents.map((event) => (
                    <tr key={event.id} className="align-top">
                      <td className="px-4 py-3">
                        <EventDescription event={event} />
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {event.username ?? 'System'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {event.ipAddress ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        <span className="line-clamp-3 wrap-break-word">{event.userAgent ?? '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            event.success ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {event.success ? 'Success' : 'Failure'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{formatDateTime(event.createdAt)}</td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
