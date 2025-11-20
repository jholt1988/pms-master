import React from "react";
import { ArrowUpRight, CreditCard, TrendingUp } from "lucide-react";
import { GlassCard } from "./GlassCard";

type PaymentStatus = "Unpaid" | "Paid" | "Partial";

interface Payment {
  invoice: string;
  unit: string;
  amount: string;
  status: PaymentStatus;
  due: string;
}

const payments: Payment[] = [
  { invoice: "#INV-1043", unit: "3C", amount: "$1,250", status: "Unpaid", due: "Nov 5" },
  { invoice: "#INV-1042", unit: "2B", amount: "$1,150", status: "Paid", due: "Oct 5" },
  { invoice: "#INV-1041", unit: "5A", amount: "$1,480", status: "Partial", due: "Oct 1" },
];

const statusStyles: Record<
  PaymentStatus,
  { pill: string; dot: string; label: string }
> = {
  Unpaid: {
    pill: "border-neon-pink/50 text-neon-pink",
    dot: "bg-neon-pink",
    label: "Unpaid",
  },
  Paid: {
    pill: "border-emerald-300/60 text-emerald-200",
    dot: "bg-emerald-300",
    label: "Settled",
  },
  Partial: {
    pill: "border-neon-blue/40 text-neon-blue",
    dot: "bg-neon-blue",
    label: "Partial",
  },
};

const StatusPill = ({ status }: { status: PaymentStatus }) => {
  const style = statusStyles[status];
  return (
    <span
      className={`flex items-center gap-2 rounded-full border bg-white/5 px-3 py-1.5 text-[10px] uppercase tracking-[0.26em] ${style.pill}`}
    >
      <span className={`h-2.5 w-2.5 rounded-full shadow-neon ${style.dot}`} />
      {style.label}
    </span>
  );
};

const SummaryStat = ({
  label,
  value,
  trend,
}: {
  label: string;
  value: string;
  trend?: string;
}) => (
  <div className="flex flex-col gap-1 rounded-2xl border border-white/10 bg-white/5 p-3">
    <span className="text-[10px] uppercase tracking-[0.3em] text-slate-400">
      {label}
    </span>
    <span className="font-mono text-xl text-slate-100">{value}</span>
    {trend && (
      <span className="flex items-center gap-1 text-[11px] uppercase tracking-[0.2em] text-emerald-300">
        <TrendingUp className="h-4 w-4" />
        {trend}
      </span>
    )}
  </div>
);

export const PaymentsCard: React.FC = () => (
  <GlassCard
    title="Financial Flow"
    subtitle="Receivables and settlements"
    actionSlot={
      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] uppercase tracking-[0.24em] text-slate-200">
        <CreditCard className="h-4 w-4 text-neon-blue" />
        Sync Ledger
      </div>
    }
  >
    <div className="grid grid-cols-2 gap-3">
      <SummaryStat label="Due This Week" value="$3,880" />
      <SummaryStat label="Collected" value="$2,630" trend="+8.4%" />
    </div>

    <div className="flex flex-col gap-2">
      {payments.map((payment) => (
        <div
          key={payment.invoice}
          className="group grid grid-cols-[1.4fr_1fr_1fr] items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm transition hover:border-neon-blue/50 hover:shadow-[0_0_15px_rgba(0,240,255,0.3)]"
        >
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-[0.3em] text-slate-400">
              Invoice
            </span>
            <span className="font-mono text-base text-slate-100">
              {payment.invoice}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-[0.3em] text-slate-400">
              Unit
            </span>
            <span className="font-mono text-base text-slate-100">
              {payment.unit}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-[0.3em] text-slate-400">
                Amount
              </span>
              <span className="font-mono text-base text-slate-100">
                {payment.amount}
              </span>
              <span className="text-[10px] uppercase tracking-[0.26em] text-slate-500">
                Due {payment.due}
              </span>
            </div>
            <div className="flex flex-col items-end gap-2">
              <StatusPill status={payment.status} />
              <button
                type="button"
                className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] uppercase tracking-[0.24em] text-slate-200 transition hover:border-neon-blue/50 hover:text-white"
              >
                Reconcile
                <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  </GlassCard>
);
