import React from 'react';
import { Wrench, Calendar, FileText, CreditCard, CheckCircle, AlertCircle } from 'lucide-react';
import { GlassCard } from './GlassCard';

export const TenantViewsCard = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Module 1: Maintenance Request */}
        <div className="lg:col-span-1">
            <GlassCard className="h-full">
                <div className="flex items-center gap-2 mb-4 text-neon-blue">
                    <Wrench size={18} />
                    <h3 className="font-mono text-sm tracking-wider">REPORT ISSUE</h3>
                </div>
                <div className="space-y-3">
                    <select 
                        className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-gray-300 focus:border-neon-blue/50 outline-none"
                        aria-label="Select unit"
                    >
                        <option>Maple St - Unit 2B</option>
                    </select>
                    <textarea 
                        className="w-full h-24 bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-gray-300 focus:border-neon-blue/50 outline-none resize-none"
                        placeholder="Describe the malfunction..."
                        aria-label="Maintenance request description"
                    />
                    <div className="relative">
                        <Calendar size={14} className="absolute left-3 top-3 text-gray-500" aria-hidden="true" />
                        <input 
                            type="text" 
                            className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 pl-9 text-sm text-gray-300" 
                            placeholder="Preferred Time (e.g. 9am)"
                            aria-label="Preferred maintenance time"
                        />
                    </div>
                    <button 
                        className="w-full py-2 bg-neon-blue text-black font-bold text-xs uppercase tracking-widest rounded hover:shadow-[0_0_15px_#00f0ff] transition-all"
                        aria-label="Submit maintenance request"
                    >
                        Transmit Request
                    </button>
                </div>
            </GlassCard>
        </div>

        {/* Module 2: Lease Status */}
        <div className="lg:col-span-1">
             <GlassCard className="h-full relative overflow-hidden">
                {/* Background decorative element */}
                <div className="absolute -right-10 -top-10 w-32 h-32 bg-green-500/10 rounded-full blur-xl"></div>
                
                <div className="flex items-center gap-2 mb-6 text-green-400">
                    <FileText size={18} />
                    <h3 className="font-mono text-sm tracking-wider">LEASE PROTOCOL</h3>
                </div>

                <div className="space-y-6">
                    <div className="flex justify-between items-end border-b border-white/5 pb-2">
                        <span className="text-xs text-gray-500">STATUS</span>
                        <span className="text-green-400 bg-green-400/10 px-2 py-0.5 rounded text-[10px] border border-green-400/20">ACTIVE</span>
                    </div>
                    <div className="flex justify-between items-end border-b border-white/5 pb-2">
                        <span className="text-xs text-gray-500">TERMINATION</span>
                        <span className="font-mono text-white">2026-09-01</span>
                    </div>
                    <div className="flex justify-between items-end border-b border-white/5 pb-2">
                        <span className="text-xs text-gray-500">MONTHLY CREDIT</span>
                        <span className="font-mono text-xl text-white">$1,150</span>
                    </div>
                </div>
                <div className="mt-6 text-[10px] text-gray-500 text-center">
                    AUTO-RENEWAL ELIGIBLE
                </div>
            </GlassCard>
        </div>

        {/* Module 3: Payment Ledger */}
        <div className="lg:col-span-1">
            <GlassCard className="h-full">
                <div className="flex items-center gap-2 mb-4 text-neon-purple">
                    <CreditCard size={18} />
                    <h3 className="font-mono text-sm tracking-wider">LEDGER</h3>
                </div>
                <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 bg-white/5 rounded border border-white/5">
                        <div className="flex flex-col">
                            <span className="text-xs text-white font-bold">Nov 01</span>
                            <span className="text-[10px] text-gray-500">#INV-2054</span>
                        </div>
                        <div className="text-right">
                             <span className="block text-sm font-mono text-white">$1,150</span>
                             <span className="text-[10px] text-neon-pink flex items-center justify-end gap-1"><AlertCircle size={8}/> UNPAID</span>
                        </div>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-transparent rounded border-b border-white/5 opacity-60">
                        <div className="flex flex-col">
                            <span className="text-xs text-white">Oct 01</span>
                            <span className="text-[10px] text-gray-500">#INV-2013</span>
                        </div>
                        <div className="text-right">
                             <span className="block text-sm font-mono text-white">$1,150</span>
                             <span className="text-[10px] text-green-400 flex items-center justify-end gap-1"><CheckCircle size={8}/> SETTLED</span>
                        </div>
                    </div>
                </div>
                 <button 
                        className="w-full mt-4 py-2 border border-white/20 text-gray-300 font-mono text-xs rounded hover:bg-white/5 transition-all"
                        aria-label="View full payment history"
                >
                        View Full History
                </button>
            </GlassCard>
        </div>
    </div>
  );
};