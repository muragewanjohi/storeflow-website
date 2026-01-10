/**
 * Page Builder Types
 * 
 * Type definitions for section-based page builder
 * 
 * Day 28: Content Management - Simple Page Builder
 */

export type SectionType = 'hero' | 'features' | 'products' | 'testimonials' | 'text' | 'image' | 'categories' | 'banners' | 'flash_sale' | 'split_layout' | 'cta' | 'product_tabs';

export interface BaseSection {
  id: string;
  type: SectionType;
  order: number;
}

export interface HeroSection extends BaseSection {
  type: 'hero';
  title: string;
  subtitle?: string;
  description?: string;
  image?: string;
  cta_text?: string;
  cta_link?: string;
  background_color?: string;
}

export interface FeaturesSection extends BaseSection {
  type: 'features';
  title?: string;
  subtitle?: string;
  features: Array<{
    id: string;
    title: string;
    description?: string;
    icon?: string;
    image?: string;
  }>;
  columns?: 2 | 3 | 4;
}

export interface ProductsSection extends BaseSection {
  type: 'products';
  title?: string;
  subtitle?: string;
  product_ids?: string[]; // IDs of products to display
  category_id?: string; // Show products from a category
  limit?: number; // Number of products to show
  columns?: 2 | 3 | 4;
}

export interface TestimonialsSection extends BaseSection {
  type: 'testimonials';
  title?: string;
  subtitle?: string;
  testimonials: Array<{
    id: string;
    name: string;
    role?: string;
    company?: string;
    content: string;
    image?: string;
    rating?: number;
  }>;
  columns?: 1 | 2 | 3;
}

export interface TextSection extends BaseSection {
  type: 'text';
  content: string; // Rich text HTML
  background_color?: string;
}

export interface ImageSection extends BaseSection {
  type: 'image';
  image: string;
  alt_text?: string;
  caption?: string;
  full_width?: boolean;
}

export interface CategoriesSection extends BaseSection {
  type: 'categories';
  title?: string;
  subtitle?: string;
  category_ids?: string[]; // IDs of specific categories to display (if empty, shows all up to limit)
  limit?: number;
  columns?: 2 | 4 | 6 | 8;
  show_count?: boolean;
}

export interface BannersSection extends BaseSection {
  type: 'banners';
  banners: Array<{
    id: string;
    title: string;
    subtitle?: string;
    image: string;
    cta_text?: string;
    cta_link?: string;
    background_color?: string;
  }>;
  columns?: 1 | 2 | 3;
}

export interface FlashSaleSection extends BaseSection {
  type: 'flash_sale';
  title?: string;
  subtitle?: string;
  badge_text?: string;
  limit?: number;
  columns?: 2 | 3 | 4;
  category_id?: string;
  cta_text?: string;
  cta_link?: string;
}

export interface SplitLayoutSection extends BaseSection {
  type: 'split_layout';
  left_side: {
    type: 'banner' | 'image';
    title?: string;
    subtitle?: string;
    image: string;
    cta_text?: string;
    cta_link?: string;
    background_color?: string;
  };
  right_side: {
    type: 'products' | 'features';
    title?: string;
    product_ids?: string[];
    category_id?: string;
    limit?: number;
    columns?: 1 | 2;
  };
}

export interface CTASection extends BaseSection {
  type: 'cta';
  title: string;
  subtitle?: string;
  cta_text: string;
  cta_link: string;
  background_color?: string;
  background_gradient?: string;
  text_color?: string;
}

export interface ProductTabsSection extends BaseSection {
  type: 'product_tabs';
  title?: string;
  tabs: Array<{
    id: string;
    label: string;
    filter: 'popular' | 'new' | 'low_price' | 'category';
    category_id?: string;
  }>;
  limit?: number;
  columns?: 2 | 3 | 4;
  default_tab?: string;
}

export type PageSection =
  | HeroSection
  | FeaturesSection
  | ProductsSection
  | TestimonialsSection
  | TextSection
  | ImageSection
  | CategoriesSection
  | BannersSection
  | FlashSaleSection
  | SplitLayoutSection
  | CTASection
  | ProductTabsSection;

export interface PageBuilderData {
  sections: PageSection[];
  version?: string; // For future compatibility
}

