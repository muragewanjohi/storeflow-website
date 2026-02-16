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
  /** Brand name to show in header/logo when previewing multipurpose theme (e.g. "Multipurpose") */
  previewBrandName?: string;
  /** Industry override for demo content when previewing multipurpose theme (e.g. "fashion" for clothes) */
  previewIndustry?: string;
}

const PreviewContext = createContext<PreviewContextValue>({
  isPreview: false,
});

export function PreviewProvider({
  children,
  isPreview = false,
  onNavigate,
  onProductClick,
  previewBrandName,
  previewIndustry,
}: {
  children: ReactNode;
  isPreview?: boolean;
  onNavigate?: (path: string) => void;
  onProductClick?: (productId: string) => void;
  previewBrandName?: string;
  previewIndustry?: string;
}) {
  return (
    <PreviewContext.Provider value={{ isPreview, onNavigate, onProductClick, previewBrandName, previewIndustry }}>
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
    previewBrandName: context?.previewBrandName,
    previewIndustry: context?.previewIndustry,
  };
}

