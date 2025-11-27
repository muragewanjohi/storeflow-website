/**
 * Theme Provider Wrapper for Storefront
 * 
 * Loads and applies theme customizations (colors, fonts, CSS, JS) to storefront pages
 * 
 * Day 36: Homepage builder theme integration
 */

'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

export default function ThemeProviderWrapper({ children }: { children: React.ReactNode }) {
  const { data: themeData } = useQuery({
    queryKey: ['current-theme'],
    queryFn: async () => {
      const response = await fetch('/api/themes/current');
      if (!response.ok) return null;
      return await response.json();
    },
  });

  const theme = themeData?.theme;
  const customizations = themeData?.customizations;

  // Apply theme colors and fonts
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    
    // Merge theme colors with customizations
    const themeColors = (theme?.colors || {}) as Record<string, string>;
    const customColors = (customizations?.custom_colors || {}) as Record<string, string>;
    const colors = { ...themeColors, ...customColors };

    // Apply color CSS variables
    Object.entries(colors).forEach(([key, value]) => {
      if (value) {
        const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
        root.style.setProperty(`--color-${cssKey}`, value);
        // Also set as Tailwind CSS variables
        if (key === 'primary') root.style.setProperty('--primary', value);
        if (key === 'secondary') root.style.setProperty('--secondary', value);
        if (key === 'accent') root.style.setProperty('--accent', value);
        if (key === 'background') root.style.setProperty('--background', value);
        if (key === 'text') root.style.setProperty('--foreground', value);
      }
    });

    // Apply typography
    const themeTypography = (theme?.typography || {}) as Record<string, string | number>;
    const customTypography = (customizations?.custom_fonts || {}) as Record<string, string | number>;
    const typography = { ...themeTypography, ...customTypography };

    if (typography.headingFont) {
      root.style.setProperty('--font-heading', String(typography.headingFont));
    }
    if (typography.bodyFont) {
      root.style.setProperty('--font-body', String(typography.bodyFont));
    }
    if (typography.baseFontSize) {
      root.style.setProperty('--font-size-base', `${typography.baseFontSize}px`);
    }

    // Apply layout variables
    const layouts = (customizations?.custom_layouts || {}) as Record<string, string | number>;
    if (layouts.containerMaxWidth) {
      root.style.setProperty('--container-max-width', `${layouts.containerMaxWidth}px`);
    }

    return () => {
      // Cleanup on unmount
      Object.keys(colors).forEach((key) => {
        const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
        root.style.removeProperty(`--color-${cssKey}`);
      });
    };
  }, [theme, customizations]);

  // Inject custom CSS
  useEffect(() => {
    if (customizations?.custom_css && typeof document !== 'undefined') {
      const styleId = 'tenant-custom-css';
      let styleElement = document.getElementById(styleId) as HTMLStyleElement;
      
      if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = styleId;
        document.head.appendChild(styleElement);
      }
      
      styleElement.textContent = customizations.custom_css;
      
      return () => {
        const element = document.getElementById(styleId);
        if (element) {
          element.remove();
        }
      };
    }
  }, [customizations?.custom_css]);

  // Inject custom JavaScript
  useEffect(() => {
    if (customizations?.custom_js && typeof document !== 'undefined') {
      const scriptId = 'tenant-custom-js';
      let scriptElement = document.getElementById(scriptId) as HTMLScriptElement;
      
      if (!scriptElement) {
        scriptElement = document.createElement('script');
        scriptElement.id = scriptId;
        scriptElement.type = 'text/javascript';
        document.body.appendChild(scriptElement);
      }
      
      try {
        scriptElement.textContent = '';
        scriptElement.textContent = customizations.custom_js;
      } catch (error) {
        console.error('Error executing custom JavaScript:', error);
      }
      
      return () => {
        const element = document.getElementById(scriptId);
        if (element) {
          element.remove();
        }
      };
    }
  }, [customizations?.custom_js]);

  return <>{children}</>;
}

