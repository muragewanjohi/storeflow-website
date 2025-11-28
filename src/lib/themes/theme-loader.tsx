/**
 * Theme Component Loader
 * 
 * Dynamically loads theme-specific components based on theme slug
 * Day 37: Theme Templates
 */

import { getThemeTemplate } from './theme-registry';
import dynamic from 'next/dynamic';

// Default components (fallback)
import DefaultHeader from '@/components/storefront/header';
import DefaultFooter from '@/components/storefront/footer';

/**
 * Load theme-specific header component
 */
export function loadThemeHeader(themeSlug: string) {
  const template = getThemeTemplate(themeSlug);
  
  if (!template || themeSlug === 'default') {
    return DefaultHeader;
  }

  // Dynamically import theme-specific header
  switch (themeSlug) {
    case 'modern':
      return dynamic(() => import('@/components/themes/modern/Header'), {
        ssr: true,
        loading: () => <DefaultHeader />,
      });
    case 'hexfashion':
      return dynamic(() => import('@/components/themes/hexfashion/Header'), {
        ssr: true,
        loading: () => <DefaultHeader />,
      });
    default:
      return DefaultHeader;
  }
}

/**
 * Load theme-specific footer component
 */
export function loadThemeFooter(themeSlug: string) {
  const template = getThemeTemplate(themeSlug);
  
  if (!template || themeSlug === 'default') {
    return DefaultFooter;
  }

  switch (themeSlug) {
    case 'modern':
      return dynamic(() => import('@/components/themes/modern/Footer'), {
        ssr: true,
        loading: () => <DefaultFooter />,
      });
    case 'hexfashion':
      return dynamic(() => import('@/components/themes/hexfashion/Footer'), {
        ssr: true,
        loading: () => <DefaultFooter />,
      });
    default:
      return DefaultFooter;
  }
}

/**
 * Load theme-specific hero component
 */
export function loadThemeHero(themeSlug: string) {
  const template = getThemeTemplate(themeSlug);
  
  if (!template) {
    return null;
  }

  switch (themeSlug) {
    case 'modern':
      return dynamic(() => import('@/components/themes/modern/Hero'), {
        ssr: true,
      });
    case 'hexfashion':
      return dynamic(() => import('@/components/themes/hexfashion/Hero'), {
        ssr: true,
      });
    default:
      return null;
  }
}

/**
 * Load theme-specific product grid component
 */
export function loadThemeProductGrid(themeSlug: string) {
  const template = getThemeTemplate(themeSlug);
  
  if (!template) {
    return null;
  }

  switch (themeSlug) {
    case 'modern':
      return dynamic(() => import('@/components/themes/modern/ProductGrid'), {
        ssr: true,
      });
    case 'hexfashion':
      return dynamic(() => import('@/components/themes/hexfashion/ProductGrid'), {
        ssr: true,
      });
    default:
      return null;
  }
}

