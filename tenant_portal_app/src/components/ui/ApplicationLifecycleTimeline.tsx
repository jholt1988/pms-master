import React, { useEffect, useState } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  FileText, 
  Shield, 
  UserCheck, 
  XCircle,
  ArrowRight,
  Circle
} from 'lucide-react';
import { apiFetch } from '../../services/apiClient';
import { useAuth } from '../../AuthContext';

interface LifecycleEvent {
  id: number;
  applicationId: number;
  eventType: string;
  fromStatus?: string;
  toStatus: string;
  performedBy?: {
    userId: number;
    username: string;
    role: string;
  };
  metadata?: Record<string, any>;
  timestamp: string;
}

interface LifecycleStage {
  stage: string;
  status: string;
  progress: number;
  nextSteps: string[];
}

interface ApplicationLifecycleTimelineProps {
  applicationId: number;
  className?: string;
}

const eventIcons: Record<string, React.ReactNode> = {
  SUBMITTED: <FileText className="w-4 h-4" />,
  UNDER_REVIEW: <Clock className="w-4 h-4" />,
  SCREENING_STARTED: <Shield className="w-4 h-4" />,
  SCREENING_COMPLETED: <Shield className="w-4 h-4" />,
  BACKGROUND_CHECK_REQUESTED: <Shield className="w-4 h-4" />,
  BACKGROUND_CHECK_COMPLETED: <Shield className="w-4 h-4" />,
  DOCUMENTS_REQUESTED: <FileText className="w-4 h-4" />,
  DOCUMENTS_RECEIVED: <FileText className="w-4 h-4" />,
  INTERVIEW_SCHEDULED: <UserCheck className="w-4 h-4" />,
  INTERVIEW_COMPLETED: <UserCheck className="w-4 h-4" />,
  APPROVED: <CheckCircle2 className="w-4 h-4" />,
  REJECTED: <XCircle className="w-4 h-4" />,
  WITHDRAWN: <XCircle className="w-4 h-4" />,
  NOTE_ADDED: <FileText className="w-4 h-4" />,
  STATUS_CHANGED: <ArrowRight className="w-4 h-4" />,
};

const eventColors: Record<string, string> = {
  SUBMITTED: 'text-blue-400',
  UNDER_REVIEW: 'text-amber-400',
  SCREENING_STARTED: 'text-purple-400',
  SCREENING_COMPLETED: 'text-purple-500',
  BACKGROUND_CHECK_REQUESTED: 'text-indigo-400',
  BACKGROUND_CHECK_COMPLETED: 'text-indigo-500',
  DOCUMENTS_REQUESTED: 'text-yellow-400',
  DOCUMENTS_RECEIVED: 'text-yellow-500',
  INTERVIEW_SCHEDULED: 'text-cyan-400',
  INTERVIEW_COMPLETED: 'text-cyan-500',
  APPROVED: 'text-green-400',
  REJECTED: 'text-red-400',
  WITHDRAWN: 'text-gray-400',
  NOTE_ADDED: 'text-gray-300',
  STATUS_CHANGED: 'text-blue-300',
};

const formatEventType = (eventType: string): string => {
  return eventType
    .split('_')
    .map(word => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
};

const formatTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
};

