import React, { useEffect, useState } from 'react';

interface DeliverySummary {
  total: number;
  sent: number;
  failed: number;
  pending: number;
}

interface BulkBatch {
  id: number;
  title: string;
  status: string;
  createdAt: string;
  deliverySummary?: DeliverySummary;
}

interface RecipientStatus {
  id: number;
  status: string;
  user: { id: number; username: string };
  errorMessage?: string | null;
  renderedContent?: string | null;
}

interface DeliveryReport {
  summary: DeliverySummary;
  failures: { userId: number; errorMessage?: string | null }[];
}

interface BulkMessageStatusPanelProps {
  token: string;
  batches: BulkBatch[];
  onRefresh: () => void;
}

const BulkMessageStatusPanel: React.FC<BulkMessageStatusPanelProps> = ({
  token,
  batches,
  onRefresh,
}) => {
  const [selectedBatch, setSelectedBatch] = useState<number | null>(null);
  const [recipientStatuses, setRecipientStatuses] = useState<RecipientStatus[]>([]);
  const [deliveryReport, setDeliveryReport] = useState<DeliveryReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedBatch === null) {
      setRecipientStatuses([]);
      setDeliveryReport(null);
      return;
    }

    const loadDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const [recipientsResponse, reportResponse] = await Promise.all([
          fetch(`/api/messaging/bulk/${selectedBatch}/recipients`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`/api/messaging/bulk/${selectedBatch}/report`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (!recipientsResponse.ok) {
          throw new Error('Failed to load recipient statuses');
        }
        if (!reportResponse.ok) {
          throw new Error('Failed to load delivery report');
        }

        const recipientData = await recipientsResponse.json();
        const reportData = await reportResponse.json();
        setRecipientStatuses(recipientData);
        setDeliveryReport(reportData);
      } catch (err: any) {
        setError(err.message);
        setRecipientStatuses([]);
        setDeliveryReport(null);
      } finally {
        setLoading(false);
      }
    };

    loadDetails();
  }, [selectedBatch, token]);

  const selected = batches.find((batch) => batch.id === selectedBatch) ?? null;

  return (
    <section className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Bulk delivery status</h3>
          <p className="text-sm text-gray-500">Monitor queued campaigns and review delivery results.</p>
        </div>
        <button
          type="button"
          className="rounded-md border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          onClick={() => {
            setSelectedBatch(null);
            onRefresh();
          }}
        >
          Refresh
        </button>
      </div>

      {error && <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          {batches.length === 0 && (
            <p className="text-sm text-gray-500">No bulk messages have been queued yet.</p>
          )}
          {batches.map((batch) => (
            <button
              key={batch.id}
              type="button"
              onClick={() => setSelectedBatch(batch.id)}
              className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition ${
                selectedBatch === batch.id ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-900">{batch.title}</span>
                <span className="text-xs uppercase tracking-wide text-gray-500">{batch.status}</span>
              </div>
              <p className="text-xs text-gray-500">{new Date(batch.createdAt).toLocaleString()}</p>
              {batch.deliverySummary && (
                <p className="mt-1 text-xs text-gray-600">
                  Sent {batch.deliverySummary.sent}/{batch.deliverySummary.total} • Pending {batch.deliverySummary.pending} •
                  Failed {batch.deliverySummary.failed}
                </p>
              )}
            </button>
          ))}
        </div>

        <div className="rounded-lg border border-dashed border-gray-200 p-4 text-sm">
          {selected ? (
            <div className="space-y-3">
              <div>
                <h4 className="text-base font-semibold text-gray-900">{selected.title}</h4>
                <p className="text-xs uppercase tracking-wide text-gray-500">{selected.status}</p>
              </div>

              {deliveryReport && (
                <div className="flex gap-4 text-xs">
                  <div>
                    <p className="text-gray-500">Total</p>
                    <p className="text-lg font-semibold text-gray-900">{deliveryReport.summary.total}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Sent</p>
                    <p className="text-lg font-semibold text-emerald-600">{deliveryReport.summary.sent}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Pending</p>
                    <p className="text-lg font-semibold text-amber-600">{deliveryReport.summary.pending}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Failed</p>
                    <p className="text-lg font-semibold text-rose-600">{deliveryReport.summary.failed}</p>
                  </div>
                </div>
              )}

              {loading ? (
                <p className="text-gray-500">Loading delivery details…</p>
              ) : recipientStatuses.length === 0 ? (
                <p className="text-gray-500">No delivery attempts recorded yet.</p>
              ) : (
                <ul className="max-h-64 space-y-2 overflow-y-auto">
                  {recipientStatuses.map((recipient) => (
                    <li key={recipient.id} className="rounded-md border border-gray-200 p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900">{recipient.user.username}</span>
                        <span className="text-xs uppercase tracking-wide text-gray-500">{recipient.status}</span>
                      </div>
                      {recipient.errorMessage && (
                        <p className="text-xs text-rose-600">{recipient.errorMessage}</p>
                      )}
                      {recipient.renderedContent && (
                        <p className="mt-1 text-xs text-gray-600">{recipient.renderedContent}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {deliveryReport?.failures?.length ? (
                <div className="rounded-md border border-rose-100 bg-rose-50 p-3 text-xs text-rose-700">
                  <p className="font-semibold">Recent failures</p>
                  <ul className="mt-1 list-disc pl-5">
                    {deliveryReport.failures.map((failure, index) => (
                      <li key={`${failure.userId}-${index}`}>
                        User #{failure.userId}: {failure.errorMessage ?? 'Unknown error'}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-gray-500">Select a batch to view detailed delivery metrics.</p>
          )}
        </div>
      </div>
    </section>
  );
};

export default BulkMessageStatusPanel;
