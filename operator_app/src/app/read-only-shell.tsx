'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  Banknote,
  Building2,
  CalendarClock,
  ClipboardList,
  Home,
  Inbox,
  KeyRound,
  Layers3,
  PenLine,
  Loader2,
  RefreshCcw,
  ShieldCheck,
  Users,
  Wrench,
} from 'lucide-react';
import {
  loadReadOnlyOperatorData,
  awardMaintenanceVendorBid,
  completeMaintenanceVendorDispatch,
  emptyReadOnlyOperatorData,
  decideApprovalTask,
  deferCommandCenterDecision,
  executeCommandCenterAction,
  loadCommandCenterDecisionDetail,
  createSetupProperty,
  createSetupUnit,
  convertOperatorApplicationToLease,
  approveInspectionRepairEstimate,
  createRepairRequestFromEstimate,
  createOperatorRenewalOffer,
  approveOperatorOwnerStatement,
  dispatchMaintenanceVendor,
  generateOperatorOwnerStatements,
  generateInspectionRepairEstimate,
  loadOperatorApplicationDetail,
  performOperatorApplicationReviewAction,
  generateLeaseSigningPacket,
  refreshLeaseSigningEnvelope,
  resendLeaseSigningEnvelope,
  requestMaintenanceVendorBid,
  rejectMaintenanceVendorBid,
  rejectInspectionRepairEstimate,
  recordOperatorRenewalMoveOut,
  recordOperatorRenewalResponse,
  refreshOperatorRenewalEnvelope,
  screenOperatorApplication,
  sendLeaseSigningEnvelope,
  sendOperatorOwnerStatement,
  sendOperatorRenewalSignature,
  type CommandCenterDecision,
  type CommandCenterDecisionDetail,
  type FeedItem,
  type OperatorApplicationDetail,
  type OperatorApplicationItem,
  type OperatorLeaseSigningItem,
  type OperatorMaintenanceDispatchItem,
  type OperatorInspectionEstimateItem,
  type OperatorRenewalItem,
  type OperatorOwnerStatementItem,
  type OperatorWorkflowItem,
  type PortfolioProperty,
  type ReadOnlyOperatorData,
} from '../lib/operator/read-only-data';

type ActiveView = 'command' | 'workflows' | 'applications' | 'signing' | 'maintenance' | 'inspections' | 'renewals' | 'owners' | 'portfolio' | 'approvals';

type WorkflowFocus = {
  item: OperatorWorkflowItem;
  targetView: ActiveView;
};

const emptyData: ReadOnlyOperatorData = emptyReadOnlyOperatorData;

const navItems = [
  { id: 'command' as const, label: 'Command Center', icon: Home },
  { id: 'workflows' as const, label: 'Workflows', icon: Layers3 },
  { id: 'applications' as const, label: 'Applications', icon: ClipboardList },
  { id: 'signing' as const, label: 'Lease Signing', icon: PenLine },
  { id: 'maintenance' as const, label: 'Maintenance', icon: Wrench },
  { id: 'inspections' as const, label: 'Inspections', icon: ClipboardList },
  { id: 'renewals' as const, label: 'Renewals', icon: CalendarClock },
  { id: 'owners' as const, label: 'Owners', icon: Banknote },
  { id: 'portfolio' as const, label: 'Portfolio', icon: Building2 },
  { id: 'approvals' as const, label: 'Approvals', icon: ShieldCheck },
];

const activeViewIds = new Set<ActiveView>(navItems.map((item) => item.id));

function parseActiveView(value: string | null): ActiveView | null {
  return value && activeViewIds.has(value as ActiveView) ? (value as ActiveView) : null;
}

function updateOperatorUrl(view: ActiveView, workflowItemId?: string | null) {
  const url = new URL(window.location.href);
  url.searchParams.set('view', view);
  if (workflowItemId) {
    url.searchParams.set('workflow', workflowItemId);
  } else {
    url.searchParams.delete('workflow');
  }
  window.history.replaceState(null, '', url);
}

const formatCurrency = (value?: number | null) =>
  typeof value === 'number'
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
    : '$0';

const formatNumber = (value?: number | null) => new Intl.NumberFormat('en-US').format(value ?? 0);

function priorityLabel(item: FeedItem) {
  if (item.priority >= 90) return 'Critical';
  if (item.priority >= 70) return 'High';
  if (item.priority >= 40) return 'Medium';
  return 'Low';
}

function decisionPriorityLabel(item: CommandCenterDecision) {
  return item.priority.charAt(0) + item.priority.slice(1).toLowerCase();
}

function propertyAddress(property: PortfolioProperty) {
  return [property.address, property.city, property.state, property.zipCode].filter(Boolean).join(', ');
}

function cents(value?: number | null) {
  return typeof value === 'number'
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value / 100)
    : null;
}

function countUnitsByStatus(property: PortfolioProperty, status: string) {
  return property.units?.filter((unit) => unit.status === status).length ?? 0;
}

export function OperatorReadOnlyShell() {
  const [activeView, setActiveView] = useState<ActiveView>('command');
  const [token, setToken] = useState('');
  const [draftToken, setDraftToken] = useState('');
  const [data, setData] = useState<ReadOnlyOperatorData>(emptyData);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [workflowFocus, setWorkflowFocus] = useState<WorkflowFocus | null>(null);
  const [pendingWorkflowFocusId, setPendingWorkflowFocusId] = useState<string | null>(null);

  const totals = useMemo(() => {
    const properties = data.portfolio.data;
    const unitCount = properties.reduce((sum, property) => sum + (property.units?.length ?? 0), 0);
    const vacantUnits = properties.reduce((sum, property) => sum + countUnitsByStatus(property, 'VACANT'), 0);

    return {
      properties: data.portfolio.meta?.totalItems ?? properties.length,
      units: data.metrics?.occupancy?.total ?? unitCount,
      occupied: data.metrics?.occupancy?.occupied ?? unitCount - vacantUnits,
      vacant: data.metrics?.occupancy?.vacant ?? vacantUnits,
      occupancy: data.metrics?.occupancy?.percentage ?? (unitCount > 0 ? Math.round(((unitCount - vacantUnits) / unitCount) * 100) : 0),
    };
  }, [data.metrics, data.portfolio]);

  const refresh = useCallback(async (authToken = token) => {
    if (!authToken) {
      setLoaded(false);
      setData(emptyData);
      return;
    }

    setLoading(true);
    const nextData = await loadReadOnlyOperatorData({ token: authToken });
    setData(nextData);
    setLoaded(true);
    setLoading(false);
  }, [token]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlView = parseActiveView(params.get('view'));
    const urlWorkflow = params.get('workflow');
    if (urlView) setActiveView(urlView);
    if (urlWorkflow) setPendingWorkflowFocusId(urlWorkflow);

    const savedToken = window.localStorage.getItem('operator_api_token') ?? '';
    setToken(savedToken);
    setDraftToken(savedToken);
    if (savedToken) {
      setLoading(true);
      void loadReadOnlyOperatorData({ token: savedToken }).then((nextData) => {
        setData(nextData);
        setLoaded(true);
        setLoading(false);
      });
    }
  }, []);

  useEffect(() => {
    if (!pendingWorkflowFocusId || !data.workflows || activeView === 'workflows') return;
    const item = data.workflows.groups.flatMap((group) => group.items).find((workflowItem) => workflowItem.id === pendingWorkflowFocusId);
    if (!item) return;
    const targetView = workflowTargetView(item.workflowId);
    if (!targetView || targetView === 'workflows') return;
    setWorkflowFocus({ item, targetView });
    setActiveView(targetView);
    setPendingWorkflowFocusId(null);
  }, [activeView, data.workflows, pendingWorkflowFocusId]);

  useEffect(() => {
    updateOperatorUrl(activeView, workflowFocus?.item.id ?? null);
  }, [activeView, workflowFocus]);

  function saveToken() {
    const nextToken = draftToken.trim();
    window.localStorage.setItem('operator_api_token', nextToken);
    setToken(nextToken);
    void refresh(nextToken);
  }

  function openWorkflowItem(item: OperatorWorkflowItem) {
    const targetView = workflowTargetView(item.workflowId);
    if (!targetView || targetView === 'workflows') return;
    setWorkflowFocus({ item, targetView });
    setPendingWorkflowFocusId(item.id);
    setActiveView(targetView);
    updateOperatorUrl(targetView, item.id);
  }

  function openView(view: ActiveView) {
    setActiveView(view);
    if (workflowFocus && workflowFocus.targetView !== view) {
      setWorkflowFocus(null);
    }
    if (view !== 'workflows') {
      setPendingWorkflowFocusId(null);
    }
    updateOperatorUrl(view, workflowFocus?.targetView === view ? workflowFocus.item.id : null);
  }

  return (
    <main className="min-h-screen">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[264px_1fr]">
        <aside className="border-b border-[var(--border)] bg-[var(--panel)] px-4 py-4 lg:border-b-0 lg:border-r">
          <div className="mb-6 flex items-center gap-3 px-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[var(--accent)] text-white">
              <Building2 size={20} aria-hidden="true" />
            </div>
            <div>
              <div className="text-sm font-semibold">PropertyOS</div>
              <div className="text-xs text-[var(--muted)]">Operator beta</div>
            </div>
          </div>

          <nav aria-label="Operator navigation" className="flex gap-2 overflow-x-auto lg:block lg:space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => openView(item.id)}
                  className={`flex min-w-max items-center gap-3 rounded-md px-3 py-2 text-sm ${
                    active
                      ? 'bg-[var(--panel-strong)] font-semibold text-[var(--foreground)]'
                      : 'text-[var(--muted)] hover:bg-[var(--panel-strong)]'
                  }`}
                >
                  <Icon size={17} aria-hidden="true" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </aside>

        <section className="px-4 py-5 sm:px-6 lg:px-8">
          <header className="mb-6 flex flex-col gap-4 border-b border-[var(--border)] pb-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="mb-2 text-sm font-medium text-[var(--accent-strong)]">Kansas private beta</p>
              <h1 className="text-3xl font-semibold tracking-normal">
                {activeView === 'command'
                  ? 'Operator command center'
                  : activeView === 'workflows'
                    ? 'Operational workflows'
                    : activeView === 'applications'
                      ? 'Applications to lease'
                    : activeView === 'signing'
                      ? 'Lease signing'
                    : activeView === 'maintenance'
                      ? 'Maintenance dispatch'
                    : activeView === 'inspections'
                      ? 'Inspection estimates'
                    : activeView === 'renewals'
                      ? 'Renewals'
                    : activeView === 'owners'
                      ? 'Owner statements'
                    : activeView === 'portfolio'
                      ? 'Read-only portfolio'
                      : 'Approval queue'}
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">
                Live first-port surface for command decisions, workflow readiness, and portfolio visibility. Mutating workflows stay approval-gated until their contracts are port-ready.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:min-w-[360px]">
              <label className="text-xs font-medium text-[var(--muted)]" htmlFor="operator-token">
                Backend bearer token
              </label>
              <div className="flex gap-2">
                <div className="relative min-w-0 flex-1">
                  <KeyRound className="absolute left-3 top-2.5 text-[var(--muted)]" size={16} aria-hidden="true" />
                  <input
                    id="operator-token"
                    value={draftToken}
                    onChange={(event) => setDraftToken(event.target.value)}
                    type="password"
                    className="h-10 w-full rounded-md border border-[var(--border)] bg-[var(--panel)] pl-9 pr-3 text-sm outline-none focus:border-[var(--accent)]"
                    placeholder="Paste JWT"
                  />
                </div>
                <button
                  onClick={saveToken}
                  className="inline-flex h-10 items-center gap-2 rounded-md bg-[var(--accent)] px-3 text-sm font-medium text-white"
                >
                  <ShieldCheck size={16} aria-hidden="true" />
                  Connect
                </button>
                <button
                  onClick={() => void refresh()}
                  disabled={!token || loading}
                  className="inline-flex h-10 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--panel)] px-3 text-sm font-medium disabled:opacity-50"
                  title="Refresh"
                >
                  {loading ? <Loader2 className="animate-spin" size={16} aria-hidden="true" /> : <RefreshCcw size={16} aria-hidden="true" />}
                  <span className="sr-only">Refresh</span>
                </button>
              </div>
            </div>
          </header>

          {data.errors.length > 0 && (
            <div className="mb-5 rounded-md border border-[var(--danger)] bg-white p-3 text-sm text-[var(--danger)]">
              {data.errors.map((error) => (
                <div key={`${error.area}-${error.status ?? 'network'}`}>
                  {error.area}: {error.status ? `${error.status} ` : ''}
                  {error.message}
                </div>
              ))}
            </div>
          )}

          {!token && (
            <div className="rounded-md border border-[var(--border)] bg-[var(--panel)] p-5 text-sm text-[var(--muted)]">
              Connect with a backend JWT to load the read-only command center and portfolio surface.
            </div>
          )}

          {token && activeView === 'command' && <CommandCenterView data={data} totals={totals} loaded={loaded} token={token} onRefresh={() => refresh()} />}
          {token && activeView === 'workflows' && (
            <WorkflowsView
              data={data}
              loaded={loaded}
              selectedWorkflowId={pendingWorkflowFocusId}
              onSelectWorkflow={(item) => {
                setPendingWorkflowFocusId(item.id);
                updateOperatorUrl('workflows', item.id);
              }}
              onOpenWorkflow={openWorkflowItem}
            />
          )}
          {token && activeView === 'applications' && <ApplicationsView data={data} loaded={loaded} token={token} onRefresh={() => refresh()} workflowFocus={workflowFocus?.targetView === 'applications' ? workflowFocus.item : null} onClearWorkflowFocus={() => setWorkflowFocus(null)} />}
          {token && activeView === 'signing' && <LeaseSigningView data={data} loaded={loaded} token={token} onRefresh={() => refresh()} workflowFocus={workflowFocus?.targetView === 'signing' ? workflowFocus.item : null} onClearWorkflowFocus={() => setWorkflowFocus(null)} />}
          {token && activeView === 'maintenance' && <MaintenanceDispatchView data={data} loaded={loaded} token={token} onRefresh={() => refresh()} workflowFocus={workflowFocus?.targetView === 'maintenance' ? workflowFocus.item : null} onClearWorkflowFocus={() => setWorkflowFocus(null)} />}
          {token && activeView === 'inspections' && <InspectionEstimatesView data={data} loaded={loaded} token={token} onRefresh={() => refresh()} workflowFocus={workflowFocus?.targetView === 'inspections' ? workflowFocus.item : null} onClearWorkflowFocus={() => setWorkflowFocus(null)} />}
          {token && activeView === 'renewals' && <RenewalsView data={data} loaded={loaded} token={token} onRefresh={() => refresh()} workflowFocus={workflowFocus?.targetView === 'renewals' ? workflowFocus.item : null} onClearWorkflowFocus={() => setWorkflowFocus(null)} />}
          {token && activeView === 'owners' && <OwnerStatementsView data={data} loaded={loaded} token={token} onRefresh={() => refresh()} workflowFocus={workflowFocus?.targetView === 'owners' ? workflowFocus.item : null} onClearWorkflowFocus={() => setWorkflowFocus(null)} />}
          {token && activeView === 'portfolio' && <PortfolioView data={data} totals={totals} loaded={loaded} token={token} onRefresh={() => refresh()} />}
          {token && activeView === 'approvals' && <ApprovalQueueView data={data} loaded={loaded} token={token} onRefresh={() => refresh()} />}
        </section>
      </div>
    </main>
  );
}

