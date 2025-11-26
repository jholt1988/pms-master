import React from 'react';
import { Building2 } from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

/**
 * Shared layout for authentication pages (login, signup, password reset)
 * Matches the Digital Twin OS dark theme with glassmorphic design
 */
export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen w-full bg-deep-900 bg-deep-space text-white font-sans overflow-hidden selection:bg-neon-blue selection:text-deep-900 relative">
      {/* Animated Background Gradient */}
      <div className="fixed inset-0 bg-deep-space bg-grid-pattern opacity-30 pointer-events-none" />
      
      {/* Ambient Background Glows */}
      <div className="fixed top-[-20%] left-[-10%] w-[40%] h-[40%] bg-neon-purple/20 rounded-full blur-[120px] animate-pulse-slow pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[40%] h-[40%] bg-neon-blue/10 rounded-full blur-[120px] animate-pulse-slow pointer-events-none" />

      {/* Centered Content */}
      <div className="flex min-h-screen items-center justify-center px-4 py-12 relative z-10">
        <div className="w-full max-w-md">
          {/* Branding Header */}
          <div className="mb-8 text-center">
            <div className="mb-4 flex justify-center">
              <div className="rounded-full p-3 bg-neon-blue/20 border border-neon-blue/50">
                <Building2 
                  size={32} 
                  className="text-neon-blue"
                />
              </div>
            </div>
            <h1 className="text-3xl font-light text-white mb-2 font-sans">
              {title}
            </h1>
            <p className="text-sm text-gray-400 font-sans">
              {subtitle}
            </p>
          </div>

          {/* Content Card */}
          {children}
        </div>
      </div>
    </div>
  );
};
