import React from 'react';
import { 
  AlertCircle, 
  Clock, 
  CheckCircle2, 
  MoreHorizontal,
  ArrowRight,
  MapPin
} from 'lucide-react';

interface Request {
  id: string;
  title: string;
  unit: string;
  priority: 'P1' | 'P2' | 'P3';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  time: string;
}

const requests: Request[] = [
  { id: 'REQ-1024', title: 'Gas Leak Detected', unit: 'Unit 2B', priority: 'P1', status: 'PENDING', time: '10m ago' },
  { id: 'REQ-1023', title: 'AC Unit Failure', unit: 'Unit 5A', priority: 'P2', status: 'IN_PROGRESS', time: '2h ago' },
  { id: 'REQ-1021', title: 'Window Seal Broken', unit: 'Unit 1C', priority: 'P3', status: 'COMPLETED', time: '1d ago' },
];

export const MaintenanceCard = () => {
  const getPriorityColor = (p: string) => {
    switch(p) {
      case 'P1': return 'text-neon-pink animate-pulse'; // Critical
      case 'P2': return 'text-orange-400'; // Warning
      default: return 'text-neon-blue'; // Normal
    }
  };

  const getStatusStyle = (s: string) => {
    switch(s) {
      case 'PENDING': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'IN_PROGRESS': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'COMPLETED': return 'bg-green-500/10 text-green-400 border-green-500/20';
      default: return 'bg-gray-500/10 text-gray-400';
    }
  };

  return (
    <div className="flex flex-col space-y-3 w-full">
      {requests.map((item) => (
        <div 
          key={item.id}
          className="group relative flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:border-neon-blue/30 hover:bg-white/10 transition-all duration-300 cursor-pointer"
        >
          {/* Left: Status Icon & Details */}
          <div className="flex items-start gap-4">
            {/* Priority Indicator */}
            <div className={`mt-1 ${getPriorityColor(item.priority)}`}>
              <AlertCircle size={18} />
            </div>

            <div>
              <h4 className="text-white font-sans text-sm tracking-wide group-hover:text-neon-blue transition-colors">
                {item.title}
              </h4>
              <div className="flex items-center gap-3 mt-1">
                <span className="flex items-center gap-1 text-xs font-mono text-gray-400">
                  <MapPin size={10} /> {item.unit}
                </span>
                <span className="text-[10px] text-gray-600 font-mono">•</span>
                <span className="text-xs font-mono text-gray-500">{item.time}</span>
              </div>
            </div>
          </div>

          {/* Right: Status Pill & Action */}
          <div className="flex items-center gap-4">
            <span className={`
              px-2 py-1 rounded text-[10px] font-mono tracking-wider border
              ${getStatusStyle(item.status)}
            `}>
              {item.status}
            </span>
            
            <button className="text-gray-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100">
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      ))}

      {/* Footer Action */}
      <button className="w-full py-3 mt-2 flex items-center justify-center gap-2 text-xs font-mono text-gray-400 hover:text-neon-blue transition-colors border-t border-dashed border-white/10">
        VIEW ALL TICKETS <ArrowRight size={12} />
      </button>
    </div>
  );
};