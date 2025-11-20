import React from "react";
import { ArrowUpRight, Wrench } from "lucide-react";
import { GlassCard } from "./GlassCard";

type Priority = "P1" | "P2" | "P3";
type Status = "Pending" | "In Progress" | "Completed";

interface MaintenanceTicket {
  title: string;
  unit: string;
  priority: Priority;
  status: Status;
  eta: string;
  assignee?: string;
}

const tickets: MaintenanceTicket[] = [
  {
    title: "Leaky faucet",
    unit: "2B",
    priority: "P1",
    status: "Pending",
    eta: "2h SLA",
    assignee: "Dispatching",
  },
  {
    title: "AC not cooling",
    unit: "5A",
    priority: "P2",
    status: "In Progress",
    eta: "ETA 4h",
    assignee: "Delta HVAC",
  },
  {
    title: "Broken window",
    unit: "1C",
    priority: "P3",
    status: "Completed",
    eta: "Resolved",
    assignee: "GlassWorks",
  },
];

const priorityStyles: Record<Priority, string> = {
  P1: "from-neon-pink/80 to-neon-blue/80 text-neon-pink",
  P2: "from-neon-blue/70 to-neon-purple/70 text-neon-blue",
  P3: "from-white/20 to-white/5 text-slate-200",
};

const statusStyles: Record<
  Status,
  { pill: string; dot: string; label: string }
> = {
  "In Progress": {
    pill: "border-neon-blue/50 text-neon-blue",
    dot: "bg-neon-blue",
    label: "In Progress",
  },
  Pending: {
    pill: "border-neon-pink/50 text-neon-pink",
    dot: "bg-neon-pink",
    label: "Pending",
  },
  Completed: {
    pill: "border-emerald-300/60 text-emerald-200",
    dot: "bg-emerald-300",
    label: "Completed",
  },
};

const LabeledValue = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center gap-2">
    <span className="text-[10px] uppercase tracking-[0.3em] text-slate-400">
      {label}
    </span>
    <span className="font-mono text-sm text-slate-100">{value}</span>
  </div>
);

const StatusBadge = ({ status }: { status: Status }) => {
  const style = statusStyles[status];
  return (
    <span
      className={`flex items-center gap-2 rounded-full border bg-white/5 px-3 py-1.5 text-[10px] uppercase tracking-[0.28em] ${style.pill}`}
    >
      <span className={`h-2.5 w-2.5 rounded-full shadow-neon ${style.dot}`} />
      {style.label}
    </span>
  );
};

const PriorityPill = ({ priority }: { priority: Priority }) => (
  <span className="relative inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 shadow-neon">
    <span
      className={`h-6 w-6 rounded-full bg-gradient-to-br ${priorityStyles[priority]}`}
    />
    <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-100">
      {priority}
    </span>
  </span>
);

export const MaintenanceCard: React.FC = () => (
  <GlassCard
    title="Critical Maintenance"
    subtitle="Live triage of high-priority tasks"
    actionSlot={
      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] uppercase tracking-[0.24em] text-slate-200">
        <Wrench className="h-4 w-4 text-neon-blue" />
        Dispatch Queue
      </div>
    }
  >
    <div className="flex flex-col gap-3">
      {tickets.map((ticket) => (
        <div
          key={ticket.title}
          className="group flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition hover:border-neon-blue/50 hover:shadow-[0_0_15px_rgba(0,240,255,0.3)]"
        >
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[10px] uppercase tracking-[0.3em] text-slate-400">
                Task
              </span>
              <span className="font-mono text-base text-slate-100">
                {ticket.title}
              </span>
              <PriorityPill priority={ticket.priority} />
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <LabeledValue label="Unit" value={ticket.unit} />
              <LabeledValue label="ETA" value={ticket.eta} />
              {ticket.assignee && (
                <LabeledValue label="Crew" value={ticket.assignee} />
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <StatusBadge status={ticket.status} />
            <button
              type="button"
              className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] uppercase tracking-[0.24em] text-slate-200 transition hover:border-neon-blue/50 hover:text-white"
            >
              Update
              <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>

    <div className="mt-1 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-[10px] uppercase tracking-[0.3em] text-slate-400">
        Managers prioritize + dispatch. Tenants submit in Maintenance.
      </div>
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-neon-blue">
        Launch playbook
        <ArrowUpRight className="h-4 w-4" />
      </div>
    </div>
  </GlassCard>
);
