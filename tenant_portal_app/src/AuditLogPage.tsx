import React, { useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

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

export default function AuditLogPage(): React.ReactElement {
  const { token } = useAuth();
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadEvents = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      setError(null);
      try {
        const res = await fetch('/api/security-events?limit=200', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const msg = await res.text();
          throw new Error(msg || 'Failed to load audit events');
        }
        setEvents(await res.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load audit events');
      } finally {
        setLoading(false);
      }
    };
    loadEvents();
  }, [token]);

  if (!token) {
    return <div className="p-4">Please sign in as a property manager to view audit logs.</div>;
  }

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-gray-900">Security audit trail</h1>
        <p className="text-sm text-gray-600">
          Monitor authentication activity, configuration changes, and other sensitive operations.
        </p>
      </header>

      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Events captured</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{events.length}</p>
        </article>
        <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Successful</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-600">
            {events.filter((event) => event.success).length}
          </p>
        </article>
        <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Failed</p>
          <p className="mt-2 text-2xl font-semibold text-rose-600">
            {events.filter((event) => !event.success).length}
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
              {events.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">
                    No audit activity recorded yet.
                  </td>
                </tr>
              ) : (
                [...events]
                  .sort(
                    (a, b) =>
                      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
                  )
                  .map((event) => (
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
                        <span className="line-clamp-3 break-words">{event.userAgent ?? '—'}</span>
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
