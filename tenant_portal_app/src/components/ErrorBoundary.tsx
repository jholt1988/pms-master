import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { GlassCard } from './ui/GlassCard';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Global Error Boundary Component
 * Catches React errors and displays a user-friendly error UI
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console in development
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // In production, you could log to an error reporting service
    // Example: Sentry.captureException(error, { contexts: { react: errorInfo } });

    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen w-full bg-deep-900 flex items-center justify-center p-4">
          <GlassCard glowColor="pink" className="max-w-2xl w-full">
            <div className="text-center">
              {/* Error Icon */}
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 rounded-full bg-neon-pink/20 border border-neon-pink/50 flex items-center justify-center">
                  <AlertTriangle className="text-neon-pink" size={40} />
                </div>
              </div>

              {/* Error Title */}
              <h1 className="text-2xl font-sans font-light text-white mb-2">
                System Error Detected
              </h1>
              <p className="text-gray-400 text-sm mb-6 font-mono">
                ERROR_CODE: {this.state.error?.name || 'UNKNOWN'}
              </p>

              {/* Error Message */}
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6 text-left">
                <p className="text-red-400 text-sm font-mono">
                  {this.state.error?.message || 'An unexpected error occurred'}
                </p>
              </div>

              {/* Error Details (Development Only) */}
              {import.meta.env.DEV && this.state.errorInfo && (
                <details className="text-left mb-6 bg-black/40 border border-white/10 rounded-lg p-4">
                  <summary className="text-gray-400 text-xs font-mono cursor-pointer mb-2">
                    Stack Trace (Dev Only)
                  </summary>
                  <pre className="text-xs text-gray-500 font-mono overflow-auto max-h-48">
                    {this.state.error?.stack}
                    {'\n\n'}
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4 justify-center">
                <button
                  onClick={this.handleReset}
                  className="flex items-center gap-2 px-6 py-3 bg-neon-blue/20 border border-neon-blue/50 text-neon-blue rounded-lg hover:bg-neon-blue/30 transition-colors font-mono text-sm uppercase tracking-wider"
                  aria-label="Retry loading the application"
                >
                  <RefreshCw size={16} />
                  Retry
                </button>
                <button
                  onClick={this.handleGoHome}
                  className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 text-white rounded-lg hover:bg-white/10 transition-colors font-mono text-sm uppercase tracking-wider"
                  aria-label="Navigate to dashboard"
                >
                  <Home size={16} />
                  Go Home
                </button>
              </div>

              {/* Help Text */}
              <p className="text-gray-500 text-xs mt-6 font-mono">
                If this error persists, please contact support
              </p>
            </div>
          </GlassCard>
        </div>
      );
    }

    return this.props.children;
  }
}
