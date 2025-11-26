import React from 'react';
import { DollarSign, Calendar, ArrowUpRight, AlertCircle, CheckCircle2 } from 'lucide-react';

export const PaymentsCard = () => {
  return (
    <div className="w-full">
      <div className="space-y-1">
        {/* Header Row */}
        <div className="grid grid-cols-12 text-[10px] uppercase tracking-widest text-gray-500 px-4 pb-2 font-mono">
          <div className="col-span-4">Invoice</div>
          <div className="col-span-3">Unit</div>
          <div className="col-span-3 text-right">Amount</div>
          <div className="col-span-2 text-right">Status</div>
        </div>

        {/* Rows */}
        {[
          { id: 'INV-1043', unit: '3C', amount: '1,250', status: 'unpaid', date: 'Nov 5' },
          { id: 'INV-1042', unit: '2B', amount: '1,150', status: 'paid', date: 'Oct 5' },
        ].map((item) => (
          <div 
            key={item.id}
            className="group grid grid-cols-12 items-center p-3 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-white/5"
            role="row"
            aria-label={`Invoice ${item.id} for unit ${item.unit}, ${item.status}, due ${item.date}`}
          >
            {/* Invoice Info */}
            <div className="col-span-4">
              <div className="flex items-center gap-2 text-sm text-white font-mono">
                <span className="opacity-50">#</span>{item.id.split('-')[1]}
              </div>
              <div className="flex items-center gap-1 text-[10px] text-gray-500 mt-0.5">
                <Calendar size={10} /> Due {item.date}
              </div>
            </div>

            {/* Unit */}
            <div className="col-span-3 text-sm text-gray-300 font-light">
              {item.unit}
            </div>

            {/* Amount */}
            <div className="col-span-3 text-right font-mono text-neon-blue">
              ${item.amount}
            </div>

            {/* Status */}
            <div className="col-span-2 flex justify-end">
              {item.status === 'unpaid' ? (
                <div className="flex items-center gap-1 text-xs text-neon-pink bg-neon-pink/10 px-2 py-1 rounded border border-neon-pink/30 shadow-[0_0_10px_rgba(255,0,153,0.2)]">
                  <AlertCircle size={10} />
                  <span className="hidden sm:inline">DUE</span>
                </div>
              ) : (
                <div className="p-1 rounded-full bg-green-500/20 text-green-400">
                  <CheckCircle2 size={14} />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Action Footer */}
      <div className="mt-4 pt-3 border-t border-white/5 flex justify-between items-center">
        <span className="text-[10px] text-gray-600 uppercase">Total Outstanding</span>
        <span className="text-sm font-mono text-white">$1,250.00</span>
      </div>
    </div>
  );
};