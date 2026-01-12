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

  // Helper function to convert hex to HSL for Tailwind CSS variables
  const hexToHsl = (hex: string): string => {
    // Remove # if present
    hex = hex.replace('#', '');
    
    // Parse RGB
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    
    h = Math.round(h * 360);
    s = Math.round(s * 100);
    l = Math.round(l * 100);
    
    return `${h} ${s}% ${l}%`;
  };

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
        
        // Also set as Tailwind CSS variables (convert hex to HSL format)
        if (key === 'primary') {
          const hslValue = hexToHsl(value);
          // Only set primary if buttonBackground is not set (buttonBackground will override)
          if (!colors.buttonBackground) {
            root.style.setProperty('--primary', hslValue);
          }
          // Use buttonText if available, otherwise use text color for primary-foreground (button text)
          if (!colors.buttonText) {
            const textColor = colors.text || '#FFFFFF';
            const textHsl = hexToHsl(textColor);
            root.style.setProperty('--primary-foreground', textHsl);
          }
        }
        if (key === 'secondary') {
          const hslValue = hexToHsl(value);
          root.style.setProperty('--secondary', hslValue);
          // Use text color for secondary-foreground
          const textColor = colors.text || '#FFFFFF';
          const textHsl = hexToHsl(textColor);
          root.style.setProperty('--secondary-foreground', textHsl);
        }
        if (key === 'accent') {
          const hslValue = hexToHsl(value);
          root.style.setProperty('--accent', hslValue);
          // Use text color for accent-foreground
          const textColor = colors.text || '#FFFFFF';
          const textHsl = hexToHsl(textColor);
          root.style.setProperty('--accent-foreground', textHsl);
        }
        if (key === 'background') {
          const hslValue = hexToHsl(value);
          root.style.setProperty('--background', hslValue);
        }
        if (key === 'text') {
          const hslValue = hexToHsl(value);
          root.style.setProperty('--foreground', hslValue);
        }
        if (key === 'muted') {
          const hslValue = hexToHsl(value);
          root.style.setProperty('--muted', hslValue);
          root.style.setProperty('--muted-foreground', hslValue);
        }
        if (key === 'buttonBackground') {
          const hslValue = hexToHsl(value);
          root.style.setProperty('--button-background', hslValue);
        }
        if (key === 'buttonText') {
          const hslValue = hexToHsl(value);
          root.style.setProperty('--button-text', hslValue);
        }
      }
    });

    // After processing all colors, apply button colors to primary/primary-foreground for buttons
    // This ensures buttons use buttonBackground and buttonText when available
    // This makes buttons automatically use the customized button colors
    if (colors.buttonBackground) {
      const buttonBgHsl = hexToHsl(colors.buttonBackground);
      root.style.setProperty('--primary', buttonBgHsl);
    }
    if (colors.buttonText) {
      const buttonTextHsl = hexToHsl(colors.buttonText);
      root.style.setProperty('--primary-foreground', buttonTextHsl);
    }

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
      Object.keys(colors).forEach((key: any) => {
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

