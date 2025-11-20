import { Sparkles, Zap } from "lucide-react";
import { GlassCard } from "./components/ui/GlassCard";
import { LeasesCard } from "./components/ui/LeasesCard";
import { MaintenanceCard } from "./components/ui/MaintenanceCard";
import { MessagingCard } from "./components/ui/MessagingCard";
import { PaymentsCard } from "./components/ui/PaymentsCard";
import { RentEstimatorCard } from "./components/ui/RentEstimatorCard";

const aiInsights = [
  { label: "Risk Scan", value: "No anomalies detected", tone: "text-emerald-300" },
  { label: "Collections", value: "+8% WoW", tone: "text-neon-blue" },
  { label: "Vacancy Forecast", value: "2 units in 14d", tone: "text-neon-pink" },
];

const quickActions = [
  "Summarize tenant messages",
  "Auto-dispatch maintenance",
  "Optimize rent recommendations",
];

const MainDashboard = () => (
  <div className="grid auto-rows-[minmax(200px,_1fr)] gap-6 md:grid-cols-12">
    <div className="md:col-span-7 md:row-span-2">
      <MaintenanceCard />
    </div>

    <div className="md:col-span-5 md:row-span-3">
      <PaymentsCard />
    </div>

    <div className="md:col-span-7">
      <GlassCard
        title="AI Insights + Quick Actions"
        subtitle="Digital twin situational awareness"
        actionSlot={
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] uppercase tracking-[0.24em] text-slate-200">
            <Sparkles className="h-4 w-4 text-neon-blue" />
            Launch Copilot
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          {aiInsights.map((insight) => (
            <div
              key={insight.label}
              className="rounded-2xl border border-white/10 bg-white/5 p-3 transition hover:border-neon-blue/50 hover:shadow-[0_0_15px_rgba(0,240,255,0.3)]"
            >
              <div className="text-[10px] uppercase tracking-[0.3em] text-slate-400">
                {insight.label}
              </div>
              <div className={`font-mono text-lg ${insight.tone}`}>
                {insight.value}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-2 flex flex-col gap-2">
          <div className="text-[10px] uppercase tracking-[0.28em] text-slate-400">
            Quick Actions
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {quickActions.map((action) => (
              <button
                key={action}
                type="button"
                className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-left text-[11px] uppercase tracking-[0.24em] text-slate-200 transition hover:border-neon-blue/50 hover:text-white hover:shadow-[0_0_15px_rgba(0,240,255,0.3)]"
              >
                <span className="font-semibold">{action}</span>
                <Zap className="h-4 w-4 text-neon-blue" />
              </button>
            ))}
          </div>
        </div>
      </GlassCard>
    </div>

    <div className="md:col-span-4">
      <MessagingCard />
    </div>

    <div className="md:col-span-4">
      <LeasesCard />
    </div>

    <div className="md:col-span-3">
      <RentEstimatorCard />
    </div>
  </div>
);

export default MainDashboard;
