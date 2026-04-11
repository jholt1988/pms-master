import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Wallet, Users, Home, Wrench, RefreshCw, AlertTriangle, BookOpen } from 'lucide-react';
import type { IntentChip } from '../types';

const chips: IntentChip[] = [
  { label: 'Collect Rent', icon: 'wallet', domain: 'payments', route: '/payments' },
  { label: 'Review Applicants', icon: 'users', domain: 'screening', route: '/screening' },
  { label: 'Fill Vacancies', icon: 'home', domain: 'leasing', route: '/leasing' },
  { label: 'Fix Risks', icon: 'wrench', domain: 'repairs', route: '/repairs' },
  { label: 'Prepare Renewals', icon: 'refresh', domain: 'renewals', route: '/renewals' },
  { label: 'Close Books', icon: 'book', domain: 'financials', route: '/financials' },
];

const iconMap: Record<string, React.ElementType> = {
  wallet: Wallet,
  users: Users,
  home: Home,
  wrench: Wrench,
  refresh: RefreshCw,
  alert: AlertTriangle,
  book: BookOpen,
};

export const IntentBar: React.FC = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.toLowerCase().trim();
    if (!q) return;

    if (q.includes('rent') || q.includes('payment') || q.includes('collect')) {
      navigate('/payments');
    } else if (q.includes('applicant') || q.includes('screen') || q.includes('review')) {
      navigate('/screening');
    } else if (q.includes('vacanc') || q.includes('lease') || q.includes('fill')) {
      navigate('/leasing');
    } else if (q.includes('repair') || q.includes('mainten') || q.includes('fix')) {
      navigate('/repairs');
    } else if (q.includes('renew') || q.includes('expir')) {
      navigate('/renewals');
    } else if (q.includes('book') || q.includes('reconcil') || q.includes('financ') || q.includes('close') || q.includes('statement') || q.includes('journal') || q.includes('ledger')) {
      navigate('/financials');
    }
    setQuery('');
  };

  return (
    <div className="mb-8">
      <form onSubmit={handleSubmit} className="relative mb-4">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="What do you need to do? (e.g. collect rent, review applicants, fix risks...)"
          className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-neon-blue/50 focus:bg-white/8 transition-all"
        />
      </form>

      <div className="flex items-center gap-2 flex-wrap">
        {chips.map((chip) => {
          const Icon = iconMap[chip.icon] || AlertTriangle;
          return (
            <button
              key={chip.label}
              onClick={() => navigate(chip.route)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-300 text-xs font-medium hover:bg-white/10 hover:border-white/20 hover:text-white transition-all"
            >
              <Icon size={14} />
              {chip.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
