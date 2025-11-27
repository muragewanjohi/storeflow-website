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

  return null; // This component doesn't render anything
}

