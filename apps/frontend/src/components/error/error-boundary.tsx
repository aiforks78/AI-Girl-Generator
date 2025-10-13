"use client";

import React from 'react';
import * as Sentry from '@sentry/nextjs';
import { Button } from '@heroui/react';
import { RefreshCw, AlertTriangle, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
  errorId?: string;
}

class ErrorBoundaryClass extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private errorId?: string;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to Sentry
    this.errorId = Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
      tags: {
        component: 'ErrorBoundary',
        section: 'frontend',
      },
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    this.setState({
      error,
      errorInfo,
    });
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    this.errorId = undefined;
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return (
        <FallbackComponent
          error={this.state.error}
          resetError={this.resetError}
          errorId={this.errorId}
        />
      );
    }

    return this.props.children;
  }
}

// Default error fallback component
function DefaultErrorFallback({ error, resetError, errorId }: ErrorFallbackProps) {
  const router = useRouter();

  return (
    <div className="min-h-[400px] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Error Icon */}
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
        </div>

        {/* Error Message */}
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Oops! Something went wrong
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            We're sorry for the inconvenience. The error has been reported and we'll fix it soon.
          </p>
          
          {/* Error ID for support */}
          {errorId && (
            <p className="text-xs text-gray-500 dark:text-gray-500 font-mono">
              Error ID: {errorId}
            </p>
          )}
        </div>

        {/* Error Details (Development only) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="text-left bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
            <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-2">
              Error Details (Development):
            </h3>
            <pre className="text-xs text-red-600 dark:text-red-400 overflow-auto">
              {error.message}
            </pre>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            color="primary"
            variant="solid"
            startContent={<RefreshCw className="w-4 h-4" />}
            onClick={resetError}
          >
            Try Again
          </Button>
          
          <Button
            color="default"
            variant="bordered"
            startContent={<Home className="w-4 h-4" />}
            onClick={() => router.push('/')}
          >
            Go Home
          </Button>
        </div>
      </div>
    </div>
  );
}

// Custom error fallback for generation errors
export function GenerationErrorFallback({ error, resetError, errorId }: ErrorFallbackProps) {
  const router = useRouter();

  return (
    <div className="min-h-[300px] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
        </div>
        
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Generation Failed
          </h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            We couldn't generate your image. Please try again with a different prompt.
          </p>
        </div>

        <div className="flex gap-2 justify-center">
          <Button
            color="primary"
            size="sm"
            onClick={resetError}
          >
            Try Again
          </Button>
          <Button
            color="default"
            variant="bordered"
            size="sm"
            onClick={() => router.push('/workspace')}
          >
            New Generation
          </Button>
        </div>
      </div>
    </div>
  );
}

// Export the main ErrorBoundary component
export default function ErrorBoundary(props: ErrorBoundaryProps) {
  return <ErrorBoundaryClass {...props} />;
}
