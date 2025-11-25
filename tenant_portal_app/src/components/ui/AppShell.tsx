import React from "react";
import { Outlet } from "react-router-dom";
import { Topbar } from "./Topbar";
import { DockNavigation } from "./DockNavigation";

// components/ui/AppShell.tsx

interface AppShellProps {
  onLogout?: () => void;
  children?: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ onLogout, children }) => {
  return (
    <div className="relative min-h-screen overflow-hidden bg-deep-900 font-sans text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-deep-900 via-deep-800 to-black animate-gradient-move opacity-80" />
      <div className="pointer-events-none absolute inset-0 bg-grid-pattern bg-size-[90px_90px] opacity-20" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(0,240,255,0.12),transparent_35%),radial-gradient(circle_at_70%_0%,rgba(112,0,255,0.18),transparent_30%),radial-gradient(circle_at_70%_80%,rgba(255,0,153,0.14),transparent_35%)]" />

      <div className="relative z-10 flex min-h-screen flex-col">
        <Topbar onLogout={onLogout} />
        <main className="flex-1 px-4 pt-24 pb-32 sm:px-8">
          <div className="mx-auto max-w-7xl">
            {children ?? <Outlet />}
          </div>
        </main>
        <DockNavigation />
      </div>
    </div>
  );
};
