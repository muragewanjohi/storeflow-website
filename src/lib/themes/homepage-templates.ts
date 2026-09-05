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

function toTitleCase(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

type BusinessTypeContent = {
  hero: { title: string; subtitle: string; image: string };
  banners: Array<{ title: string; image: string; cta_link: string; background_color: string }>;
  features: Array<{ title: string; description: string; icon: string }>;
  splitLayout: { title: string; image: string; cta_link: string; background_color: string };
  productTabsTitle: string;
  ctaTitle: string;
  ctaSubtitle: string;
  heroBackgroundColor?: string;
  ctaGradient?: string;
};

/**
 * Get business-type-specific content for homepage sections.
 *
 * `niche` is the merchant's specific free-text answer to "what are you
 * selling" (e.g. "Video Games"), as distinct from the coarse `businessType`
 * bucket ("Electronics & Gadgets") the switch below matches on — a niche
 * that isn't one of the hardcoded buckets below would otherwise fall through
 * to that bucket's generic copy (or the fully generic default) with no
 * mention of what the store actually sells. When a niche is given, it
 * overrides just the hero title/subtitle with a niche-flavored template —
 * everything else (image, banners, features, etc.) still comes from the
 * matched business-type bucket.
 */
function getBusinessTypeContent(businessType: string, niche?: string): BusinessTypeContent {
  const content = getBusinessTypeContentByBucket(businessType);

  const trimmedNiche = niche?.trim();
  if (trimmedNiche) {
    const nicheTitle = toTitleCase(trimmedNiche);
    content.hero = {
      ...content.hero,
      title: `Everything You Need for ${nicheTitle}`,
      subtitle: `Quality ${nicheTitle} at great prices, delivered fast.`,
    };

    // The matched bucket's banners/split-layout link to business-type-
    // specific collection slugs (e.g. '/collections/smartphones') that won't
    // exist for a niche the bucket wasn't built for (e.g. "Video Games"
    // matched via the coarser "electronics" bucket) — point them at the
    // general catalog instead of a 404, and swap in niche-flavored banner
    // titles so the copy matches what the merchant actually sells. Images
    // stay as the bucket's stock photo here; real niche-specific photos come
    // from the separate AI image-generation pass (buildGenericHomepageImageJobs)
    // that runs after this template is created and patches image fields in
    // place — see applyGenericImagesToPageBuilderData.
    const nicheBannerTitles = [
      `${nicheTitle} - New Arrivals`,
      `${nicheTitle} Best Sellers`,
      `Special Offers on ${nicheTitle}`,
    ];
    content.banners = content.banners.map((banner, index) => ({
      ...banner,
      title: nicheBannerTitles[index] ?? banner.title,
      cta_link: '/products',
    }));
    content.splitLayout = {
      ...content.splitLayout,
      cta_link: '/products',
    };
  }

  return content;
}

function getBusinessTypeContentByBucket(businessType: string): BusinessTypeContent {
  const type = businessType?.toLowerCase() || '';
  
  // Grocery Store / Supermarket
  if (type.includes('grocery') || type.includes('supermarket')) {
    return {
      hero: {
        title: 'Organic Food For Health',
        subtitle: 'We collect pure natural organic healthy food and provide you through packaging.',
        image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&h=600&fit=crop',
      },
      banners: [
        {
          title: 'Now Get 20% Off For Fruits',
          image: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=600&h=400&fit=crop',
          cta_link: '/collections/pure-fruits',
          background_color: '#fef3c7',
        },
        {
          title: 'Pure Vegetables For Health',
          image: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=600&h=400&fit=crop',
          cta_link: '/collections/vegetables',
          background_color: '#d1fae5',
        },
        {
          title: 'Face Nourishing Beauty creams',
          image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&h=400&fit=crop',
          cta_link: '/products',
          background_color: '#fce7f3',
        },
      ],
      features: [
        { title: 'Handmade Products', description: 'We collect fresh natural fruits for your healthy life.', icon: '🌿' },
        { title: 'Organic and Fresh', description: 'Our all products 100% natural and fresh.', icon: '🛒' },
        { title: '150+ Organic Items', description: 'We have 150+ organic food for our trusted customers.', icon: '⚡' },
        { title: '100% Secure Payment', description: 'We make sure our all client\'s payment method secure.', icon: '🛡️' },
        { title: 'Temperature Control', description: 'We always try to control our items for healthy.', icon: '🌡️' },
        { title: 'Super Fast Delivery', description: 'Our all delivery services fast and secure from damage.', icon: '🚚' },
      ],
      splitLayout: {
        title: 'Enjoy Our Organic Vegetables',
        image: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800&h=800&fit=crop',
        cta_link: '/collections/vegetables',
        background_color: '#d1fae5',
      },
      productTabsTitle: 'Weekly Best Selling Organic Items',
      ctaTitle: 'We Make Your Daily Life More Easy',
      ctaSubtitle: 'Fresh, Affordable, and Delivered to Your Door!',
      heroBackgroundColor: '#F0FFF4',
      ctaGradient: 'linear-gradient(to right, #4CAF50, #2E7D32)',
    };
  }
  
  // Pharmacy / Health & Wellness
  if (type.includes('pharmacy') || type.includes('health') || type.includes('wellness')) {
    return {
      hero: {
        title: 'Your Health, Our Priority',
        subtitle: 'Quality medications and wellness products for a healthier you.',
        image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=1200&h=600&fit=crop',
      },
      banners: [
        {
          title: 'Get 15% Off On Vitamins',
          image: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=600&h=400&fit=crop',
          cta_link: '/collections/vitamins-supplements',
          background_color: '#dbeafe',
        },
        {
          title: 'Prescription Medications',
          image: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=600&h=400&fit=crop',
          cta_link: '/collections/prescription-medications',
          background_color: '#fce7f3',
        },
        {
          title: 'Personal Care Essentials',
          image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&h=400&fit=crop',
          cta_link: '/collections/personal-care',
          background_color: '#fef3c7',
        },
      ],
      features: [
        { title: 'Licensed Pharmacy', description: 'All medications from licensed and verified sources.', icon: '💊' },
        { title: 'Expert Consultation', description: 'Get advice from qualified healthcare professionals.', icon: '👨‍⚕️' },
        { title: '100% Authentic', description: 'Genuine products with quality assurance guarantee.', icon: '✅' },
        { title: 'Secure & Private', description: 'Your health information is kept confidential.', icon: '🔒' },
        { title: 'Fast Delivery', description: 'Quick and discreet delivery to your doorstep.', icon: '🚚' },
        { title: '24/7 Support', description: 'Round-the-clock customer service for your needs.', icon: '📞' },
      ],
      splitLayout: {
        title: 'Your Wellness Journey Starts Here',
        image: 'https://images.unsplash.com/photo-1576671081837-49000212a370?w=800&h=800&fit=crop',
        cta_link: '/collections/vitamins-supplements',
        background_color: '#dbeafe',
      },
      productTabsTitle: 'Popular Health & Wellness Products',
      ctaTitle: 'Take Control of Your Health',
      ctaSubtitle: 'Quality Products, Expert Care, Delivered to You!',
      heroBackgroundColor: '#E0F2F1',
      ctaGradient: 'linear-gradient(to right, #009688, #00695C)',
    };
  }
  
  // Fashion / Clothing
  if (type.includes('fashion') || type.includes('clothing')) {
    return {
      hero: {
        title: 'Fashion That Speaks Your Style',
        subtitle: 'Discover the latest trends and timeless classics for every occasion.',
        image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=1200&h=600&fit=crop',
      },
      banners: [
        {
          title: 'New Collection - 30% Off',
          image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&h=400&fit=crop',
          cta_link: '/collections/new-arrivals',
          background_color: '#fce7f3',
        },
        {
          title: 'Summer Essentials',
          image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&h=400&fit=crop',
          cta_link: '/collections/summer-collection',
          background_color: '#fef3c7',
        },
        {
          title: 'Designer Accessories',
          image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=600&h=400&fit=crop',
          cta_link: '/collections/accessories',
          background_color: '#e0e7ff',
        },
      ],
      features: [
        { title: 'Latest Trends', description: 'Stay ahead with the newest fashion collections.', icon: '👗' },
        { title: 'Quality Materials', description: 'Premium fabrics for comfort and durability.', icon: '✨' },
        { title: 'Perfect Fit', description: 'Sizes for every body type and style preference.', icon: '📏' },
        { title: 'Easy Returns', description: 'Hassle-free returns within 30 days.', icon: '↩️' },
        { title: 'Fast Shipping', description: 'Quick delivery to get your style faster.', icon: '🚚' },
        { title: 'Style Guide', description: 'Expert styling tips and outfit inspiration.', icon: '💡' },
      ],
      splitLayout: {
        title: 'Express Your Unique Style',
        image: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800&h=800&fit=crop',
        cta_link: '/collections/new-arrivals',
        background_color: '#fce7f3',
      },
      productTabsTitle: 'Trending Fashion Collections',
      ctaTitle: 'Elevate Your Wardrobe',
      ctaSubtitle: 'Style, Quality, and Affordability Combined!',
      heroBackgroundColor: '#F5F5F5',
      ctaGradient: 'linear-gradient(to right, #000000, #424242)',
    };
  }
  
  // Electronics & Mobile Phones
  if (type.includes('electronics') || type.includes('mobile') || type.includes('phones')) {
    return {
      hero: {
        title: 'Latest Technology at Your Fingertips',
        subtitle: 'Cutting-edge electronics and mobile devices for modern living.',
        image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=1200&h=600&fit=crop',
      },
      banners: [
        {
          title: 'Smartphones - Up to 25% Off',
          image: 'https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?w=600&h=400&fit=crop',
          cta_link: '/collections/smartphones',
          background_color: '#e0e7ff',
        },
        {
          title: 'Laptops & Computers',
          image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&h=400&fit=crop',
          cta_link: '/collections/laptops',
          background_color: '#dbeafe',
        },
        {
          title: 'Audio & Accessories',
          image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=400&fit=crop',
          cta_link: '/collections/audio',
          background_color: '#f3e8ff',
        },
      ],
      features: [
        { title: 'Latest Models', description: 'Newest devices from top brands available.', icon: '📱' },
        { title: 'Warranty Included', description: 'Manufacturer warranty on all products.', icon: '🛡️' },
        { title: 'Expert Support', description: 'Technical assistance when you need it.', icon: '🔧' },
        { title: 'Secure Payment', description: 'Safe and encrypted payment processing.', icon: '💳' },
        { title: 'Fast Delivery', description: 'Quick shipping for urgent tech needs.', icon: '⚡' },
        { title: 'Trade-In Program', description: 'Upgrade by trading in your old device.', icon: '🔄' },
      ],
      splitLayout: {
        title: 'Upgrade to the Latest Technology',
        image: 'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=800&h=800&fit=crop',
        cta_link: '/collections/smartphones',
        background_color: '#e0e7ff',
      },
      productTabsTitle: 'Best Selling Electronics',
      ctaTitle: 'Experience Innovation',
      ctaSubtitle: 'Premium Tech, Best Prices, Expert Service!',
      heroBackgroundColor: '#EFF6FF',
      ctaGradient: 'linear-gradient(to right, #146EB4, #232F3E)',
    };
  }
  
  // Beauty & Personal Care
  if (type.includes('beauty') || type.includes('personal care')) {
    return {
      hero: {
        title: 'Beauty That Radiates From Within',
        subtitle: 'Premium beauty and personal care products for your daily routine.',
        image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=1200&h=600&fit=crop',
      },
      heroBackgroundColor: '#FDF2F8',
      banners: [
        {
          title: 'Skincare Essentials - 20% Off',
          image: 'https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?w=600&h=400&fit=crop',
          cta_link: '/collections/skincare',
          background_color: '#FDF2F8',
        },
        {
          title: 'Makeup Must-Haves',
          image: 'https://images.unsplash.com/photo-1583241800698-e8ab01830a07?w=600&h=400&fit=crop',
          cta_link: '/collections/makeup',
          background_color: '#FEF3C7',
        },
        {
          title: 'Hair Care Favourites',
          image: 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=600&h=400&fit=crop',
          cta_link: '/collections/hair-care',
          background_color: '#EDE9FE',
        },
      ],
      features: [
        { title: 'Premium Brands', description: 'Top beauty brands from around the world.', icon: '✨' },
        { title: 'Cruelty-Free', description: 'Ethical products that care for you and nature.', icon: '🐰' },
        { title: 'Expert Advice', description: 'Beauty tips and recommendations from experts.', icon: '💄' },
        { title: 'Sample Sizes', description: 'Try before you buy with sample products.', icon: '🧪' },
        { title: 'Fast Delivery', description: 'Quick shipping for your beauty essentials.', icon: '🚚' },
        { title: 'Loyalty Rewards', description: 'Earn points with every purchase.', icon: '🎁' },
      ],
      splitLayout: {
        title: 'Discover Your Perfect Beauty Routine',
        image: 'https://images.unsplash.com/photo-1487412912498-0447578fcca8?w=800&h=800&fit=crop',
        cta_link: '/collections/skincare',
        background_color: '#FDF2F8',
      },
      productTabsTitle: 'Popular Beauty Products',
      ctaTitle: 'Unleash Your Natural Beauty',
      ctaSubtitle: 'Quality Products, Expert Care, Beautiful Results!',
      ctaGradient: 'linear-gradient(to right, #E91E63, #9C27B0)',
    };
  }
  
  // Home & Kitchen
  if (type.includes('home') && type.includes('kitchen')) {
    return {
      hero: {
        title: 'Transform Your Home & Kitchen',
        subtitle: 'Everything you need to make your home beautiful and functional.',
        image: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=1200&h=600&fit=crop',
      },
      banners: [
        {
          title: 'Kitchen Essentials - 25% Off',
          image: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=600&h=400&fit=crop',
          cta_link: '/collections/kitchen-essentials',
          background_color: '#fef3c7',
        },
        {
          title: 'Home Decor Collection',
          image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&h=400&fit=crop',
          cta_link: '/collections/home-decor',
          background_color: '#d1fae5',
        },
        {
          title: 'Storage Solutions',
          image: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=600&h=400&fit=crop',
          cta_link: '/collections/storage',
          background_color: '#e0e7ff',
        },
      ],
      features: [
        { title: 'Quality Products', description: 'Durable items built to last for years.', icon: '🏠' },
        { title: 'Modern Designs', description: 'Contemporary styles for every taste.', icon: '✨' },
        { title: 'Easy Assembly', description: 'Simple setup instructions included.', icon: '🔧' },
        { title: 'Space Saving', description: 'Smart solutions for small spaces.', icon: '📦' },
        { title: 'Fast Delivery', description: 'Quick shipping for your home needs.', icon: '🚚' },
        { title: 'Expert Advice', description: 'Tips and guides for home improvement.', icon: '💡' },
      ],
      splitLayout: {
        title: 'Create Your Dream Kitchen',
        image: 'https://images.unsplash.com/photo-1507089947368-19c1da9775ae?w=800&h=800&fit=crop',
        cta_link: '/collections/kitchen-essentials',
        background_color: '#fef3c7',
      },
      productTabsTitle: 'Best Selling Home & Kitchen Items',
      ctaTitle: 'Make Your House a Home',
      ctaSubtitle: 'Quality, Style, and Functionality Combined!',
      heroBackgroundColor: '#FBE9E7',
      ctaGradient: 'linear-gradient(to right, #6D4C41, #8D6E63)',
    };
  }
  
  // Baby & Kids Products
  if (type.includes('baby') || type.includes('kids')) {
    return {
      hero: {
        title: 'Everything Your Little Ones Need',
        subtitle: 'Safe, quality products for babies and children of all ages.',
        image: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=1200&h=600&fit=crop',
      },
      banners: [
        {
          title: 'Baby Essentials - 20% Off',
          image: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=600&h=400&fit=crop',
          cta_link: '/collections/baby-essentials',
          background_color: '#fce7f3',
        },
        {
          title: 'Kids Toys & Games',
          image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=400&fit=crop',
          cta_link: '/collections/toys-games',
          background_color: '#fef3c7',
        },
        {
          title: 'Children\'s Clothing',
          image: 'https://images.unsplash.com/photo-1519689680058-324335c77eba?w=600&h=400&fit=crop',
          cta_link: '/collections/children-clothing',
          background_color: '#dbeafe',
        },
      ],
      features: [
        { title: 'Safety First', description: 'All products meet strict safety standards.', icon: '🛡️' },
        { title: 'Age Appropriate', description: 'Products designed for specific age groups.', icon: '👶' },
        { title: 'Quality Materials', description: 'Safe, non-toxic materials for peace of mind.', icon: '✅' },
        { title: 'Expert Approved', description: 'Recommended by pediatricians and parents.', icon: '👨‍⚕️' },
        { title: 'Fast Delivery', description: 'Quick shipping for urgent baby needs.', icon: '🚚' },
        { title: 'Parent Support', description: 'Guidance and tips for new parents.', icon: '💝' },
      ],
      splitLayout: {
        title: 'Nurturing Your Little Ones',
        image: 'https://images.unsplash.com/photo-1504185945330-7a3ca1380535?w=800&h=800&fit=crop',
        cta_link: '/collections/baby-essentials',
        background_color: '#fce7f3',
      },
      productTabsTitle: 'Popular Baby & Kids Products',
      ctaTitle: 'Caring for Your Family',
      ctaSubtitle: 'Safe, Quality Products for Your Little Ones!',
      heroBackgroundColor: '#FCE4EC',
      ctaGradient: 'linear-gradient(to right, #F48FB1, #CE93D8)',
    };
  }
  
  // Food & Beverages / Restaurant
  if (type.includes('food') || type.includes('beverages') || type.includes('restaurant')) {
    return {
      hero: {
        title: 'Delicious Food & Fresh Beverages',
        subtitle: 'Quality ingredients and prepared meals for every taste.',
        image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&h=600&fit=crop',
      },
      banners: [
        {
          title: 'Fresh Meals - 15% Off',
          image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=400&fit=crop',
          cta_link: '/collections/fresh-meals',
          background_color: '#fef3c7',
        },
        {
          title: 'Beverages Collection',
          image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=600&h=400&fit=crop',
          cta_link: '/collections/beverages',
          background_color: '#d1fae5',
        },
        {
          title: 'Desserts & Treats',
          image: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=600&h=400&fit=crop',
          cta_link: '/collections/desserts',
          background_color: '#fce7f3',
        },
      ],
      features: [
        { title: 'Fresh Daily', description: 'Prepared fresh every day with quality ingredients.', icon: '🥗' },
        { title: 'Chef Prepared', description: 'Meals crafted by experienced chefs.', icon: '👨‍🍳' },
        { title: 'Fast Delivery', description: 'Quick delivery to keep your food fresh.', icon: '🚚' },
        { title: 'Custom Orders', description: 'Special requests and dietary accommodations.', icon: '✏️' },
        { title: 'Quality Ingredients', description: 'Only the finest ingredients used.', icon: '✅' },
        { title: 'Satisfaction Guaranteed', description: 'Love it or your money back.', icon: '💯' },
      ],
      splitLayout: {
        title: 'Savor Every Bite',
        image: 'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=800&h=800&fit=crop',
        cta_link: '/collections/fresh-meals',
        background_color: '#fef3c7',
      },
      productTabsTitle: 'Popular Food & Beverages',
      ctaTitle: 'Taste the Difference',
      ctaSubtitle: 'Fresh, Delicious, and Delivered to Your Door!',
      heroBackgroundColor: '#FFF3E0',
      ctaGradient: 'linear-gradient(to right, #E53935, #FF6F00)',
    };
  }
  
  // Convenience Store / Duka
  if (type.includes('convenience') || type.includes('duka')) {
    return {
      hero: {
        title: 'Your Neighborhood Convenience Store',
        subtitle: 'Everything you need, right around the corner.',
        image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&h=600&fit=crop',
      },
      banners: [
        {
          title: 'Daily Essentials - 10% Off',
          image: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=600&h=400&fit=crop',
          cta_link: '/collections/daily-essentials',
          background_color: '#fef3c7',
        },
        {
          title: 'Snacks & Beverages',
          image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=600&h=400&fit=crop',
          cta_link: '/collections/snacks',
          background_color: '#d1fae5',
        },
        {
          title: 'Household Items',
          image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&h=400&fit=crop',
          cta_link: '/collections/household',
          background_color: '#e0e7ff',
        },
      ],
      features: [
        { title: 'Wide Selection', description: 'Everything you need in one place.', icon: '🛒' },
        { title: 'Affordable Prices', description: 'Great value for everyday items.', icon: '💰' },
        { title: 'Quick Service', description: 'Fast checkout and friendly service.', icon: '⚡' },
        { title: 'Local Convenience', description: 'Serving your neighborhood daily.', icon: '📍' },
        { title: 'Fresh Products', description: 'Regular restocking of fresh items.', icon: '🔄' },
        { title: 'Easy Access', description: 'Open when you need us most.', icon: '🕐' },
      ],
      splitLayout: {
        title: 'Your One-Stop Shop',
        image: 'https://images.unsplash.com/photo-1556742393-d75f468bfcb0?w=800&h=800&fit=crop',
        cta_link: '/collections/daily-essentials',
        background_color: '#fef3c7',
      },
      productTabsTitle: 'Popular Convenience Items',
      ctaTitle: 'Shop Local, Shop Convenient',
      ctaSubtitle: 'Quality Products, Great Prices, Always Open!',
      heroBackgroundColor: '#E8EAF6',
      ctaGradient: 'linear-gradient(to right, #1C49C2, #4CAF50)',
    };
  }
  
  // Furniture & Home Decor
  if (type.includes('furniture') || type.includes('home decor')) {
    return {
      hero: {
        title: 'Furnish Your Dream Home',
        subtitle: 'Beautiful furniture and decor to transform your living space.',
        image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1200&h=600&fit=crop',
      },
      banners: [
        {
          title: 'Living Room Sets - 30% Off',
          image: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=600&h=400&fit=crop',
          cta_link: '/collections/living-room',
          background_color: '#fef3c7',
        },
        {
          title: 'Bedroom Furniture',
          image: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&h=400&fit=crop',
          cta_link: '/collections/bedroom',
          background_color: '#d1fae5',
        },
        {
          title: 'Home Decor Accessories',
          image: 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=600&h=400&fit=crop',
          cta_link: '/collections/decor',
          background_color: '#e0e7ff',
        },
      ],
      features: [
        { title: 'Quality Craftsmanship', description: 'Durable furniture built to last generations.', icon: '🪑' },
        { title: 'Modern Designs', description: 'Contemporary styles for every home.', icon: '✨' },
        { title: 'Custom Options', description: 'Personalize to match your style.', icon: '🎨' },
        { title: 'Easy Assembly', description: 'Simple setup with clear instructions.', icon: '🔧' },
        { title: 'Free Delivery', description: 'Complimentary delivery on large items.', icon: '🚚' },
        { title: 'Interior Design Tips', description: 'Expert advice for your home.', icon: '💡' },
      ],
      splitLayout: {
        title: 'Design Your Perfect Space',
        image: 'https://images.unsplash.com/photo-1586105251261-72a756497a11?w=800&h=800&fit=crop',
        cta_link: '/collections/living-room',
        background_color: '#fef3c7',
      },
      productTabsTitle: 'Trending Furniture Collections',
      ctaTitle: 'Create Your Dream Home',
      ctaSubtitle: 'Style, Comfort, and Quality Combined!',
      heroBackgroundColor: '#EFEBE9',
      ctaGradient: 'linear-gradient(to right, #5D4037, #8D6E63)',
    };
  }
  
  // Pets
  if (type.includes('pets')) {
    return {
      hero: {
        title: 'Everything Your Pet Needs',
        subtitle: 'Quality products to keep your furry friends happy and healthy.',
        image: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=1200&h=600&fit=crop',
      },
      banners: [
        {
          title: 'Pet Food - 20% Off',
          image: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=600&h=400&fit=crop',
          cta_link: '/collections/pet-food',
          background_color: '#fef3c7',
        },
        {
          title: 'Pet Toys & Accessories',
          image: 'https://images.unsplash.com/photo-1526336024174-e58f5cdd8e13?w=600&h=400&fit=crop',
          cta_link: '/collections/pet-toys',
          background_color: '#d1fae5',
        },
        {
          title: 'Pet Care Products',
          image: 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=600&h=400&fit=crop',
          cta_link: '/collections/pet-care',
          background_color: '#fce7f3',
        },
      ],
      features: [
        { title: 'Pet Health', description: 'Products approved by veterinarians.', icon: '🐾' },
        { title: 'Quality Food', description: 'Nutritious meals for all life stages.', icon: '🍖' },
        { title: 'Fun Toys', description: 'Engaging toys to keep pets active.', icon: '🎾' },
        { title: 'Expert Advice', description: 'Tips from pet care professionals.', icon: '👨‍⚕️' },
        { title: 'Fast Delivery', description: 'Quick shipping for pet essentials.', icon: '🚚' },
        { title: 'Loyalty Program', description: 'Rewards for pet parents.', icon: '🎁' },
      ],
      splitLayout: {
        title: 'Happy Pets, Happy Home',
        image: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&h=800&fit=crop',
        cta_link: '/collections/pet-food',
        background_color: '#fef3c7',
      },
      productTabsTitle: 'Popular Pet Products',
      ctaTitle: 'Show Your Pet Some Love',
      ctaSubtitle: 'Quality Products for Your Furry Family Members!',
      heroBackgroundColor: '#E3F2FD',
      ctaGradient: 'linear-gradient(to right, #1C49C2, #4CAF50)',
    };
  }
  
  // Hardware
  if (type.includes('hardware')) {
    return {
      hero: {
        title: 'Tools & Hardware for Every Project',
        subtitle: 'Quality tools and hardware supplies for professionals and DIY enthusiasts.',
        image: 'https://images.unsplash.com/photo-1590479773265-7464e5d48118?w=1200&h=600&fit=crop',
      },
      banners: [
        {
          title: 'Power Tools - 15% Off',
          image: 'https://images.unsplash.com/photo-1605152276897-4f618f831968?w=600&h=400&fit=crop',
          cta_link: '/collections/power-tools',
          background_color: '#fef3c7',
        },
        {
          title: 'Hand Tools Collection',
          image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&h=400&fit=crop',
          cta_link: '/collections/hand-tools',
          background_color: '#d1fae5',
        },
        {
          title: 'Hardware Supplies',
          image: 'https://images.unsplash.com/photo-1597262975002-c5c3b14bbd62?w=600&h=400&fit=crop',
          cta_link: '/collections/hardware-supplies',
          background_color: '#e0e7ff',
        },
      ],
      features: [
        { title: 'Professional Grade', description: 'Tools trusted by professionals.', icon: '🔧' },
        { title: 'Wide Selection', description: 'Everything for your project needs.', icon: '🛠️' },
        { title: 'Expert Advice', description: 'Guidance from experienced professionals.', icon: '👷' },
        { title: 'Quality Guarantee', description: 'Durable tools built to last.', icon: '✅' },
        { title: 'Fast Delivery', description: 'Quick shipping for urgent projects.', icon: '🚚' },
        { title: 'Bulk Discounts', description: 'Special prices for large orders.', icon: '💰' },
      ],
      splitLayout: {
        title: 'Build Anything You Imagine',
        image: 'https://images.unsplash.com/photo-1601058268499-e52658b8bb88?w=800&h=800&fit=crop',
        cta_link: '/collections/power-tools',
        background_color: '#fef3c7',
      },
      productTabsTitle: 'Best Selling Tools & Hardware',
      ctaTitle: 'Get the Job Done Right',
      ctaSubtitle: 'Quality Tools, Expert Service, Best Prices!',
      heroBackgroundColor: '#FFF3E0',
      ctaGradient: 'linear-gradient(to right, #F77000, #37474F)',
    };
  }
  
  // Shoes / Footwear
  if (type.includes('shoes') || type.includes('footwear')) {
    return {
      hero: {
        title: 'Step Into Style',
        subtitle: 'Premium footwear for every occasion. Comfort meets fashion.',
        image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1200&h=600&fit=crop',
      },
      heroBackgroundColor: '#F5F5F5',
      banners: [
        {
          title: 'Sneakers Collection - 25% Off',
          image: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=600&h=400&fit=crop',
          cta_link: '/collections/sneakers',
          background_color: '#F5F5F5',
        },
        {
          title: 'Running Shoes',
          image: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=600&h=400&fit=crop',
          cta_link: '/collections/running-shoes',
          background_color: '#E8EAF6',
        },
        {
          title: 'Boots & Formal',
          image: 'https://images.unsplash.com/photo-1608256246200-53e635b5b65f?w=600&h=400&fit=crop',
          cta_link: '/collections/boots',
          background_color: '#EFEBE9',
        },
      ],
      features: [
        { title: 'Perfect Fit', description: 'Precise sizing for ultimate comfort.', icon: '👟' },
        { title: 'Premium Quality', description: 'Handcrafted with the finest materials.', icon: '✨' },
        { title: 'All Styles', description: 'From casual to formal, we have it all.', icon: '👞' },
        { title: 'Free Returns', description: 'Easy returns if the fit isn\'t right.', icon: '↩️' },
        { title: 'Fast Delivery', description: 'Quick shipping on all orders.', icon: '🚚' },
        { title: 'Brand Selection', description: 'Top brands you know and trust.', icon: '🏷️' },
      ],
      splitLayout: {
        title: 'Find Your Perfect Pair',
        image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&h=800&fit=crop',
        cta_link: '/collections/running-shoes',
        background_color: '#F5F5F5',
      },
      productTabsTitle: 'Trending Footwear',
      ctaTitle: 'Walk Your Way',
      ctaSubtitle: 'Comfort, Style, and Performance in Every Step!',
      ctaGradient: 'linear-gradient(to right, #000000, #424242)',
    };
  }
  
  // Default (fallback)
  return {
    hero: {
      title: 'Welcome to Our Store',
      subtitle: 'Discover amazing products and great deals.',
      image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&h=600&fit=crop',
    },
    heroBackgroundColor: '#EFF6FF',
    banners: [
      {
        title: 'Special Offers',
        image: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=600&h=400&fit=crop',
        cta_link: '/products',
        background_color: '#EFF6FF',
      },
      {
        title: 'New Arrivals',
        image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=600&h=400&fit=crop',
        cta_link: '/products',
        background_color: '#d1fae5',
      },
      {
        title: 'Best Sellers',
        image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&h=400&fit=crop',
        cta_link: '/products',
        background_color: '#e0e7ff',
      },
    ],
    features: [
      { title: 'Quality Products', description: 'We offer only the best products.', icon: '✨' },
      { title: 'Fast Shipping', description: 'Quick delivery to your doorstep.', icon: '🚚' },
      { title: 'Great Prices', description: 'Competitive prices every day.', icon: '💰' },
      { title: 'Secure Payment', description: 'Safe and encrypted transactions.', icon: '🔒' },
      { title: 'Easy Returns', description: 'Hassle-free return policy.', icon: '↩️' },
      { title: '24/7 Support', description: 'We\'re here to help anytime.', icon: '📞' },
    ],
    splitLayout: {
      title: 'Shop With Confidence',
      image: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=800&h=800&fit=crop',
      cta_link: '/products',
      background_color: '#EFF6FF',
    },
    productTabsTitle: 'Featured Products',
    ctaTitle: 'Start Shopping Today',
    ctaSubtitle: 'Quality, Value, and Service You Can Trust!',
    ctaGradient: 'linear-gradient(to right, #0066CC, #00A8E8)',
  };
}

/** Every business-type bucket keyword the switch in getBusinessTypeContentByBucket matches on, plus '' for the default fallback — used only to enumerate every hardcoded stock photo URL below. */
const ALL_BUSINESS_TYPE_BUCKET_KEYWORDS = [
  'grocery', 'pharmacy', 'fashion', 'electronics', 'beauty', 'home kitchen',
  'baby', 'food', 'convenience', 'furniture', 'pets', 'hardware', 'shoes', '',
];

/**
 * Every stock photo URL hardcoded into a business-type bucket above (hero,
 * banners, split-layout) — i.e. every image a fresh homepage can start with
 * before a real, niche-specific image has ever been generated for it.
 */
const KNOWN_STOCK_HOMEPAGE_IMAGE_URLS: Set<string> = (() => {
  const urls = new Set<string>();
  for (const keyword of ALL_BUSINESS_TYPE_BUCKET_KEYWORDS) {
    const content = getBusinessTypeContentByBucket(keyword);
    urls.add(content.hero.image);
    for (const banner of content.banners) urls.add(banner.image);
    urls.add(content.splitLayout.image);
  }
  return urls;
})();

/**
 * True if `url` is one of the hardcoded stock photos above — meaning a
 * homepage's hero/banner/split-layout section is still showing the generic,
 * un-personalized bucket fallback rather than a real image generated for
 * that specific store (either the DA.21 generic AI images, or a merchant's
 * own product photos). Used by the starter-pack image repair endpoint and
 * its retry cron to find homepages that still need generation, since these
 * URLs look like legitimate images (unlike the onboarding placeholder SVG)
 * and wouldn't otherwise be recognized as needing replacement.
 */
export function isKnownStockHomepageImageUrl(url: string | null | undefined): boolean {
  if (typeof url !== 'string') return false;
  return KNOWN_STOCK_HOMEPAGE_IMAGE_URLS.has(url.trim());
}

/**
 * Create grocery theme homepage template matching GroceryHomepage component
 */
export function createGroceryHomepageTemplate(tenantName: string, businessType?: string, niche?: string): PageBuilderData {
  const content = getBusinessTypeContent(businessType || 'Grocery Store / Supermarket', niche);
  
  return {
    sections: [
      {
        id: 'hero-1',
        type: 'hero' as const,
        order: 1,
        title: content.hero.title,
        subtitle: content.hero.subtitle,
        description: '',
        image: content.hero.image,
        cta_text: 'Order Now',
        cta_link: '/products',
        background_color: content.heroBackgroundColor || '#fef3c7',
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
        banners: content.banners.map((banner, index) => ({
          id: `banner-${index + 1}`,
          title: banner.title,
          image: banner.image,
          cta_text: 'Buy Now',
          cta_link: banner.cta_link,
          background_color: banner.background_color,
        })),
        columns: 3,
      },
      {
        id: 'sales-tab-1',
        type: 'sales_tab' as const,
        order: 4,
        display_mode: 'all_active',
        layout: 'grid',
        columns: 4,
        title: 'Super Flash Sale',
        limit: 8,
        show_countdown: true,
        show_badge: true,
        show_sale_name: true,
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
        features: content.features.map((feature, index) => ({
          id: `feature-${index + 1}`,
          title: feature.title,
          description: feature.description,
          icon: feature.icon,
        })),
        columns: 3,
      },
      {
        id: 'product-tabs-1',
        type: 'product_tabs' as const,
        order: 6,
        title: content.productTabsTitle,
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
      // Split layout: left side banner is image-only (no text overlay), transparent background
      {
        id: 'split-layout-1',
        type: 'split_layout' as const,
        order: 7,
        left_side: {
          type: 'banner',
          image: content.splitLayout.image,
          cta_link: content.splitLayout.cta_link,
          background_color: 'transparent',
          image_position: 'cover',
        },
        right_side: {
          type: 'products',
          title: 'Top Rated',
          limit: 4,
          columns: 2,
        },
      },
      {
        id: 'blogs-1',
        type: 'blogs' as const,
        order: 8,
        title: 'Latest Blog Posts',
        subtitle: 'Stay updated with our latest news and articles',
        layout: 'grid',
        columns: 3,
        limit: 6,
        show_excerpt: true,
        show_date: true,
        show_author: false,
        show_category: true,
        show_read_more: true,
        order_by: 'created_at',
        order_direction: 'desc',
        cta_text: 'View All Blogs',
        cta_link: '/blog',
      },
      {
        id: 'cta-1',
        type: 'cta' as const,
        order: 9,
        title: content.ctaTitle,
        subtitle: content.ctaSubtitle,
        cta_text: 'Continue Your Shopping',
        cta_link: '/products',
        background_gradient: content.ctaGradient || 'linear-gradient(to right, #16a34a, #059669)',
        text_color: '#ffffff',
      },
    ] as PageSection[],
  };
}

/**
 * Real, AI-generated (Gemini/Nano Banana) images for the DA.21 "niche is
 * empty" registration path — see buildGenericHomepageImageJobs() in
 * src/app/api/onboarding/starter-pack/route.ts (genericImagesOnly mode).
 * Never fabricated demo products/categories alongside these — see that
 * route's docblock for why.
 */
export interface GenericHomepageImages {
  hero: string;
  /** 0-3 banner URLs — fewer than 3 if some jobs failed; sections are omitted for any missing ones, never left with a broken/placeholder image. */
  banners: string[];
  splitLayout: string | null;
}

/**
 * Create a simple default homepage template if theme-specific one doesn't exist
 * @param genericImages Real AI-generated images for a niche-less registration (DA.21) — when provided, replaces the plain hero and adds banners/split-layout sections using these real URLs instead of leaving them out.
 * @param niche The merchant's specific free-text "what are you selling" answer (e.g. "Video Games"), when given — flavors the hero title/subtitle instead of the fully generic "Welcome to {tenantName}" copy.
 */
export function createDefaultHomepageTemplate(
  themeSlug: string,
  tenantName: string,
  businessType?: string,
  genericImages?: GenericHomepageImages,
  niche?: string
): PageBuilderData {
  // Use grocery template for grocery theme
  if (themeSlug === 'grocery') {
    return createGroceryHomepageTemplate(tenantName, businessType, niche);
  }

  const trimmedNiche = niche?.trim();
  const nicheTitle = trimmedNiche ? toTitleCase(trimmedNiche) : null;

  const sections: PageSection[] = [
    {
      id: 'hero-1',
      type: 'hero' as const,
      order: 1,
      title: nicheTitle ? `Everything You Need for ${nicheTitle}` : `Welcome to ${tenantName}`,
      subtitle: nicheTitle
        ? `Quality ${nicheTitle} at great prices, delivered fast.`
        : 'Discover amazing products and great deals',
      cta_text: 'Shop Now',
      cta_link: '/products',
      ...(genericImages?.hero ? { image: genericImages.hero } : {}),
    },
  ];

  if (genericImages?.banners && genericImages.banners.length > 0) {
    const bannerTitles = ['New Arrivals', 'Best Sellers', 'Special Offers'];
    sections.push({
      id: 'banners-1',
      type: 'banners' as const,
      order: 2,
      banners: genericImages.banners.map((image, index) => ({
        id: `banner-${index + 1}`,
        title: bannerTitles[index] ?? `Offer ${index + 1}`,
        image,
        cta_text: 'Shop Now',
        cta_link: '/products',
        background_color: '#f5f5f5',
      })),
      columns: genericImages.banners.length,
    } as PageSection);
  }

  sections.push({
    id: 'products-1',
    type: 'products' as const,
    order: 3,
    title: 'Featured Products',
    limit: 8,
    columns: 4,
  });

  if (genericImages?.splitLayout) {
    sections.push({
      id: 'split-layout-1',
      type: 'split_layout' as const,
      order: 4,
      left_side: {
        type: 'banner',
        image: genericImages.splitLayout,
        cta_link: '/products',
        background_color: 'transparent',
        image_position: 'cover',
      },
      right_side: {
        type: 'products',
        title: 'Top Rated',
        limit: 4,
        columns: 2,
      },
    } as PageSection);
  }

  sections.push({
    id: 'features-1',
    type: 'features' as const,
    order: 5,
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
  });

  return { sections };
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * DA.21/DA.25 — overwrites a homepage's hero/banners/split-layout image
 * fields with real generic AI images, all 5 at once. Originally local to
 * src/app/api/tenants/register/route.ts (applied to a freshly-built, not
 * yet saved PageBuilderData at registration time) — moved here, exported,
 * so DA.25's post-registration single-image regenerate feature
 * (@/lib/homepage-images/regenerate-shared) can reuse the exact same
 * section-shape logic via applySingleHomepageImageToPageBuilderData()
 * below, instead of forking a second copy of "where does each slot's image
 * field live in a PageBuilderData". Pure — works on any already-parsed
 * PageBuilderData, whether freshly built in-memory or fetched back out of
 * `pages.content`, since both are shaped identically.
 */
export function applyGenericImagesToPageBuilderData<T extends { sections?: Array<Record<string, unknown>> }>(
  pageBuilderData: T,
  genericImages: { hero: string | null; banners: string[]; splitLayout: string | null }
): T {
  if (!Array.isArray(pageBuilderData.sections)) return pageBuilderData;

  const sections = pageBuilderData.sections.map((section) => {
    if (section.type === 'hero' && genericImages.hero) {
      return { ...section, image: genericImages.hero };
    }
    if (section.type === 'banners' && Array.isArray(section.banners) && genericImages.banners.length > 0) {
      const existingBanners = section.banners as Array<Record<string, unknown>>;
      const nextBanners = existingBanners.map((banner, i) => {
        const image = genericImages.banners[i];
        return image ? { ...banner, image } : banner;
      });
      return { ...section, banners: nextBanners };
    }
    if (section.type === 'split_layout' && genericImages.splitLayout && isPlainRecord(section.left_side)) {
      return { ...section, left_side: { ...section.left_side, image: genericImages.splitLayout } };
    }
    return section;
  });

  return { ...pageBuilderData, sections };
}

/** The 5 fixed homepage image slots a merchant can individually regenerate post-registration — see @/lib/homepage-images/regenerate-shared. Kept in sync with @/lib/onboarding/nano-banana-jobs's GENERIC_IMAGE_SLOTS (that module owns the canonical list; duplicated here as a type-only re-statement to avoid a lib->lib import cycle risk between onboarding and themes). */
export type HomepageImageSlot = 'hero' | 'banner1' | 'banner2' | 'banner3' | 'split_layout';

/**
 * DA.25 — same section-shape logic as applyGenericImagesToPageBuilderData()
 * above, narrowed to exactly ONE slot, for the post-registration "regenerate
 * just my hero/banner N/split-layout image" feature. Never touches the
 * other 4 sections' images.
 */
export function applySingleHomepageImageToPageBuilderData<T extends { sections?: Array<Record<string, unknown>> }>(
  pageBuilderData: T,
  slot: HomepageImageSlot,
  imageUrl: string
): T {
  if (!Array.isArray(pageBuilderData.sections)) return pageBuilderData;

  const bannerIndex = slot === 'banner1' ? 0 : slot === 'banner2' ? 1 : slot === 'banner3' ? 2 : -1;

  const sections = pageBuilderData.sections.map((section) => {
    if (slot === 'hero' && section.type === 'hero') {
      return { ...section, image: imageUrl };
    }
    if (bannerIndex >= 0 && section.type === 'banners' && Array.isArray(section.banners)) {
      const existingBanners = section.banners as Array<Record<string, unknown>>;
      if (bannerIndex >= existingBanners.length) return section;
      const nextBanners = existingBanners.map((banner, i) => (i === bannerIndex ? { ...banner, image: imageUrl } : banner));
      return { ...section, banners: nextBanners };
    }
    if (slot === 'split_layout' && section.type === 'split_layout' && isPlainRecord(section.left_side)) {
      return { ...section, left_side: { ...section.left_side, image: imageUrl } };
    }
    return section;
  });

  return { ...pageBuilderData, sections };
}