function ApprovalQueueView({
  data,
  loaded,
  token,
  onRefresh,
}: {
  data: ReadOnlyOperatorData;
  loaded: boolean;
  token: string;
  onRefresh: () => Promise<void>;
}) {
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const [rejectTaskId, setRejectTaskId] = useState<string | null>(null);
  const [reasonByTask, setReasonByTask] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);

  async function decide(taskId: string, decision: 'APPROVE' | 'REJECT') {
    const reason = reasonByTask[taskId] ?? '';
    if (decision === 'REJECT' && !reason.trim()) {
      setRejectTaskId(taskId);
      setMessage('A rejection reason is required.');
      return;
    }

    setPendingTaskId(taskId);
    setMessage(null);
    try {
      await decideApprovalTask(taskId, decision, reason, { token });
      setReasonByTask((current) => ({ ...current, [taskId]: '' }));
      setRejectTaskId(null);
      setMessage(`Approval task ${decision === 'APPROVE' ? 'approved' : 'rejected'}.`);
      await onRefresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to decide approval task.');
    } finally {
      setPendingTaskId(null);
    }
  }

  return (
    <section aria-labelledby="approval-title">
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="approval-title" className="text-lg font-semibold">Pending approvals</h2>
          <p className="text-sm text-[var(--muted)]">Approvals execute through policy workflow actions and record a DecisionRecord plus audit event.</p>
        </div>
        <span className="text-sm text-[var(--muted)]">{loaded ? `${data.approvals.length} pending` : 'Waiting for data'}</span>
      </div>

      {message ? (
        <div className="mb-3 rounded-md border border-[var(--border)] bg-[var(--panel)] p-3 text-sm text-[var(--muted)]">
          {message}
        </div>
      ) : null}

      <div className="space-y-3">
        {data.approvals.length === 0 && (
          <div className="rounded-md border border-[var(--border)] bg-[var(--panel)] p-5 text-sm text-[var(--muted)]">
            No pending approval tasks returned by `/api/policy/approval-tasks/pending`.
          </div>
        )}

        {data.approvals.map((task) => (
          <article key={task.id} className="rounded-md border border-[var(--border)] bg-[var(--panel)] p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{task.title}</h3>
                  <span className="rounded-sm border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--muted)]">{task.status}</span>
                </div>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">{task.summary || 'No summary provided.'}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--muted)]">
                  {task.propertyId ? <span>Property {task.propertyId}</span> : null}
                  {task.leaseId ? <span>Lease {task.leaseId}</span> : null}
                  {task.workOrderId ? <span>Work order {task.workOrderId}</span> : null}
                </div>
              </div>
              <div className="flex min-w-[220px] flex-col gap-2">
                {rejectTaskId === task.id ? (
                  <textarea
                    value={reasonByTask[task.id] ?? ''}
                    onChange={(event) => setReasonByTask((current) => ({ ...current, [task.id]: event.target.value }))}
                    className="min-h-20 rounded-md border border-[var(--border)] bg-[var(--panel)] p-2 text-sm outline-none focus:border-[var(--accent)]"
                    aria-label="Approval rejection reason"
                    placeholder="Reason for rejection"
                  />
                ) : null}
                <div className="flex gap-2 sm:justify-end">
                  <button
                    disabled={pendingTaskId === task.id}
                    onClick={() => {
                      if (rejectTaskId !== task.id) {
                        setRejectTaskId(task.id);
                        return;
                      }
                      void decide(task.id, 'REJECT');
                    }}
                    className="rounded-md border border-[var(--border)] px-3 py-2 text-sm font-medium disabled:opacity-50"
                  >
                    {pendingTaskId === task.id && rejectTaskId === task.id ? 'Rejecting' : 'Reject'}
                  </button>
                  <button
                    disabled={pendingTaskId === task.id}
                    onClick={() => void decide(task.id, 'APPROVE')}
                    className="rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                  >
                    {pendingTaskId === task.id && rejectTaskId !== task.id ? 'Approving' : 'Approve'}
                  </button>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ApplicationsView({
  data,
  loaded,
  token,
  onRefresh,
  workflowFocus,
  onClearWorkflowFocus,
}: {
  data: ReadOnlyOperatorData;
  loaded: boolean;
  token: string;
  onRefresh: () => Promise<void>;
  workflowFocus: OperatorWorkflowItem | null;
  onClearWorkflowFocus: () => void;
}) {
  const workbench = data.applications;
  const [selectedId, setSelectedId] = useState<number | null>(workbench?.applications[0]?.id ?? null);
  const [detail, setDetail] = useState<OperatorApplicationDetail | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [reviewAction, setReviewAction] = useState('APPROVE');
  const [reviewNote, setReviewNote] = useState('');
  const [denialReasonCode, setDenialReasonCode] = useState('');
  const [leaseStart, setLeaseStart] = useState('');
  const [leaseEnd, setLeaseEnd] = useState('');
  const [leaseRent, setLeaseRent] = useState('');
  const [leaseDeposit, setLeaseDeposit] = useState('');

  useEffect(() => {
    if (!selectedId && workbench?.applications[0]?.id) {
      setSelectedId(workbench.applications[0].id);
    }
  }, [selectedId, workbench?.applications]);

  useEffect(() => {
    if (workflowFocus?.entityType === 'RentalApplication') {
      const applicationId = Number(workflowFocus.entityId);
      if (Number.isFinite(applicationId)) setSelectedId(applicationId);
    }
  }, [workflowFocus]);

  useEffect(() => {
    if (!selectedId || !token) {
      setDetail(null);
      return;
    }
    let active = true;
    void loadOperatorApplicationDetail(selectedId, { token })
      .then((nextDetail) => {
        if (active) setDetail(nextDetail);
      })
      .catch((error) => {
        if (active) setMessage(error instanceof Error ? error.message : 'Unable to load application detail.');
      });
    return () => {
      active = false;
    };
  }, [selectedId, token]);

  const selected = detail?.application ?? workbench?.applications.find((item) => item.id === selectedId) ?? null;

  async function runScreen(applicationId: number) {
    setPending(`screen-${applicationId}`);
    setMessage(null);
    try {
      await screenOperatorApplication(applicationId, { token });
      setMessage('Application screened.');
      await onRefresh();
      setDetail(await loadOperatorApplicationDetail(applicationId, { token }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to screen application.');
    } finally {
      setPending(null);
    }
  }

  async function submitReview(applicationId: number) {
    setPending(`review-${applicationId}`);
    setMessage(null);
    try {
      await performOperatorApplicationReviewAction(applicationId, {
        action: reviewAction,
        note: reviewNote.trim() || undefined,
        reason: reviewAction === 'DENY' ? reviewNote.trim() || 'Denied by operator review.' : undefined,
        reasonCode: reviewAction === 'DENY' ? denialReasonCode || undefined : undefined,
      }, { token });
      setReviewNote('');
      setMessage('Review action recorded.');
      await onRefresh();
      setDetail(await loadOperatorApplicationDetail(applicationId, { token }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to record review action.');
    } finally {
      setPending(null);
    }
  }

  async function submitLease(applicationId: number) {
    setPending(`lease-${applicationId}`);
    setMessage(null);
    try {
      const lease = await convertOperatorApplicationToLease(applicationId, {
        startDate: leaseStart,
        endDate: leaseEnd,
        rentAmount: leaseRent ? Number(leaseRent) : undefined,
        depositAmount: leaseDeposit ? Number(leaseDeposit) : undefined,
        moveInAt: leaseStart,
        noticePeriodDays: 30,
      }, { token });
      setMessage(`Draft lease created: ${lease.id}`);
      await onRefresh();
      setDetail(await loadOperatorApplicationDetail(applicationId, { token }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to convert application to lease.');
    } finally {
      setPending(null);
    }
  }

  return (
    <section aria-labelledby="applications-title">
      <WorkflowFocusBanner
        item={workflowFocus}
        matched={workflowFocus ? workbench?.applications.some((item) => workflowFocusMatchesEntity(workflowFocus, 'RentalApplication', item.id)) ?? false : undefined}
        onClear={onClearWorkflowFocus}
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile label="Applications" value={formatNumber(workbench?.metrics.totalApplications)} detail="current workbench" icon={Users} />
        <MetricTile label="Need screening" value={formatNumber(workbench?.metrics.needsScreening)} detail="ready for policy review" icon={ClipboardList} />
        <MetricTile label="Ready for lease" value={formatNumber(workbench?.metrics.approvedReadyForLease)} detail="approved handoffs" icon={KeyRound} />
        <MetricTile label="Converted" value={formatNumber(workbench?.metrics.convertedToLease)} detail="draft leases created" icon={ShieldCheck} />
      </div>

      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="applications-title" className="text-lg font-semibold">Tenant application to lease</h2>
          <p className="text-sm text-[var(--muted)]">Review applications, inspect policy evidence, and create draft leases from approved applicants.</p>
        </div>
        <span className="text-sm text-[var(--muted)]">{loaded && workbench ? new Date(workbench.generatedAt).toLocaleString() : 'Waiting for data'}</span>
      </div>

      {message ? <div className="mb-3 rounded-md border border-[var(--border)] bg-[var(--panel)] p-3 text-sm text-[var(--muted)]">{message}</div> : null}

      {!workbench ? (
        <div className="rounded-md border border-[var(--border)] bg-[var(--panel)] p-5 text-sm text-[var(--muted)]">
          No application workbench returned by `/api/operator-applications`.
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_430px]">
          <section className="rounded-md border border-[var(--border)] bg-[var(--panel)]">
            <div className="border-b border-[var(--border)] px-4 py-3">
              <h3 className="font-semibold">Application queue</h3>
            </div>
            {workbench.applications.length === 0 ? (
              <div className="px-4 py-4 text-sm text-[var(--muted)]">No rental applications returned.</div>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {workbench.applications.map((application) => (
                  <ApplicationQueueRow
                    key={application.id}
                    application={application}
                    active={application.id === selectedId}
                    onSelect={() => setSelectedId(application.id)}
                  />
                ))}
              </div>
            )}
          </section>

          <aside className="rounded-md border border-[var(--border)] bg-[var(--panel)]">
            <div className="border-b border-[var(--border)] px-4 py-3">
              <h3 className="font-semibold">Review and lease handoff</h3>
            </div>
            {!selected ? (
              <div className="px-4 py-4 text-sm text-[var(--muted)]">Select an application.</div>
            ) : (
              <div className="space-y-5 p-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-semibold">{selected.applicantName}</h4>
                    <span className="rounded-sm border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--muted)]">{selected.status}</span>
                  </div>
                  <p className="mt-1 text-sm text-[var(--muted)]">{selected.propertyName ?? 'No property'} {selected.unitLabel ? `- ${selected.unitLabel}` : ''}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-[var(--muted)]">Income</span><div className="font-medium">{formatCurrency(selected.income)}</div></div>
                    <div><span className="text-[var(--muted)]">Score</span><div className="font-medium">{selected.screeningScore ?? 'Not screened'}</div></div>
                    <div><span className="text-[var(--muted)]">Credit</span><div className="font-medium">{selected.creditScore ?? 'Missing'}</div></div>
                    <div><span className="text-[var(--muted)]">Next</span><div className="font-medium">{selected.nextAction.replaceAll('_', ' ')}</div></div>
                  </div>
                </div>

                <div className="space-y-2">
                  <button
                    disabled={pending === `screen-${selected.id}`}
                    onClick={() => void runScreen(selected.id)}
                    className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm font-medium disabled:opacity-50"
                  >
                    {pending === `screen-${selected.id}` ? 'Screening' : 'Run screening'}
                  </button>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <select value={reviewAction} onChange={(event) => setReviewAction(event.target.value)} className="h-10 rounded-md border border-[var(--border)] bg-[var(--panel)] px-2 text-sm" aria-label="Application review action">
                      {workbench.reviewActions.map((action) => <option key={action} value={action}>{action.replaceAll('_', ' ')}</option>)}
                    </select>
                    {reviewAction === 'DENY' ? (
                      <select value={denialReasonCode} onChange={(event) => setDenialReasonCode(event.target.value)} className="h-10 rounded-md border border-[var(--border)] bg-[var(--panel)] px-2 text-sm" aria-label="Denial reason code">
                        <option value="">Reason code</option>
                        {workbench.denialReasonCodes.map((code) => <option key={code} value={code}>{code.replaceAll('_', ' ')}</option>)}
                      </select>
                    ) : null}
                  </div>
                  <textarea value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} className="min-h-20 w-full rounded-md border border-[var(--border)] bg-[var(--panel)] p-2 text-sm" aria-label="Review note or denial reason" placeholder="Review note or denial reason" />
                  <button
                    disabled={pending === `review-${selected.id}`}
                    onClick={() => void submitReview(selected.id)}
                    className="w-full rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                  >
                    {pending === `review-${selected.id}` ? 'Saving review' : 'Save review action'}
                  </button>
                </div>

                <div className="space-y-2 border-t border-[var(--border)] pt-4">
                  <div className="text-sm font-semibold">Draft lease</div>
                  {detail?.leaseHandoff?.readinessWarnings.length ? (
                    <div className="rounded-md border border-[var(--border)] bg-[var(--panel-strong)] p-2 text-xs text-[var(--muted)]">
                      {detail.leaseHandoff.readinessWarnings.join(' ')}
                    </div>
                  ) : null}
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input type="date" value={leaseStart} onChange={(event) => setLeaseStart(event.target.value)} className="h-10 rounded-md border border-[var(--border)] bg-[var(--panel)] px-2 text-sm" aria-label="Lease start" />
                    <input type="date" value={leaseEnd} onChange={(event) => setLeaseEnd(event.target.value)} className="h-10 rounded-md border border-[var(--border)] bg-[var(--panel)] px-2 text-sm" aria-label="Lease end" />
                    <input value={leaseRent} onChange={(event) => setLeaseRent(event.target.value)} className="h-10 rounded-md border border-[var(--border)] bg-[var(--panel)] px-2 text-sm" aria-label="Lease rent amount" placeholder={`Rent ${detail?.leaseHandoff?.recommendedRentAmount ?? ''}`} />
                    <input value={leaseDeposit} onChange={(event) => setLeaseDeposit(event.target.value)} className="h-10 rounded-md border border-[var(--border)] bg-[var(--panel)] px-2 text-sm" aria-label="Lease deposit amount" placeholder={`Deposit ${detail?.leaseHandoff?.recommendedDepositAmount ?? ''}`} />
                  </div>
                  <button
                    disabled={selected.nextAction !== 'convert_to_lease' || pending === `lease-${selected.id}` || !leaseStart || !leaseEnd}
                    onClick={() => void submitLease(selected.id)}
                    className="w-full rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                  >
                    {pending === `lease-${selected.id}` ? 'Creating lease' : 'Create draft lease'}
                  </button>
                </div>

                <div className="border-t border-[var(--border)] pt-4">
                  <div className="mb-2 text-sm font-semibold">Evidence</div>
                  <div className="space-y-2 text-xs text-[var(--muted)]">
                    <div>Policy: {JSON.stringify(detail?.policyEvaluation ?? {}).slice(0, 220)}</div>
                    <div>Lifecycle: {JSON.stringify(detail?.lifecycle ?? {}).slice(0, 180)}</div>
                    <div>Timeline events: {detail?.timeline.length ?? 0}</div>
                  </div>
                </div>
              </div>
            )}
          </aside>
        </div>
      )}
    </section>
  );
}

function ApplicationQueueRow({
  application,
  active,
  onSelect,
}: {
  application: OperatorApplicationItem;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`grid w-full gap-3 px-4 py-4 text-left md:grid-cols-[1fr_140px_150px_130px] md:items-center ${active ? 'bg-[var(--panel-strong)]' : 'hover:bg-[var(--panel-strong)]'}`}
    >
      <div>
        <div className="font-medium">{application.applicantName}</div>
        <div className="mt-1 text-xs text-[var(--muted)]">{application.email} · {application.propertyName ?? 'No property'} {application.unitLabel ? `- ${application.unitLabel}` : ''}</div>
      </div>
      <div className="text-sm">{application.status.replaceAll('_', ' ')}</div>
      <div className="text-sm">{application.screeningScore ?? 'Not screened'}</div>
      <div className="text-xs text-[var(--muted)]">{application.nextAction.replaceAll('_', ' ')}</div>
    </button>
  );
}

function LeaseSigningView({
  data,
  loaded,
  token,
  onRefresh,
  workflowFocus,
  onClearWorkflowFocus,
}: {
  data: ReadOnlyOperatorData;
  loaded: boolean;
  token: string;
  onRefresh: () => Promise<void>;
  workflowFocus: OperatorWorkflowItem | null;
  onClearWorkflowFocus: () => void;
}) {
  const workbench = data.leaseSigning;
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function runAction(item: OperatorLeaseSigningItem, action: 'packet' | 'send' | 'refresh' | 'resend') {
    setPending(`${action}-${item.leaseId}`);
    setMessage(null);
    try {
      if (action === 'packet') {
        await generateLeaseSigningPacket(item.leaseId, { token });
        setMessage('Lease packet generated.');
      }
      if (action === 'send') {
        await sendLeaseSigningEnvelope(item.leaseId, {
          signerEmail: item.tenantEmail ?? undefined,
          signerName: item.tenantName,
          templateId: 'LEASE_PACKET_V1',
        }, { token });
        setMessage('Signature envelope sent.');
      }
      if (action === 'refresh' && item.latestEnvelope) {
        await refreshLeaseSigningEnvelope(item.latestEnvelope.id, { token });
        setMessage('Envelope status refreshed.');
      }
      if (action === 'resend' && item.latestEnvelope) {
        await resendLeaseSigningEnvelope(item.latestEnvelope.id, { token });
        setMessage('Signature notification resent.');
      }
      await onRefresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Lease signing action failed.');
    } finally {
      setPending(null);
    }
  }

  return (
    <section aria-labelledby="lease-signing-title">
      <WorkflowFocusBanner
        item={workflowFocus}
        matched={workflowFocus ? workbench?.items.some((item) => workflowFocusMatchesEntity(workflowFocus, 'Lease', item.leaseId)) ?? false : undefined}
        onClear={onClearWorkflowFocus}
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricTile label="Draft leases" value={formatNumber(workbench?.metrics.draftLeases)} detail="signing candidates" icon={ClipboardList} />
        <MetricTile label="Packets ready" value={formatNumber(workbench?.metrics.packetsReady)} detail="ready to send" icon={ShieldCheck} />
        <MetricTile label="Sent envelopes" value={formatNumber(workbench?.metrics.envelopesSent)} detail="waiting on signatures" icon={PenLine} />
        <MetricTile label="Completed" value={formatNumber(workbench?.metrics.signaturesCompleted)} detail="signed packets" icon={KeyRound} />
        <MetricTile label="At risk" value={formatNumber(workbench?.metrics.riskItems)} detail="signature follow-up" icon={AlertTriangle} />
      </div>

      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="lease-signing-title" className="text-lg font-semibold">Lease signing workflow</h2>
          <p className="text-sm text-[var(--muted)]">Generate lease packets, send e-signature envelopes, monitor completion, and resend pending signature requests.</p>
        </div>
        <span className="text-sm text-[var(--muted)]">{loaded && workbench ? new Date(workbench.generatedAt).toLocaleString() : 'Waiting for data'}</span>
      </div>

      {message ? <div className="mb-3 rounded-md border border-[var(--border)] bg-[var(--panel)] p-3 text-sm text-[var(--muted)]">{message}</div> : null}

      {!workbench ? (
        <div className="rounded-md border border-[var(--border)] bg-[var(--panel)] p-5 text-sm text-[var(--muted)]">
          No lease signing workbench returned by `/api/operator-lease-signing`.
        </div>
      ) : (
        <section className="rounded-md border border-[var(--border)] bg-[var(--panel)]">
          <div className="border-b border-[var(--border)] px-4 py-3">
            <h3 className="font-semibold">Signing queue</h3>
          </div>
          {workbench.items.length === 0 ? (
            <div className="px-4 py-4 text-sm text-[var(--muted)]">No draft or signing leases returned.</div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {workbench.items.map((item) => (
                <LeaseSigningRow
                  key={item.leaseId}
                  item={item}
                  pending={pending}
                  focused={workflowFocusMatchesEntity(workflowFocus, 'Lease', item.leaseId)}
                  onAction={(action) => void runAction(item, action)}
                />
              ))}
            </div>
          )}
        </section>
      )}
    </section>
  );
}

function LeaseSigningRow({
  item,
  pending,
  focused,
  onAction,
}: {
  item: OperatorLeaseSigningItem;
  pending: string | null;
  focused: boolean;
  onAction: (action: 'packet' | 'send' | 'refresh' | 'resend') => void;
}) {
  const pendingForLease = pending?.endsWith(item.leaseId);
  const focusedRef = useFocusedRowScroll(focused);
  return (
    <article ref={focusedRef} className={`grid gap-4 px-4 py-4 xl:grid-cols-[1fr_250px_250px] xl:items-start ${focused ? 'bg-[var(--panel-strong)]' : ''}`}>
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="font-semibold">{item.tenantName}</h4>
          {focused ? <span className="rounded-sm bg-[var(--accent)] px-2 py-0.5 text-xs font-medium text-white">Focused workflow item</span> : null}
          <span className="rounded-sm border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--muted)]">{item.leaseStatus}</span>
          <span className="rounded-sm border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--muted)]">{item.nextAction.replaceAll('_', ' ')}</span>
        </div>
        <p className="mt-1 text-sm text-[var(--muted)]">{item.propertyName ?? 'No property'} {item.unitLabel ? `- ${item.unitLabel}` : ''}</p>
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-[var(--muted)]">
          <span>{cents(item.rentAmountCents) ?? formatCurrency(item.rentAmount)} rent</span>
          <span>{cents(item.depositAmountCents) ?? formatCurrency(item.depositAmount)} deposit</span>
          <span>{new Date(item.startDate).toLocaleDateString()} to {new Date(item.endDate).toLocaleDateString()}</span>
          <span>{item.documentCount} packet docs</span>
        </div>
        {item.blockers.length > 0 ? (
          <div className="mt-3 rounded-md border border-[var(--border)] bg-[var(--panel-strong)] p-2 text-xs text-[var(--muted)]">
            {item.blockers.join(' ')}
          </div>
        ) : null}
      </div>

      <div className="text-sm">
        <div className="font-medium">Envelope</div>
        {item.latestEnvelope ? (
          <div className="mt-2 space-y-1 text-xs text-[var(--muted)]">
            <div>Status: {item.latestEnvelope.status}</div>
            <div>Provider: {item.latestEnvelope.providerStatus ?? item.latestEnvelope.providerEnvelopeId}</div>
            <div>Participants: {item.latestEnvelope.participants.map((p) => `${p.name} ${p.status}`).join(', ')}</div>
          </div>
        ) : (
          <div className="mt-2 text-xs text-[var(--muted)]">No envelope created.</div>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
        <button disabled={pendingForLease || item.nextAction === 'blocked'} onClick={() => onAction('packet')} className="rounded-md border border-[var(--border)] px-3 py-2 text-sm font-medium disabled:opacity-50">
          Generate packet
        </button>
        <button disabled={pendingForLease || item.nextAction === 'blocked' || item.nextAction === 'monitor_signature' || item.nextAction === 'complete'} onClick={() => onAction('send')} className="rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
          Send envelope
        </button>
        <button disabled={pendingForLease || !item.latestEnvelope} onClick={() => onAction('refresh')} className="rounded-md border border-[var(--border)] px-3 py-2 text-sm font-medium disabled:opacity-50">
          Refresh status
        </button>
        <button disabled={pendingForLease || !item.latestEnvelope || item.nextAction === 'complete'} onClick={() => onAction('resend')} className="rounded-md border border-[var(--border)] px-3 py-2 text-sm font-medium disabled:opacity-50">
          Resend
        </button>
      </div>
    </article>
  );
}

function MaintenanceDispatchView({
  data,
  loaded,
  token,
  onRefresh,
  workflowFocus,
  onClearWorkflowFocus,
}: {
  data: ReadOnlyOperatorData;
  loaded: boolean;
  token: string;
  onRefresh: () => Promise<void>;
  workflowFocus: OperatorWorkflowItem | null;
  onClearWorkflowFocus: () => void;
}) {
  const workbench = data.maintenanceDispatch;
  const [selectedVendorByRequest, setSelectedVendorByRequest] = useState<Record<string, string>>({});
  const [notifyByRequest, setNotifyByRequest] = useState<Record<string, boolean>>({});
  const [noteByRequest, setNoteByRequest] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [predictiveAssets, setPredictiveAssets] = useState<any>(null);
  const [loadingPredictive, setLoadingPredictive] = useState(false);
  const [triggeringAssetId, setTriggeringAssetId] = useState<number | null>(null);

  const loadPredictive = useCallback(async () => {
    setLoadingPredictive(true);
    try {
      const res = await fetch('/api/backend/maintenance/predictive/assets', {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });
      if (res.ok) {
        const body = await res.json();
        setPredictiveAssets(body.data || body);
      }
    } catch (err) {
      console.error('Failed to load predictive assets.');
    } finally {
      setLoadingPredictive(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      void loadPredictive();
    }
  }, [token, loadPredictive]);

  async function triggerPreventiveTicket(assetId: number) {
    setTriggeringAssetId(assetId);
    setMessage(null);
    try {
      const res = await fetch(`/api/backend/maintenance/predictive/assets/${assetId}/trigger-preventive`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (res.ok) {
        setMessage('Preventative work order successfully generated.');
        await loadPredictive();
        await onRefresh();
      } else {
        setMessage('Failed to generate preventative work order.');
      }
    } catch (err) {
      setMessage('Error triggering preventative ticket.');
    } finally {
      setTriggeringAssetId(null);
    }
  }

  async function dispatch(item: OperatorMaintenanceDispatchItem) {
    const vendorId = selectedVendorByRequest[item.requestId];
    if (!vendorId) {
      setMessage('Select a vendor before dispatching.');
      return;
    }
    setPending(`dispatch-${item.requestId}`);
    setMessage(null);
    try {
      const note = noteByRequest[item.requestId] ?? '';
      await dispatchMaintenanceVendor(item.requestId, {
        vendorId,
        notes: note.trim() || undefined,
        notifyTenant: Boolean(notifyByRequest[item.requestId]),
        tenantMessage: notifyByRequest[item.requestId] ? `A vendor has been dispatched for ${item.title}. ${note}`.trim() : undefined,
      }, { token });
      setMessage('Vendor dispatched.');
      await onRefresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to dispatch vendor.');
    } finally {
      setPending(null);
    }
  }

  async function requestBid(item: OperatorMaintenanceDispatchItem) {
    const vendorId = selectedVendorByRequest[item.requestId];
    setPending(`bid-${item.requestId}`);
    setMessage(null);
    try {
      await requestMaintenanceVendorBid(item.requestId, {
        vendorId: vendorId || undefined,
        scope: noteByRequest[item.requestId]?.trim() || item.description,
      }, { token });
      setMessage('Vendor bid requested.');
      await onRefresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to request vendor bid.');
    } finally {
      setPending(null);
    }
  }

  async function awardBid(item: OperatorMaintenanceDispatchItem, bidId?: string) {
    const targetBidId = bidId || item.latestBid?.id;
    if (!targetBidId) return;
    setPending(`award-${item.requestId}`);
    setMessage(null);
    try {
      const note = noteByRequest[item.requestId] ?? '';
      await awardMaintenanceVendorBid(targetBidId, {
        note: note.trim() || undefined,
        notifyTenant: Boolean(notifyByRequest[item.requestId]),
        tenantMessage: notifyByRequest[item.requestId] ? `A vendor bid has been approved for ${item.title}. ${note}`.trim() : undefined,
      }, { token });
      setMessage('Vendor bid awarded.');
      await onRefresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to award vendor bid.');
    } finally {
      setPending(null);
    }
  }

  async function completeDispatch(item: OperatorMaintenanceDispatchItem) {
    if (!item.latestDispatch) return;
    setPending(`complete-${item.requestId}`);
    setMessage(null);
    try {
      await completeMaintenanceVendorDispatch(item.latestDispatch.id, {
        note: noteByRequest[item.requestId]?.trim() || 'Vendor dispatch completed.',
      }, { token });
      setMessage('Vendor dispatch completed.');
      await onRefresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to complete vendor dispatch.');
    } finally {
      setPending(null);
    }
  }

  async function rejectBid(item: OperatorMaintenanceDispatchItem, bidId?: string) {
    const targetBidId = bidId || item.latestBid?.id;
    if (!targetBidId) return;
    setPending(`reject-${item.requestId}`);
    setMessage(null);
    try {
      await rejectMaintenanceVendorBid(targetBidId, {
        reason: noteByRequest[item.requestId]?.trim() || undefined,
      }, { token });
      setMessage('Vendor bid rejected.');
      await onRefresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to reject vendor bid.');
    } finally {
      setPending(null);
    }
  }

  return (
    <section aria-labelledby="maintenance-dispatch-title">
      <WorkflowFocusBanner
        item={workflowFocus}
        matched={workflowFocus ? workbench?.requests.some((item) => workflowFocusMatchesEntity(workflowFocus, 'MaintenanceRequest', item.requestId)) ?? false : undefined}
        onClear={onClearWorkflowFocus}
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <MetricTile label="Open" value={formatNumber(workbench?.metrics.openRequests)} detail="active requests" icon={Wrench} />
        <MetricTile label="Emergency" value={formatNumber(workbench?.metrics.emergencyRequests)} detail="high priority" icon={AlertTriangle} />
        <MetricTile label="Unassigned" value={formatNumber(workbench?.metrics.unassignedRequests)} detail="needs owner" icon={Users} />
        <MetricTile label="Vendor ready" value={formatNumber(workbench?.metrics.vendorReadyRequests)} detail="dispatch candidates" icon={ArrowUpRight} />
        <MetricTile label="Open bids" value={formatNumber(workbench?.metrics.bidsOpen)} detail="vendor responses" icon={ClipboardList} />
        <MetricTile label="Dispatched" value={formatNumber(workbench?.metrics.dispatchedRequests)} detail="vendors active" icon={Wrench} />
        <MetricTile label="Complete" value={formatNumber(workbench?.metrics.completedDispatches)} detail="vendor finished" icon={ShieldCheck} />
      </div>

      {/* High-Risk Assets Panel */}
      <div className="mb-6 rounded-md border border-[var(--border)] bg-[var(--panel)] p-4">
        <div className="mb-3 flex items-center justify-between border-b border-[var(--border)] pb-2">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <AlertTriangle size={16} className="text-yellow-600 animate-pulse" />
            Predictive Maintenance: High-Risk Appliances
          </h3>
          <button
            onClick={() => void loadPredictive()}
            disabled={loadingPredictive}
            className="text-xs text-[var(--accent)] font-medium hover:underline"
          >
            {loadingPredictive ? 'Scanning...' : 'Scan Assets'}
          </button>
        </div>

        {predictiveAssets?.alerts?.length > 0 ? (
          <div className="space-y-3">
            {predictiveAssets.alerts.map((alert: any) => (
              <div key={alert.id} className="flex flex-col gap-3 rounded-md bg-[var(--panel-strong)] p-3 text-xs md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="font-semibold text-[var(--foreground)]">{alert.metadata?.assetName} ({alert.metadata?.category})</div>
                  <div className="mt-1 text-[var(--muted)]">
                    Projected life remaining: <strong className="text-[var(--foreground)]">{alert.metadata?.remainingLifeDays} days</strong> · 
                    Failure Probability: <strong className="text-red-600 font-semibold">{Math.round(alert.metadata?.failureProbability * 100)}%</strong>
                  </div>
                  <div className="mt-1 font-medium text-yellow-700">{alert.metadata?.recommendedAction}</div>
                </div>
                <button
                  disabled={triggeringAssetId === alert.metadata?.assetId}
                  onClick={() => void triggerPreventiveTicket(alert.metadata?.assetId)}
                  className="rounded bg-[var(--accent)] px-3 py-1.5 font-semibold text-white hover:opacity-90 disabled:opacity-50 min-w-[150px] text-center"
                >
                  {triggeringAssetId === alert.metadata?.assetId ? 'Generating...' : 'Approve Work Order'}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-[var(--muted)]">No critical assets currently flagged for imminent failure.</div>
        )}
      </div>

      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="maintenance-dispatch-title" className="text-lg font-semibold">Maintenance request to vendor dispatch</h2>
          <p className="text-sm text-[var(--muted)]">Triage open requests, request contractor bids, dispatch vendors, and optionally notify tenants.</p>
        </div>
        <span className="text-sm text-[var(--muted)]">{loaded && workbench ? new Date(workbench.generatedAt).toLocaleString() : 'Waiting for data'}</span>
      </div>

      {message ? <div className="mb-3 rounded-md border border-[var(--border)] bg-[var(--panel)] p-3 text-sm text-[var(--muted)]">{message}</div> : null}

      {!workbench ? (
        <div className="rounded-md border border-[var(--border)] bg-[var(--panel)] p-5 text-sm text-[var(--muted)]">
          No maintenance dispatch workbench returned by `/api/operator-maintenance-dispatch`.
        </div>
      ) : (
        <section className="rounded-md border border-[var(--border)] bg-[var(--panel)]">
          <div className="border-b border-[var(--border)] px-4 py-3">
            <h3 className="font-semibold">Dispatch queue</h3>
          </div>
          {workbench.requests.length === 0 ? (
            <div className="px-4 py-4 text-sm text-[var(--muted)]">No open maintenance requests returned.</div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {workbench.requests.map((item) => (
                <MaintenanceDispatchRow
                  key={item.requestId}
                  item={item}
                  vendors={workbench.vendors}
                  focused={workflowFocusMatchesEntity(workflowFocus, 'MaintenanceRequest', item.requestId)}
                  selectedVendor={selectedVendorByRequest[item.requestId] ?? ''}
                  note={noteByRequest[item.requestId] ?? ''}
                  notifyTenant={Boolean(notifyByRequest[item.requestId])}
                  pending={pending?.endsWith(item.requestId) ?? false}
                  onVendorChange={(vendorId) => setSelectedVendorByRequest((current) => ({ ...current, [item.requestId]: vendorId }))}
                  onNoteChange={(note) => setNoteByRequest((current) => ({ ...current, [item.requestId]: note }))}
                  onNotifyChange={(notify) => setNotifyByRequest((current) => ({ ...current, [item.requestId]: notify }))}
                  onDispatch={() => void dispatch(item)}
                  onRequestBid={() => void requestBid(item)}
                  onAwardBid={(bidId) => void awardBid(item, bidId)}
                  onCompleteDispatch={() => void completeDispatch(item)}
                  onRejectBid={(bidId) => void rejectBid(item, bidId)}
                />
              ))}
            </div>
          )}
        </section>
      )}
    </section>
  );
}

function MaintenanceDispatchRow({
  item,
  vendors,
  focused,
  selectedVendor,
  note,
  notifyTenant,
  pending,
  onVendorChange,
  onNoteChange,
  onNotifyChange,
  onDispatch,
  onRequestBid,
  onAwardBid,
  onCompleteDispatch,
  onRejectBid,
}: {
  item: OperatorMaintenanceDispatchItem;
  vendors: NonNullable<ReadOnlyOperatorData['maintenanceDispatch']>['vendors'];
  focused: boolean;
  selectedVendor: string;
  note: string;
  notifyTenant: boolean;
  pending: boolean;
  onVendorChange: (vendorId: string) => void;
  onNoteChange: (note: string) => void;
  onNotifyChange: (notify: boolean) => void;
  onDispatch: () => void;
  onRequestBid: () => void;
  onAwardBid: (bidId?: string) => void;
  onCompleteDispatch: () => void;
  onRejectBid: (bidId?: string) => void;
}) {
  const hasAwardableBid = Boolean(item.latestBid && !['AWARDED', 'COMPLETED', 'REJECTED'].includes(item.latestBid.status));
  const hasRejectableBid = Boolean(item.latestBid && !['AWARDED', 'COMPLETED', 'REJECTED'].includes(item.latestBid.status));
  const hasActiveDispatch = Boolean(item.latestDispatch && item.latestDispatch.status === 'AWARDED');
  const focusedRef = useFocusedRowScroll(focused);

  return (
    <article ref={focusedRef} className={`grid gap-4 px-4 py-4 xl:grid-cols-[1fr_280px_260px] xl:items-start ${focused ? 'bg-[var(--panel-strong)]' : ''}`}>
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="font-semibold">{item.title}</h4>
          {focused ? <span className="rounded-sm bg-[var(--accent)] px-2 py-0.5 text-xs font-medium text-white">Focused workflow item</span> : null}
          <span className="rounded-sm border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--muted)]">{item.priority}</span>
          <span className="rounded-sm border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--muted)]">{item.nextAction.replaceAll('_', ' ')}</span>
        </div>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">{item.description}</p>
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-[var(--muted)]">
          <span>{item.propertyName ?? 'No property'} {item.unitLabel ? `- ${item.unitLabel}` : ''}</span>
          <span>Tenant {item.tenantName}</span>
          <span>Assignee {item.assigneeName ?? 'none'}</span>
          <span>{item.bidsCount} bids</span>
          {item.responseDueAt ? <span>Response due {new Date(item.responseDueAt).toLocaleString()}</span> : null}
        </div>

        {/* Nested Bids Marketplace with Composite Scores */}
        {item.bids && item.bids.length > 0 ? (
          <div className="mt-4 space-y-2.5">
            <h5 className="text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider">Marketplace Vendor Bids</h5>
            <div className="space-y-2">
              {item.bids.map((bid) => {
                const canAction = !['AWARDED', 'COMPLETED', 'REJECTED'].includes(bid.status);
                const scoreColor = (bid.aiScore ?? 0) >= 80 
                  ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200' 
                  : (bid.aiScore ?? 0) >= 60 
                    ? 'text-yellow-700 bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200' 
                    : 'text-rose-700 bg-rose-50 dark:bg-rose-950/30 border-rose-200';
                
                return (
                  <div key={bid.id} className="rounded-md border border-[var(--border)] bg-[var(--panel-strong)]/40 p-3 text-xs flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-semibold text-[var(--foreground)]">
                        {bid.vendorName ?? 'Vendor'}
                        {bid.vendorEmail ? ` (${bid.vendorEmail})` : ''}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${scoreColor}`}>
                          Rank: {bid.aiScore ?? 'N/A'}/100
                        </span>
                        <span className="rounded-sm border border-[var(--border)] px-1.5 py-0.5 text-[10px] text-[var(--muted)] uppercase font-mono">
                          {bid.status}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[var(--muted)] border-t border-[var(--border)]/50 pt-2">
                      <div>Bid Amount: <strong className="text-[var(--foreground)]">{cents(bid.bidAmountCents) ?? 'N/A'}</strong></div>
                      <div>Expected By: <strong className="text-[var(--foreground)]">{bid.dueDate ? new Date(bid.dueDate).toLocaleDateString() : 'Immediate'}</strong></div>
                    </div>

                    {bid.aiRationale ? (
                      <div className="text-[11px] text-[var(--muted)] leading-relaxed italic bg-[var(--panel)]/50 p-2 rounded border border-[var(--border)]/30">
                        {bid.aiRationale}
                      </div>
                    ) : null}

                    {bid.scope ? (
                      <div className="text-[11px] text-[var(--foreground)] leading-relaxed">
                        <span className="text-[var(--muted)] font-medium">Scope:</span> {bid.scope}
                      </div>
                    ) : null}

                    {canAction && (
                      <div className="flex justify-end gap-2 border-t border-[var(--border)]/50 pt-2">
                        <button
                          disabled={pending}
                          onClick={() => onRejectBid(bid.id)}
                          className="rounded border border-[var(--border)] px-2.5 py-1 font-semibold text-[var(--danger)] hover:bg-rose-50 dark:hover:bg-rose-950/20 disabled:opacity-50"
                        >
                          Reject
                        </button>
                        <button
                          disabled={pending}
                          onClick={() => onAwardBid(bid.id)}
                          className="rounded bg-[var(--accent)] px-2.5 py-1 font-semibold text-white hover:opacity-90 disabled:opacity-50"
                        >
                          Award Bid
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mt-3 text-xs text-[var(--muted)] italic">No bids submitted yet for this RFP scope.</div>
        )}

        {item.latestDispatch ? (
          <div className="mt-2 rounded-md border border-[var(--border)] bg-[var(--panel-strong)] p-2 text-xs text-[var(--muted)]">
            Dispatch: {item.latestDispatch.vendorName ?? 'Vendor'} · {item.latestDispatch.status}
            {item.latestDispatch.awardedAt ? ` · awarded ${new Date(item.latestDispatch.awardedAt).toLocaleDateString()}` : ''}
            {item.latestDispatch.responseNotes ? <div className="mt-1">{item.latestDispatch.responseNotes}</div> : null}
          </div>
        ) : null}
        {item.dispatchHistory.length > 1 ? (
          <div className="mt-2 text-xs text-[var(--muted)]">
            Dispatch history: {item.dispatchHistory.map((dispatch) => `${dispatch.vendorName ?? 'Vendor'} ${dispatch.status}`).join(' · ')}
          </div>
        ) : null}
        {item.blockers.length > 0 ? <div className="mt-3 text-xs text-[var(--danger)]">{item.blockers.join(' ')}</div> : null}
      </div>

      <div className="space-y-2">
        <select value={selectedVendor} onChange={(event) => onVendorChange(event.target.value)} className="h-10 w-full rounded-md border border-[var(--border)] bg-[var(--panel)] px-2 text-sm" aria-label="Maintenance vendor">
          <option value="">Select vendor</option>
          {vendors.map((vendor) => (
            <option key={vendor.id} value={vendor.id}>{vendor.name} · {vendor.complianceStatus}</option>
          ))}
        </select>
        <textarea value={note} onChange={(event) => onNoteChange(event.target.value)} className="min-h-20 w-full rounded-md border border-[var(--border)] bg-[var(--panel)] p-2 text-sm" aria-label="Maintenance dispatch note" placeholder="Scope, access notes, tenant instructions" />
        <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
          <input type="checkbox" checked={notifyTenant} onChange={(event) => onNotifyChange(event.target.checked)} />
          Notify tenant
        </label>
      </div>

      <div className="grid gap-2">
        <button disabled={pending || item.nextAction === 'blocked'} onClick={onRequestBid} className="rounded-md border border-[var(--border)] px-3 py-2 text-sm font-medium disabled:opacity-50">
          Request bid
        </button>
        <button disabled={pending || item.nextAction === 'blocked'} onClick={onDispatch} className="rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
          Dispatch vendor
        </button>
        <button disabled={pending || !hasAwardableBid} onClick={() => onAwardBid()} className="rounded-md border border-[var(--border)] px-3 py-2 text-sm font-medium disabled:opacity-50">
          Award latest bid
        </button>
        <button disabled={pending || !hasActiveDispatch} onClick={onCompleteDispatch} className="rounded-md border border-[var(--border)] px-3 py-2 text-sm font-medium disabled:opacity-50">
          Complete dispatch
        </button>
        <button disabled={pending || !hasRejectableBid} onClick={() => onRejectBid()} className="rounded-md border border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--danger)] disabled:opacity-50">
          Reject latest bid
        </button>
      </div>
    </article>
  );
}

function InspectionEstimatesView({
  data,
  loaded,
  token,
  onRefresh,
  workflowFocus,
  onClearWorkflowFocus,
}: {
  data: ReadOnlyOperatorData;
  loaded: boolean;
  token: string;
  onRefresh: () => Promise<void>;
  workflowFocus: OperatorWorkflowItem | null;
  onClearWorkflowFocus: () => void;
}) {
  const workbench = data.inspectionEstimates;
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [noteByEstimate, setNoteByEstimate] = useState<Record<string, string>>({});

  const [isOnline, setIsOnline] = useState(true);
  const [offlineQueue, setOfflineQueue] = useState<any[]>([]);
  const [simTargetId, setSimTargetId] = useState<string>('');
  const [simFinding, setSimFinding] = useState('');
  const [syncingQueue, setSyncingQueue] = useState(false);

  function simulateOfflineFinding() {
    if (!simTargetId) {
      setMessage('Select an inspection to simulate first.');
      return;
    }
    const targetId = parseInt(simTargetId, 10);
    const newAction = {
      id: targetId,
      action: 'complete',
      timestamp: new Date().toISOString(),
      payload: {
        findings: [
          {
            location: 'Unit Interior',
            category: 'Safety',
            issueType: 'Repair',
            description: simFinding || 'Simulated offline inspection checklist issue.',
          },
        ],
        notes: 'Offline field device checklist sync draft.',
      },
    };

    if (isOnline) {
      setMessage('Direct sync online is not simulated. Toggle Offline mode to test the queuing mechanism.');
      return;
    }

    setOfflineQueue((curr) => [...curr, newAction]);
    setSimFinding('');
    setMessage(`Offline action successfully queued: Complete Inspection #${targetId}`);
  }

  async function syncQueue() {
    if (offlineQueue.length === 0) return;
    setSyncingQueue(true);
    setMessage(null);
    try {
      const res = await fetch('/api/backend/inspections/sync', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ actions: offlineQueue }),
      });
      if (!res.ok) {
        throw new Error(`Sync failed with status: ${res.status}`);
      }
      setMessage(`Successfully synchronized ${offlineQueue.length} offline inspection action(s) to the database.`);
      setOfflineQueue([]);
      await onRefresh();
    } catch (err: any) {
      setMessage(err.message || 'Failed to sync offline queue.');
    } finally {
      setSyncingQueue(false);
    }
  }

  async function run(item: OperatorInspectionEstimateItem, action: 'generate' | 'approve' | 'reject' | 'repair') {
    const estimate = item.latestEstimate;
    setPending(`${action}-${item.inspectionId}`);
    setMessage(null);
    try {
      if (action === 'generate') {
        await generateInspectionRepairEstimate(item.inspectionId, { token });
        setMessage('Repair estimate generated.');
      }
      if (action === 'approve' && estimate) {
        await approveInspectionRepairEstimate(estimate.id, { token });
        setMessage('Repair estimate approved.');
      }
      if (action === 'reject' && estimate) {
        await rejectInspectionRepairEstimate(estimate.id, noteByEstimate[estimate.id] ?? '', { token });
        setMessage('Repair estimate rejected.');
      }
      if (action === 'repair' && estimate) {
        await createRepairRequestFromEstimate(estimate.id, {
          title: `Inspection repair - ${item.unitLabel ?? item.unitId}`,
          priority: estimate.totalProjectCost >= 1500 ? 'HIGH' : estimate.totalProjectCost <= 250 ? 'LOW' : 'MEDIUM',
        }, { token });
        setMessage('Maintenance repair request created.');
      }
      await onRefresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Inspection estimate action failed.');
    } finally {
      setPending(null);
    }
  }

  return (
    <section aria-labelledby="inspection-estimates-title">
      <WorkflowFocusBanner
        item={workflowFocus}
        matched={workflowFocus ? workbench?.inspections.some((item) => workflowFocusMatchesEntity(workflowFocus, 'InspectionRequest', item.inspectionId)) ?? false : undefined}
        onClear={onClearWorkflowFocus}
      />

      {/* Offline Sync Simulator Panel */}
      <div className="mb-6 rounded-md border border-[var(--border)] bg-[var(--panel)] p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--border)] pb-3">
          <div>
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
              Offline-First Mobile Sync Simulator
            </h3>
            <p className="text-xs text-[var(--muted)] mt-1">Simulates mobile field inspectors taking offline room assessments and batch syncing findings.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsOnline(true)}
              className={`px-3 py-1.5 text-xs font-semibold rounded ${isOnline ? 'bg-[var(--accent)] text-white' : 'bg-[var(--panel-strong)] text-[var(--muted)]'}`}
            >
              Online Mode
            </button>
            <button
              onClick={() => setIsOnline(false)}
              className={`px-3 py-1.5 text-xs font-semibold rounded ${!isOnline ? 'bg-amber-600 text-white' : 'bg-[var(--panel-strong)] text-[var(--muted)]'}`}
            >
              Offline Mode
            </button>
          </div>
        </div>

        <div className="grid gap-5 mt-4 md:grid-cols-[1fr_280px]">
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1" htmlFor="sim-inspection-select">Target Scheduled Inspection</label>
                <select
                  id="sim-inspection-select"
                  value={simTargetId}
                  onChange={(e) => setSimTargetId(e.target.value)}
                  className="h-10 w-full rounded-md border border-[var(--border)] bg-[var(--panel)] px-2 text-xs"
                >
                  <option value="">Select Scheduled Unit</option>
                  {workbench?.inspections
                    .filter((item) => item.status === 'SCHEDULED' || item.status === 'PENDING')
                    .map((item) => (
                      <option key={item.inspectionId} value={item.inspectionId}>
                        Inspection #{item.inspectionId} · {item.propertyName} ({item.unitLabel ?? 'General'})
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1" htmlFor="sim-finding-input">Findings & Notes (Offline Assessment)</label>
                <input
                  id="sim-finding-input"
                  value={simFinding}
                  onChange={(e) => setSimFinding(e.target.value)}
                  placeholder="e.g. Scratched living room floor, clogged bathroom sink"
                  className="h-10 w-full rounded-md border border-[var(--border)] bg-[var(--panel)] px-3 text-xs outline-none focus:border-[var(--accent)]"
                />
              </div>
            </div>
            <button
              disabled={isOnline || !simTargetId}
              onClick={simulateOfflineFinding}
              className="rounded bg-[var(--panel-strong)] border border-[var(--border)] px-4 py-2 text-xs font-semibold disabled:opacity-50 hover:bg-[var(--panel)]"
            >
              Record Finding Offline
            </button>
          </div>

          <div className="rounded-md border border-[var(--border)] bg-[var(--panel-strong)]/30 p-3 text-xs flex flex-col justify-between">
            <div>
              <div className="font-semibold text-xs border-b border-[var(--border)] pb-1.5 flex justify-between">
                <span>Unsynced Queue</span>
                <span className="font-mono text-amber-600 font-bold">{offlineQueue.length} items</span>
              </div>
              <div className="mt-2 space-y-1.5 max-h-[80px] overflow-y-auto">
                {offlineQueue.length === 0 ? (
                  <div className="text-[11px] text-[var(--muted)] italic">Queue is empty. Toggle Offline Mode & add assessments.</div>
                ) : (
                  offlineQueue.map((item, index) => (
                    <div key={index} className="text-[11px] bg-[var(--panel)] border border-[var(--border)] p-1 rounded font-mono truncate">
                      [{new Date(item.timestamp).toLocaleTimeString()}] Sync Inspection #{item.id}
                    </div>
                  ))
                )}
              </div>
            </div>
            <button
              disabled={!isOnline || offlineQueue.length === 0 || syncingQueue}
              onClick={syncQueue}
              className="mt-3 w-full rounded bg-[var(--accent)] py-2 text-xs font-semibold text-white disabled:opacity-50 hover:opacity-95 text-center flex items-center justify-center gap-1.5"
            >
              {syncingQueue ? <Loader2 size={13} className="animate-spin" /> : null}
              Sync Offline Queue
            </button>
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <MetricTile label="Completed" value={formatNumber(workbench?.metrics.completedInspections)} detail="inspections" icon={ClipboardList} />
        <MetricTile label="Need estimate" value={formatNumber(workbench?.metrics.inspectionsNeedingEstimate)} detail="findings ready" icon={AlertTriangle} />
        <MetricTile label="Draft" value={formatNumber(workbench?.metrics.draftEstimates)} detail="estimates" icon={Inbox} />
        <MetricTile label="Pending review" value={formatNumber(workbench?.metrics.pendingReviewEstimates)} detail="operator approval" icon={ShieldCheck} />
        <MetricTile label="Approved" value={formatNumber(workbench?.metrics.approvedEstimates)} detail="repair scope" icon={PenLine} />
        <MetricTile label="Repair ready" value={formatNumber(workbench?.metrics.repairReadyEstimates)} detail="needs request" icon={Wrench} />
      </div>

      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="inspection-estimates-title" className="text-lg font-semibold">Inspection to repair estimate</h2>
          <p className="text-sm text-[var(--muted)]">Turn completed inspection findings into repair estimates, approve scope, and create maintenance repair work.</p>
        </div>
        <span className="text-sm text-[var(--muted)]">{loaded && workbench ? new Date(workbench.generatedAt).toLocaleString() : 'Waiting for data'}</span>
      </div>

      {message ? <div className="mb-3 rounded-md border border-[var(--border)] bg-[var(--panel)] p-3 text-sm text-[var(--muted)]">{message}</div> : null}

      {!workbench ? (
        <div className="rounded-md border border-[var(--border)] bg-[var(--panel)] p-5 text-sm text-[var(--muted)]">
          No inspection estimates workbench returned by `/api/operator-inspection-estimates`.
        </div>
      ) : (
        <section className="rounded-md border border-[var(--border)] bg-[var(--panel)]">
          <div className="border-b border-[var(--border)] px-4 py-3">
            <h3 className="font-semibold">Estimate queue</h3>
          </div>
          {workbench.inspections.length === 0 ? (
            <div className="px-4 py-4 text-sm text-[var(--muted)]">No inspections returned.</div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {workbench.inspections.map((item) => (
                <InspectionEstimateRow
                  key={item.inspectionId}
                  item={item}
                  focused={workflowFocusMatchesEntity(workflowFocus, 'InspectionRequest', item.inspectionId)}
                  pending={pending?.endsWith(String(item.inspectionId)) ?? false}
                  reviewNote={item.latestEstimate ? noteByEstimate[item.latestEstimate.id] ?? '' : ''}
                  onReviewNoteChange={(note) => {
                    if (!item.latestEstimate) return;
                    setNoteByEstimate((current) => ({ ...current, [item.latestEstimate!.id]: note }));
                  }}
                  onAction={(action) => void run(item, action)}
                />
              ))}
            </div>
          )}
        </section>
      )}
    </section>
  );
}

function InspectionEstimateRow({
  item,
  focused,
  pending,
  reviewNote,
  onReviewNoteChange,
  onAction,
}: {
  item: OperatorInspectionEstimateItem;
  focused: boolean;
  pending: boolean;
  reviewNote: string;
  onReviewNoteChange: (note: string) => void;
  onAction: (action: 'generate' | 'approve' | 'reject' | 'repair') => void;
}) {
  const estimate = item.latestEstimate;
  const focusedRef = useFocusedRowScroll(focused);
  return (
    <article ref={focusedRef} className={`grid gap-4 px-4 py-4 xl:grid-cols-[1fr_260px_260px] xl:items-start ${focused ? 'bg-[var(--panel-strong)]' : ''}`}>
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="font-semibold">{item.type.replaceAll('_', ' ')}</h4>
          {focused ? <span className="rounded-sm bg-[var(--accent)] px-2 py-0.5 text-xs font-medium text-white">Focused workflow item</span> : null}
          <span className="rounded-sm border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--muted)]">{item.status}</span>
          <span className="rounded-sm border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--muted)]">{item.nextAction.replaceAll('_', ' ')}</span>
        </div>
        <p className="mt-2 text-sm text-[var(--muted)]">{item.propertyName ?? 'No property'} {item.unitLabel ? `- ${item.unitLabel}` : ''}</p>
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-[var(--muted)]">
          <span>{item.findingsCount} findings</span>
          <span>{item.photosCount} photos</span>
          <span>{item.estimateCount} estimates</span>
          <span>Scheduled {new Date(item.scheduledDate).toLocaleDateString()}</span>
          {item.completedDate ? <span>Completed {new Date(item.completedDate).toLocaleDateString()}</span> : null}
        </div>
        {item.blockers.length > 0 ? <div className="mt-3 text-xs text-[var(--danger)]">{item.blockers.join(' ')}</div> : null}
      </div>

      <div className="text-sm">
        <div className="font-medium">Latest estimate</div>
        {estimate ? (
          <div className="mt-2 space-y-1 text-xs text-[var(--muted)]">
            <div>Status: {estimate.status}</div>
            <div>Total: {formatCurrency(estimate.totalProjectCost)}</div>
            <div>Labor: {formatCurrency(estimate.totalLaborCost)} · Materials: {formatCurrency(estimate.totalMaterialCost)}</div>
            <div>{estimate.lineItemCount} line items</div>
            {estimate.maintenanceRequestId ? <div>Repair request {estimate.maintenanceRequestId}</div> : null}
          </div>
        ) : (
          <div className="mt-2 text-xs text-[var(--muted)]">No estimate generated.</div>
        )}
        {estimate ? (
          <textarea value={reviewNote} onChange={(event) => onReviewNoteChange(event.target.value)} className="mt-3 min-h-16 w-full rounded-md border border-[var(--border)] bg-[var(--panel)] p-2 text-sm" aria-label="Inspection estimate review note" placeholder="Reject reason or repair note" />
        ) : null}
      </div>

      <div className="grid gap-2">
        <button disabled={pending || item.nextAction === 'blocked'} onClick={() => onAction('generate')} className="rounded-md border border-[var(--border)] px-3 py-2 text-sm font-medium disabled:opacity-50">
          Generate estimate
        </button>
        <button disabled={pending || !estimate || !['DRAFT', 'PENDING_REVIEW'].includes(estimate.status)} onClick={() => onAction('approve')} className="rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
          Approve estimate
        </button>
        <button disabled={pending || !estimate || estimate.status === 'APPROVED'} onClick={() => onAction('reject')} className="rounded-md border border-[var(--border)] px-3 py-2 text-sm font-medium disabled:opacity-50">
          Reject estimate
        </button>
        <button disabled={pending || !estimate || estimate.status !== 'APPROVED' || Boolean(estimate.maintenanceRequestId)} onClick={() => onAction('repair')} className="rounded-md border border-[var(--border)] px-3 py-2 text-sm font-medium disabled:opacity-50">
          Create repair request
        </button>
      </div>
    </article>
  );
}

function RenewalsView({
  data,
  loaded,
  token,
  onRefresh,
  workflowFocus,
  onClearWorkflowFocus,
}: {
  data: ReadOnlyOperatorData;
  loaded: boolean;
  token: string;
  onRefresh: () => Promise<void>;
  workflowFocus: OperatorWorkflowItem | null;
  onClearWorkflowFocus: () => void;
}) {
  const workbench = data.renewals;
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [rentByLease, setRentByLease] = useState<Record<string, string>>({});
  const [noteByLease, setNoteByLease] = useState<Record<string, string>>({});
  const [moveOutByLease, setMoveOutByLease] = useState<Record<string, string>>({});

  const [selectedPricingUnitId, setSelectedPricingUnitId] = useState<string | null>(null);
  const [pricingMatrix, setPricingMatrix] = useState<any>(null);
  const [loadingPricing, setLoadingPricing] = useState(false);

  async function loadPricing(unitId: string) {
    setSelectedPricingUnitId(unitId);
    setLoadingPricing(true);
    setPricingMatrix(null);
    try {
      const res = await fetch(`/api/backend/rent-recommendations/seasonal-pricing/${unitId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });
      if (res.ok) {
        const body = await res.json();
        setPricingMatrix(body.data || body);
      } else {
        setMessage('Failed to load seasonal pricing matrix.');
      }
    } catch (err) {
      setMessage('Error loading pricing matrix.');
    } finally {
      setLoadingPricing(false);
    }
  }

  async function run(item: OperatorRenewalItem, action: 'offer' | 'accept' | 'decline' | 'signature' | 'refresh' | 'moveout') {
    setPending(`${action}-${item.leaseId}`);
    setMessage(null);
    try {
      const note = noteByLease[item.leaseId] ?? '';
      if (action === 'offer') {
        const start = new Date(item.endDate);
        start.setDate(start.getDate() + 1);
        const end = new Date(start);
        end.setFullYear(end.getFullYear() + 1);
        await createOperatorRenewalOffer(item.leaseId, {
          proposedRent: rentByLease[item.leaseId] ? Number(rentByLease[item.leaseId]) : item.currentRent,
          proposedStart: start.toISOString(),
          proposedEnd: end.toISOString(),
          message: note.trim() || undefined,
        }, { token });
        setMessage('Renewal offer created.');
      }
      if ((action === 'accept' || action === 'decline') && item.latestOffer) {
        await recordOperatorRenewalResponse(item.leaseId, item.latestOffer.id, {
          decision: action === 'accept' ? 'ACCEPTED' : 'DECLINED',
          message: note.trim() || undefined,
        }, { token });
        setMessage(`Renewal ${action === 'accept' ? 'accepted' : 'declined'}.`);
      }
      if (action === 'signature') {
        await sendOperatorRenewalSignature(item.leaseId, {
          signerEmail: item.tenantEmail ?? undefined,
          signerName: item.tenantName,
          message: note.trim() || undefined,
        }, { token });
        setMessage('Renewal signature envelope sent.');
      }
      if (action === 'refresh' && item.latestEnvelope) {
        await refreshOperatorRenewalEnvelope(item.latestEnvelope.id, { token });
        setMessage('Renewal signature status refreshed.');
      }
      if (action === 'moveout') {
        const moveOutAt = moveOutByLease[item.leaseId] || item.endDate.slice(0, 10);
        await recordOperatorRenewalMoveOut(item.leaseId, {
          moveOutAt,
          message: note.trim() || undefined,
          deliveryMethod: 'PORTAL',
        }, { token });
        setMessage('Move-out notice recorded.');
      }
      await onRefresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Renewal action failed.');
    } finally {
      setPending(null);
    }
  }

  return (
    <section aria-labelledby="renewals-title">
      <WorkflowFocusBanner
        item={workflowFocus}
        matched={workflowFocus ? workbench?.leases.some((item) => workflowFocusMatchesEntity(workflowFocus, 'Lease', item.leaseId)) ?? false : undefined}
        onClear={onClearWorkflowFocus}
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <MetricTile label="Expiring" value={formatNumber(workbench?.metrics.expiringLeases)} detail="leases in window" icon={CalendarClock} />
        <MetricTile label="Need offer" value={formatNumber(workbench?.metrics.needsOffer)} detail="no active offer" icon={ClipboardList} />
        <MetricTile label="Pending" value={formatNumber(workbench?.metrics.offersPending)} detail="awaiting response" icon={Inbox} />
        <MetricTile label="Accepted" value={formatNumber(workbench?.metrics.offersAccepted)} detail="ready to sign" icon={ShieldCheck} />
        <MetricTile label="Signatures" value={formatNumber(workbench?.metrics.signaturesPending)} detail="pending envelopes" icon={PenLine} />
        <MetricTile label="Move-outs" value={formatNumber(workbench?.metrics.moveOutNotices)} detail="notice given" icon={KeyRound} />
      </div>

      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="renewals-title" className="text-lg font-semibold">Renewal offer to signed renewal or move-out</h2>
          <p className="text-sm text-[var(--muted)]">Create renewal offers, record tenant decisions, send signature packets, or capture move-out notices.</p>
        </div>
        <span className="text-sm text-[var(--muted)]">{loaded && workbench ? new Date(workbench.generatedAt).toLocaleString() : 'Waiting for data'}</span>
      </div>

      {message ? <div className="mb-3 rounded-md border border-[var(--border)] bg-[var(--panel)] p-3 text-sm text-[var(--muted)]">{message}</div> : null}

      {!workbench ? (
        <div className="rounded-md border border-[var(--border)] bg-[var(--panel)] p-5 text-sm text-[var(--muted)]">
          No renewals workbench returned by `/api/operator-renewals`.
        </div>
      ) : (
        <section className="rounded-md border border-[var(--border)] bg-[var(--panel)]">
          <div className="border-b border-[var(--border)] px-4 py-3">
            <h3 className="font-semibold">Renewal queue</h3>
          </div>
          {workbench.leases.length === 0 ? (
            <div className="px-4 py-4 text-sm text-[var(--muted)]">No expiring leases returned.</div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {workbench.leases.map((item) => (
                <RenewalRow
                  key={item.leaseId}
                  item={item}
                  focused={workflowFocusMatchesEntity(workflowFocus, 'Lease', item.leaseId)}
                  pending={pending?.endsWith(item.leaseId) ?? false}
                  rent={rentByLease[item.leaseId] ?? ''}
                  note={noteByLease[item.leaseId] ?? ''}
                  moveOutAt={moveOutByLease[item.leaseId] ?? ''}
                  onRentChange={(value) => setRentByLease((current) => ({ ...current, [item.leaseId]: value }))}
                  onNoteChange={(value) => setNoteByLease((current) => ({ ...current, [item.leaseId]: value }))}
                  onMoveOutChange={(value) => setMoveOutByLease((current) => ({ ...current, [item.leaseId]: value }))}
                  onAction={(action) => void run(item, action)}
                  onViewPricing={() => void loadPricing(item.unitId)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {selectedPricingUnitId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-4xl rounded-lg border border-[var(--border)] bg-[var(--panel)] p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="text-xl font-bold">Seasonal Pricing Matrix & Dynamic Optimization</h3>
              <button onClick={() => setSelectedPricingUnitId(null)} className="text-[var(--muted)] hover:text-[var(--foreground)] text-lg">✕</button>
            </div>

            {loadingPricing ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="animate-spin text-[var(--accent)]" size={32} />
              </div>
            ) : pricingMatrix ? (
              <div>
                <div className="mb-5 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-md border border-[var(--border)] p-3">
                    <span className="text-xs text-[var(--muted)]">Unit</span>
                    <div className="text-sm font-semibold">{pricingMatrix.unitName}</div>
                  </div>
                  <div className="rounded-md border border-[var(--border)] p-3">
                    <span className="text-xs text-[var(--muted)]">Base Rent</span>
                    <div className="text-sm font-semibold">{formatCurrency(pricingMatrix.baseRent)}</div>
                  </div>
                  <div className="rounded-md border border-[var(--border)] p-3">
                    <span className="text-xs text-[var(--muted)]">Generated At</span>
                    <div className="text-sm font-semibold">{new Date(pricingMatrix.generatedAt).toLocaleDateString()}</div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border)] text-xs uppercase text-[var(--muted)]">
                        <th className="py-2 px-3">Term (Months)</th>
                        <th className="py-2 px-3">Start Month</th>
                        <th className="py-2 px-3 text-right">Rent</th>
                        <th className="py-2 px-3 text-right">Adj %</th>
                        <th className="py-2 px-3">Recommendation</th>
                        <th className="py-2 px-3">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {pricingMatrix.options?.map((option: any, idx: number) => (
                        <tr key={idx} className={`hover:bg-[var(--panel-strong)] ${option.recommended ? 'bg-[var(--accent)]/5 font-medium' : ''}`}>
                          <td className="py-3 px-3">{option.termMonths}m</td>
                          <td className="py-3 px-3">{option.targetStartMonthLabel}</td>
                          <td className="py-3 px-3 text-right font-semibold">{formatCurrency(option.monthlyRent)}</td>
                          <td className="py-3 px-3 text-right text-xs">
                            <span className={option.seasonalAdjustmentPercent > 0 ? 'text-green-600 font-medium' : option.seasonalAdjustmentPercent < 0 ? 'text-red-600 font-medium' : ''}>
                              {option.seasonalAdjustmentPercent > 0 ? '+' : ''}{option.seasonalAdjustmentPercent}%
                            </span>
                          </td>
                          <td className="py-3 px-3 text-xs text-[var(--muted)] max-w-xs">{option.reason}</td>
                          <td className="py-3 px-3">
                            <button
                              onClick={() => {
                                setRentByLease(current => ({ ...current, [pricingMatrix.unitId]: String(option.monthlyRent) }));
                                if (workbench && workbench.leases) {
                                  const leaseItem = workbench.leases.find((l: any) => l.unitId === pricingMatrix.unitId);
                                  if (leaseItem) {
                                    setRentByLease(current => ({ ...current, [leaseItem.leaseId]: String(option.monthlyRent) }));
                                  }
                                }
                                setSelectedPricingUnitId(null);
                              }}
                              className="rounded bg-[var(--accent)] px-2.5 py-1 text-xs text-white hover:opacity-90 font-medium"
                            >
                              Apply Price
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-[var(--muted)]">Failed to load data.</div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function RenewalRow({
  item,
  focused,
  pending,
  rent,
  note,
  moveOutAt,
  onRentChange,
  onNoteChange,
  onMoveOutChange,
  onAction,
  onViewPricing,
}: {
  item: OperatorRenewalItem;
  focused: boolean;
  pending: boolean;
  rent: string;
  note: string;
  moveOutAt: string;
  onRentChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onMoveOutChange: (value: string) => void;
  onAction: (action: 'offer' | 'accept' | 'decline' | 'signature' | 'refresh' | 'moveout') => void;
  onViewPricing: () => void;
}) {
  const focusedRef = useFocusedRowScroll(focused);
  return (
    <article ref={focusedRef} className={`grid gap-4 px-4 py-4 xl:grid-cols-[1fr_280px_280px] xl:items-start ${focused ? 'bg-[var(--panel-strong)]' : ''}`}>
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="font-semibold">{item.tenantName}</h4>
          {focused ? <span className="rounded-sm bg-[var(--accent)] px-2 py-0.5 text-xs font-medium text-white">Focused workflow item</span> : null}
          <span className="rounded-sm border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--muted)]">{item.leaseStatus}</span>
          <span className="rounded-sm border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--muted)]">{item.nextAction.replaceAll('_', ' ')}</span>
        </div>
        <p className="mt-2 text-sm text-[var(--muted)]">{item.propertyName ?? 'No property'} {item.unitLabel ? `- ${item.unitLabel}` : ''}</p>
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-[var(--muted)]">
          <span>Rent {cents(item.currentRentCents) ?? formatCurrency(item.currentRent)}</span>
          <span>Ends {new Date(item.endDate).toLocaleDateString()}</span>
          {item.renewalDueAt ? <span>Due {new Date(item.renewalDueAt).toLocaleDateString()}</span> : null}
          {item.latestOffer ? <span>Offer {item.latestOffer.status} · {cents(item.latestOffer.proposedRentCents) ?? formatCurrency(item.latestOffer.proposedRent)}</span> : null}
          {item.latestEnvelope ? <span>Envelope {item.latestEnvelope.status}</span> : null}
          {item.latestNotice ? <span>Notice {item.latestNotice.type}</span> : null}
        </div>
        {item.blockers.length > 0 ? <div className="mt-3 text-xs text-[var(--danger)]">{item.blockers.join(' ')}</div> : null}
      </div>

      <div className="space-y-2">
        <div className="flex gap-2">
          <input value={rent} onChange={(event) => onRentChange(event.target.value)} className="h-10 flex-1 rounded-md border border-[var(--border)] bg-[var(--panel)] px-2 text-sm outline-none focus:border-[var(--accent)]" aria-label="Renewal rent amount" placeholder={`Rent ${item.currentRent}`} />
          <button onClick={onViewPricing} className="h-10 px-3 rounded-md border border-[var(--border)] bg-[var(--panel)] text-xs font-medium hover:bg-[var(--panel-strong)]" title="Optimize rent using ML metrics">Optimize</button>
        </div>
        <input type="date" value={moveOutAt} onChange={(event) => onMoveOutChange(event.target.value)} className="h-10 w-full rounded-md border border-[var(--border)] bg-[var(--panel)] px-2 text-sm outline-none focus:border-[var(--accent)]" aria-label="Move-out date" />
        <textarea value={note} onChange={(event) => onNoteChange(event.target.value)} className="min-h-20 w-full rounded-md border border-[var(--border)] bg-[var(--panel)] p-2 text-sm outline-none focus:border-[var(--accent)]" aria-label="Renewal note" placeholder="Offer message, response note, or move-out reason" />
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
        <button disabled={pending || item.nextAction === 'blocked'} onClick={() => onAction('offer')} className="rounded-md border border-[var(--border)] px-3 py-2 text-sm font-medium disabled:opacity-50">Create offer</button>
        <button disabled={pending || !item.latestOffer || item.latestOffer.status !== 'OFFERED'} onClick={() => onAction('accept')} className="rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white disabled:opacity-50">Record accept</button>
        <button disabled={pending || !item.latestOffer || item.latestOffer.status !== 'OFFERED'} onClick={() => onAction('decline')} className="rounded-md border border-[var(--border)] px-3 py-2 text-sm font-medium disabled:opacity-50">Record decline</button>
        <button disabled={pending || item.nextAction === 'blocked' || item.nextAction === 'create_offer'} onClick={() => onAction('signature')} className="rounded-md border border-[var(--border)] px-3 py-2 text-sm font-medium disabled:opacity-50">Send signature</button>
        <button disabled={pending || !item.latestEnvelope} onClick={() => onAction('refresh')} className="rounded-md border border-[var(--border)] px-3 py-2 text-sm font-medium disabled:opacity-50">Refresh signature</button>
        <button disabled={pending} onClick={() => onAction('moveout')} className="rounded-md border border-[var(--border)] px-3 py-2 text-sm font-medium disabled:opacity-50">Record move-out</button>
      </div>
    </article>
  );
}

function OwnerStatementsView({
  data,
  loaded,
  token,
  onRefresh,
  workflowFocus,
  onClearWorkflowFocus,
}: {
  data: ReadOnlyOperatorData;
  loaded: boolean;
  token: string;
  onRefresh: () => Promise<void>;
  workflowFocus: OperatorWorkflowItem | null;
  onClearWorkflowFocus: () => void;
}) {
  const workbench = data.ownerStatements;
  const [month, setMonth] = useState(workbench?.month ?? new Date().toISOString().slice(0, 7));
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [subView, setSubView] = useState<'statements' | 'bi'>('statements');
  const [analyticsData, setAnalyticsData] = useState<any | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  const loadAnalytics = useCallback(async () => {
    if (!token) return;
    setAnalyticsLoading(true);
    setAnalyticsError(null);
    try {
      const res = await fetch('/api/backend/reporting/owner-portfolio-analytics', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) {
        throw new Error(`Failed to load analytics: ${res.statusText}`);
      }
      const val = await res.json();
      setAnalyticsData(val);
    } catch (err: any) {
      setAnalyticsError(err.message || 'Error fetching analytics data');
    } finally {
      setAnalyticsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (subView === 'bi' && !analyticsData && !analyticsLoading) {
      void loadAnalytics();
    }
  }, [subView, analyticsData, analyticsLoading, loadAnalytics]);

  useEffect(() => {
    if (workbench?.month) setMonth(workbench.month);
  }, [workbench?.month]);

  async function generate() {
    setPending('generate');
    setMessage(null);
    try {
      await generateOperatorOwnerStatements(month, { token });
      setMessage('Owner statements generated from posted entries.');
      await onRefresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to generate owner statements.');
    } finally {
      setPending(null);
    }
  }

  async function act(statement: OperatorOwnerStatementItem, action: 'approve' | 'send') {
    setPending(`${action}-${statement.id}`);
    setMessage(null);
    try {
      if (action === 'approve') {
        await approveOperatorOwnerStatement(statement.id, { token });
        setMessage('Owner statement approved.');
      } else {
        await sendOperatorOwnerStatement(statement.id, { token });
        setMessage('Owner statement marked sent.');
      }
      await onRefresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : `Unable to ${action} owner statement.`);
    } finally {
      setPending(null);
    }
  }

  return (
    <section aria-labelledby="owner-statements-title">
      <WorkflowFocusBanner
        item={workflowFocus}
        matched={workflowFocus ? workbench?.statements.some((item) => workflowFocusMatchesEntity(workflowFocus, 'OwnerStatement', item.id)) ?? false : undefined}
        onClear={onClearWorkflowFocus}
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <MetricTile label="Statements" value={formatNumber(workbench?.metrics.statements)} detail={workbench?.month ?? month} icon={ClipboardList} />
        <MetricTile label="Draft" value={formatNumber(workbench?.metrics.draftStatements)} detail="needs review" icon={Inbox} />
        <MetricTile label="Approved" value={formatNumber(workbench?.metrics.approvedStatements)} detail="ready to send" icon={ShieldCheck} />
        <MetricTile label="Sent" value={formatNumber(workbench?.metrics.sentStatements)} detail="delivered" icon={ArrowUpRight} />
        <MetricTile label="Distribution" value={cents(workbench?.metrics.netDistributionCents) ?? '$0'} detail="net owner amount" icon={Banknote} />
        <MetricTile label="Close locks" value={`${formatNumber(workbench?.metrics.closeLockedProperties)}/${formatNumber((workbench?.metrics.closeLockedProperties ?? 0) + (workbench?.metrics.closeUnlockedProperties ?? 0))}`} detail="locked properties" icon={KeyRound} />
      </div>

      <div className="mb-4 flex border-b border-[var(--border)]">
        <button
          onClick={() => setSubView('statements')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
            subView === 'statements'
              ? 'border-[var(--accent)] text-[var(--foreground)]'
              : 'border-transparent text-[var(--muted)] hover:text-[var(--foreground)]'
          }`}
        >
          Statement Queue
        </button>
        <button
          onClick={() => setSubView('bi')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            subView === 'bi'
              ? 'border-[var(--accent)] text-[var(--foreground)]'
              : 'border-transparent text-[var(--muted)] hover:text-[var(--foreground)]'
          }`}
        >
          <span className="flex h-1.5 w-1.5 rounded-full bg-[var(--accent)]"></span>
          BI Portfolio Analytics
        </button>
      </div>

      {subView === 'statements' && (
        <>
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="owner-statements-title" className="text-lg font-semibold">Owner statement review</h2>
              <p className="text-sm text-[var(--muted)]">Generate statements from posted accounting entries, review monthly-close blockers, approve, and send to owners.</p>
            </div>
            <div className="flex gap-2">
              <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="h-10 rounded-md border border-[var(--border)] bg-[var(--panel)] px-2 text-sm" aria-label="Statement month" />
              <button disabled={pending === 'generate' || !month} onClick={() => void generate()} className="rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
                Generate
              </button>
            </div>
          </div>

          {message ? <div className="mb-3 rounded-md border border-[var(--border)] bg-[var(--panel)] p-3 text-sm text-[var(--muted)]">{message}</div> : null}

          {!workbench ? (
            <div className="rounded-md border border-[var(--border)] bg-[var(--panel)] p-5 text-sm text-[var(--muted)]">
              No owner statements workbench returned by `/api/operator-owner-statements`.
            </div>
          ) : (
            <section className="rounded-md border border-[var(--border)] bg-[var(--panel)]">
              <div className="border-b border-[var(--border)] px-4 py-3">
                <h3 className="font-semibold">Statement queue</h3>
              </div>
              {workbench.statements.length === 0 ? (
                <div className="px-4 py-4 text-sm text-[var(--muted)]">No owner statements returned for {workbench.month}.</div>
              ) : (
                <div className="divide-y divide-[var(--border)]">
                  {workbench.statements.map((statement) => (
                    <OwnerStatementRow
                      key={statement.id}
                      statement={statement}
                      focused={workflowFocusMatchesEntity(workflowFocus, 'OwnerStatement', statement.id)}
                      pending={pending?.endsWith(statement.id) ?? false}
                      onApprove={() => void act(statement, 'approve')}
                      onSend={() => void act(statement, 'send')}
                    />
                  ))}
                </div>
              )}
            </section>
          )}
        </>
      )}

      {subView === 'bi' && (
        <div className="space-y-6">
          {analyticsLoading && (
            <div className="flex items-center justify-center py-12 bg-[var(--panel)] rounded-md border border-[var(--border)]">
              <Loader2 className="animate-spin text-[var(--accent)]" size={32} />
              <span className="ml-3 text-sm text-[var(--muted)]">Calculating metrics and generating AI narrative...</span>
            </div>
          )}

          {analyticsError && (
            <div className="rounded-md border border-[var(--danger)] bg-[var(--panel)] p-4 text-sm text-[var(--danger)]">
              {analyticsError}
              <button onClick={() => void loadAnalytics()} className="ml-4 underline font-medium text-xs">Try again</button>
            </div>
          )}

          {!analyticsLoading && !analyticsError && analyticsData && (
            <>
              {/* Custom metric tiles for BI Dashboard */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-md border border-[var(--border)] bg-[var(--panel)] p-5 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[var(--muted)]">Capitalization Rate (Cap Rate)</span>
                    <span className="text-[var(--accent-strong)] text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--panel-strong)]">Annualized</span>
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-4xl font-bold tracking-tight text-[var(--foreground)]">{analyticsData.capRate}%</span>
                  </div>
                  <p className="mt-2 text-xs text-[var(--muted)]">Annualized NOI / Estimated Market Value (${formatNumber(analyticsData.portfolioValuation)})</p>
                </div>

                <div className="rounded-md border border-[var(--border)] bg-[var(--panel)] p-5 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[var(--muted)]">Cash-on-Cash Yield</span>
                    <span className="text-[var(--accent-strong)] text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--panel-strong)] font-mono">CoC</span>
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-4xl font-bold tracking-tight text-[var(--foreground)]">{analyticsData.cashOnCash}%</span>
                  </div>
                  <p className="mt-2 text-xs text-[var(--muted)]">Annualized Net Income / Est. Cash Invested (${formatNumber(analyticsData.cashInvested)})</p>
                </div>

                <div className="rounded-md border border-[var(--border)] bg-[var(--panel)] p-5 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[var(--muted)]">5-Year IRR Projection</span>
                    <span className="text-emerald-600 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30">Target</span>
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-4xl font-bold tracking-tight text-[var(--foreground)]">{analyticsData.irr}%</span>
                  </div>
                  <p className="mt-2 text-xs text-[var(--muted)]">Simulated Internal Rate of Return over a 5-year hold period</p>
                </div>
              </div>

              {/* AI Narrative Explainer Card */}
              <div className="rounded-md border border-[var(--border)] bg-[var(--panel)] p-5 bg-gradient-to-r from-[var(--panel)] via-[var(--panel)] to-[var(--panel-strong)]">
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent)] text-white">
                    <span className="text-xs font-bold font-mono">AI</span>
                  </div>
                  <h4 className="font-semibold text-sm">Portfolio Performance Insights (AI Copilot)</h4>
                </div>
                <p className="text-sm leading-relaxed text-[var(--foreground)] italic">
                  &ldquo;{analyticsData.aiSummary}&rdquo;
                </p>
                <div className="mt-3 text-[10px] text-[var(--muted)] flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                  Real-time variance engine active · dynamic monthly ledger scan
                </div>
              </div>

              {/* Historical Cash Flow Table & Asset Context */}
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-md border border-[var(--border)] bg-[var(--panel)]">
                  <div className="border-b border-[var(--border)] px-4 py-3 flex items-center justify-between">
                    <h3 className="font-semibold text-sm">Cash Flow Comparison</h3>
                    <span className="text-xs text-[var(--muted)]">Month-over-Month</span>
                  </div>
                  <div className="p-4">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-[var(--border)] text-[var(--muted)] text-xs">
                          <th className="py-2 font-medium">Metric</th>
                          <th className="py-2 text-right font-medium">Last Month</th>
                          <th className="py-2 text-right font-medium">Current Month</th>
                          <th className="py-2 text-right font-medium">Change</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border)] text-xs sm:text-sm">
                        <tr>
                          <td className="py-3 font-medium">Gross Rent Income</td>
                          <td className="py-3 text-right">{cents(analyticsData.cashFlows[1]?.incomeCents) ?? formatCurrency(analyticsData.cashFlows[1]?.income)}</td>
                          <td className="py-3 text-right font-semibold">{cents(analyticsData.cashFlows[0]?.incomeCents) ?? formatCurrency(analyticsData.cashFlows[0]?.income)}</td>
                          <td className={`py-3 text-right font-medium ${analyticsData.cashFlows[0]?.income >= analyticsData.cashFlows[1]?.income ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {analyticsData.cashFlows[1]?.income > 0 
                              ? `${(((analyticsData.cashFlows[0]?.income - analyticsData.cashFlows[1]?.income) / analyticsData.cashFlows[1]?.income) * 100).toFixed(1)}%`
                              : 'N/A'
                            }
                          </td>
                        </tr>
                        <tr>
                          <td className="py-3 font-medium">Operating Expenses</td>
                          <td className="py-3 text-right">{cents(analyticsData.cashFlows[1]?.expensesCents) ?? formatCurrency(analyticsData.cashFlows[1]?.expenses)}</td>
                          <td className="py-3 text-right font-semibold">{cents(analyticsData.cashFlows[0]?.expensesCents) ?? formatCurrency(analyticsData.cashFlows[0]?.expenses)}</td>
                          <td className={`py-3 text-right font-medium ${analyticsData.cashFlows[0]?.expenses <= analyticsData.cashFlows[1]?.expenses ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {analyticsData.cashFlows[1]?.expenses > 0 
                              ? `${(((analyticsData.cashFlows[0]?.expenses - analyticsData.cashFlows[1]?.expenses) / analyticsData.cashFlows[1]?.expenses) * 100).toFixed(1)}%`
                              : 'N/A'
                            }
                          </td>
                        </tr>
                        <tr className="bg-[var(--panel-strong)]/30">
                          <td className="py-3 font-bold">Net Operating Income (NOI)</td>
                          <td className="py-3 text-right font-medium">{cents(analyticsData.cashFlows[1]?.netCents) ?? formatCurrency(analyticsData.cashFlows[1]?.net)}</td>
                          <td className="py-3 text-right font-bold text-[var(--accent-strong)]">{cents(analyticsData.cashFlows[0]?.netCents) ?? formatCurrency(analyticsData.cashFlows[0]?.net)}</td>
                          <td className={`py-3 text-right font-bold ${analyticsData.cashFlows[0]?.net >= analyticsData.cashFlows[1]?.net ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {analyticsData.cashFlows[1]?.net !== 0 
                              ? `${(((analyticsData.cashFlows[0]?.net - analyticsData.cashFlows[1]?.net) / Math.abs(analyticsData.cashFlows[1]?.net)) * 100).toFixed(1)}%`
                              : 'N/A'
                            }
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-md border border-[var(--border)] bg-[var(--panel)] p-5 flex flex-col justify-between">
                  <div>
                    <h3 className="font-semibold text-sm mb-3">Portfolio Asset Valuation & Baseline Details</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between border-b border-[var(--border)] pb-2">
                        <span className="text-[var(--muted)]">Active Portfolio Properties</span>
                        <span className="font-semibold">{analyticsData.propertiesCount} properties</span>
                      </div>
                      <div className="flex justify-between border-b border-[var(--border)] pb-2">
                        <span className="text-[var(--muted)]">Total Managed Units</span>
                        <span className="font-semibold">{analyticsData.unitsCount} units</span>
                      </div>
                      <div className="flex justify-between border-b border-[var(--border)] pb-2">
                        <span className="text-[var(--muted)]">Estimated Market Valuation</span>
                        <span className="font-semibold">{formatCurrency(analyticsData.portfolioValuation)}</span>
                      </div>
                      <div className="flex justify-between pb-1">
                        <span className="text-[var(--muted)]">Estimated Owner Equity Invested</span>
                        <span className="font-semibold">{formatCurrency(analyticsData.cashInvested)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 p-3 rounded bg-[var(--panel-strong)]/50 text-xs text-[var(--muted)]">
                    Values are estimated based on active units ($250k market value, $50k invested equity per unit baseline) for current hold simulation formulas.
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}

function OwnerStatementRow({
  statement,
  focused,
  pending,
  onApprove,
  onSend,
}: {
  statement: OperatorOwnerStatementItem;
  focused: boolean;
  pending: boolean;
  onApprove: () => void;
  onSend: () => void;
}) {
  const focusedRef = useFocusedRowScroll(focused);
  return (
    <article ref={focusedRef} className={`grid gap-4 px-4 py-4 xl:grid-cols-[1fr_280px_220px] xl:items-start ${focused ? 'bg-[var(--panel-strong)]' : ''}`}>
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="font-semibold">{statement.ownerName}</h4>
          {focused ? <span className="rounded-sm bg-[var(--accent)] px-2 py-0.5 text-xs font-medium text-white">Focused workflow item</span> : null}
          <span className="rounded-sm border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--muted)]">{statement.status}</span>
          <span className="rounded-sm border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--muted)]">{statement.nextAction}</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-[var(--muted)]">
          <span>{statement.month}</span>
          <span>Gross {cents(statement.grossIncomeCents)}</span>
          <span>Expenses {cents(statement.totalExpensesCents)}</span>
          <span>Mgmt fee {cents(statement.managementFeeCents)}</span>
        </div>
        {statement.blockers.length > 0 ? <div className="mt-3 text-xs text-[var(--danger)]">{statement.blockers.join(' ')}</div> : null}
      </div>

      <div className="text-sm">
        <div className="font-medium">Net distribution</div>
        <div className="mt-1 text-xl font-semibold">{cents(statement.netDistributionCents)}</div>
        <div className="mt-2 text-xs text-[var(--muted)]">
          {statement.approvedAt ? `Approved ${new Date(statement.approvedAt).toLocaleString()}` : 'Not approved'}
          <br />
          {statement.sentAt ? `Sent ${new Date(statement.sentAt).toLocaleString()}` : 'Not sent'}
        </div>
      </div>

      <div className="grid gap-2">
        <button disabled={pending || statement.nextAction === 'blocked' || statement.status !== 'DRAFT'} onClick={onApprove} className="rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
          Approve
        </button>
        <button disabled={pending || statement.status !== 'APPROVED'} onClick={onSend} className="rounded-md border border-[var(--border)] px-3 py-2 text-sm font-medium disabled:opacity-50">
          Send
        </button>
      </div>
    </article>
  );
}

function WorkflowsView({
  data,
  loaded,
  selectedWorkflowId,
  onSelectWorkflow,
  onOpenWorkflow,
}: {
  data: ReadOnlyOperatorData;
  loaded: boolean;
  selectedWorkflowId: string | null;
  onSelectWorkflow: (item: OperatorWorkflowItem) => void;
  onOpenWorkflow: (item: OperatorWorkflowItem) => void;
}) {
  const groups = useMemo(() => data.workflows?.groups ?? [], [data.workflows?.groups]);
  const totalItems = data.workflows?.totals.items ?? 0;
  const paymentWorkbench = data.paymentWorkbench;
  const allItems = useMemo(() => groups.flatMap((group) => group.items), [groups]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const selectedItem = allItems.find((item) => item.id === selectedItemId) ?? allItems[0] ?? null;
  const relatedDecision = selectedItem
    ? (data.commandCenter?.decisions ?? []).find((decision) => workflowItemMatchesDecision(selectedItem, decision)) ?? null
    : null;
  const relatedAiCapabilities = selectedItem
    ? (data.aiCapabilities?.capabilities ?? []).filter((capability) => capability.workflowIds.includes(selectedItem.workflowId))
    : [];

  useEffect(() => {
    if (selectedWorkflowId && allItems.some((item) => item.id === selectedWorkflowId)) {
      setSelectedItemId(selectedWorkflowId);
      return;
    }
    if (!selectedItemId && allItems[0]) {
      setSelectedItemId(allItems[0].id);
    }
  }, [allItems, selectedItemId, selectedWorkflowId]);

  return (
    <div>
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile label="Workflow groups" value={formatNumber(data.workflows?.totals.workflows ?? groups.length)} detail="Phase 3 operational areas" icon={Layers3} />
        <MetricTile label="Open items" value={formatNumber(totalItems)} detail="work ready or blocked" icon={ClipboardList} />
        <MetricTile label="High priority" value={formatNumber(data.workflows?.totals.highPriority)} detail="needs same-day review" icon={AlertTriangle} />
        <MetricTile label="Blocked" value={formatNumber(data.workflows?.totals.blocked)} detail="requires resolution before progress" icon={ShieldCheck} />
      </div>

      <section aria-labelledby="workflow-title">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="workflow-title" className="text-lg font-semibold">Core operational workflows</h2>
          <span className="text-sm text-[var(--muted)]">{loaded ? `${totalItems} items` : 'Waiting for data'}</span>
        </div>

        {groups.length === 0 && (
          <div className="rounded-md border border-[var(--border)] bg-[var(--panel)] p-5 text-sm text-[var(--muted)]">
            No workflow read model returned by `/api/operator-workflows`.
          </div>
        )}

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="space-y-5">
            {groups.map((group) => (
              <section key={group.workflowId} className="rounded-md border border-[var(--border)] bg-[var(--panel)]">
                <div className="flex flex-col gap-1 border-b border-[var(--border)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-semibold">{group.label}</h3>
                    <p className="text-xs text-[var(--muted)]">{group.workflowId}</p>
                  </div>
                  <span className="text-sm text-[var(--muted)]">{group.count} open</span>
                </div>

                {group.items.length === 0 ? (
                  <div className="px-4 py-4 text-sm text-[var(--muted)]">No active items in this workflow.</div>
                ) : (
                  <div className="divide-y divide-[var(--border)]">
                    {group.items.map((item) => (
                      <WorkflowRow
                        key={item.id}
                        item={item}
                        selected={selectedItem?.id === item.id}
                        onSelect={() => {
                          setSelectedItemId(item.id);
                          onSelectWorkflow(item);
                        }}
                      />
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>

          <WorkflowInspector
            item={selectedItem}
            decision={relatedDecision}
            capabilities={relatedAiCapabilities}
            manifestMode={data.aiCapabilities?.mode}
            onOpenWorkflow={onOpenWorkflow}
          />
        </div>
      </section>

      <section className="mt-8" aria-labelledby="payment-workbench-title">
        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="payment-workbench-title" className="text-lg font-semibold">Payment and reconciliation workbench</h2>
            <p className="text-sm text-[var(--muted)]">Read-only Phase 3 payment workflow: ledger balances, delinquency, exceptions, and accounting gates.</p>
          </div>
          <span className="text-sm text-[var(--muted)]">{paymentWorkbench ? new Date(paymentWorkbench.generatedAt).toLocaleString() : 'Waiting for data'}</span>
        </div>

        {!paymentWorkbench ? (
          <div className="rounded-md border border-[var(--border)] bg-[var(--panel)] p-5 text-sm text-[var(--muted)]">
            No payment workbench returned by `/api/operator-payments`.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <MetricTile label="Ledger balance" value={cents(paymentWorkbench.metrics.totalBalanceCents) ?? '$0'} detail={`${formatNumber(paymentWorkbench.metrics.ledgerAccounts)} accounts`} icon={Banknote} />
              <MetricTile label="Delinquent" value={cents(paymentWorkbench.metrics.delinquentAmountCents) ?? '$0'} detail={`${formatNumber(paymentWorkbench.metrics.delinquentLeases)} leases`} icon={AlertTriangle} />
              <MetricTile label="Exceptions" value={formatNumber(paymentWorkbench.metrics.paymentExceptions)} detail="bookkeeping exceptions" icon={ClipboardList} />
              <MetricTile label="Unreconciled" value={formatNumber(paymentWorkbench.metrics.unreconciledItems)} detail="bank/recon items" icon={RefreshCcw} />
              <MetricTile label="Payment gates" value={paymentWorkbench.metrics.paymentExpansionBlocked ? 'Blocked' : 'Ready'} detail="write expansion status" icon={ShieldCheck} />
            </div>

            <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
              <section className="rounded-md border border-[var(--border)] bg-[var(--panel)]">
                <div className="border-b border-[var(--border)] px-4 py-3">
                  <h3 className="font-semibold">Tenant ledger accounts</h3>
                </div>
                {paymentWorkbench.ledgerAccounts.length === 0 ? (
                  <div className="px-4 py-4 text-sm text-[var(--muted)]">No lease ledger accounts returned.</div>
                ) : (
                  <div className="divide-y divide-[var(--border)]">
                    {paymentWorkbench.ledgerAccounts.map((account) => (
                      <article key={account.leaseId} className="grid gap-3 px-4 py-4 md:grid-cols-[1fr_150px_180px] md:items-center">
                        <div>
                          <div className="font-medium">{account.tenantName}</div>
                          <div className="mt-1 text-xs text-[var(--muted)]">{account.propertyName ?? 'No property'} {account.unitName ? `- ${account.unitName}` : ''}</div>
                        </div>
                        <div className="text-sm font-medium">{cents(account.currentBalanceCents)}</div>
                        <div className="break-all text-xs text-[var(--muted)]">{account.canonicalRoute}</div>
                      </article>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-md border border-[var(--border)] bg-[var(--panel)]">
                <div className="border-b border-[var(--border)] px-4 py-3">
                  <h3 className="font-semibold">Payment exceptions</h3>
                </div>
                {paymentWorkbench.exceptions.length === 0 ? (
                  <div className="px-4 py-4 text-sm text-[var(--muted)]">No payment exceptions returned.</div>
                ) : (
                  <div className="divide-y divide-[var(--border)]">
                    {paymentWorkbench.exceptions.map((item) => (
                      <article key={item.id} className="px-4 py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-medium">{item.description}</div>
                            <div className="mt-1 text-xs text-[var(--muted)]">{item.reason ?? item.status}</div>
                          </div>
                          <div className="text-sm font-medium">{cents(item.amountCents)}</div>
                        </div>
                        <div className="mt-2 break-all text-xs text-[var(--muted)]">{item.canonicalRoute}</div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function workflowItemMatchesDecision(item: OperatorWorkflowItem, decision: CommandCenterDecision) {
  return [
    item.entityId && decision.entity.id === item.entityId,
    item.propertyId && decision.propertyId === item.propertyId,
    item.unitId && decision.unitId === item.unitId,
    item.tenantId && decision.tenantId === item.tenantId,
  ].some(Boolean);
}

function workflowTargetView(workflowId: string): ActiveView | null {
  if (workflowId.startsWith('WF-APP')) return 'applications';
  if (workflowId.startsWith('WF-LEASE')) return 'signing';
  if (workflowId.startsWith('WF-MNT')) return 'maintenance';
  if (workflowId.startsWith('WF-INSP')) return 'inspections';
  if (workflowId.startsWith('WF-RENEW')) return 'renewals';
  if (workflowId.startsWith('WF-OWNER')) return 'owners';
  if (workflowId.startsWith('WF-PAY')) return 'workflows';
  return null;
}

function workflowTargetLabel(view: ActiveView | null) {
  return navItems.find((item) => item.id === view)?.label ?? 'Workspace';
}

function WorkflowFocusBanner({ item, matched, onClear }: { item: OperatorWorkflowItem | null; matched?: boolean; onClear: () => void }) {
  if (!item) return null;

  return (
    <div className="mb-5 flex flex-col gap-3 rounded-md border border-[var(--border)] bg-[var(--panel)] p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Opened from workflow</div>
        <div className="mt-1 font-medium">{item.title}</div>
        <div className="mt-1 text-sm text-[var(--muted)]">{item.workflowId} · {item.entityType} {item.entityId}</div>
        <div className="mt-2 text-sm text-[var(--muted)]">{item.nextAction}</div>
        <div className="mt-1 break-all text-xs text-[var(--muted)]">{item.canonicalRoute}</div>
        {matched === false ? <div className="mt-2 text-xs text-[var(--danger)]">The focused entity is not currently visible in this workspace queue.</div> : null}
      </div>
      <button onClick={onClear} className="rounded-md border border-[var(--border)] px-3 py-2 text-sm font-medium">
        Clear focus
      </button>
    </div>
  );
}

function workflowFocusMatchesEntity(item: OperatorWorkflowItem | null, entityType: string, entityId: string | number) {
  return Boolean(item && item.entityType === entityType && item.entityId === String(entityId));
}

function useFocusedRowScroll(focused: boolean) {
  const ref = useCallback((node: HTMLElement | null) => {
    if (!node || !focused) return;
    window.setTimeout(() => {
      node.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);
  }, [focused]);

  return ref;
}

function WorkflowRow({ item, selected, onSelect }: { item: OperatorWorkflowItem; selected: boolean; onSelect: () => void }) {
  const amount = cents(item.amountCents);

  return (
    <article className={`grid gap-3 px-4 py-4 lg:grid-cols-[1fr_150px_150px_180px] lg:items-center ${selected ? 'bg-[var(--panel-strong)]' : ''}`}>
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="font-medium">{item.title}</h4>
          <span className="rounded-sm border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--muted)]">{item.status.toLowerCase().replace(/_/g, ' ')}</span>
          <span className="rounded-sm bg-[var(--panel-strong)] px-2 py-0.5 text-xs">{item.priority.toLowerCase()}</span>
        </div>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">{item.summary}</p>
        <p className="mt-1 text-xs text-[var(--muted)]">{item.nextAction}</p>
      </div>
      <div className="text-sm">
        <span className="lg:hidden text-[var(--muted)]">Entity: </span>
        {item.entityType}
      </div>
      <div className="text-sm">
        <span className="lg:hidden text-[var(--muted)]">Amount: </span>
        {amount ?? (item.dueAt ? new Date(item.dueAt).toLocaleDateString() : 'No date')}
      </div>
      <div className="flex justify-start lg:justify-end">
        <button onClick={onSelect} className="inline-flex items-center gap-2 rounded-md border border-[var(--border)] px-3 py-2 text-sm font-medium">
          Inspect
          <ArrowUpRight size={15} aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}

function WorkflowInspector({
  item,
  decision,
  capabilities,
  manifestMode,
  onOpenWorkflow,
}: {
  item: OperatorWorkflowItem | null;
  decision: CommandCenterDecision | null;
  capabilities: NonNullable<ReadOnlyOperatorData['aiCapabilities']>['capabilities'];
  manifestMode?: string;
  onOpenWorkflow: (item: OperatorWorkflowItem) => void;
}) {
  if (!item) {
    return (
      <aside className="rounded-md border border-[var(--border)] bg-[var(--panel)] p-4 text-sm text-[var(--muted)]">
        Select a workflow item to inspect decision linkage, AI guardrails, and the canonical backend route.
      </aside>
    );
  }

  const targetView = workflowTargetView(item.workflowId);
  const targetLabel = workflowTargetLabel(targetView);

  return (
    <aside className="h-fit rounded-md border border-[var(--border)] bg-[var(--panel)]">
      <div className="border-b border-[var(--border)] px-4 py-3">
        <h3 className="font-semibold">Workflow inspector</h3>
        <p className="mt-1 text-xs text-[var(--muted)]">{item.workflowId}</p>
      </div>

      <div className="space-y-4 p-4">
        <div>
          <div className="text-sm font-medium">{item.title}</div>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{item.nextAction}</p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-md border border-[var(--border)] p-3">
            <div className="text-xs text-[var(--muted)]">Status</div>
            <div className="mt-1 font-medium">{item.status.replace(/_/g, ' ')}</div>
          </div>
          <div className="rounded-md border border-[var(--border)] p-3">
            <div className="text-xs text-[var(--muted)]">Priority</div>
            <div className="mt-1 font-medium">{item.priority.toLowerCase()}</div>
          </div>
        </div>

        <div className="rounded-md border border-[var(--border)] p-3">
          <div className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Canonical route</div>
          <div className="mt-2 break-all text-sm">{item.canonicalRoute}</div>
        </div>

        <button
          disabled={!targetView || targetView === 'workflows'}
          onClick={() => targetView && targetView !== 'workflows' && onOpenWorkflow(item)}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Open {targetLabel}
          <ArrowUpRight size={15} aria-hidden="true" />
        </button>
        {targetView === 'workflows' && (
          <div className="text-xs leading-5 text-[var(--muted)]">
            Payment and accounting workflow actions are handled in the workbench below this queue.
          </div>
        )}

        <div className="rounded-md border border-[var(--border)] p-3">
          <div className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Command decision</div>
          {decision ? (
            <div className="mt-2">
              <div className="text-sm font-medium">{decision.title}</div>
              <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{decision.recommendedAction}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <span className="rounded-sm bg-[var(--panel-strong)] px-2 py-1">{decision.priority.toLowerCase()}</span>
                <span className="rounded-sm bg-[var(--panel-strong)] px-2 py-1">{decision.type}</span>
                {decision.approvalTaskId && <span className="rounded-sm bg-[var(--panel-strong)] px-2 py-1">approval linked</span>}
              </div>
            </div>
          ) : (
            <div className="mt-2 text-sm text-[var(--muted)]">No command-center decision currently matches this workflow item.</div>
          )}
        </div>

        <div className="rounded-md border border-[var(--border)] p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">AI workflow coverage</div>
            <span className="rounded-sm bg-[var(--panel-strong)] px-2 py-1 text-xs">{manifestMode ?? 'unknown'}</span>
          </div>
          <div className="mt-3 space-y-3">
            {capabilities.map((capability) => (
              <div key={capability.id} className="text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{capability.task}</span>
                  <span className="rounded-sm border border-[var(--border)] px-2 py-0.5 text-xs">{capability.riskLevel.toLowerCase()}</span>
                </div>
                <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{capability.primaryGuardrails[0] ?? capability.description}</p>
              </div>
            ))}
            {capabilities.length === 0 && (
              <div className="text-sm text-[var(--muted)]">No AI capability is mapped to this workflow yet.</div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}

function MetricTile({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon: typeof Building2 }) {
  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--panel)] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-[var(--muted)]">{label}</div>
        <Icon size={18} className="text-[var(--accent-strong)]" aria-hidden="true" />
      </div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-xs text-[var(--muted)]">{detail}</div>
    </div>
  );
}

function CommandCenterView({
  data,
  totals,
  loaded,
  token,
  onRefresh,
}: {
  data: ReadOnlyOperatorData;
  totals: { properties: number; units: number; occupied: number; vacant: number; occupancy: number };
  loaded: boolean;
  token: string;
  onRefresh: () => Promise<void>;
}) {
  const [selectedDecisionId, setSelectedDecisionId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CommandCenterDecisionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionNote, setActionNote] = useState('');
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState(false);
  const [filters, setFilters] = useState({ type: 'ALL', priority: 'ALL', status: 'ALL', due: 'ALL', propertyId: '' });
  const briefingDecisionItems: FeedItem[] = data.briefing?.signals.slice(0, 6).map((signal) => ({
    id: signal.id,
    kind: 'critical_signal',
    domain: signal.domain ?? 'operations',
    title: signal.title,
    summary: signal.summary ?? '',
    priority: signal.severity === 'critical' ? 95 : signal.severity === 'high' ? 75 : 50,
    timestamp: signal.createdAt,
    actions: [{ id: `${signal.id}-review`, label: signal.actionLabel ?? 'Review', type: 'navigation' }],
    metadata: { impact: { financial: signal.monetaryImpact, risk: signal.severity } },
  })) ?? [];
  const decisionItems = data.feed.length > 0 ? data.feed : briefingDecisionItems;
  const rawCommandDecisions = data.commandCenter?.decisions ?? [];
  const aiCapabilities = data.aiCapabilities?.capabilities ?? [];
  const highRiskAiCapabilities = aiCapabilities.filter((capability) => capability.riskLevel === 'HIGH').length;
  const decisionRecordCapabilities = aiCapabilities.filter((capability) => capability.persistsDecisionRecord).length;
  const approvalGatedCapabilities = aiCapabilities.filter((capability) => capability.requiresApprovalForExternalAction).length;
  const commandDecisions = rawCommandDecisions.filter((decision) => {
    if (filters.type !== 'ALL' && decision.type !== filters.type) return false;
    if (filters.priority !== 'ALL' && decision.priority !== filters.priority) return false;
    if (filters.status === 'approval-linked' && !decision.approvalTaskId) return false;
    if (filters.status === 'unlinked' && decision.approvalTaskId) return false;
    if (filters.propertyId.trim() && decision.propertyId !== filters.propertyId.trim()) return false;
    if (filters.due === 'overdue' && (!decision.dueAt || new Date(decision.dueAt) >= new Date())) return false;
    if (filters.due === 'upcoming' && (!decision.dueAt || new Date(decision.dueAt) < new Date())) return false;
    return true;
  });
  const openDecisionCount = data.commandCenter?.metrics.totalDecisions ?? data.briefing?.metrics?.pendingDecisions ?? decisionItems.length;
  const atRiskAmount = data.briefing?.metrics?.atRiskAmount ?? data.metrics?.financials?.outstanding;

  async function selectDecision(decisionId: string) {
    setSelectedDecisionId(decisionId);
    setDetail(null);
    setActionMessage(null);
    setDetailLoading(true);
    try {
      setDetail(await loadCommandCenterDecisionDetail(decisionId, { token }));
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'Unable to load decision detail.');
    } finally {
      setDetailLoading(false);
    }
  }

  async function executeAction(actionId: string) {
    if (!selectedDecisionId) return;
    setActionPending(true);
    setActionMessage(null);
    try {
      await executeCommandCenterAction(selectedDecisionId, actionId, actionNote, { token });
      setActionMessage('Approval task created for this command-center action.');
      setActionNote('');
      await onRefresh();
      setDetail(await loadCommandCenterDecisionDetail(selectedDecisionId, { token }));
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'Unable to execute command-center action.');
    } finally {
      setActionPending(false);
    }
  }

  async function deferSelectedDecision() {
    if (!selectedDecisionId) return;
    setActionPending(true);
    setActionMessage(null);
    try {
      await deferCommandCenterDecision(selectedDecisionId, actionNote, { token });
      setActionMessage('Decision deferred and recorded.');
      setActionNote('');
      await onRefresh();
      setDetail(await loadCommandCenterDecisionDetail(selectedDecisionId, { token }));
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'Unable to defer decision.');
    } finally {
      setActionPending(false);
    }
  }

  return (
    <div>
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile label="Occupancy" value={`${totals.occupancy}%`} detail={`${formatNumber(totals.occupied)} occupied / ${formatNumber(totals.units)} units`} icon={Building2} />
        <MetricTile label="Open decisions" value={formatNumber(openDecisionCount)} detail="canonical command-center queue" icon={ClipboardList} />
        <MetricTile label="At-risk amount" value={formatCurrency(atRiskAmount)} detail="requires review before action" icon={Banknote} />
        <MetricTile label="Maintenance load" value={formatNumber(data.metrics?.maintenance?.open ?? data.metrics?.maintenance?.total)} detail="read-only operational count" icon={Wrench} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <section className="space-y-3" aria-labelledby="decision-queue-title">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 id="decision-queue-title" className="text-lg font-semibold">Decision queue</h2>
              <span className="text-sm text-[var(--muted)]">{loaded ? `${commandDecisions.length || decisionItems.length} loaded` : 'Waiting for data'}</span>
            </div>
            <div className="grid gap-2 md:grid-cols-5">
              <FilterSelect label="Type" value={filters.type} onChange={(type) => setFilters((current) => ({ ...current, type }))} options={['ALL', ...Array.from(new Set(rawCommandDecisions.map((decision) => decision.type)))]} />
              <FilterSelect label="Priority" value={filters.priority} onChange={(priority) => setFilters((current) => ({ ...current, priority }))} options={['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW']} />
              <FilterSelect label="Status" value={filters.status} onChange={(status) => setFilters((current) => ({ ...current, status }))} options={['ALL', 'approval-linked', 'unlinked']} />
              <FilterSelect label="Due" value={filters.due} onChange={(due) => setFilters((current) => ({ ...current, due }))} options={['ALL', 'overdue', 'upcoming']} />
              <label className="text-xs font-medium text-[var(--muted)]">
                Property
                <input
                  value={filters.propertyId}
                  onChange={(event) => setFilters((current) => ({ ...current, propertyId: event.target.value }))}
                  className="mt-1 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--panel)] px-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                  placeholder="Property id"
                />
              </label>
            </div>
          </div>

          {commandDecisions.length === 0 && decisionItems.length === 0 && (
            <div className="rounded-md border border-[var(--border)] bg-[var(--panel)] p-5 text-sm text-[var(--muted)]">
              No command-center items returned by the current contracts.
            </div>
          )}

          {rawCommandDecisions.length > 0 && commandDecisions.length === 0 && (
            <div className="rounded-md border border-[var(--border)] bg-[var(--panel)] p-5 text-sm text-[var(--muted)]">
              No command-center items match the current filters.
            </div>
          )}

          {commandDecisions.map((item) => (
            <article key={item.id} className={`rounded-md border bg-[var(--panel)] p-4 ${selectedDecisionId === item.id ? 'border-[var(--accent)]' : 'border-[var(--border)]'}`}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex gap-3">
                  <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[var(--panel-strong)]">
                    <AlertTriangle size={19} aria-hidden="true" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{item.title}</h3>
                      <span className="rounded-sm border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--muted)]">{item.domain}</span>
                      <span className="rounded-sm border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--muted)]">{item.type.replace(/_/g, ' ').toLowerCase()}</span>
                    </div>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">{item.summary}</p>
                    <p className="mt-2 text-xs text-[var(--muted)]">{item.recommendedAction}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                  <span className="rounded-sm bg-[var(--panel-strong)] px-2 py-1 text-xs font-medium">{decisionPriorityLabel(item)}</span>
                  <span className="text-xs text-[var(--muted)]">{item.dueAt ? new Date(item.dueAt).toLocaleDateString() : 'Review'}</span>
                </div>
              </div>
              <div className="mt-4 grid gap-2 md:grid-cols-3">
                {item.evidence.slice(0, 3).map((evidence) => (
                  <div key={`${item.id}-${evidence.label}`} className="rounded-md border border-[var(--border)] bg-[var(--panel-strong)] p-3">
                    <div className="text-xs text-[var(--muted)]">{evidence.label}</div>
                    <div className="mt-1 truncate text-sm font-medium">{String(evidence.value ?? 'Not set')}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-[var(--muted)]">Evidence from {item.entity.type} {item.entity.label ? `- ${item.entity.label}` : ''}</span>
                <button onClick={() => void selectDecision(item.id)} className="inline-flex items-center gap-2 rounded-md border border-[var(--border)] px-3 py-2 text-sm font-medium">
                  Open evidence
                  <ArrowUpRight size={15} aria-hidden="true" />
                </button>
              </div>
            </article>
          ))}

          {commandDecisions.length === 0 && decisionItems.map((item) => (
            <article key={item.id} className="rounded-md border border-[var(--border)] bg-[var(--panel)] p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex gap-3">
                  <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[var(--panel-strong)]">
                    <AlertTriangle size={19} aria-hidden="true" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{item.title}</h3>
                      <span className="rounded-sm border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--muted)]">{item.domain}</span>
                    </div>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">{item.summary}</p>
                  </div>
                </div>
                <span className="rounded-sm bg-[var(--panel-strong)] px-2 py-1 text-xs font-medium">{priorityLabel(item)}</span>
              </div>
            </article>
          ))}
        </section>

        <aside className="space-y-4">
          <DecisionEvidencePanel
            detail={detail}
            loading={detailLoading}
            actionNote={actionNote}
            actionMessage={actionMessage}
            actionPending={actionPending}
            onNoteChange={setActionNote}
            onExecute={(actionId) => void executeAction(actionId)}
            onDefer={() => void deferSelectedDecision()}
            onClose={() => {
              setSelectedDecisionId(null);
              setDetail(null);
              setActionMessage(null);
            }}
          />

          <section className="rounded-md border border-[var(--border)] bg-[var(--panel)] p-4" aria-labelledby="approval-panel-title">
            <h2 id="approval-panel-title" className="text-lg font-semibold">Approval panel</h2>
            <div className="mt-4 text-3xl font-semibold">{formatNumber(data.commandCenter?.metrics.pendingApprovals ?? data.approvals.length)}</div>
            <p className="mt-1 text-sm text-[var(--muted)]">pending approval tasks connected to executable workflows</p>
          </section>

          <section className="rounded-md border border-[var(--border)] bg-[var(--panel)] p-4" aria-labelledby="ai-readiness-title">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="ai-readiness-title" className="text-lg font-semibold">AI workflow readiness</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {data.aiCapabilities ? `${data.aiCapabilities.mode} / ${data.aiCapabilities.model}` : 'Capability manifest unavailable'}
                </p>
              </div>
              <span className="rounded-sm border border-[var(--border)] px-2 py-1 text-xs font-medium">{formatNumber(aiCapabilities.length)} routes</span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-md border border-[var(--border)] bg-[var(--panel-strong)] p-2">
                <div className="text-lg font-semibold">{formatNumber(highRiskAiCapabilities)}</div>
                <div className="mt-1 text-[11px] text-[var(--muted)]">high risk</div>
              </div>
              <div className="rounded-md border border-[var(--border)] bg-[var(--panel-strong)] p-2">
                <div className="text-lg font-semibold">{formatNumber(approvalGatedCapabilities)}</div>
                <div className="mt-1 text-[11px] text-[var(--muted)]">approval gated</div>
              </div>
              <div className="rounded-md border border-[var(--border)] bg-[var(--panel-strong)] p-2">
                <div className="text-lg font-semibold">{formatNumber(decisionRecordCapabilities)}</div>
                <div className="mt-1 text-[11px] text-[var(--muted)]">decision record</div>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {aiCapabilities.slice(0, 5).map((capability) => (
                <div key={capability.id} className="rounded-md border border-[var(--border)] bg-[var(--panel-strong)] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium">{capability.id.replace(/-/g, ' ')}</div>
                      <div className="mt-1 text-xs text-[var(--muted)]">{capability.workflowIds.slice(0, 3).join(' / ')}</div>
                    </div>
                    <span className="rounded-sm border border-[var(--border)] px-2 py-0.5 text-[11px] font-medium">{capability.riskLevel.toLowerCase()}</span>
                  </div>
                  <div className="mt-2 text-xs leading-5 text-[var(--muted)]">{capability.primaryGuardrails[0] ?? capability.description}</div>
                </div>
              ))}
              {aiCapabilities.length === 0 && (
                <div className="text-sm text-[var(--muted)]">No AI capability manifest returned by the backend.</div>
              )}
            </div>
          </section>

          <section className="rounded-md border border-[var(--border)] bg-[var(--panel)] p-4" aria-labelledby="briefing-title">
            <h2 id="briefing-title" className="text-lg font-semibold">Today</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--muted)]">Events</dt>
                <dd className="font-medium">{formatNumber(data.briefing?.metrics?.todayEvents ?? data.briefing?.events.length)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--muted)]">Vacant units</dt>
                <dd className="font-medium">{formatNumber(data.briefing?.metrics?.vacantUnits ?? totals.vacant)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--muted)]">Overdue payments</dt>
                <dd className="font-medium">{formatNumber(data.briefing?.metrics?.overduePayments)}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-md border border-[var(--border)] bg-[var(--panel)] p-4" aria-labelledby="timeline-title">
            <h2 id="timeline-title" className="text-lg font-semibold">Workflow timeline</h2>
            <div className="mt-4 space-y-3">
              {(data.commandCenter?.timeline ?? []).slice(0, 5).map((item) => (
                <div key={item.id} className="border-l border-[var(--border)] pl-3 text-sm">
                  <div className="font-medium">{item.title}</div>
                  <div className="mt-1 text-xs text-[var(--muted)]">{item.status} - {new Date(item.occurredAt).toLocaleString()}</div>
                </div>
              ))}
              {(data.commandCenter?.timeline ?? []).length === 0 && (
                <div className="text-sm text-[var(--muted)]">No recent workflow executions returned.</div>
              )}
            </div>
          </section>

          <section className="rounded-md border border-[var(--border)] bg-[var(--panel)] p-4" aria-labelledby="beta-title">
            <h2 id="beta-title" className="text-lg font-semibold">Port scope</h2>
            <div className="mt-4 space-y-3 text-sm">
              {['Read-only command center', 'Read-only portfolio list', 'No operator mutations', 'Canonical backend routes only'].map((item) => (
                <div key={item} className="flex gap-3">
                  <ShieldCheck className="mt-0.5 shrink-0 text-[var(--success)]" size={16} aria-hidden="true" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-xs font-medium text-[var(--muted)]">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--panel)] px-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option === 'ALL' ? 'All' : option.replace(/_/g, ' ').toLowerCase()}
          </option>
        ))}
      </select>
    </label>
  );
}

function SetupInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-xs font-medium text-[var(--muted)]">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--panel)] px-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
      />
    </label>
  );
}

function DecisionEvidencePanel({
  detail,
  loading,
  actionNote,
  actionMessage,
  actionPending,
  onNoteChange,
  onExecute,
  onDefer,
  onClose,
}: {
  detail: CommandCenterDecisionDetail | null;
  loading: boolean;
  actionNote: string;
  actionMessage: string | null;
  actionPending: boolean;
  onNoteChange: (value: string) => void;
  onExecute: (actionId: string) => void;
  onDefer: () => void;
  onClose: () => void;
}) {
  if (!detail && !loading && !actionMessage) {
    return (
      <section className="rounded-md border border-[var(--border)] bg-[var(--panel)] p-4" aria-labelledby="evidence-title">
        <h2 id="evidence-title" className="text-lg font-semibold">Evidence drawer</h2>
        <p className="mt-3 text-sm text-[var(--muted)]">Select a decision to inspect evidence, source links, audit history, and action controls.</p>
      </section>
    );
  }

  return (
    <section className="rounded-md border border-[var(--border)] bg-[var(--panel)] p-4" aria-labelledby="evidence-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="evidence-title" className="text-lg font-semibold">Evidence drawer</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">{loading ? 'Loading decision detail' : detail?.decision.title}</p>
        </div>
        <button onClick={onClose} className="rounded-md border border-[var(--border)] px-2 py-1 text-xs">Close</button>
      </div>

      {actionMessage ? <div className="mt-3 rounded-md border border-[var(--border)] bg-[var(--panel-strong)] p-3 text-sm text-[var(--muted)]">{actionMessage}</div> : null}

      {detail ? (
        <div className="mt-4 space-y-5">
          <div>
            <h3 className="text-sm font-semibold">Evidence</h3>
            <div className="mt-2 space-y-2">
              {detail.decision.evidence.map((evidence) => (
                <div key={`${evidence.source}-${evidence.label}`} className="rounded-md border border-[var(--border)] bg-[var(--panel-strong)] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium">{evidence.label}</div>
                    <div className="text-xs text-[var(--muted)]">{evidence.source}</div>
                  </div>
                  <div className="mt-1 text-sm text-[var(--muted)]">{String(evidence.value ?? 'Not set')}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold">Source links</h3>
            <div className="mt-2 space-y-2">
              {detail.sourceLinks.map((link) => (
                <div key={`${link.entityType}-${link.entityId}`} className="rounded-md border border-[var(--border)] p-3 text-sm">
                  <div className="font-medium">{link.label}</div>
                  <div className="mt-1 break-all text-xs text-[var(--muted)]">{link.entityType} {link.entityId}</div>
                  <div className="mt-1 break-all text-xs text-[var(--muted)]">{link.route}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold">Action</h3>
            <textarea
              value={actionNote}
              onChange={(event) => onNoteChange(event.target.value)}
              className="mt-2 min-h-20 w-full rounded-md border border-[var(--border)] bg-[var(--panel)] p-2 text-sm outline-none focus:border-[var(--accent)]"
              aria-label="Decision action note"
              placeholder="Optional operator note"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                disabled={actionPending}
                onClick={onDefer}
                className="rounded-md border border-[var(--border)] px-3 py-2 text-sm font-medium disabled:opacity-50"
              >
                Defer
              </button>
              {detail.decision.actions.map((action) => (
                <button
                  key={action.id}
                  disabled={actionPending}
                  onClick={() => onExecute(action.id)}
                  className="rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {action.approvalTaskId ? 'Approval linked' : action.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold">Audit trail</h3>
            <div className="mt-2 space-y-3">
              {detail.auditTrail.length === 0 ? (
                <div className="text-sm text-[var(--muted)]">No audit activity recorded yet.</div>
              ) : (
                detail.auditTrail.map((item) => (
                  <div key={item.id} className="border-l border-[var(--border)] pl-3 text-sm">
                    <div className="font-medium">{item.title}</div>
                    <div className="mt-1 text-xs text-[var(--muted)]">{item.domain} - {item.status} - {new Date(item.occurredAt).toLocaleString()}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function PortfolioView({
  data,
  totals,
  loaded,
  token,
  onRefresh,
}: {
  data: ReadOnlyOperatorData;
  totals: { properties: number; units: number; occupied: number; vacant: number; occupancy: number };
  loaded: boolean;
  token: string;
  onRefresh: () => Promise<void>;
}) {
  const [propertyForm, setPropertyForm] = useState({ name: '', address: '', city: '', state: 'KS', zipCode: '', propertyType: 'Residential' });
  const [unitForm, setUnitForm] = useState({ propertyId: '', name: '', unitNumber: '', bedrooms: '', bathrooms: '', squareFeet: '', status: 'VACANT' });
  const [setupMessage, setSetupMessage] = useState<string | null>(null);
  const [setupPending, setSetupPending] = useState(false);

  async function submitProperty() {
    if (!propertyForm.name.trim() || !propertyForm.address.trim()) {
      setSetupMessage('Property name and address are required.');
      return;
    }
    setSetupPending(true);
    setSetupMessage(null);
    try {
      await createSetupProperty({
        name: propertyForm.name.trim(),
        address: propertyForm.address.trim(),
        city: propertyForm.city.trim() || undefined,
        state: propertyForm.state.trim() || undefined,
        zipCode: propertyForm.zipCode.trim() || undefined,
        propertyType: propertyForm.propertyType.trim() || undefined,
      }, { token });
      setPropertyForm({ name: '', address: '', city: '', state: 'KS', zipCode: '', propertyType: 'Residential' });
      setSetupMessage('Property created.');
      await onRefresh();
    } catch (error) {
      setSetupMessage(error instanceof Error ? error.message : 'Unable to create property.');
    } finally {
      setSetupPending(false);
    }
  }

  async function submitUnit() {
    if (!unitForm.propertyId || !unitForm.name.trim()) {
      setSetupMessage('Select a property and enter a unit name.');
      return;
    }
    setSetupPending(true);
    setSetupMessage(null);
    try {
      await createSetupUnit(unitForm.propertyId, {
        name: unitForm.name.trim(),
        unitNumber: unitForm.unitNumber.trim() || undefined,
        status: unitForm.status,
        bedrooms: unitForm.bedrooms ? Number(unitForm.bedrooms) : undefined,
        bathrooms: unitForm.bathrooms ? Number(unitForm.bathrooms) : undefined,
        squareFeet: unitForm.squareFeet ? Number(unitForm.squareFeet) : undefined,
      }, { token });
      setUnitForm((current) => ({ ...current, name: '', unitNumber: '', bedrooms: '', bathrooms: '', squareFeet: '', status: 'VACANT' }));
      setSetupMessage('Unit created.');
      await onRefresh();
    } catch (error) {
      setSetupMessage(error instanceof Error ? error.message : 'Unable to create unit.');
    } finally {
      setSetupPending(false);
    }
  }

  return (
    <div>
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile label="Properties" value={formatNumber(totals.properties)} detail="portfolio records" icon={Building2} />
        <MetricTile label="Units" value={formatNumber(totals.units)} detail="read-only unit count" icon={Home} />
        <MetricTile label="Vacant" value={formatNumber(totals.vacant)} detail="available or turning soon" icon={CalendarClock} />
        <MetricTile label="Tenants" value={formatNumber(data.metrics?.occupancy?.occupied)} detail="occupied unit proxy" icon={Users} />
      </div>

      <section className="mb-6 rounded-md border border-[var(--border)] bg-[var(--panel)] p-4" aria-labelledby="setup-title">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="setup-title" className="text-lg font-semibold">Property and unit setup</h2>
            <p className="text-sm text-[var(--muted)]">Create beta portfolio records through audited Phase 3 setup contracts.</p>
          </div>
          <span className="text-sm text-[var(--muted)]">{data.setup ? `${data.setup.metrics.unitsMissingDetails} units need details` : 'Waiting for setup summary'}</span>
        </div>

        {setupMessage ? <div className="mb-3 rounded-md border border-[var(--border)] bg-[var(--panel-strong)] p-3 text-sm text-[var(--muted)]">{setupMessage}</div> : null}

        <div className="grid gap-5 xl:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold">Add property</h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <SetupInput label="Name" value={propertyForm.name} onChange={(name) => setPropertyForm((current) => ({ ...current, name }))} />
              <SetupInput label="Address" value={propertyForm.address} onChange={(address) => setPropertyForm((current) => ({ ...current, address }))} />
              <SetupInput label="City" value={propertyForm.city} onChange={(city) => setPropertyForm((current) => ({ ...current, city }))} />
              <SetupInput label="State" value={propertyForm.state} onChange={(state) => setPropertyForm((current) => ({ ...current, state }))} />
              <SetupInput label="Zip" value={propertyForm.zipCode} onChange={(zipCode) => setPropertyForm((current) => ({ ...current, zipCode }))} />
              <SetupInput label="Type" value={propertyForm.propertyType} onChange={(propertyType) => setPropertyForm((current) => ({ ...current, propertyType }))} />
            </div>
            <button disabled={setupPending} onClick={() => void submitProperty()} className="mt-3 rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white disabled:opacity-50">Create property</button>
          </div>

          <div>
            <h3 className="text-sm font-semibold">Add unit</h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <label className="text-xs font-medium text-[var(--muted)]">
                Property
                <select value={unitForm.propertyId} onChange={(event) => setUnitForm((current) => ({ ...current, propertyId: event.target.value }))} className="mt-1 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--panel)] px-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]">
                  <option value="">Select property</option>
                  {data.portfolio.data.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}
                </select>
              </label>
              <SetupInput label="Unit name" value={unitForm.name} onChange={(name) => setUnitForm((current) => ({ ...current, name }))} />
              <SetupInput label="Unit number" value={unitForm.unitNumber} onChange={(unitNumber) => setUnitForm((current) => ({ ...current, unitNumber }))} />
              <SetupInput label="Bedrooms" value={unitForm.bedrooms} onChange={(bedrooms) => setUnitForm((current) => ({ ...current, bedrooms }))} />
              <SetupInput label="Bathrooms" value={unitForm.bathrooms} onChange={(bathrooms) => setUnitForm((current) => ({ ...current, bathrooms }))} />
              <SetupInput label="Sq ft" value={unitForm.squareFeet} onChange={(squareFeet) => setUnitForm((current) => ({ ...current, squareFeet }))} />
            </div>
            <button disabled={setupPending} onClick={() => void submitUnit()} className="mt-3 rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white disabled:opacity-50">Create unit</button>
          </div>
        </div>
      </section>

      <section aria-labelledby="portfolio-title">
        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="portfolio-title" className="text-lg font-semibold">Portfolio</h2>
            <p className="text-sm text-[var(--muted)]">Property and unit visibility only. Editing remains in the legacy app until write contracts are ported.</p>
          </div>
          <span className="text-sm text-[var(--muted)]">{loaded ? `${data.portfolio.data.length} rows` : 'Waiting for data'}</span>
        </div>

        <div className="overflow-hidden rounded-md border border-[var(--border)] bg-[var(--panel)]">
          <div className="hidden grid-cols-[1.4fr_1fr_120px_120px_120px] gap-4 border-b border-[var(--border)] bg-[var(--panel-strong)] px-4 py-3 text-xs font-semibold uppercase text-[var(--muted)] md:grid">
            <div>Property</div>
            <div>Address</div>
            <div>Units</div>
            <div>Vacant</div>
            <div>Rent band</div>
          </div>

          {data.portfolio.data.length === 0 && (
            <div className="p-5 text-sm text-[var(--muted)]">No properties returned by `/api/properties`.</div>
          )}

          {data.portfolio.data.map((property) => (
            <div key={property.id} className="grid gap-3 border-b border-[var(--border)] px-4 py-4 last:border-b-0 md:grid-cols-[1.4fr_1fr_120px_120px_120px] md:items-center">
              <div>
                <div className="font-semibold">{property.name}</div>
                <div className="mt-1 text-xs text-[var(--muted)]">{property.propertyType ?? 'Residential'}</div>
              </div>
              <div className="text-sm text-[var(--muted)]">{propertyAddress(property) || 'No address on file'}</div>
              <div className="text-sm">
                <span className="md:hidden text-[var(--muted)]">Units: </span>
                {formatNumber(property.units?.length)}
              </div>
              <div className="text-sm">
                <span className="md:hidden text-[var(--muted)]">Vacant: </span>
                {formatNumber(countUnitsByStatus(property, 'VACANT'))}
              </div>
              <div className="text-sm">
                <span className="md:hidden text-[var(--muted)]">Rent: </span>
                {property.minRent || property.maxRent ? `${formatCurrency(property.minRent)}-${formatCurrency(property.maxRent)}` : 'Not set'}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
