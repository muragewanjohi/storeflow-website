/**
 * Theme Registry
 * 
 * Central registry for theme templates with industry-specific components
 * 
 * Day 37: Theme Templates with Demo Content
 */

import type { ThemeConfig } from '@/types/theme';

export type ThemeIndustry = 'electronics' | 'fashion' | 'general';

export interface ThemeTemplateConfig {
  id: string;
  name: string;
  slug: string;
  industry: ThemeIndustry;
  description: string;
  layout: {
    header: 'sticky' | 'transparent' | 'minimal' | 'centered';
    productGrid: 'grid' | 'masonry' | 'list' | 'catalog';
    sidebar: 'left' | 'right' | 'none';
    footer: 'multi-column' | 'simple' | 'minimal';
  };
  componentPaths: {
    Header: string;
    Footer: string;
    ProductCard: string;
    ProductGrid: string;
    Hero: string;
    Homepage?: string;
  };
  demoContent: {
    products: number;
    categories: number;
    images: string[];
  };
}

/**
 * Theme Template Registry
 * Maps theme slugs to their template configurations
 */
export const themeTemplates: Record<string, ThemeTemplateConfig> = {
  modern: {
    id: 'modern',
    name: 'Modern',
    slug: 'modern',
    industry: 'electronics',
    description: 'Clean, tech-focused theme perfect for electronics and gadgets',
    layout: {
      header: 'sticky',
      productGrid: 'grid',
      sidebar: 'none',
      footer: 'multi-column',
    },
    componentPaths: {
      Header: '@/components/themes/modern/Header',
      Footer: '@/components/themes/modern/Footer',
      ProductCard: '@/components/themes/modern/ProductCard',
      ProductGrid: '@/components/themes/modern/ProductGrid',
      Hero: '@/components/themes/modern/Hero',
      Homepage: '@/components/themes/modern/Homepage',
    },
    demoContent: {
      products: 12,
      categories: 4,
      images: [
        'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800',
        'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800',
        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
      ],
    },
  },
  hexfashion: {
    id: 'hexfashion',
    name: 'HexFashion',
    slug: 'hexfashion',
    industry: 'fashion',
    description: 'Elegant fashion theme with catalog-style layouts',
    layout: {
      header: 'minimal',
      productGrid: 'catalog',
      sidebar: 'none',
      footer: 'multi-column',
    },
    componentPaths: {
      Header: '@/components/themes/hexfashion/Header',
      Footer: '@/components/themes/hexfashion/Footer',
      ProductCard: '@/components/themes/hexfashion/ProductCard',
      ProductGrid: '@/components/themes/hexfashion/ProductGrid',
      Hero: '@/components/themes/hexfashion/Hero',
      Homepage: '@/components/themes/hexfashion/Homepage',
    },
    demoContent: {
      products: 12,
      categories: 5,
      images: [
        'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800',
        'https://images.unsplash.com/photo-1445205170230-053b83016050?w=800',
        'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800',
      ],
    },
  },
  default: {
    id: 'default',
    name: 'Default',
    slug: 'default',
    industry: 'general',
    description: 'Versatile theme suitable for any type of store',
    layout: {
      header: 'sticky',
      productGrid: 'grid',
      sidebar: 'none',
      footer: 'multi-column',
    },
    componentPaths: {
      Header: '@/components/storefront/header',
      Footer: '@/components/storefront/footer',
      ProductCard: '@/components/storefront/product-card',
      ProductGrid: '@/components/storefront/product-grid',
      Hero: '@/components/storefront/hero',
    },
    demoContent: {
      products: 8,
      categories: 3,
      images: [
        'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800',
        'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
      ],
    },
  },
};

/**
 * Get theme template configuration by slug
 */
export function getThemeTemplate(slug: string): ThemeTemplateConfig | null {
  return themeTemplates[slug] || themeTemplates.default;
}

/**
 * Get all theme templates
 */
export function getAllThemeTemplates(): ThemeTemplateConfig[] {
  return Object.values(themeTemplates);
}

/**
 * Get theme templates by industry
 */
export function getThemeTemplatesByIndustry(industry: ThemeIndustry): ThemeTemplateConfig[] {
  return Object.values(themeTemplates).filter((template: any) => template.industry === industry);
}

