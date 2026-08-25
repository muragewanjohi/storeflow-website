/**
 * Theme Scripts Component
 * 
 * Injects custom CSS and JavaScript from theme customizations
 * Used in storefront pages to apply tenant theme customizations
 * 
 * Day 36: Advanced theme features
 */

'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

export default function ThemeScripts() {
  const { data: themeData } = useQuery({
    queryKey: ['current-theme'],
    queryFn: async () => {
      const response = await fetch('/api/themes/current');
      if (!response.ok) return null;
      return await response.json();
    },
  });

  const customizations = themeData?.customizations;

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

  // Custom JavaScript injection was removed (Theme Track B1.4) — direct,
  // confirmed user decision: arbitrary JS execution on customer-facing
  // storefront pages, including real M-Pesa/Pesapal payment flows, isn't a
  // risk this platform takes on. See @/lib/themes/custom-css-sanitizer.ts
  // for the full rationale. Any legacy custom_js still stored on a
  // tenant_themes row is simply never read here anymore.

  return null; // This component doesn't render anything
}

