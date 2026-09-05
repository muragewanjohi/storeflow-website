/**
 * Page Builder Types
 * 
 * Type definitions for section-based page builder
 * 
 * Day 28: Content Management - Simple Page Builder
 */

export type SectionType = 'hero' | 'features' | 'products' | 'testimonials' | 'text' | 'image' | 'categories' | 'banners' | 'sales_tab' | 'split_layout' | 'cta' | 'product_tabs' | 'form' | 'blogs' | 'location';

export interface BaseSection {
  id: string;
  type: SectionType;
  order: number;
  hidden?: boolean;
}

export interface HeroSection extends BaseSection {
  type: 'hero';
  title: string;
  subtitle?: string;
  description?: string;
  title_font_size?: string; // CSS value or preset: 'sm' | 'md' | 'lg' | 'xl'
  subtitle_font_size?: string; // CSS value or preset: 'sm' | 'md' | 'lg' | 'xl'
  image?: string; // Normal image (displayed as separate element)
  banner_image?: string; // Banner image (used as background)
  image_crop?: boolean; // If false, don't crop the normal image. Defaults to true
  image_position?: 'left' | 'center' | 'right'; // Position of normal image when both banner and normal image are present
  text_alignment?: 'left' | 'center' | 'right'; // Alignment for title and subtitle
  cta_text?: string;
  cta_link?: string;
  background_color?: string;
  title_color?: string;
  subtitle_color?: string;
  description_color?: string;
  cta_text_color?: string;
  cta_button_color?: string;
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
  background_color?: string;
  title_color?: string;
  subtitle_color?: string;
}

export interface ProductsSection extends BaseSection {
  type: 'products';
  title?: string;
  subtitle?: string;
  product_ids?: string[]; // IDs of products to display
  category_id?: string; // Show products from a category
  limit?: number; // Number of products to show
  columns?: 2 | 3 | 4;
  background_color?: string;
  title_color?: string;
  subtitle_color?: string;
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
  background_color?: string;
  title_color?: string;
  subtitle_color?: string;
}

export interface TextSection extends BaseSection {
  type: 'text';
  content: string; // Rich text HTML
  background_color?: string;
  text_color?: string;
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
  background_color?: string;
  title_color?: string;
  subtitle_color?: string;
}

export interface BannersSection extends BaseSection {
  type: 'banners';
  title?: string;
  subtitle?: string;
  banners: Array<{
    id: string;
    title: string;
    subtitle?: string;
    image: string;
    cta_text?: string;
    cta_link?: string;
    background_color?: string;
    title_color?: string;
    subtitle_color?: string;
    cta_text_color?: string;
    cta_button_color?: string;
  }>;
  columns?: 1 | 2 | 3;
  background_color?: string;
  title_color?: string;
  subtitle_color?: string;
}

export interface SalesTabSection extends BaseSection {
  type: 'sales_tab';
  
  // Display Mode
  display_mode: 'single_sale' | 'featured_sales' | 'all_active';
  
  // Single Sale Mode
  sale_id?: string; // Required if display_mode is 'single_sale'
  sale_slug?: string; // Sale slug for public API access (auto-populated when sale_id is selected)
  
  // Featured Sales Mode
  featured_sale_ids?: string[]; // Array of sale IDs for featured mode
  max_featured_sales?: number; // Limit for featured sales (default: 5)
  
  // Layout
  layout: 'grid' | 'carousel' | 'tabs';
  columns: 2 | 3 | 4;
  
  // Content
  title?: string;
  subtitle?: string;
  title_color?: string;
  subtitle_color?: string;
  limit?: number; // Products per sale
  
  // Features
  show_countdown: boolean;
  show_badge: boolean;
  show_sale_name?: boolean; // Show sale name on frontend
  badge_text?: string; // Override sale badge_text
  badge_color?: string; // Override sale badge_color
  
  // Styling
  background_color?: string;
  text_color?: string;
  banner_style: 'full_width' | 'contained' | 'none';
  product_card_style: 'default' | 'compact' | 'detailed';
  
  // CTA
  cta_text?: string;
  cta_link?: string;
  cta_position: 'top_right' | 'bottom_center' | 'none';
}

/**
 * Enhanced Split Layout Section
 * Based on Shopify/BigCommerce best practices
 * 
 * Phase 1 Features:
 * - Layout ratio options (50/50, 60/40, etc.)
 * - Text alignment controls
 * - Mobile behavior options
 * - Spacing/padding controls
 * - Background gradients
 */
export interface SplitLayoutSection extends BaseSection {
  type: 'split_layout';
  
  // Layout Configuration
  layout_ratio?: '50-50' | '60-40' | '40-60' | '70-30' | '30-70';
  mobile_behavior?: 'stack' | 'scroll' | 'hide_left' | 'hide_right' | 'reverse_stack';
  reverse_desktop?: boolean; // Swap left/right on desktop
  
