/**
 * Theme Registry
 * 
 * Central registry for theme templates with industry-specific components
 * 
 * Day 37: Theme Templates with Demo Content
 */

import type { ThemeConfig } from '@/types/theme';

export type ThemeIndustry = 'electronics' | 'fashion' | 'general' | 'grocery';

export interface ThemeTemplateConfig {
  id: string;
  name: string;
  slug: string;
  industry: ThemeIndustry;
  description: string;
  screenshotUrl?: string; // Preview/screenshot image for theme marketplace
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
    screenshotUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=800&fit=crop',
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
        'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800&h=800&fit=crop',
        'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&h=800&fit=crop',
        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&h=800&fit=crop',
      ],
    },
  },
  hexfashion: {
    id: 'hexfashion',
    name: 'HexFashion',
    slug: 'hexfashion',
    industry: 'fashion',
    description: 'Elegant fashion theme with catalog-style layouts',
    screenshotUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&h=800&fit=crop',
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
        'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=800&fit=crop',
        'https://images.unsplash.com/photo-1445205170230-053b83016050?w=800&h=800&fit=crop',
        'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800&h=800&fit=crop',
      ],
    },
  },
  default: {
    id: 'default',
    name: 'Default',
    slug: 'default',
    industry: 'electronics',
    description: 'Most appealing theme with hero, testimonials, and blogs - perfect for computer and electronics stores',
    screenshotUrl: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1200&h=800&fit=crop',
    layout: {
      header: 'sticky',
      productGrid: 'grid',
      sidebar: 'none',
      footer: 'multi-column',
    },
    componentPaths: {
      Header: '@/components/storefront/header',
      Footer: '@/components/storefront/footer',
      ProductCard: '@/components/themes/default/ProductCard',
      ProductGrid: '@/components/themes/default/ProductGrid',
      Hero: '@/components/themes/default/Hero',
      Homepage: '@/components/themes/default/Homepage',
    },
    demoContent: {
      products: 12,
      categories: 4,
      images: [
        'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&h=800&fit=crop',
        'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&h=800&fit=crop',
        'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&h=800&fit=crop',
        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&h=800&fit=crop',
      ],
    },
  },
  minimal: {
    id: 'minimal',
    name: 'Minimal',
    slug: 'minimal',
    industry: 'general',
    description: 'A minimal and elegant theme with clean lines and simple design',
    screenshotUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&h=800&fit=crop',
    layout: {
      header: 'minimal',
      productGrid: 'grid',
      sidebar: 'none',
      footer: 'minimal',
    },
    componentPaths: {
      Header: '@/components/themes/minimal/Header',
      Footer: '@/components/themes/minimal/Footer',
      ProductCard: '@/components/themes/minimal/ProductCard',
      ProductGrid: '@/components/themes/minimal/ProductGrid',
      Hero: '@/components/storefront/hero',
      Homepage: '@/components/themes/minimal/Homepage',
    },
    demoContent: {
      products: 8,
      categories: 3,
      images: [
        'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=800&fit=crop',
        'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=800&fit=crop',
      ],
    },
  },
  grocery: {
    id: 'grocery',
    name: 'Grocery',
    slug: 'grocery',
    industry: 'grocery',
    description: 'Fresh and organic grocery theme perfect for food stores, farmers markets, and organic food retailers',
    screenshotUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&h=800&fit=crop',
    layout: {
      header: 'sticky',
      productGrid: 'grid',
      sidebar: 'none',
      footer: 'multi-column',
    },
    componentPaths: {
      Header: '@/components/themes/grocery/Header',
      Footer: '@/components/themes/grocery/Footer',
      ProductCard: '@/components/themes/grocery/ProductCard',
      ProductGrid: '@/components/themes/grocery/ProductGrid',
      Hero: '@/components/themes/grocery/Hero',
      Homepage: '@/components/themes/grocery/Homepage',
    },
    demoContent: {
      products: 12,
      categories: 8,
      images: [
        'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&h=800&fit=crop',
        'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=800&h=800&fit=crop',
        'https://images.unsplash.com/photo-1603048297172-c92544798d5e?w=800&h=800&fit=crop',
        'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=800&h=800&fit=crop',
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

/**
 * Get screenshot URL for a theme by slug
 * Returns the screenshot URL from the theme template registry
 */
export function getThemeScreenshotUrl(slug: string): string | undefined {
  const template = themeTemplates[slug];
  return template?.screenshotUrl;
}

