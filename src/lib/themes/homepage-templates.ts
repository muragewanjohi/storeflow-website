/**
 * Homepage Template Utilities
 * 
 * Handles creation of homepage templates when themes are installed
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import type { PageBuilderData, PageSection } from '@/lib/content/page-builder-types';

interface LegacyPageBuilderAddon {
  id?: number;
  addon_name: string;
  addon_type: string;
  addon_location: string;
  addon_order: number;
  addon_page_id?: number;
  addon_page_type: string;
  addon_settings: string; // JSON string
  addon_namespace?: string;
  created_at?: string;
  updated_at?: string;
}

interface LegacyPageData {
  id?: number;
  title: string;
  slug: string;
  theme_slug?: string;
  page_content: string;
  visibility: number;
  breadcrumb: number;
  page_builder: number;
  status: number;
  navbar_variant?: string;
  footer_variant?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Get homepage template data for a theme
 */
export function getHomepageTemplateData(themeSlug: string): LegacyPageData | null {
  try {
    const filePath = join(process.cwd(), '..', 'assets', 'tenant', 'page-layout', 'home-pages', 'dynamic-pages.json');
    const fileContent = readFileSync(filePath, 'utf-8');
    const data = JSON.parse(fileContent);
    
    const pages = data.data || data;
    const homepage = pages.find((page: LegacyPageData) => 
      page.theme_slug === themeSlug || 
      page.slug?.includes(themeSlug.toLowerCase())
    );
    
    return homepage || null;
  } catch (error) {
    console.error(`Error reading homepage template for ${themeSlug}:`, error);
    return null;
  }
}

/**
 * Get homepage layout (page builder sections) for a theme
 */
export function getHomepageLayout(themeSlug: string): LegacyPageBuilderAddon[] | null {
  try {
    const layoutFileName = `${themeSlug}-layout.json`;
    const filePath = join(process.cwd(), '..', 'assets', 'tenant', 'page-layout', 'home-pages', layoutFileName);
    const fileContent = readFileSync(filePath, 'utf-8');
    const data = JSON.parse(fileContent);
    
    // Handle both array and object with data property
    const layout = Array.isArray(data) ? data : (data.data || []);
    return layout;
  } catch (error) {
    console.error(`Error reading homepage layout for ${themeSlug}:`, error);
    return null;
  }
}

/**
 * Map legacy addon names to new section types
 */
function mapLegacyAddonToSectionType(addonName: string): string {
  const mapping: Record<string, string> = {
    'HeaderOne': 'hero',
    'Hero': 'hero',
    'FeaturedProductSlider': 'products',
    'ProductTypeList': 'products',
    'CollectionArea': 'features',
    'DealArea': 'features',
    'FlashStore': 'products',
    'BlogOne': 'text',
    'Brand': 'features',
    'Testimonial': 'testimonials',
    'Newsletter': 'text',
  };

  return mapping[addonName] || 'text';
}

/**
 * Convert legacy page builder format to new PageBuilderData format
 */
export function convertLegacyLayoutToPageBuilder(
  legacyAddons: LegacyPageBuilderAddon[]
): PageBuilderData {
  const sections = legacyAddons
    .sort((a, b) => a.addon_order - b.addon_order)
    .map((addon, index) => {
      let settings: any = {};
      try {
        settings = JSON.parse(addon.addon_settings);
      } catch {
        // If parsing fails, use empty object
      }

      const sectionType = mapLegacyAddonToSectionType(addon.addon_name);
      
      // Convert to new format based on section type
      const baseSection: any = {
        id: `section-${index + 1}`,
        type: sectionType,
        order: addon.addon_order || index + 1,
      };

      // Map settings to section properties based on type
      if (sectionType === 'hero') {
        return {
          ...baseSection,
          type: 'hero' as const,
          title: settings.title || settings.title_?.[0] || 'Welcome',
          subtitle: settings.subtitle || settings.subtitle_?.[0] || '',
          description: settings.short_description || '',
          image: settings.background_image || settings.bg_image || '',
          cta_text: settings.button_text || settings.shop_button_text_?.[0] || 'Shop Now',
          cta_link: settings.button_url || settings.shop_button_url_?.[0] || '/products',
        } as PageSection;
      } else if (sectionType === 'products') {
        return {
          ...baseSection,
          type: 'products' as const,
          title: settings.title || 'Featured Products',
          subtitle: settings.subtitle || '',
          limit: settings.item_show || settings.items || 8,
          columns: 4,
          product_ids: settings.products || [],
        } as PageSection;
      } else if (sectionType === 'features') {
        return {
          ...baseSection,
          type: 'features' as const,
          title: settings.title || '',
          subtitle: settings.subtitle || settings.short_description || '',
          features: [],
          columns: 3,
        } as PageSection;
      } else if (sectionType === 'testimonials') {
        return {
          ...baseSection,
          type: 'testimonials' as const,
          title: settings.title || 'Testimonials',
          testimonials: [],
          columns: 3,
        } as PageSection;
      } else {
        // Default text section
        return {
          ...baseSection,
          type: 'text' as const,
          content: settings.text || settings.content || '',
        } as PageSection;
      }
    });

  return {
    sections: sections as any,
  };
}

/**
 * Create a simple default homepage template if theme-specific one doesn't exist
 */
export function createDefaultHomepageTemplate(themeSlug: string, tenantName: string): PageBuilderData {
  return {
    sections: [
      {
        id: 'hero-1',
        type: 'hero' as const,
        order: 1,
        title: `Welcome to ${tenantName}`,
        subtitle: 'Discover amazing products and great deals',
        cta_text: 'Shop Now',
        cta_link: '/products',
      },
      {
        id: 'products-1',
        type: 'products' as const,
        order: 2,
        title: 'Featured Products',
        limit: 8,
        columns: 4,
      },
      {
        id: 'features-1',
        type: 'features' as const,
        order: 3,
        title: 'Why Shop With Us',
        subtitle: 'Discover what makes us special',
        features: [
          {
            id: 'feature-1',
            title: 'Fast Shipping',
            description: 'Free shipping on orders over $50',
          },
          {
            id: 'feature-2',
            title: 'Secure Payment',
            description: 'Your payment information is safe',
          },
          {
            id: 'feature-3',
            title: '24/7 Support',
            description: 'We\'re here to help anytime',
          },
        ],
        columns: 3,
      },
    ] as PageSection[],
  };
}
