/**
 * React Error Boundary Component
 * 
 * Catches JavaScript errors in child components and displays a fallback UI
 */

'use client';

import React from 'react';
import { ErrorState } from './error-boundary';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ReactErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ReactErrorBoundary] Caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <ErrorState
          title="Something went wrong"
          message={this.state.error?.message || 'An error occurred while loading this page.'}
          actionLabel="Go Home"
          actionHref="/"
        />
      );
    }

    return this.props.children;
  }
}
