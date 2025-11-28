import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Check, X, Search, ShieldCheck } from 'lucide-react';
import { GlassCard } from './GlassCard';

export const RentalApplicationsCard = () => {
  const navigate = useNavigate();
  
  return (
    <div className="w-full">
        <div className="flex flex-col gap-3">
            {/* Row 1 */}
            <div 
              onClick={() => navigate('/rental-applications-management')}
              className="flex items-center justify-between p-3 bg-transparent border border-white/10 rounded-xl hover:border-neon-blue/50 hover:shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all backdrop-blur-sm cursor-pointer"
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-black border border-white/20 flex items-center justify-center">
                        <User size={18} className="text-gray-300" />
                    </div>
                    <div>
                        <div className="text-sm text-white font-medium">Riley Park</div>
                        <div className="flex items-center gap-2 text-[10px] text-gray-400">
                            <span className="bg-white/10 px-1.5 rounded">Unit 2A</span>
                            <span className="text-neon-blue font-mono">Score: 726</span>
                        </div>
                    </div>
                </div>
                
                <div className="flex gap-2">
                    <button 
                      className="p-2 rounded-lg bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-colors" 
                      aria-label="Approve application"
                      title="Approve"
                    >
                        <Check size={16} />
                    </button>
                    <button 
                      className="p-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors" 
                      aria-label="Reject application"
                      title="Reject"
                    >
                        <X size={16} />
                    </button>
                    <button 
                      className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors" 
                      aria-label="Screen application"
                      title="Screen"
                    >
                        <ShieldCheck size={16} />
                    </button>
                </div>
            </div>

            {/* Row 2 */}
            <div 
              onClick={() => navigate('/rental-applications-management')}
              className="flex items-center justify-between p-3 bg-transparent border border-white/10 rounded-xl hover:border-neon-blue/50 hover:shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all opacity-70 hover:opacity-100 backdrop-blur-sm cursor-pointer"
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-black border border-white/20 flex items-center justify-center">
                        <User size={18} className="text-gray-300" />
                    </div>
                    <div>
                        <div className="text-sm text-white font-medium">Taylor Kim</div>
                        <div className="flex items-center gap-2 text-[10px] text-gray-400">
                            <span className="bg-white/10 px-1.5 rounded">Unit 5B</span>
                            <span className="text-yellow-400 font-mono">Score: 688</span>
                        </div>
                    </div>
                </div>
                
                <div className="flex gap-2">
                     <button 
                      className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                      aria-label="View application details"
                    >
                        <Search size={16} />
                    </button>
                </div>
            </div>
        </div>
    </div>
  );
};