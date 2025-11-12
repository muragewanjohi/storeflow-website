/**
 * Theme System Type Definitions
 * Component-Based Theme Architecture for StoreFlow
 */

// ============================================
// Theme Configuration Types
// ============================================

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  muted: string;
  [key: string]: string; // Allow additional colors
}

export interface ThemeTypography {
  headingFont: string;
  bodyFont: string;
  baseFontSize: number;
  headingWeight?: number;
  bodyWeight?: number;
}

export interface ThemeLayout {
  header: 'sticky' | 'static' | 'transparent';
  footer: 'multi-column' | 'simple' | 'minimal';
  sidebar?: 'left' | 'right' | 'none';
  containerMaxWidth?: number;
}

export interface ThemeFeatures {
  megaMenu: boolean;
  quickView: boolean;
  wishlist: boolean;
  compareProducts: boolean;
  ajaxSearch?: boolean;
  stickyCart?: boolean;
  [key: string]: boolean | undefined;
}

export interface ThemeConfig {
  id: string;
  name: string;
  slug: string;
  description?: string;
  version: string;
  colors: ThemeColors;
  typography: ThemeTypography;
  layout: ThemeLayout;
  features: ThemeFeatures;
  [key: string]: unknown; // Allow additional config
}

// ============================================
// Theme Component Types
// ============================================

export interface ThemeComponent {
  name: string;
  slug: string;
  category: 'header' | 'footer' | 'hero' | 'product-grid' | 'product-card' | 'cart' | 'checkout' | 'other';
  config?: Record<string, unknown>;
}

export interface ThemeComponents {
  Header: React.ComponentType<HeaderProps>;
  Footer: React.ComponentType<FooterProps>;
  ProductCard: React.ComponentType<ProductCardProps>;
  ProductGrid: React.ComponentType<ProductGridProps>;
  Hero?: React.ComponentType<HeroProps>;
  Cart?: React.ComponentType<CartProps>;
  Checkout?: React.ComponentType<CheckoutProps>;
  [key: string]: React.ComponentType<any> | undefined;
}

// ============================================
// Component Props Types
// ============================================

export interface HeaderProps {
  logo?: string;
  navigation?: NavigationItem[];
  showSearch?: boolean;
  showCart?: boolean;
  showWishlist?: boolean;
  className?: string;
}

export interface FooterProps {
  columns?: FooterColumn[];
  socialLinks?: SocialLink[];
  copyright?: string;
  className?: string;
}

export interface ProductCardProps {
  product: Product;
  showQuickView?: boolean;
  showWishlist?: boolean;
  showCompare?: boolean;
  variant?: 'minimal' | 'detailed' | 'card';
  className?: string;
}

export interface ProductGridProps {
  products: Product[];
  columns?: number;
  showQuickView?: boolean;
  className?: string;
}

export interface HeroProps {
  title: string;
  subtitle?: string;
  image?: string;
  ctaText?: string;
  ctaLink?: string;
  className?: string;
}

export interface CartProps {
  items: CartItem[];
  onUpdate?: (itemId: string, quantity: number) => void;
  onRemove?: (itemId: string) => void;
  className?: string;
}

export interface CheckoutProps {
  cart: CartItem[];
  onComplete?: (order: Order) => void;
  className?: string;
}

// ============================================
// Supporting Types
// ============================================

export interface NavigationItem {
  label: string;
  href: string;
  children?: NavigationItem[];
}

export interface FooterColumn {
  title: string;
  links: { label: string; href: string }[];
}

export interface SocialLink {
  platform: 'facebook' | 'twitter' | 'instagram' | 'youtube' | 'linkedin';
  url: string;
  icon?: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice?: number;
  image: string;
  images?: string[];
  description?: string;
  inStock?: boolean;
  rating?: number;
  reviewsCount?: number;
  [key: string]: unknown;
}

export interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  variant?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  items: CartItem[];
  total: number;
  status: string;
}

// ============================================
// Tenant Theme Customization Types
// ============================================

export interface TenantThemeCustomizations {
  colors?: Partial<ThemeColors>;
  typography?: Partial<ThemeTypography>;
  layouts?: Partial<ThemeLayout>;
  customCss?: string;
  logo?: string;
  favicon?: string;
  metaTitle?: string;
  metaDescription?: string;
  socialLinks?: SocialLink[];
}

// ============================================
// Theme Registry Types
// ============================================

export interface ThemeRegistryEntry {
  config: ThemeConfig;
  components: ThemeComponents;
  tenantCustomizations?: TenantThemeCustomizations;
}

export type ThemeLoader = () => Promise<ThemeRegistryEntry>;

// ============================================
// Database Types (Supabase)
// ============================================

export interface ThemeRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  author: string | null;
  version: string;
  status: boolean;
  is_premium: boolean;
  price: number | null;
  preview_url: string | null;
  screenshot_url: string | null;
  demo_url: string | null;
  config: Record<string, unknown>;
  customization_schema: Record<string, unknown>;
  colors: ThemeColors;
  typography: ThemeTypography;
  layouts: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface TenantThemeRow {
  id: string;
  tenant_id: string;
  theme_id: string;
  custom_colors: Partial<ThemeColors>;
  custom_fonts: Partial<ThemeTypography>;
  custom_layouts: Partial<ThemeLayout>;
  custom_css: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
  social_links: SocialLink[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

