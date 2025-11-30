import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Card, CardBody, Button } from '@nextui-org/react';
import { useNavigate } from 'react-router-dom';

interface Props {
  children: ReactNode;
  pageName?: string;
  onReset?: () => void;
  onNavigateHome?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Page-Level Error Boundary Component
 * Catches React errors within individual pages and displays a user-friendly error UI
 * This provides better error isolation than a single global boundary
 */
export class PageErrorBoundary extends Component<Props, State> {
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
      console.error(`PageErrorBoundary [${this.props.pageName || 'Unknown'}]:`, error, errorInfo);
    }

    // In production, log to error reporting service
    // Example: Sentry.captureException(error, { 
    //   contexts: { react: errorInfo },
    //   tags: { page: this.props.pageName }
    // });

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
    
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleGoHome = () => {
    if (this.props.onNavigateHome) {
      this.props.onNavigateHome();
    } else {
      // Fallback: use window.location if navigate function not provided
      window.location.href = '/dashboard';
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[400px] p-6">
          <Card className="max-w-md w-full">
            <CardBody className="text-center space-y-4">
              {/* Error Icon */}
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-danger/20 border border-danger/50 flex items-center justify-center">
                  <AlertTriangle className="text-danger" size={32} />
                </div>
              </div>

              {/* Error Title */}
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-1">
                  {this.props.pageName ? `${this.props.pageName} Error` : 'Page Error'}
                </h2>
                <p className="text-sm text-default-500">
                  Something went wrong while loading this page
                </p>
              </div>

              {/* Error Message */}
              <div className="bg-danger/10 border border-danger/30 rounded-lg p-3 text-left">
                <p className="text-danger text-sm">
                  {this.state.error?.message || 'An unexpected error occurred'}
                </p>
              </div>

              {/* Error Details (Development Only) */}
              {import.meta.env.DEV && this.state.errorInfo && (
                <details className="text-left bg-default-100 border border-default-200 rounded-lg p-3">
                  <summary className="text-default-600 text-xs cursor-pointer mb-2">
                    Stack Trace (Dev Only)
                  </summary>
                  <pre className="text-xs text-default-500 overflow-auto max-h-32">
                    {this.state.error?.stack}
                    {'\n\n'}
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 justify-center">
                <Button
                  color="primary"
                  variant="flat"
                  onPress={this.handleReset}
                  startContent={<RefreshCw size={16} />}
                >
                  Try Again
                </Button>
                <Button
                  color="default"
                  variant="bordered"
                  onPress={this.handleGoHome}
                  startContent={<Home size={16} />}
                >
                  Go Home
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Wrapper component that provides navigation functionality to PageErrorBoundary
 * Since PageErrorBoundary is a class component, it can't use hooks directly
 */
export const PageErrorBoundaryWithNav: React.FC<Omit<Props, 'onNavigateHome'>> = (props) => {
  const navigate = useNavigate();
  
  const handleNavigateHome = () => {
    navigate('/dashboard', { replace: true });
  };
  
  return (
    <PageErrorBoundary
      {...props}
      onNavigateHome={handleNavigateHome}
    />
  );
};

