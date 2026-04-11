import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Props {
  title: string;
  subtitle?: string;
  icon: React.ElementType;
  accentColor?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export const WorkspaceShell: React.FC<Props> = ({ title, subtitle, icon: Icon, accentColor = 'neon-blue', actions, children }) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/briefing')}
            className="p-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Back to briefing"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-${accentColor}/10 border border-${accentColor}/20`}>
              <Icon size={22} className={`text-${accentColor}`} />
            </div>
            <div>
              <h1 className="text-white text-xl font-light">{title}</h1>
              {subtitle && <p className="text-gray-400 text-xs font-mono uppercase tracking-wider">{subtitle}</p>}
            </div>
          </div>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
};
