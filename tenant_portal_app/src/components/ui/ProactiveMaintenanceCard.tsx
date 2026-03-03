import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, MapPin, TrendingUp } from 'lucide-react';

interface Suggestion {
  id: string;
  title: string;
  unit: string;
  probability: number;
  milestone: string;
}

interface ProactiveMaintenanceCardProps {
  suggestions: Suggestion[];
}

export const ProactiveMaintenanceCard: React.FC<ProactiveMaintenanceCardProps> = ({ suggestions }) => {
  const navigate = useNavigate();

  if (!suggestions || suggestions.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500 text-sm font-mono">NO PROACTIVE SUGGESTIONS</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-3 w-full">
      {suggestions.map((item) => (
        <div 
          key={item.id}
          onClick={() => navigate('/maintenance-management')} // Or a more specific page
          className="group relative flex items-center justify-between p-4 rounded-xl bg-transparent border border-white/10 hover:border-neon-pink/50 hover:shadow-[0_0_15px_rgba(255,0,128,0.3)] transition-all duration-300 cursor-pointer backdrop-blur-sm"
        >
          {/* Left: Icon & Details */}
          <div className="flex items-start gap-4">
            <div className="mt-1 text-neon-pink animate-pulse">
              <AlertCircle size={18} />
            </div>
            <div>
              <h4 className="text-white font-sans text-sm tracking-wide group-hover:text-neon-pink transition-colors">
                {item.title}
              </h4>
              <div className="flex items-center gap-3 mt-1">
                <span className="flex items-center gap-1 text-xs font-mono text-gray-400">
                  <MapPin size={10} /> {item.unit}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Probability & Action */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="flex items-center gap-1 text-sm font-mono text-neon-pink">
                <TrendingUp size={12} />
                <span>{(item.probability * 100).toFixed(0)}%</span>
              </div>
              <div className="text-[10px] text-gray-500 font-mono">{item.milestone} PROB.</div>
            </div>
            <button 
              className="text-gray-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
              aria-label={`View details for ${item.title}`}
            >
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
