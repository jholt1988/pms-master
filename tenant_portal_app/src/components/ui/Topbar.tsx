import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  Bell,
  Building2,
  LogOut,
  ShieldCheck,
  Sparkles,
  Wifi,
} from "lucide-react";

interface TopbarProps {
  className?: string;
  onLogout?: () => void;
}

type StatusTone = "blue" | "pink" | "green";

const toneStyles: Record<StatusTone, string> = {
  blue: "border-white/15 bg-white/5 text-neon-blue",
  pink: "border-white/15 bg-white/5 text-neon-pink",
  green: "border-white/15 bg-white/5 text-emerald-300",
};

const StatusPill = ({
  icon,
  label,
  value,
  tone = "blue",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: StatusTone;
}) => (
  <div
    className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-[0.25em] ${toneStyles[tone]}`}
  >
    <span className="h-2 w-2 rounded-full bg-gradient-to-r from-neon-blue via-neon-pink to-neon-purple shadow-neon" />
    <span className="flex items-center gap-2 text-slate-200">
      <span className="text-slate-300/80">{label}</span>
      <span className="flex items-center gap-1 font-semibold text-slate-50">
        {icon}
        {value}
      </span>
    </span>
  </div>
);

export const Topbar: React.FC<TopbarProps> = ({ className = "", onLogout }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      navigate("/login");
    }
  };

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-black/40 backdrop-blur-xl ${className}`}
    >
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/10 shadow-neon">
            <Building2 className="h-5 w-5 text-neon-blue" />
          </div>
          <div className="leading-tight">
            <p className="text-[10px] uppercase tracking-[0.4em] text-slate-400">
              Property OS
            </p>
            <p className="text-sm font-semibold text-slate-100">
              Digital Twin HUD
            </p>
          </div>
        </div>

        <div className="hidden flex-1 items-center justify-center gap-3 lg:flex">
          <StatusPill
            icon={<Activity className="h-3.5 w-3.5" />}
            label="Systems"
            value="Nominal"
            tone="blue"
          />
          <StatusPill
            icon={<Wifi className="h-3.5 w-3.5" />}
            label="Link"
            value="Live"
            tone="green"
          />
          <StatusPill
            icon={<ShieldCheck className="h-3.5 w-3.5" />}
            label="Secure"
            value="On"
            tone="pink"
          />
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            className="rounded-full border border-white/15 bg-white/5 p-2 text-slate-200 hover:border-neon-blue/50 hover:text-white transition"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => navigate("/rent-optimization")}
            className="relative flex items-center gap-3 rounded-full border border-white/15 bg-white/5 px-2 pr-3 py-1.5 text-left shadow-neon hover:border-neon-blue/60 transition"
            aria-label="Open AI copilot"
          >
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-neon-blue/30 blur-md" />
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-neon-blue via-neon-pink to-neon-purple animate-orb-pulse" />
            </div>
            <div className="hidden sm:block leading-tight">
              <p className="text-[10px] uppercase tracking-[0.35em] text-slate-300/80">
                AI Orb
              </p>
              <p className="text-sm font-semibold text-slate-100">
                Ask Anything
              </p>
            </div>
            <Sparkles className="hidden h-4 w-4 text-neon-blue sm:block" />
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 hover:border-neon-pink/60 hover:text-white transition"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};
