import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../services/apiClient';
import { useAuth } from '../../AuthContext';
import { AlertCircle, CheckCircle, Zap, Clock } from 'lucide-react';

// Define the ActionIntent type based on expected data
// This should be replaced with an import from a contracts package when available
interface ActionIntent {
  id: string;
  type: 'RISK_MITIGATION' | 'AUTOMATION' | 'ALERT';
  description: string;
  status: 'PENDING' | 'EXECUTED' | 'FAILED';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  createdAt: string;
}

const getPriorityClass = (priority: ActionIntent['priority']) => {
  switch (priority) {
    case 'HIGH':
      return 'border-l-neon-pink';
    case 'MEDIUM':
      return 'border-l-yellow-400';
    case 'LOW':
    default:
      return 'border-l-gray-500';
  }
};

const getIcon = (type: ActionIntent['type']) => {
  switch (type) {
    case 'RISK_MITIGATION':
      return <AlertCircle className="text-neon-pink" size={20} />;
    case 'AUTOMATION':
      return <Zap className="text-neon-purple" size={20} />;
    case 'ALERT':
    default:
      return <CheckCircle className="text-neon-blue" size={20} />;
  }
};

export const ActionIntentFeed = () => {
  const { token } = useAuth();
  const [intents, setIntents] = useState<ActionIntent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchIntents = async () => {
      if (!token) return;
      try {
        // This endpoint is assumed to exist. Backend will need to implement it.
        const data = await apiFetch('/dashboard/action-intents', { token });
        setIntents(data.intents || []);
      } catch (err) {
        console.error('Error fetching action intents:', err);
        setError('Failed to load activity feed.');
        // Use mock data on error for UI development
        setIntents([
          { id: '1', type: 'RISK_MITIGATION', description: 'HVAC unit #3 at 123 Main St showing signs of failure. Proactive maintenance suggested.', status: 'PENDING', priority: 'HIGH', createdAt: new Date().toISOString() },
          { id: '2', type: 'AUTOMATION', description: 'Rent payment for Unit 5B automatically processed.', status: 'EXECUTED', priority: 'LOW', createdAt: new Date(Date.now() - 3600000).toISOString() },
          { id: '3', type: 'ALERT', description: 'Lease for 7A expires in 30 days. Renewal notice prepared.', status: 'PENDING', priority: 'MEDIUM', createdAt: new Date(Date.now() - 7200000).toISOString() },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchIntents();
  }, [token]);

  const timeSince = (date: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "mo ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m ago";
    return Math.floor(seconds) + "s ago";
  };
  
  return (
    <div>
      <h3 className="text-white font-light flex items-center gap-2 mb-4">
        <Zap className="text-neon-purple" size={18} />
        System Intelligence Feed
      </h3>
      {loading && <p className="text-gray-400 text-sm">Loading feed...</p>}
      {error && <p className="text-red-400 text-sm">{error}</p>}
      {!loading && intents.length === 0 && <p className="text-gray-500 text-sm">No recent system activity.</p>}
      <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
        {intents.map((intent) => (
          <div key={intent.id} className={`bg-white/5 p-3 rounded-lg border-l-4 ${getPriorityClass(intent.priority)} flex items-start gap-3`}>
            <div className="flex-shrink-0 mt-1">{getIcon(intent.type)}</div>
            <div className="flex-grow">
              <p className="text-white text-sm">{intent.description}</p>
              <div className="text-xs text-gray-400 flex items-center gap-2 mt-1">
                <Clock size={12} />
                <span>{timeSince(intent.createdAt)}</span>
                <span className="font-mono uppercase text-gray-500">{intent.status}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
