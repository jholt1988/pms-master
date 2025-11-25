import React from "react";

interface GlassCardProps {
  title?: string;
  subtitle?: string;
  actionSlot?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
  glowColor?: string;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  title,
  subtitle,
  actionSlot,
  className = "",
  children,
  glowColor = ""
}) => {
  return (
    <div
      className={`group relative overflow-hidden rounded-3xl border border-glass-border bg-glass-surface backdrop-blur-xl shadow-glass-strong ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-white/10 via-white/0 to-white/5 opacity-70" />
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-linear-to-r from-transparent via-white/30 to-transparent" />

      <div className="relative flex flex-col gap-4 p-5 sm:p-6">
        {(title || subtitle || actionSlot) && (
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              {title && (
                <p className="text-[10px] uppercase tracking-[0.35em] text-slate-300">
                  {title}
                </p>
              )}
              {subtitle && (
                <p className="text-sm font-mono text-slate-100/80">{subtitle}</p>
              )}
            </div>
            {actionSlot}
          </div>
        )}
        {children}
      </div>
    </div>
  );
};
