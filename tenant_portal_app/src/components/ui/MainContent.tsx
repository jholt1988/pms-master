import React from 'react';

interface ContentProps {
  className?: string;
  children?: React.ReactNode;
}

export const MainContent: React.FC<ContentProps> = ({ className = '', children }) => {
  return (
    <div className={`content ${className}`}>
      {children}
    </div>
  );
};