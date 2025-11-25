/**
 * Page Builder Types
 * 
 * Type definitions for section-based page builder
 * 
 * Day 28: Content Management - Simple Page Builder
 */

export type SectionType = 'hero' | 'features' | 'products' | 'testimonials' | 'text' | 'image';

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

export type PageSection =
  | HeroSection
  | FeaturesSection
  | ProductsSection
  | TestimonialsSection
  | TextSection
  | ImageSection;

export interface PageBuilderData {
  sections: PageSection[];
  version?: string; // For future compatibility
}

