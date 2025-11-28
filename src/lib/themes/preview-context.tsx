/**
 * Theme Preview Context
 * 
 * Provides context for theme components to know they're in preview mode
 * and handle navigation/links appropriately
 */

'use client';

import { createContext, useContext, ReactNode } from 'react';

interface PreviewContextValue {
  isPreview: boolean;
  onNavigate?: (path: string) => void;
  onProductClick?: (productId: string) => void;
}

const PreviewContext = createContext<PreviewContextValue>({
  isPreview: false,
});

export function PreviewProvider({
  children,
  isPreview = false,
  onNavigate,
  onProductClick,
}: {
  children: ReactNode;
  isPreview?: boolean;
  onNavigate?: (path: string) => void;
  onProductClick?: (productId: string) => void;
}) {
  return (
    <PreviewContext.Provider value={{ isPreview, onNavigate, onProductClick }}>
      {children}
    </PreviewContext.Provider>
  );
}

export function usePreview() {
  const context = useContext(PreviewContext);
  // Return safe defaults if context is not available (component used outside PreviewProvider)
  return {
    isPreview: context?.isPreview ?? false,
    onNavigate: context?.onNavigate,
    onProductClick: context?.onProductClick,
  };
}

