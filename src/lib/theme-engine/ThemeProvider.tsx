'use client';

import { createContext, useContext, useMemo, useEffect, ReactNode } from 'react';
import type { ThemeConfig, TenantThemeCustomizations, ThemeColors } from '@/types/theme';

// ============================================
// Theme Context
// ============================================

interface ThemeContextValue {
  config: ThemeConfig;
  colors: ThemeConfig['colors'];
  typography: ThemeConfig['typography'];
  layout: ThemeConfig['layout'];
  features: ThemeConfig['features'];
  customizations?: TenantThemeCustomizations;
  updateTheme: (updates: Partial<ThemeConfig>) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

// ============================================
// Theme Provider Component
// ============================================

interface ThemeProviderProps {
  children: ReactNode;
  config: ThemeConfig;
  tenantCustomizations?: TenantThemeCustomizations;
}

export function ThemeProvider({
  children,
  config,
  tenantCustomizations,
}: ThemeProviderProps) {
  // Merge theme config with tenant customizations
  const mergedConfig = useMemo(() => {
    // Filter out undefined values from customizations
    const customColors = tenantCustomizations?.colors 
      ? Object.fromEntries(
          Object.entries(tenantCustomizations.colors).filter(([_, v]) => v !== undefined)
        ) as Partial<ThemeColors>
      : {};
    
    const merged: ThemeConfig = {
      ...config,
      colors: {
        ...config.colors,
        ...customColors,
      } as ThemeColors,
      typography: {
        ...config.typography,
        ...tenantCustomizations?.typography,
      },
      layout: {
        ...config.layout,
        ...tenantCustomizations?.layouts,
      },
    };
    return merged;
  }, [config, tenantCustomizations]);

  // Inject CSS custom properties into document root
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      
      // Set color variables
      Object.entries(mergedConfig.colors).forEach(([key, value]) => {
        const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
        root.style.setProperty(`--color-${cssKey}`, value);
      });
      
      // Set typography variables
      root.style.setProperty('--font-heading', mergedConfig.typography.headingFont);
      root.style.setProperty('--font-body', mergedConfig.typography.bodyFont);
      root.style.setProperty('--font-size-base', `${mergedConfig.typography.baseFontSize}px`);
      
      // Set layout variables
      if (mergedConfig.layout.containerMaxWidth) {
        root.style.setProperty(
          '--container-max-width',
          `${mergedConfig.layout.containerMaxWidth}px`
        );
      }
    }
  }, [mergedConfig]);

  // Inject custom CSS if provided
  useEffect(() => {
    if (tenantCustomizations?.customCss && typeof document !== 'undefined') {
      const styleId = 'tenant-custom-css';
      let styleElement = document.getElementById(styleId) as HTMLStyleElement;
      
      if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = styleId;
        document.head.appendChild(styleElement);
      }
      
      styleElement.textContent = tenantCustomizations.customCss;
      
      // Cleanup on unmount
      return () => {
        const element = document.getElementById(styleId);
        if (element) {
          element.remove();
        }
      };
    }
  }, [tenantCustomizations?.customCss]);

  // Inject custom JavaScript if provided
  useEffect(() => {
    if (tenantCustomizations?.customJs && typeof document !== 'undefined') {
      const scriptId = 'tenant-custom-js';
      let scriptElement = document.getElementById(scriptId) as HTMLScriptElement;
      
      if (!scriptElement) {
        scriptElement = document.createElement('script');
        scriptElement.id = scriptId;
        scriptElement.type = 'text/javascript';
        document.body.appendChild(scriptElement);
      }
      
      // Execute the JavaScript code
      try {
        // Remove old script content if it exists
        scriptElement.textContent = '';
        // Add new script content
        scriptElement.textContent = tenantCustomizations.customJs;
      } catch (error) {
        console.error('Error executing custom JavaScript:', error);
      }
      
      // Cleanup on unmount
      return () => {
        const element = document.getElementById(scriptId);
        if (element) {
          element.remove();
        }
      };
    }
  }, [tenantCustomizations?.customJs]);

  const value: ThemeContextValue = {
    config: mergedConfig,
    colors: mergedConfig.colors,
    typography: mergedConfig.typography,
    layout: mergedConfig.layout,
    features: mergedConfig.features,
    customizations: tenantCustomizations,
    updateTheme: () => {
      // TODO: Implement theme update API call
      console.warn('Theme update not yet implemented');
    },
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

// ============================================
// useTheme Hook
// ============================================

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  
  return context;
}

// ============================================
// Helper Hooks
// ============================================

/**
 * Get theme color by key
 */
export function useThemeColor(colorKey: keyof ThemeConfig['colors']): string {
  const { colors } = useTheme();
  return colors[colorKey] || '';
}

/**
 * Check if a theme feature is enabled
 */
export function useThemeFeature(featureKey: keyof ThemeConfig['features']): boolean {
  const { features } = useTheme();
  return features[featureKey] ?? false;
}

