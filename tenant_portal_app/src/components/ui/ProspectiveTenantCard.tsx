import React from 'react';
import { UserPlus, ClipboardList, ThumbsUp, ThumbsDown, Search } from 'lucide-react';
import { GlassCard } from './GlassCard';

export const ProspectiveTenantCard = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Application Form (Public View) */}
        <div className="lg:col-span-5">
            <GlassCard className="h-full border-t-neon-blue/50">
                 <div className="flex items-center gap-2 mb-6">
                    <UserPlus className="text-neon-blue" size={20} />
                    <h3 className="text-white font-light">Application Portal</h3>
                </div>
                
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <input 
                            type="text" 
                            placeholder="Select Property" 
                            className="bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-neon-blue/50 outline-none"
                            aria-label="Select property"
                        />
                        <input 
                            type="text" 
                            placeholder="Unit" 
                            className="bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-neon-blue/50 outline-none"
                            aria-label="Select unit"
                        />
                    </div>
                    <input 
                        type="text" 
                        placeholder="Full Legal Name" 
                        className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-neon-blue/50 outline-none"
                        aria-label="Full legal name"
                    />
                    <div className="relative">
                        <span className="absolute left-3 top-2 text-gray-500 text-sm" aria-hidden="true">$</span>
                        <input 
                            type="number" 
                            placeholder="Monthly Income" 
                            className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 pl-6 text-sm text-white focus:border-neon-blue/50 outline-none"
                            aria-label="Monthly income"
                        />
                    </div>
                    <textarea 
                        placeholder="Additional Notes..." 
                        className="w-full h-20 bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-neon-blue/50 outline-none resize-none"
                        aria-label="Additional notes"
                    />
                    
                    <button 
                        className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-medium rounded shadow-lg transition-all"
                        aria-label="Submit rental application"
                    >
                        Submit Application
                    </button>
                </div>
            </GlassCard>
        </div>

        {/* Manager Dashboard View */}
        <div className="lg:col-span-7">
             <GlassCard className="h-full border-t-neon-purple/50">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                        <ClipboardList className="text-neon-purple" size={20} />
                        <h3 className="text-white font-light">Candidate Queue</h3>
                    </div>
                    <span className="bg-white/10 text-xs px-2 py-1 rounded text-white">2 Pending</span>
                </div>

                <div className="space-y-2">
                    {/* Candidate Row 1 */}
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5 hover:bg-white/10 transition-colors group">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center text-xs font-bold">AD</div>
                            <div>
                                <div className="text-sm text-white">Avery Doe</div>
                                <div className="text-[10px] text-gray-400">Maple St • Unit 1B</div>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] bg-yellow-500/20 text-yellow-200 px-2 py-0.5 rounded border border-yellow-500/30">REVIEW</span>
                            <div className="h-4 w-[1px] bg-white/10 mx-1"></div>
                            <button 
                                className="p-1.5 text-green-400 hover:bg-green-400/20 rounded transition-colors" 
                                title="Approve"
                                aria-label="Approve application"
                            >
                                <ThumbsUp size={14} aria-hidden="true"/>
                            </button>
                            <button 
                                className="p-1.5 text-red-400 hover:bg-red-400/20 rounded transition-colors" 
                                title="Reject"
                                aria-label="Reject application"
                            >
                                <ThumbsDown size={14} aria-hidden="true"/>
                            </button>
                            <button 
                                className="p-1.5 text-blue-400 hover:bg-blue-400/20 rounded transition-colors" 
                                title="Screen"
                                aria-label="Screen application"
                            >
                                <Search size={14} aria-hidden="true"/>
                            </button>
                        </div>
                    </div>

                    {/* Candidate Row 2 */}
                    <div className="flex items-center justify-between p-3 bg-transparent rounded-lg border border-transparent opacity-60 hover:opacity-100 transition-all">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-xs text-gray-500">JQ</div>
                            <div>
                                <div className="text-sm text-gray-300 line-through decoration-red-500/50">Jordan Qi</div>
                                <div className="text-[10px] text-gray-500">Oak Ave • Unit 3A</div>
                            </div>
                        </div>
                         <span className="text-[10px] bg-red-500/10 text-red-400 px-2 py-0.5 rounded border border-red-500/20">REJECTED</span>
                    </div>
                </div>
            </GlassCard>
        </div>
    </div>
  );
};