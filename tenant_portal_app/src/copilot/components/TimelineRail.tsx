import React from 'react';

interface TimelineEvent {
  id: string;
  label: string;
  date: string;
  status: 'completed' | 'active' | 'upcoming';
}

export const TimelineRail: React.FC<{ events: TimelineEvent[] }> = ({ events }) => {
  if (!events.length) return null;

  return (
    <div className="flex items-center gap-0 overflow-x-auto pb-2 no-scrollbar">
      {events.map((event, i) => {
        const dotColor = event.status === 'completed'
          ? 'bg-green-500'
          : event.status === 'active'
            ? 'bg-neon-blue animate-pulse'
            : 'bg-gray-600';

        return (
          <React.Fragment key={event.id}>
            <div className="flex flex-col items-center min-w-[80px]">
              <div className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
              <p className="text-[10px] text-gray-400 mt-1 text-center leading-tight">{event.label}</p>
              <p className="text-[9px] text-gray-600 font-mono">{event.date}</p>
            </div>
            {i < events.length - 1 && (
              <div className={`h-px flex-1 min-w-[20px] ${event.status === 'completed' ? 'bg-green-500/50' : 'bg-gray-700'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
