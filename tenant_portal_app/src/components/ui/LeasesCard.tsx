import React from "react";
import { ArrowUpRight, FileText, ShieldCheck } from "lucide-react";
import { GlassCard } from "./GlassCard";

interface Lease {
  property: string;
  unit: string;
  tenant: string;
  term: string;
  ends: string;
}

const leases: Lease[] = [
  { property: "Maple St", unit: "4D", tenant: "Jamie Lin", term: "12 mo", ends: "Aug 30, 2026" },
  { property: "Oak Ave", unit: "1A", tenant: "Chris Yu", term: "6 mo", ends: "Mar 1, 2026" },
  { property: "Pine Court", unit: "7B", tenant: "Rhea Daly", term: "18 mo", ends: "Jan 12, 2027" },
];

const LeaseRow = ({ lease }: { lease: Lease }) => (
  <div className="group grid grid-cols-[1.1fr_0.6fr_1fr] gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition hover:border-neon-blue/50 hover:shadow-[0_0_15px_rgba(0,240,255,0.3)]">
    <div className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-[0.3em] text-slate-400">
        Property
      </span>
      <span className="font-mono text-base text-slate-100">
        {lease.property}
      </span>
      <span className="text-[10px] uppercase tracking-[0.26em] text-slate-500">
        Unit {lease.unit}
      </span>
    </div>
    <div className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-[0.3em] text-slate-400">
        Tenant
      </span>
      <span className="font-mono text-base text-slate-100">
        {lease.tenant}
      </span>
    </div>
    <div className="flex items-center justify-between gap-3">
      <div className="flex flex-col gap-1">
        <span className="text-[10px] uppercase tracking-[0.3em] text-slate-400">
          Term
        </span>
        <span className="font-mono text-base text-slate-100">
          {lease.term}
        </span>
        <span className="text-[10px] uppercase tracking-[0.26em] text-slate-500">
          Ends {lease.ends}
        </span>
      </div>
      <button
        type="button"
        className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] uppercase tracking-[0.24em] text-slate-200 transition hover:border-neon-blue/50 hover:text-white"
      >
        View
        <ArrowUpRight className="h-4 w-4" />
      </button>
    </div>
  </div>
);

export const LeasesCard: React.FC = () => (
  <GlassCard
    title="Leases"
    subtitle="Active agreements + expirations"
    actionSlot={
      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] uppercase tracking-[0.24em] text-slate-200">
        <ShieldCheck className="h-4 w-4 text-neon-blue" />
        Compliance OK
      </div>
    }
  >
    <div className="flex flex-col gap-2">
      {leases.map((lease) => (
        <LeaseRow key={`${lease.property}-${lease.unit}`} lease={lease} />
      ))}
    </div>

    <div className="mt-2 flex items-center justify-between text-[10px] uppercase tracking-[0.28em] text-slate-400">
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-neon-blue" />
        Auto-renewal review in 14 days
      </div>
      <div className="flex items-center gap-1 text-neon-blue">
        Generate addendum
        <ArrowUpRight className="h-4 w-4" />
      </div>
    </div>
  </GlassCard>
);
