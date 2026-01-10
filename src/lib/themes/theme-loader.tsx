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
  
  if (!template) {
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
    case 'minimal':
      return dynamic(() => import('@/components/themes/minimal/Header'), {
        ssr: true,
        loading: () => <DefaultHeader />,
      });
    case 'grocery':
      return dynamic(() => import('@/components/themes/grocery/Header'), {
        ssr: true,
        loading: () => <DefaultHeader />,
      });
    case 'furniture':
      return dynamic(() => import('@/components/themes/furniture/Header'), {
        ssr: true,
        loading: () => <DefaultHeader />,
      });
    case 'default':
    default:
      return DefaultHeader;
  }
}

/**
 * Load theme-specific footer component
 */
export function loadThemeFooter(themeSlug: string) {
  const template = getThemeTemplate(themeSlug);
  
  if (!template) {
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
    case 'minimal':
      return dynamic(() => import('@/components/themes/minimal/Footer'), {
        ssr: true,
        loading: () => <DefaultFooter />,
      });
    case 'grocery':
      return dynamic(() => import('@/components/themes/grocery/Footer'), {
        ssr: true,
        loading: () => <DefaultFooter />,
      });
    case 'furniture':
      return dynamic(() => import('@/components/themes/furniture/Footer'), {
        ssr: true,
        loading: () => <DefaultFooter />,
      });
    case 'default':
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
    case 'default':
      return dynamic(() => import('@/components/themes/default/Hero'), {
        ssr: true,
      });
    case 'grocery':
      return dynamic(() => import('@/components/themes/grocery/Hero'), {
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
    case 'default':
      return dynamic(() => import('@/components/themes/default/ProductGrid'), {
        ssr: true,
      });
    case 'minimal':
      return dynamic(() => import('@/components/themes/minimal/ProductGrid'), {
        ssr: true,
      });
    case 'grocery':
      return dynamic(() => import('@/components/themes/grocery/ProductGrid'), {
        ssr: true,
      });
    case 'furniture':
      return dynamic(() => import('@/components/themes/furniture/ProductGrid'), {
        ssr: true,
      });
    default:
      return null;
  }
}

/**
 * Load theme-specific homepage component
 */
export function loadThemeHomepage(themeSlug: string) {
  const template = getThemeTemplate(themeSlug);
  
  if (!template) {
    return null;
  }

  switch (themeSlug) {
    case 'modern':
      return dynamic(() => import('@/components/themes/modern/Homepage'), {
        ssr: true,
      });
    case 'hexfashion':
      return dynamic(() => import('@/components/themes/hexfashion/Homepage'), {
        ssr: true,
      });
    case 'default':
      return dynamic(() => import('@/components/themes/default/Homepage'), {
        ssr: true,
      });
    case 'minimal':
      return dynamic(() => import('@/components/themes/minimal/Homepage'), {
        ssr: true,
      });
    case 'grocery':
      return dynamic(() => import('@/components/themes/grocery/Homepage'), {
        ssr: true,
      });
    case 'furniture':
      return dynamic(() => import('@/components/themes/furniture/Homepage'), {
        ssr: true,
      });
    default:
      return null;
  }
}

/**
 * Load theme-specific product detail component
 */
export function loadThemeProductDetail(themeSlug: string) {
  const template = getThemeTemplate(themeSlug);
  
  if (!template) {
    return null;
  }

  switch (themeSlug) {
    case 'hexfashion':
      return dynamic(() => import('@/components/themes/hexfashion/ProductDetail'), {
        ssr: true,
      });
    case 'furniture':
      return dynamic(() => import('@/components/themes/furniture/ProductDetail'), {
        ssr: true,
      });
    default:
      return null; // Use default ProductDetailClient for other themes
  }
}

/**
 * Load theme-specific product card component
 */
export function loadThemeProductCard(themeSlug: string) {
  const template = getThemeTemplate(themeSlug);
  
  if (!template) {
    return null;
  }

  switch (themeSlug) {
    case 'grocery':
      return dynamic(() => import('@/components/themes/grocery/ProductCard'), {
        ssr: true,
      });
    case 'hexfashion':
      return dynamic(() => import('@/components/themes/hexfashion/ProductCard'), {
        ssr: true,
      });
    case 'modern':
      return dynamic(() => import('@/components/themes/modern/ProductCard'), {
        ssr: true,
      });
    case 'furniture':
      return dynamic(() => import('@/components/themes/furniture/ProductCard'), {
        ssr: true,
      });
    case 'minimal':
      return dynamic(() => import('@/components/themes/minimal/ProductCard'), {
        ssr: true,
      });
    case 'default':
    default:
      return dynamic(() => import('@/components/themes/default/ProductCard'), {
        ssr: true,
      });
  }
}

