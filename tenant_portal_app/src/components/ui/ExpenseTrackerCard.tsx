import React from 'react';
import { TrendingDown, DollarSign, PieChart } from 'lucide-react';

export const ExpenseTrackerCard = () => {
  const categories = [
    { name: 'Maintenance', spent: 4500, limit: 5000, color: 'bg-neon-pink' },
    { name: 'Utilities', spent: 2100, limit: 2500, color: 'bg-neon-blue' },
    { name: 'Services', spent: 1200, limit: 2000, color: 'bg-neon-purple' },
  ];

  return (
    <div className="h-full flex flex-col">
        <div className="flex items-center justify-between mb-6">
            <h3 className="text-white font-light flex items-center gap-2">
                <TrendingDown className="text-red-400" size={18} />
                Monthly Outflow
            </h3>
            <span className="text-xl font-mono font-bold text-white">$7,800</span>
        </div>

        <div className="space-y-5 flex-1">
            {categories.map((cat) => {
                const percent = (cat.spent / cat.limit) * 100;
                return (
                    <div key={cat.name} className="group">
                        <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-400 group-hover:text-white transition-colors">{cat.name}</span>
                            <span className="font-mono text-gray-300">${cat.spent} <span className="text-gray-600">/ ${cat.limit}</span></span>
                        </div>
                        <div className="relative w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                            {/* Background Grid Line */}
                            <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-20" />
                            <div 
                                className={`h-full rounded-full ${cat.color} shadow-[0_0_10px_currentColor] transition-all duration-1000 ease-out`}
                                style={{ width: `${percent}%` }} 
                            />
                        </div>
                    </div>
                )
            })}
        </div>
        
        <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-gray-500">
            <span>Projected EOM: $8,200</span>
            <button 
                className="hover:text-neon-blue transition-colors"
                aria-label="Download expense report"
            >
                Download Report
            </button>
        </div>
    </div>
  );
};