  // Left Side Configuration
  left_side: {
    type: 'banner' | 'text' | 'form' | 'products';
    title?: string;
    subtitle?: string;
    content?: string; // For text type or rich HTML
    image?: string;
    alt_text?: string;
    cta_text?: string;
    cta_link?: string;
    form_id?: string; // For form type
    
    // Product Options (if type is 'products')
    product_selection?: 'category' | 'featured' | 'specific' | 'new' | 'bestsellers';
    product_ids?: string[];
    category_id?: string;
    limit?: number;
    columns?: 1 | 2 | 3;
    
    // Alignment & Positioning
    text_alignment?: 'left' | 'center' | 'right';
    vertical_alignment?: 'top' | 'middle' | 'bottom';
    image_position?: 'cover' | 'contain' | 'top' | 'center' | 'bottom';
    
    // Colors & Styling
    background_color?: string;
    background_gradient?: string;
    title_color?: string;
    subtitle_color?: string;
    content_color?: string;
    cta_text_color?: string;
    cta_button_color?: string;
    overlay_opacity?: number; // 0-100 for image overlays
    border_radius?: number; // px
  };
  
  // Right Side Configuration
  right_side: {
    type: 'products' | 'features' | 'text' | 'banner' | 'form';
    title?: string;
    subtitle?: string;
    content?: string; // For text type
    image?: string;
    alt_text?: string;
    cta_text?: string;
    cta_link?: string;
    form_id?: string; // For form type
    
    // Product Options
    product_selection?: 'category' | 'featured' | 'specific' | 'new' | 'bestsellers';
    product_ids?: string[];
    category_id?: string;
    limit?: number;
    columns?: 1 | 2 | 3;
    
    // Features Options (if type is 'features')
    features?: Array<{
      id: string;
      title: string;
      description?: string;
      icon?: string;
    }>;
    
    // Styling (banner/image: background_color or transparent)
    background_color?: string;
    background_gradient?: string;
    title_color?: string;
    subtitle_color?: string;
    text_alignment?: 'left' | 'center' | 'right';
    border_radius?: number;
    image_position?: 'cover' | 'contain' | 'top' | 'center' | 'bottom';
    overlay_opacity?: number; // 0-100 for banner overlay
  };
  
  // Section-Level Spacing & Styling
  spacing?: {
    section_padding_top?: number; // px
    section_padding_bottom?: number; // px
    section_padding_left?: number; // px (for container)
    section_padding_right?: number; // px (for container)
    column_gap?: number; // px gap between columns
    content_padding?: number; // px padding inside each column
  };
  
  background_color?: string;
  background_gradient?: string;
  full_width?: boolean; // If true, extends to full viewport width
  min_height?: number; // px - minimum section height
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
  title_color?: string;
  subtitle_color?: string;
  cta_text_color?: string;
  cta_button_color?: string;
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
  background_color?: string;
  title_color?: string;
}

export interface FormSection extends BaseSection {
  type: 'form';
  form_id: string; // ID of the form to embed
  title?: string;
  subtitle?: string;
  background_color?: string;
  title_color?: string;
  subtitle_color?: string;
  show_form_title?: boolean; // Whether to show the form's own title
  max_width?: 'sm' | 'md' | 'lg' | 'xl' | 'full'; // Container width
}

export interface BlogsSection extends BaseSection {
  type: 'blogs';
  title?: string;
  subtitle?: string;
  layout?: 'grid' | 'list' | 'carousel';
  columns?: 2 | 3 | 4;
  limit?: number; // Number of blog posts to display
  category_id?: string; // Filter by category (optional)
  show_excerpt?: boolean; // Show blog excerpt
  show_date?: boolean; // Show publication date
  show_author?: boolean; // Show author name
  show_category?: boolean; // Show category badge
  show_read_more?: boolean; // Show "Read More" link
  order_by?: 'created_at' | 'updated_at' | 'title'; // Sort order
  order_direction?: 'asc' | 'desc';
  background_color?: string;
  title_color?: string;
  subtitle_color?: string;
  cta_text?: string; // "View All Blogs" button text
  cta_link?: string; // Link to full blog listing
}

export interface LocationSection extends BaseSection {
  type: 'location';
  title?: string;
  subtitle?: string;
  address: string; // Full address for the location
  latitude?: number; // Optional: precise latitude
  longitude?: number; // Optional: precise longitude
  map_type?: 'roadmap' | 'satellite' | 'hybrid' | 'terrain'; // Google Maps map type
  zoom?: number; // Map zoom level (1-20, default 15)
  height?: number; // Map height in pixels (default 400)
  show_info_window?: boolean; // Show address in info window
  background_color?: string;
  title_color?: string;
  subtitle_color?: string;
  full_width?: boolean; // Full width map
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
  | SalesTabSection
  | SplitLayoutSection
  | CTASection
  | ProductTabsSection
  | FormSection
  | BlogsSection
  | LocationSection;

export interface PageBuilderData {
  sections: PageSection[];
  version?: string; // For future compatibility
}

