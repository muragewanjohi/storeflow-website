/**
 * Shared Storefront Layout Component
 * 
 * A reusable layout wrapper for storefront pages that provides:
 * - Consistent structure across all customer-facing pages
 * - Configurable spacing and container options
 * - SEO-friendly semantic HTML
 * - Accessibility features
 * - Theme integration
 * 
 * Based on best practices from Shopify, BigCommerce, and WooCommerce
 */

'use client';

import { ReactNode } from 'react';

interface SharedStorefrontLayoutProps {
  children: ReactNode;
  
  // Container Options
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  noPadding?: boolean;
  noMargin?: boolean;
  
  // Semantic HTML
  as?: 'div' | 'main' | 'section' | 'article';
  
  // Spacing
  paddingTop?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  paddingBottom?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  
  // Background
  backgroundColor?: string;
  backgroundGradient?: string;
  
  // Additional Classes
  className?: string;
  
  // Accessibility
  ariaLabel?: string;
  role?: string;
}

export default function SharedStorefrontLayout({
  children,
  maxWidth = 'xl',
  noPadding = false,
  noMargin = false,
  as: Component = 'div',
  paddingTop = 'md',
  paddingBottom = 'md',
  backgroundColor,
  backgroundGradient,
  className = '',
  ariaLabel,
  role,
}: Readonly<SharedStorefrontLayoutProps>) {
  // Map maxWidth to Tailwind classes
  const getMaxWidthClass = () => {
    const widthMap = {
      sm: 'max-w-3xl',
      md: 'max-w-5xl',
      lg: 'max-w-7xl',
      xl: 'max-w-[1400px]',
      '2xl': 'max-w-[1600px]',
      full: 'max-w-full',
    };
    return widthMap[maxWidth];
  };

  // Map padding to Tailwind classes
  const getPaddingClass = (direction: 'top' | 'bottom', size?: string) => {
    if (size === 'none') return '';
    
    const paddingMap = {
      sm: direction === 'top' ? 'pt-4' : 'pb-4',
      md: direction === 'top' ? 'pt-8 md:pt-12' : 'pb-8 md:pb-12',
      lg: direction === 'top' ? 'pt-12 md:pt-16' : 'pb-12 md:pb-16',
      xl: direction === 'top' ? 'pt-16 md:pt-24' : 'pb-16 md:pb-24',
    };
    
    return paddingMap[size as keyof typeof paddingMap] || paddingMap.md;
  };

  const containerClasses = [
    // Base container
    noMargin ? '' : 'container mx-auto',
    noPadding ? '' : 'px-4 sm:px-6 lg:px-8',
    getMaxWidthClass(),
    
    // Spacing
    getPaddingClass('top', paddingTop),
    getPaddingClass('bottom', paddingBottom),
    
    // Additional classes
    className,
  ].filter(Boolean).join(' ');

  const componentStyle = {
    backgroundColor: backgroundGradient ? undefined : backgroundColor,
    backgroundImage: backgroundGradient,
  };

  return (
    <Component
      className={containerClasses}
      style={componentStyle}
      aria-label={ariaLabel}
      role={role}
    >
      {children}
    </Component>
  );
}

/**
 * Specialized Layout Variants
 */

// Hero Section Layout
export function HeroLayout({ children, ...props }: Readonly<SharedStorefrontLayoutProps>) {
  return (
    <SharedStorefrontLayout
      as="section"
      maxWidth="2xl"
      paddingTop="xl"
      paddingBottom="xl"
      {...props}
    >
      {children}
    </SharedStorefrontLayout>
  );
}

// Content Section Layout
export function ContentLayout({ children, ...props }: Readonly<SharedStorefrontLayoutProps>) {
  return (
    <SharedStorefrontLayout
      as="section"
      maxWidth="lg"
      paddingTop="lg"
      paddingBottom="lg"
      {...props}
    >
      {children}
    </SharedStorefrontLayout>
  );
}

// Product Grid Layout
export function ProductGridLayout({ children, ...props }: Readonly<SharedStorefrontLayoutProps>) {
  return (
    <SharedStorefrontLayout
      as="section"
      maxWidth="xl"
      paddingTop="md"
      paddingBottom="md"
      {...props}
    >
      {children}
    </SharedStorefrontLayout>
  );
}

// Full Width Layout (for banners, sliders, etc.)
export function FullWidthLayout({ children, ...props }: Readonly<SharedStorefrontLayoutProps>) {
  return (
    <SharedStorefrontLayout
      as="section"
      maxWidth="full"
      noPadding
      noMargin
      paddingTop="none"
      paddingBottom="none"
      {...props}
    >
      {children}
    </SharedStorefrontLayout>
  );
}

