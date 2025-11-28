import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AlertCircle, 
  Clock, 
  CheckCircle2, 
  MoreHorizontal,
  ArrowRight,
  MapPin
} from 'lucide-react';
import { apiFetch } from '../../services/apiClient';
import { useAuth } from '../../AuthContext';
import { shouldUseMockData, getMockMaintenanceRequests, MockMaintenanceRequest } from '../../mocks/apiFixtures';

interface Request {
  id: string;
  title: string;
  unit: string;
  priority: 'P1' | 'P2' | 'P3';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  time: string;
}

const mapPriority = (priority: string): 'P1' | 'P2' | 'P3' => {
  if (priority === 'HIGH' || priority === 'EMERGENCY') return 'P1';
  if (priority === 'MEDIUM') return 'P2';
  return 'P3';
};

const mapStatus = (status: string): 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' => {
  if (status === 'PENDING') return 'PENDING';
  if (status === 'IN_PROGRESS') return 'IN_PROGRESS';
  return 'COMPLETED';
};

const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
};

export const MaintenanceCard = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRequests = async () => {
      try {
        let data: MockMaintenanceRequest[];
        
        if (shouldUseMockData()) {
          data = await getMockMaintenanceRequests();
        } else if (token) {
          data = await apiFetch('/maintenance', { token });
        } else {
          data = [];
        }

        // Transform to Request format
        const transformed: Request[] = data.slice(0, 3).map((req) => ({
          id: `REQ-${req.id}`,
          title: req.title,
          unit: req.unit || 'Unknown',
          priority: mapPriority(req.priority),
          status: mapStatus(req.status),
          time: formatTimeAgo(req.createdAt),
        }));

        setRequests(transformed);
      } catch (error) {
        console.error('Failed to load maintenance requests:', error);
        // Fallback to empty array
        setRequests([]);
      } finally {
        setLoading(false);
      }
    };

    loadRequests();
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-400 text-sm font-mono">LOADING...</div>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500 text-sm font-mono">NO ACTIVE REQUESTS</div>
      </div>
    );
  }
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
          onClick={() => navigate('/maintenance-management')}
          className="group relative flex items-center justify-between p-4 rounded-xl bg-transparent border border-white/10 hover:border-neon-blue/50 hover:shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all duration-300 cursor-pointer backdrop-blur-sm"
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
            
            <button 
              className="text-gray-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
              aria-label={`View details for ${item.title}`}
            >
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      ))}

      {/* Footer Action */}
      <button 
        onClick={() => navigate('/maintenance-management')}
        className="w-full py-3 mt-2 flex items-center justify-center gap-2 text-xs font-mono text-gray-400 hover:text-neon-blue transition-colors border-t border-dashed border-white/10"
        aria-label="View all maintenance tickets"
      >
        VIEW ALL TICKETS <ArrowRight size={12} />
      </button>
    </div>
  );
};