import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  CreditCard,
  FileText,
  LayoutDashboard,
  MessageCircle,
  Sparkles,
  Wrench,
} from "lucide-react";

type DockItem = {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
};

const dockItems: DockItem[] = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Maintenance", path: "/maintenance-management", icon: Wrench },
  { label: "Payments", path: "/payments", icon: CreditCard },
  { label: "Messaging", path: "/messaging", icon: MessageCircle },
  { label: "Leases", path: "/lease-management", icon: FileText },
  { label: "AI Hub", path: "/rent-optimization", icon: Sparkles },
];

const isActivePath = (target: string, current: string) => {
  if (target === "/dashboard") {
    return current === "/dashboard" || current === "/";
  }
  return current === target || current.startsWith(`${target}/`);
};

export const DockNavigation: React.FC = () => {
  const location = useLocation();

  return (
    <nav
      aria-label="Primary dock navigation"
      className="fixed inset-x-0 bottom-6 z-40"
    >
      <div className="mx-auto flex max-w-5xl justify-center px-4">
        <div className="flex items-center gap-2 rounded-[28px] border border-white/15 bg-white/10 px-2 py-2 backdrop-blur-2xl shadow-glass-strong">
          {dockItems.map((item) => {
            const Icon = item.icon;
            const active = isActivePath(item.path, location.pathname);
            return (
              <Link
                key={item.path}
                to={item.path}
                aria-current={active ? "page" : undefined}
                className={`group relative flex min-w-[84px] flex-col items-center gap-1 rounded-2xl border px-3 py-2 text-center transition-all duration-300 ${
                  active
                    ? "border-neon-blue/60 bg-white/15 text-white shadow-neon"
                    : "border-white/10 bg-white/5 text-slate-300 hover:border-neon-blue/40 hover:text-white hover:shadow-neon"
                }`}
              >
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-2xl border transition-all ${
                    active
                      ? "border-neon-blue/60 bg-white/10"
                      : "border-white/10 bg-white/5 group-hover:border-neon-blue/30"
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 transition-colors ${
                      active ? "text-neon-blue" : "text-slate-200"
                    }`}
                  />
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.26em]">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
