/**
 * Lazy Loading Utilities
 * 
 * Provides utilities for lazy loading heavy components to improve initial page load
 * 
 * Day 38: Performance Optimization - Code Splitting
 */

import dynamic from 'next/dynamic';
import { ComponentType } from 'react';

/**
 * Default loading component for lazy-loaded components
 */
export function DefaultLoading() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}

/**
 * Lazy load a component with default loading state
 */
export function lazyLoad<P = {}>(
  importFunc: () => Promise<{ default: ComponentType<P> }>,
  options?: {
    loading?: () => React.ReactElement;
    ssr?: boolean;
  }
) {
  return dynamic(importFunc, {
    loading: options?.loading || (() => <DefaultLoading />),
    ssr: options?.ssr !== false,
  });
}

