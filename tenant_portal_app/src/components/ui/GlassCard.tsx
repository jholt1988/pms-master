import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: 'blue' | 'purple' | 'pink' | 'none';
  title?: string;
  subtitle?: string;
  actionSlot?: React.ReactNode;
}

export const GlassCard: React.FC<GlassCardProps> = ({ 
  children, 
  className = '', 
  glowColor = 'none',
  title,
  subtitle,
  actionSlot
}) => {
  const glowStyles = {
    blue: 'shadow-[0_0_30px_-5px_rgba(0,240,255,0.3)] border-neon-blue/30',
    purple: 'shadow-[0_0_30px_-5px_rgba(112,0,255,0.3)] border-neon-purple/30',
    pink: 'shadow-[0_0_30px_-5px_rgba(255,0,128,0.3)] border-neon-pink/30',
    none: 'shadow-xl border-glass-border'
  };

  return (
    <article 
      className={`
        relative overflow-hidden rounded-2xl 
        bg-glass-surface backdrop-blur-xl 
        border border-t-glass-highlight border-b-0 border-r-glass-border border-l-glass-border
        transition-all duration-300 hover:bg-white/10 hover:scale-[1.01]
        ${glowStyles[glowColor]}
        ${className}
      `}
      aria-labelledby={title ? `glasscard-title-${title.replace(/\s+/g, '-').toLowerCase()}` : undefined}
    >
      {/* Scanline effect overlay (optional) */}
      <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-[0.03]" aria-hidden="true" />
      
      <div className="relative z-10 p-6">
        {(title || subtitle || actionSlot) && (
          <header className="flex items-start justify-between mb-4 pb-4 border-b border-white/10">
            <div>
              {title && (
                <h3 
                  id={`glasscard-title-${title.replace(/\s+/g, '-').toLowerCase()}`}
                  className="text-white font-sans font-light text-lg mb-1"
                >
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-mono">{subtitle}</p>
              )}
            </div>
            {actionSlot && (
              <div role="group" aria-label="Card actions">
                {actionSlot}
              </div>
            )}
          </header>
        )}
        {children}
      </div>
    </article>
  );
};