import React from 'react';

type FeedbackTone = 'error' | 'success' | 'info' | 'warning';

const toneClasses: Record<FeedbackTone, string> = {
  error: 'border-rose-200 bg-rose-50 text-rose-700',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  info: 'border-sky-200 bg-sky-50 text-sky-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
};

interface FeedbackBannerProps {
  tone?: FeedbackTone;
  message: string;
  className?: string;
}

export const FeedbackBanner: React.FC<FeedbackBannerProps> = ({
  tone = 'info',
  message,
  className = '',
}) => {
  return (
    <div role="status" aria-live="polite" className={`rounded-md border px-4 py-3 text-sm ${toneClasses[tone]} ${className}`}>
      {message}
    </div>
  );
};