// Narrow Content Layout (for articles, blog posts)
export function NarrowContentLayout({ children, ...props }: Readonly<SharedStorefrontLayoutProps>) {
  return (
    <SharedStorefrontLayout
      as="article"
      maxWidth="md"
      paddingTop="lg"
      paddingBottom="lg"
      {...props}
    >
      {children}
    </SharedStorefrontLayout>
  );
}

/**
 * Grid Layouts for Common Patterns
 */

interface GridLayoutProps extends SharedStorefrontLayoutProps {
  columns?: 1 | 2 | 3 | 4 | 6;
  gap?: 'sm' | 'md' | 'lg';
}

export function GridLayout({ 
  children, 
  columns = 3,
  gap = 'md',
  ...props 
}: Readonly<GridLayoutProps>) {
  const getGridClass = () => {
    const colMap = {
      1: 'grid-cols-1',
      2: 'grid-cols-1 md:grid-cols-2',
      3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
      4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
      6: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6',
    };
    return colMap[columns];
  };

  const getGapClass = () => {
    const gapMap = {
      sm: 'gap-4',
      md: 'gap-6',
      lg: 'gap-8',
    };
    return gapMap[gap];
  };

  return (
    <SharedStorefrontLayout {...props}>
      <div className={`grid ${getGridClass()} ${getGapClass()}`}>
        {children}
      </div>
    </SharedStorefrontLayout>
  );
}

/**
 * Two Column Split Layout
 */

interface SplitLayoutProps extends SharedStorefrontLayoutProps {
  leftColumn: ReactNode;
  rightColumn: ReactNode;
  ratio?: '50-50' | '60-40' | '40-60' | '70-30' | '30-70';
  gap?: 'sm' | 'md' | 'lg' | 'xl';
  stackOnMobile?: boolean;
}

export function SimpleSplitLayout({
  leftColumn,
  rightColumn,
  ratio = '50-50',
  gap = 'lg',
  stackOnMobile = true,
  ...props
}: Readonly<SplitLayoutProps>) {
  const getGridClass = () => {
    const ratioMap = {
      '50-50': 'lg:grid-cols-2',
      '60-40': 'lg:grid-cols-[60fr_40fr]',
      '40-60': 'lg:grid-cols-[40fr_60fr]',
      '70-30': 'lg:grid-cols-[70fr_30fr]',
      '30-70': 'lg:grid-cols-[30fr_70fr]',
    };
    return ratioMap[ratio];
  };

  const getGapClass = () => {
    const gapMap = {
      sm: 'gap-4',
      md: 'gap-6',
      lg: 'gap-8',
      xl: 'gap-12',
    };
    return gapMap[gap];
  };

  return (
    <SharedStorefrontLayout {...props}>
      <div className={`grid ${stackOnMobile ? 'grid-cols-1' : 'grid-cols-2'} ${getGridClass()} ${getGapClass()}`}>
        <div>{leftColumn}</div>
        <div>{rightColumn}</div>
      </div>
    </SharedStorefrontLayout>
  );
}

/**
 * Section Wrapper (for consistent section styling)
 */

interface SectionWrapperProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  titleAlignment?: 'left' | 'center' | 'right';
  className?: string;
}

export function SectionWrapper({
  children,
  title,
  subtitle,
  titleAlignment = 'center',
  className = '',
}: Readonly<SectionWrapperProps>) {
  const alignmentClass = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }[titleAlignment];

  return (
    <div className={className}>
      {(title || subtitle) && (
        <div className={`mb-8 ${alignmentClass}`}>
          {title && (
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {title}
            </h2>
          )}
          {subtitle && (
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {subtitle}
            </p>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

/**
 * Example Usage:
 * 
 * // Basic content layout
 * <SharedStorefrontLayout>
 *   <h1>My Page</h1>
 *   <p>Content here...</p>
 * </SharedStorefrontLayout>
 * 
 * // Hero section
 * <HeroLayout backgroundColor="#f9fafb">
 *   <HeroComponent />
 * </HeroLayout>
 * 
 * // Product grid with section header
 * <ProductGridLayout>
 *   <SectionWrapper title="Featured Products" subtitle="Hand-picked for you">
 *     <GridLayout columns={4} gap="md">
 *       {products.map(product => <ProductCard key={product.id} {...product} />)}
 *     </GridLayout>
 *   </SectionWrapper>
 * </ProductGridLayout>
 * 
 * // Split layout
 * <SimpleSplitLayout
 *   ratio="60-40"
 *   leftColumn={<div>Main content</div>}
 *   rightColumn={<div>Sidebar</div>}
 * />
 */
