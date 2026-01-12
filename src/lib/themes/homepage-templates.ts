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
 * Create grocery theme homepage template matching GroceryHomepage component
 */
export function createGroceryHomepageTemplate(tenantName: string): PageBuilderData {
  return {
    sections: [
      {
        id: 'hero-1',
        type: 'hero' as const,
        order: 1,
        title: 'Organic Food For Health',
        subtitle: 'We collect pure natural organic healthy food and provide you through packaging.',
        description: '',
        image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&h=600&fit=crop',
        cta_text: 'Order Now',
        cta_link: '/products',
        background_color: '#fef3c7',
      },
      {
        id: 'categories-1',
        type: 'categories' as const,
        order: 2,
        title: 'Browse By Categories',
        limit: 8,
        columns: 8,
        show_count: true,
      },
      {
        id: 'banners-1',
        type: 'banners' as const,
        order: 3,
        banners: [
          {
            id: 'banner-1',
            title: 'Now Get 20% Off For Fruits',
            image: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=600&h=400&fit=crop',
            cta_text: 'Buy Now',
            cta_link: '/products?category=pure-fruits',
            background_color: '#fef3c7',
          },
          {
            id: 'banner-2',
            title: 'Pure Vegetables For Health',
            image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&h=400&fit=crop',
            cta_text: 'Buy Now',
            cta_link: '/products?category=vegetables',
            background_color: '#d1fae5',
          },
          {
            id: 'banner-3',
            title: 'Face Nourishing Beauty creams',
            image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&h=400&fit=crop',
            cta_text: 'Buy Now',
            cta_link: '/products',
            background_color: '#fce7f3',
          },
        ],
        columns: 3,
      },
      {
        id: 'sales-tab-1',
        type: 'sales_tab' as const,
        order: 4,
        display_mode: 'single_sale',
        layout: 'grid',
        columns: 4,
        title: 'Super Flash Sale',
        limit: 8,
        show_countdown: true,
        show_badge: true,
        banner_style: 'contained',
        product_card_style: 'default',
        cta_text: 'Shop More',
        cta_position: 'top_right',
      },
      {
        id: 'features-1',
        type: 'features' as const,
        order: 5,
        title: '',
        subtitle: '',
        features: [
          {
            id: 'feature-1',
            title: 'Handmade Products',
            description: 'We collect fresh natural fruits for your healthy life.',
            icon: '🌿',
          },
          {
            id: 'feature-2',
            title: 'Organic and Fresh',
            description: 'Our all products 100% natural and fresh.',
            icon: '🛒',
          },
          {
            id: 'feature-3',
            title: '150+ Organic Items',
            description: 'We have 150+ organic food for our trusted customers.',
            icon: '⚡',
          },
          {
            id: 'feature-4',
            title: '100% Secure Payment',
            description: 'We make sure our all client\'s payment method secure.',
            icon: '🛡️',
          },
          {
            id: 'feature-5',
            title: 'Temperature Control',
            description: 'We always try to control our items for healthy.',
            icon: '🌡️',
          },
          {
            id: 'feature-6',
            title: 'Super Fast Delivery',
            description: 'Our all delivery services fast and secure from damage.',
            icon: '🚚',
          },
        ],
        columns: 3,
      },
      {
        id: 'product-tabs-1',
        type: 'product_tabs' as const,
        order: 6,
        title: 'Weekly Best Selling Organic Items',
        tabs: [
          {
            id: 'tab-popular',
            label: 'Popular',
            filter: 'popular',
          },
          {
            id: 'tab-new',
            label: 'Newly Added',
            filter: 'new',
          },
          {
            id: 'tab-low-price',
            label: 'Low Price',
            filter: 'low_price',
          },
        ],
        limit: 8,
        columns: 4,
        default_tab: 'tab-popular',
      },
      {
        id: 'split-layout-1',
        type: 'split_layout' as const,
        order: 7,
        left_side: {
          type: 'banner',
          title: 'Enjoy Our Organic Vegetables',
          image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&h=800&fit=crop',
          cta_text: 'Order Now',
          cta_link: '/products?category=vegetables',
          background_color: '#d1fae5',
        },
        right_side: {
          type: 'products',
          title: 'Top Rated',
          limit: 4,
          columns: 2,
        },
      },
      {
        id: 'cta-1',
        type: 'cta' as const,
        order: 8,
        title: 'We Make Your Daily Life More Easy',
        subtitle: 'Fresh, Affordable, and Delivered to Your Door!',
        cta_text: 'Continue Your Shopping',
        cta_link: '/products',
        background_gradient: 'linear-gradient(to right, #16a34a, #059669)',
        text_color: '#ffffff',
      },
    ] as PageSection[],
  };
}

/**
 * Create a simple default homepage template if theme-specific one doesn't exist
 */
export function createDefaultHomepageTemplate(themeSlug: string, tenantName: string): PageBuilderData {
  // Use grocery template for grocery theme
  if (themeSlug === 'grocery') {
    return createGroceryHomepageTemplate(tenantName);
  }

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
