import React from "react";
import { ArrowUpRight, Calculator, Sparkles } from "lucide-react";
import { GlassCard } from "./GlassCard";

const inputs = [
  { label: "Property", value: "Oak Ave" },
  { label: "Unit", value: "2C" },
  { label: "Bedrooms", value: "2" },
  { label: "Bathrooms", value: "1" },
];

export const RentEstimatorCard: React.FC = () => (
  <GlassCard
    title="Rent Estimator"
    subtitle="AI blended comparables"
    actionSlot={
      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] uppercase tracking-[0.24em] text-slate-200">
        <Calculator className="h-4 w-4 text-neon-blue" />
        Model v2
      </div>
    }
  >
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {inputs.map((input) => (
        <div
          key={input.label}
          className="rounded-2xl border border-white/10 bg-white/5 p-3 transition hover:border-neon-blue/50 hover:shadow-[0_0_15px_rgba(0,240,255,0.3)]"
        >
          <div className="text-[10px] uppercase tracking-[0.3em] text-slate-400">
            {input.label}
          </div>
          <div className="font-mono text-lg text-slate-100">{input.value}</div>
        </div>
      ))}
    </div>

    <button
      type="button"
      className="group inline-flex items-center gap-3 rounded-full border border-neon-blue/50 bg-gradient-to-r from-neon-blue/30 via-neon-pink/30 to-neon-purple/40 px-4 py-2 text-[11px] uppercase tracking-[0.3em] text-white transition hover:shadow-[0_0_15px_rgba(0,240,255,0.35)]"
    >
      <Sparkles className="h-4 w-4" />
      Estimate
      <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
    </button>

    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-[10px] uppercase tracking-[0.3em] text-slate-400">
        Estimated Market Rent
      </div>
      <div className="font-mono text-2xl text-slate-50">
        $1,475 - $1,620
      </div>
      <div className="text-[10px] uppercase tracking-[0.26em] text-slate-500">
        Includes neighborhood velocity + recent comps
      </div>
    </div>
  </GlassCard>
);