export const ApplicationLifecycleTimeline: React.FC<ApplicationLifecycleTimelineProps> = ({
  applicationId,
  className = '',
}) => {
  const { token } = useAuth();
  const [timeline, setTimeline] = useState<LifecycleEvent[]>([]);
  const [lifecycleStage, setLifecycleStage] = useState<LifecycleStage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLifecycleData = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const [timelineData, stageData] = await Promise.all([
          apiFetch(`/rental-applications/${applicationId}/timeline`, { token }),
          apiFetch(`/rental-applications/${applicationId}/lifecycle`, { token }),
        ]);

        setTimeline(timelineData || []);
        setLifecycleStage(stageData || null);
      } catch (err: any) {
        setError(err.message || 'Failed to load lifecycle data');
      } finally {
        setLoading(false);
      }
    };

    fetchLifecycleData();
  }, [applicationId, token]);

  if (loading) {
    return (
      <div className={`bg-black/20 border border-white/10 rounded-xl p-6 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-neon-blue"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-black/20 border border-red-500/20 rounded-xl p-6 ${className}`}>
        <div className="text-red-400 text-sm">{error}</div>
      </div>
    );
  }

  return (
    <div className={`bg-black/20 border border-white/10 rounded-xl p-6 backdrop-blur-sm ${className}`}>
      {/* Lifecycle Stage Summary */}
      {lifecycleStage && (
        <div className="mb-6 pb-6 border-b border-white/10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold text-sm">Current Stage</h3>
            <span className="text-xs text-gray-400 font-mono">{lifecycleStage.progress}%</span>
          </div>
          <div className="mb-2">
            <div className="text-lg text-white font-medium">{lifecycleStage.stage}</div>
            <div className="text-xs text-gray-400 capitalize">{lifecycleStage.status.toLowerCase().replace('_', ' ')}</div>
          </div>
          <div className="w-full bg-white/5 rounded-full h-2 mb-3">
            <div 
              className="bg-gradient-to-r from-neon-blue to-purple-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${lifecycleStage.progress}%` }}
            />
          </div>
          {lifecycleStage.nextSteps.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs text-gray-400 mb-1">Next Steps:</div>
              {lifecycleStage.nextSteps.map((step, idx) => (
                <div key={idx} className="text-xs text-gray-300 flex items-start gap-2">
                  <Circle className="w-2 h-2 mt-1.5 text-neon-blue flex-shrink-0" fill="currentColor" />
                  <span>{step}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Timeline */}
      <div>
        <h3 className="text-white font-semibold text-sm mb-4">Timeline</h3>
        <div className="space-y-4">
          {timeline.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              No lifecycle events yet
            </div>
          ) : (
            timeline.map((event, index) => {
              const isLast = index === timeline.length - 1;
              const icon = eventIcons[event.eventType] || <Circle className="w-4 h-4" />;
              const color = eventColors[event.eventType] || 'text-gray-400';

              return (
                <div key={event.id} className="flex gap-4">
                  {/* Timeline Line */}
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full border-2 border-white/20 bg-black/40 flex items-center justify-center ${color}`}>
                      {icon}
                    </div>
                    {!isLast && (
                      <div className="w-0.5 h-full bg-white/10 mt-2" />
                    )}
                  </div>

                  {/* Event Content */}
                  <div className="flex-1 pb-4">
                    <div className="flex items-start justify-between mb-1">
                      <div className="text-white text-sm font-medium">
                        {formatEventType(event.eventType)}
                      </div>
                      <div className="text-xs text-gray-400 font-mono">
                        {formatTimestamp(event.timestamp)}
                      </div>
                    </div>
                    
                    {event.fromStatus && event.toStatus && event.fromStatus !== event.toStatus && (
                      <div className="text-xs text-gray-400 mb-2 flex items-center gap-2">
                        <span className="capitalize">{event.fromStatus.toLowerCase().replace('_', ' ')}</span>
                        <ArrowRight className="w-3 h-3" />
                        <span className="capitalize">{event.toStatus.toLowerCase().replace('_', ' ')}</span>
                      </div>
                    )}

                    {event.performedBy && (
                      <div className="text-xs text-gray-500 mb-2">
                        by {event.performedBy.username}
                        {event.performedBy.role && (
                          <span className="ml-1 text-gray-600">
                            ({event.performedBy.role.replace('_', ' ')})
                          </span>
                        )}
                      </div>
                    )}

                    {event.metadata && Object.keys(event.metadata).length > 0 && (
                      <div className="text-xs text-gray-500 mt-2">
                        {event.metadata.applicationNumber && (
                          <span className="font-mono text-neon-blue">{event.metadata.applicationNumber}</span>
                        )}
                        {event.metadata.score && (
                          <span className="ml-2">Score: {event.metadata.score}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

