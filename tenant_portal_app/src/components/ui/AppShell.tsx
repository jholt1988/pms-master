import React from 'react';
import { Outlet } from 'react-router-dom';
import { DockNavigation } from './DockNavigation';
import { AIOperatingSystem } from './AIOperatingSystem';
import { Topbar } from './Topbar';
import { MockModeBanner } from '../../mocks/stripeMock';



interface AppShellProps {
  children?: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  return (
    // Main "Universe" Container with animated deep-space gradient
    <div className="min-h-screen w-full bg-deep-900 bg-deep-space text-white font-sans overflow-hidden selection:bg-neon-blue selection:text-deep-900 relative">
      {/* Skip to main content link for keyboard navigation (WCAG 2.4.1) */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      
      {/* Animated Background Gradient */}
      <div className="fixed inset-0 bg-deep-space bg-grid-pattern opacity-30 pointer-events-none" aria-hidden="true" />
      
      {/* Ambient Background Glows */}
      <div className="fixed top-[-20%] left-[-10%] w-[40%] h-[40%] bg-neon-purple/20 rounded-full blur-[120px] animate-pulse-slow pointer-events-none" aria-hidden="true" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[40%] h-[40%] bg-neon-blue/10 rounded-full blur-[120px] animate-pulse-slow pointer-events-none" aria-hidden="true" />

      {/* Mock Mode Banner */}
      <MockModeBanner />

      {/* Top HUD (Time, User Status, AI Status) */}
      <header role="banner">
        <Topbar />
      </header>

      {/* Main Content Scroll Area */}
      <main id="main-content" className="relative z-10 h-screen pt-20 pb-32 px-4 overflow-y-auto no-scrollbar" role="main">
        <div className="max-w-7xl mx-auto">
          {children ?? <Outlet />}
        </div>
      </main>

      {/* Bottom Floating Dock */}
      <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50" aria-label="Main navigation">
        <DockNavigation />
      </nav>
    </div>
  );
};