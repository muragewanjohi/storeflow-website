/**
 * Section Template Components
 * 
 * Reusable section components for page builder
 * 
 * Day 28: Content Management - Simple Page Builder
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageSection } from '@/lib/content/page-builder-types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import Link from 'next/link';
import * as LucideIcons from 'lucide-react';
import DefaultProductCard from '@/components/themes/default/ProductCard';
import CountdownTimer from '@/components/storefront/countdown-timer';

interface SectionRendererProps {
  section: PageSection;
  isPreview?: boolean;
}

export function SectionRenderer({ section, isPreview = false }: Readonly<SectionRendererProps>) {
  switch (section.type) {
    case 'hero':
      return <HeroSectionComponent section={section} isPreview={isPreview} />;
    case 'features':
      return <FeaturesSectionComponent section={section} isPreview={isPreview} />;
    case 'products':
      return <ProductsSectionComponent section={section} isPreview={isPreview} />;
    case 'testimonials':
      return <TestimonialsSectionComponent section={section} isPreview={isPreview} />;
    case 'text':
      return <TextSectionComponent section={section} isPreview={isPreview} />;
    case 'image':
      return <ImageSectionComponent section={section} isPreview={isPreview} />;
    case 'categories':
      return <CategoriesSectionComponent section={section} isPreview={isPreview} />;
    case 'banners':
      return <BannersSectionComponent section={section} isPreview={isPreview} />;
    case 'sales_tab':
      return <SalesTabSectionComponent section={section} isPreview={isPreview} />;
    case 'split_layout':
      return <SplitLayoutSectionComponent section={section} isPreview={isPreview} />;
    case 'cta':
      return <CTASectionComponent section={section} isPreview={isPreview} />;
    case 'product_tabs':
      return <ProductTabsSectionComponent section={section} isPreview={isPreview} />;
    case 'form':
      return <FormSectionComponent section={section} isPreview={isPreview} />;
    case 'blogs':
      return <BlogsSectionComponent section={section} isPreview={isPreview} />;
    case 'location':
      return <LocationSectionComponent section={section} isPreview={isPreview} />;
    default:
      return null;
  }
}

// Hero title/subtitle font size presets (responsive clamp)
const HERO_TITLE_FONT_SIZES: Record<string, string> = {
  sm: 'clamp(1.5rem, 3vw, 2.25rem)',
  md: 'clamp(1.875rem, 4vw, 3rem)',
  lg: 'clamp(2.25rem, 5vw, 3.75rem)',
  xl: 'clamp(2.75rem, 6vw, 4.5rem)',
};
const HERO_SUBTITLE_FONT_SIZES: Record<string, string> = {
  sm: 'clamp(0.9rem, 2vw, 1.125rem)',
  md: 'clamp(1.125rem, 2.5vw, 1.5rem)',
  lg: 'clamp(1.375rem, 3vw, 1.875rem)',
  xl: 'clamp(1.625rem, 4vw, 2.25rem)',
};

// Hero with background (image or colour) - tighter spacing for better visual impact
// Best practice: content should fill ~90-95% of container, minimal wasted space
const HERO_VISUAL_MIN_H = 'min-h-[340px] sm:min-h-[420px] md:min-h-[500px] lg:min-h-[560px]';
const HERO_CONTENT_MIN_H = 'min-h-[320px] sm:min-h-[400px] md:min-h-[480px] lg:min-h-[540px]';
// Normal image in hero: sized to fill most of the hero height
// Using consistent dimensions for both side (left/right) and center alignments
const HERO_NORMAL_IMAGE_SIDE = 'h-[280px] sm:h-[360px] md:h-[440px] lg:h-[500px]';
const HERO_NORMAL_IMAGE_CENTER = 'h-[280px] sm:h-[360px] md:h-[440px] lg:h-[500px]';

function HeroSectionComponent({ 
  section, 
  isPreview 
}: { 
  section: Extract<PageSection, { type: 'hero' }>; 
  isPreview: boolean;
}) {
  const hasBannerImage = section.banner_image && !section.banner_image.startsWith('blob:');
  const hasBackgroundColor = !!(section.background_color && section.background_color.trim());
  const hasVisualBackground = hasBannerImage || hasBackgroundColor;
  const hasNormalImage = section.image && !section.image.startsWith('blob:');
  const textAlignment = section.text_alignment || 'center';
  const shouldCropImage = section.image_crop !== false;
  const titleFontSize = HERO_TITLE_FONT_SIZES[section.title_font_size || 'md'] ?? HERO_TITLE_FONT_SIZES.md;
  const subtitleFontSize = HERO_SUBTITLE_FONT_SIZES[section.subtitle_font_size || 'md'] ?? HERO_SUBTITLE_FONT_SIZES.md;
  
  // Get alignment classes - always vertically center, but horizontally align based on selection
  const getAlignmentClasses = (align: 'left' | 'center' | 'right') => {
    // Always use items-center for vertical centering
    switch (align) {
      case 'left':
        return 'text-left items-center';
      case 'right':
        return 'text-right items-center';
      case 'center':
      default:
        return 'text-center items-center';
    }
  };
  
  const alignmentClasses = getAlignmentClasses(textAlignment);
  
  // Set CSS variables on section for better performance (section-specific naming)
  const sectionStyle = {
    '--hero-text': 'var(--color-text, currentColor)',
    '--hero-title-color': section.title_color || 'var(--color-primary, currentColor)',
    '--hero-subtitle-color': section.subtitle_color || 'var(--color-text, #666666)',
    '--hero-description-color': section.description_color || 'var(--color-text, #666666)',
    '--hero-cta-text-color': section.cta_text_color || 'var(--color-button-text, #FFFFFF)',
    '--hero-cta-bg-color': section.cta_button_color || 'var(--color-primary, hsl(var(--primary)))',
    '--font-heading': 'var(--font-heading, inherit)',
    '--font-body': 'var(--font-body, inherit)',
  } as React.CSSProperties & Record<string, string | undefined>;

  // Hero background: same container for image or colour, aligned with content container.
  const heroBackgroundStyle: React.CSSProperties = {
    backgroundColor: hasBannerImage ? 'transparent' : (section.background_color || 'var(--color-background, transparent)'),
    ...(hasBannerImage
      ? {
          backgroundImage: `url("${section.banner_image!.trim()}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'scroll',
        }
      : {}),
  };

  return (
    <section
      className={`relative overflow-hidden ${hasVisualBackground ? `${HERO_VISUAL_MIN_H} py-4 sm:py-6 md:py-8` : 'py-12 sm:py-16 md:py-24'}`}
      style={{
        ...sectionStyle,
        position: 'relative',
        isolation: 'isolate',
      }}
    >
      {/* Content in container aligned with header */}
      <div
        className={`container mx-auto px-2 sm:px-4 lg:px-8 relative ${hasVisualBackground ? '' : 'rounded-lg'}`}
        style={{ maxWidth: 'var(--container-max-width, 1200px)' }}
      >
        {/* Background: image or colour, constrained to same width as content */}
        {hasVisualBackground && (
          <div
            className="absolute inset-0 z-0 bg-center bg-no-repeat rounded-lg"
            style={heroBackgroundStyle}
          />
        )}
        {!hasVisualBackground && hasBackgroundColor && (
          <div
            className="absolute inset-0 z-0 rounded-lg"
            style={{ backgroundColor: section.background_color || 'var(--color-background, transparent)' }}
          />
        )}
        <div className={`relative z-[2] ${hasVisualBackground ? HERO_CONTENT_MIN_H : ''}`}>
        {hasVisualBackground ? (
          // Full-width background image layout - can include normal image
          (() => {
            const imagePosition = section.image_position || 'right';
            const showNormalImage = hasNormalImage;
            
            // If normal image is present, use grid layout based on position
            if (showNormalImage) {
              const isImageLeft = imagePosition === 'left';
              const isImageRight = imagePosition === 'right';
              const isImageCenter = imagePosition === 'center';
              
              if (isImageCenter) {
                // Center image layout - image in center, text above/below
                return (
                  <div className={`flex flex-col items-center justify-center ${HERO_VISUAL_MIN_H} ${alignmentClasses}`}>
                    <div className={`w-full max-w-4xl ${textAlignment === 'center' ? 'text-center' : textAlignment === 'right' ? 'text-right' : 'text-left'}`}>
                      {section.title && (
                        <h1 
                          className="font-bold mb-4 leading-tight"
                          style={{ 
                            fontFamily: 'var(--font-heading)',
                            color: 'var(--hero-title-color)',
                            fontSize: titleFontSize,
                          }}
                        >
                          {section.title}
                        </h1>
                      )}
                      {section.subtitle && (
                        <h2 
                          className="mb-4 font-semibold"
                          style={{ 
                            fontFamily: 'var(--font-heading)',
                            color: 'var(--hero-subtitle-color)',
                            fontSize: subtitleFontSize,
                          }}
                        >
                          {section.subtitle}
                        </h2>
                      )}
                      {section.description && (
                        <p 
                          className={`text-base md:text-lg mb-6 ${textAlignment === 'center' ? 'mx-auto max-w-2xl' : ''}`}
                          style={{ 
                            fontFamily: 'var(--font-body)',
                            color: 'var(--hero-description-color)',
                          }}
                        >
                          {section.description}
                        </p>
                      )}
                    </div>
                    
                    {/* Center image - sized for hero (best practice: proportional to hero height) */}
                    <div className={`relative w-full max-w-3xl ${HERO_NORMAL_IMAGE_CENTER} my-3 md:my-4 overflow-hidden rounded-lg`}>
                      {section.image!.startsWith('blob:') ? (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          <div className="text-center">
                            <p className="text-sm font-medium">Image not available</p>
                            <p className="text-xs mt-1">Please re-upload this image</p>
                          </div>
                        </div>
                      ) : (
                        <div className="relative w-full h-full bg-transparent">
                          <Image
                            src={section.image!}
                            alt={section.title || 'Hero image'}
                            fill
                            className={shouldCropImage ? 'object-cover' : 'object-contain'}
                            sizes="(max-width: 1024px) 100vw, 50vw"
                            priority
                            quality={90}
                            unoptimized={section.image!.startsWith('data:')}
                          />
                        </div>
                      )}
                    </div>
                    
                    {section.cta_text && section.cta_link && (
                      <div className={textAlignment === 'center' ? 'flex justify-center' : textAlignment === 'right' ? 'flex justify-end' : ''}>
                        <Button 
                          asChild
                          size="lg"
                          className="text-base px-6 py-3"
                          style={{ 
                            backgroundColor: 'var(--hero-cta-bg-color)',
                            color: 'var(--hero-cta-text-color)',
                          }}
                        >
                          <a href={section.cta_link}>{section.cta_text}</a>
                        </Button>
                      </div>
                    )}
                  </div>
                );
              } else {
                // Left or right image layout - side by side
                return (
                  <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 items-center ${HERO_VISUAL_MIN_H} ${isImageLeft ? 'lg:grid-flow-col-dense' : ''}`}>
                    {/* Image column */}
                    {isImageLeft && (
                      <div className={`relative w-full ${HERO_NORMAL_IMAGE_SIDE} order-1 overflow-hidden rounded-lg`}>
                        {section.image!.startsWith('blob:') ? (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <div className="text-center">
                              <p className="text-sm font-medium">Image not available</p>
                              <p className="text-xs mt-1">Please re-upload this image</p>
                            </div>
                          </div>
                        ) : (
                          <div className="relative w-full h-full bg-transparent">
                            <Image
                              src={section.image!}
                              alt={section.title || 'Hero image'}
                              fill
                              className={shouldCropImage ? 'object-cover' : 'object-contain'}
                              sizes="(max-width: 1024px) 100vw, 50vw"
                              priority
                              quality={90}
                              unoptimized={section.image!.startsWith('data:')}
                            />
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Text column */}
                    <div className={`${isImageLeft ? 'order-2' : 'order-1'} ${textAlignment === 'center' ? 'text-center' : textAlignment === 'right' ? 'text-right' : 'text-left'}`}>
                      {section.title && (
                        <h1 
                          className="font-bold mb-4 leading-tight"
                          style={{ 
                            fontFamily: 'var(--font-heading)',
                            color: 'var(--hero-title-color)',
                            fontSize: titleFontSize,
                          }}
                        >
                          {section.title}
                        </h1>
                      )}
                      {section.subtitle && (
                        <h2 
                          className="mb-4 font-semibold"
                          style={{ 
                            fontFamily: 'var(--font-heading)',
                            color: 'var(--hero-subtitle-color)',
                            fontSize: subtitleFontSize,
                          }}
                        >
                          {section.subtitle}
                        </h2>
                      )}
                      {section.description && (
                        <p 
                          className="text-base md:text-lg mb-6"
                          style={{ 
                            fontFamily: 'var(--font-body)',
                            color: 'var(--hero-description-color)',
                          }}
                        >
                          {section.description}
                        </p>
                      )}
                      {section.cta_text && section.cta_link && (
                        <div className={textAlignment === 'center' ? 'flex justify-center' : textAlignment === 'right' ? 'flex justify-end' : ''}>
                          <Button 
                            asChild
                            size="lg"
                            className="text-base px-6 py-3"
                            style={{ 
                              backgroundColor: 'var(--hero-cta-bg-color)',
                              color: 'var(--hero-cta-text-color)',
                            }}
                          >
                            <a href={section.cta_link}>{section.cta_text}</a>
                          </Button>
                        </div>
                      )}
                    </div>
                    
                    {/* Image column - right */}
                    {isImageRight && (
                      <div className={`relative w-full ${HERO_NORMAL_IMAGE_SIDE} order-2 overflow-hidden rounded-lg`}>
                        {section.image!.startsWith('blob:') ? (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <div className="text-center">
                              <p className="text-sm font-medium">Image not available</p>
                              <p className="text-xs mt-1">Please re-upload this image</p>
                            </div>
                          </div>
                        ) : (
                          <div className="relative w-full h-full bg-transparent">
                            <Image
                              src={section.image!}
                              alt={section.title || 'Hero image'}
                              fill
                              className={shouldCropImage ? 'object-cover' : 'object-contain'}
                              sizes="(max-width: 1024px) 100vw, 50vw"
                              priority
                              quality={90}
                              unoptimized={section.image!.startsWith('data:')}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              }
            } else {
              // No normal image - just text content
              return (
                <div className={`flex ${alignmentClasses} ${HERO_VISUAL_MIN_H}`}>
                  <div className={`max-w-4xl w-full ${textAlignment === 'center' ? 'mx-auto' : textAlignment === 'right' ? 'ml-auto' : ''}`}>
                    {section.title && (
                      <h1 
                        className="font-bold mb-4 leading-tight"
                        style={{ 
                          fontFamily: 'var(--font-heading)',
                          color: 'var(--hero-title-color)',
                          fontSize: titleFontSize,
                        }}
                      >
                        {section.title}
                      </h1>
                    )}
                    {section.subtitle && (
                      <h2 
                        className="mb-4 font-semibold"
                        style={{ 
                          fontFamily: 'var(--font-heading)',
                          color: 'var(--hero-subtitle-color)',
                          fontSize: subtitleFontSize,
                        }}
                      >
                        {section.subtitle}
                      </h2>
                    )}
                    {section.description && (
                      <p 
                        className={`text-base md:text-lg mb-6 ${textAlignment === 'center' ? 'mx-auto max-w-2xl' : ''}`}
                        style={{ 
                          fontFamily: 'var(--font-body)',
                          color: 'var(--hero-description-color)',
                        }}
                      >
                        {section.description}
                      </p>
                    )}
                    {section.cta_text && section.cta_link && (
                      <div className={textAlignment === 'center' ? 'flex justify-center' : textAlignment === 'right' ? 'flex justify-end' : ''}>
                        <Button 
                          asChild
                          size="lg"
                          className="text-base px-6 py-3"
                          style={{ 
                            backgroundColor: 'var(--hero-cta-bg-color)',
                            color: 'var(--hero-cta-text-color)',
                          }}
                        >
                          <a href={section.cta_link}>{section.cta_text}</a>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            }
          })()
        ) : (
          // Two-column layout with image on the right
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 items-center">
            <div className={textAlignment === 'center' ? 'text-center' : textAlignment === 'right' ? 'text-right' : 'text-left'}>
              {section.title && (
                <h1 
                  className="font-bold mb-4 leading-tight"
                  style={{ 
                    fontFamily: 'var(--font-heading)',
                    color: 'var(--hero-title-color)',
                    fontSize: titleFontSize,
                  }}
                >
                  {section.title}
                </h1>
              )}
              {section.subtitle && (
                <h2 
                  className="mb-4 font-semibold"
                  style={{ 
                    fontFamily: 'var(--font-heading)',
                    color: 'var(--hero-subtitle-color)',
                    fontSize: subtitleFontSize,
                  }}
                >
                  {section.subtitle}
                </h2>
              )}
              {section.description && (
                <p 
                  className="text-base md:text-lg mb-6" 
                  style={{ 
                    fontFamily: 'var(--font-body)',
                    color: 'var(--hero-description-color)',
                  }}
                >
                  {section.description}
                </p>
              )}
              {section.cta_text && section.cta_link && (
                <div className={textAlignment === 'center' ? 'flex justify-center' : textAlignment === 'right' ? 'flex justify-end' : ''}>
                  <Button 
                    asChild
                    size="lg"
                    className="text-base px-6 py-3"
                    style={{ 
                      backgroundColor: 'var(--hero-cta-bg-color)',
                      color: 'var(--hero-cta-text-color)',
                    }}
                  >
                    <a href={section.cta_link}>{section.cta_text}</a>
                  </Button>
                </div>
              )}
            </div>
            {hasNormalImage && (
              <div className={`relative w-full ${HERO_NORMAL_IMAGE_SIDE} overflow-hidden rounded-lg`}>
                {section.image!.startsWith('blob:') ? (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <p className="text-sm font-medium">Image not available</p>
                      <p className="text-xs mt-1">Please re-upload this image</p>
                    </div>
                  </div>
                ) : (
                  <div className="relative w-full h-full bg-transparent">
                    <Image
                      src={section.image!}
                      alt={section.title || 'Hero image'}
                      fill
                      className={shouldCropImage ? 'object-cover' : 'object-contain'}
                      sizes="(max-width: 1024px) 100vw, 50vw"
                      priority
                      quality={90}
                      unoptimized={section.image!.startsWith('data:')}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = `
                            <div class="w-full h-full flex items-center justify-center text-muted-foreground">
                              <div class="text-center">
                                <p class="text-sm font-medium">Image not available</p>
                                <p class="text-xs mt-1">Please check the image URL</p>
                              </div>
                            </div>
                          `;
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      </div>
    </section>
  );
}

function FeaturesSectionComponent({ 
  section, 
  isPreview 
}: { 
  section: Extract<PageSection, { type: 'features' }>; 
  isPreview: boolean;
}) {
  const columns = section.columns || 3;
  const gridCols = columns === 2 ? 'md:grid-cols-2' : columns === 4 ? 'md:grid-cols-4' : 'md:grid-cols-3';
  
  // Set CSS variables on section for better performance (section-specific naming)
  const sectionStyle = {
    '--features-bg': section.background_color || 'transparent',
    '--features-title-color': section.title_color || 'var(--color-primary, currentColor)',
    '--features-subtitle-color': section.subtitle_color || 'var(--color-text, #666666)',
    '--font-heading': 'var(--font-heading, inherit)',
    '--font-body': 'var(--font-body, inherit)',
  } as React.CSSProperties & Record<string, string | undefined>;

  return (
    <section 
      className="py-16" 
      style={{
        ...sectionStyle,
        backgroundColor: 'var(--features-bg)',
      }}
    >
      <div className="container mx-auto px-4" style={{ maxWidth: 'var(--container-max-width, 1200px)' }}>
        {section.title && (
          <h2 
            className="text-3xl font-bold text-center mb-4"
            style={{ 
              fontFamily: 'var(--font-heading)',
              color: 'var(--features-title-color)',
            }}
          >
            {section.title}
          </h2>
        )}
        {section.subtitle && (
          <p 
            className="text-lg text-center mb-12" 
            style={{ 
              fontFamily: 'var(--font-body)',
              color: 'var(--features-subtitle-color)',
            }}
          >
            {section.subtitle}
          </p>
        )}
        <div className={`grid grid-cols-1 ${gridCols} gap-6`}>
          {section.features.map((feature: any) => (
            <Card key={feature.id}>
              <CardContent className="pt-6">
                {feature.image && (
                  <div className="relative aspect-video mb-4 rounded-lg overflow-hidden">
                    <Image
                      src={feature.image}
                      alt={feature.title}
                      fill
                      className="object-contain"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  </div>
                )}
                {feature.icon && (
                  <div className="text-4xl mb-4 flex items-center justify-center">
                    {feature.icon.startsWith('icon:') ? (
                      (() => {
                        const iconName = feature.icon.replace('icon:', '');
                        const IconComponent = (LucideIcons as any)[iconName];
                        return IconComponent ? (
                          <IconComponent className="h-12 w-12 text-primary" />
                        ) : (
                          <span className="text-4xl">📦</span>
                        );
                      })()
                    ) : (
                      <span>{feature.icon}</span>
                    )}
                  </div>
                )}
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                {feature.description && (
                  <p className="text-muted-foreground">{feature.description}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

interface Product {
  id: string;
  name: string;
  slug: string | null;
  price: number;
  compareAtPrice?: number;
  image: string | null;
  stock_quantity: number | null;
  saleBadge?: string;
  saleBadgeColor?: string;
  discountPercent?: number;
}

function ProductsSectionComponent({ 
  section, 
  isPreview 
}: { 
  section: Extract<PageSection, { type: 'products' }>; 
  isPreview: boolean;
}) {
  const columns = section.columns || 4;
  const gridCols = columns === 2 ? 'md:grid-cols-2' : columns === 3 ? 'md:grid-cols-3' : 'md:grid-cols-4';
  const headingFont = 'var(--font-heading, inherit)';
  const bodyFont = 'var(--font-body, inherit)';
  
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Don't fetch in preview mode
    if (isPreview) {
      setIsLoading(false);
      return;
    }

    const fetchProducts = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Build query parameters
        const params = new URLSearchParams();
        params.append('status', 'active');
        params.append('limit', String(section.limit || 8));
        
        if (section.category_id) {
          params.append('category_id', section.category_id);
        }
        
        // Fetch products from API
        const response = await fetch(`/api/products?${params.toString()}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch products');
        }
        
        const data = await response.json();
        
        // Convert products to match Product interface
        const fetchedProducts: Product[] = (data.products || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          price: typeof p.price === 'number' ? p.price : Number(p.price),
          image: p.image,
          stock_quantity: p.stock_quantity,
        }));
        
        setProducts(fetchedProducts);
      } catch (err) {
        console.error('Error fetching products:', err);
        setError(err instanceof Error ? err.message : 'Failed to load products');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, [section.category_id, section.limit, isPreview]);

  // Set CSS variables on section for better performance (section-specific naming)
  const sectionStyle = {
    '--products-bg': section.background_color || 'transparent',
    '--products-title-color': section.title_color || 'var(--color-primary, currentColor)',
    '--products-subtitle-color': section.subtitle_color || 'var(--color-text, #666666)',
    '--font-heading': 'var(--font-heading, inherit)',
    '--font-body': 'var(--font-body, inherit)',
  } as React.CSSProperties & Record<string, string | undefined>;

  return (
    <section 
      className="py-16" 
      style={{
        ...sectionStyle,
        backgroundColor: 'var(--products-bg)',
      }}
    >
      <div className="container mx-auto px-4" style={{ maxWidth: 'var(--container-max-width, 1200px)' }}>
        {section.title && (
          <h2 
            className="text-3xl font-bold text-center mb-4"
            style={{ 
              fontFamily: 'var(--font-heading)',
              color: 'var(--products-title-color)',
            }}
          >
            {section.title}
          </h2>
        )}
        {section.subtitle && (
          <p 
            className="text-lg text-center mb-12" 
            style={{ 
              fontFamily: 'var(--font-body)',
              color: 'var(--products-subtitle-color)',
            }}
          >
            {section.subtitle}
          </p>
        )}
        <div className={`grid grid-cols-1 ${gridCols} gap-6`}>
          {isPreview ? (
            <div className="text-center text-muted-foreground py-12 border-2 border-dashed rounded-lg">
              Products will be displayed here
              {section.product_ids && section.product_ids.length > 0 && (
                <p className="text-sm mt-2">{section.product_ids.length} product(s) selected</p>
              )}
              {section.category_id && (
                <p className="text-sm mt-2">Category: {section.category_id}</p>
              )}
            </div>
          ) : isLoading ? (
            <div className="col-span-full text-center text-muted-foreground py-12">
              Loading products...
            </div>
          ) : error ? (
            <div className="col-span-full text-center text-destructive py-12">
              {error}
            </div>
          ) : products.length === 0 ? (
            <div className="col-span-full text-center text-muted-foreground py-12">
              No products found
            </div>
          ) : (
            products.map((product) => (
              <DefaultProductCard key={product.id} product={product} />
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function TestimonialsSectionComponent({ 
  section, 
  isPreview 
}: { 
  section: Extract<PageSection, { type: 'testimonials' }>; 
  isPreview: boolean;
}) {
  const columns = section.columns || 3;
  const gridCols = columns === 1 ? 'md:grid-cols-1' : columns === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3';
  const headingFont = 'var(--font-heading, inherit)';
  const bodyFont = 'var(--font-body, inherit)';
  
  // Set CSS variables on section for better performance (section-specific naming)
  const sectionStyle = {
    '--testimonials-bg': section.background_color || 'var(--color-muted, rgba(0,0,0,0.05))',
    '--testimonials-title-color': section.title_color || 'var(--color-primary, currentColor)',
    '--testimonials-subtitle-color': section.subtitle_color || 'var(--color-text, #666666)',
    '--font-heading': 'var(--font-heading, inherit)',
    '--font-body': 'var(--font-body, inherit)',
  } as React.CSSProperties & Record<string, string | undefined>;

  return (
    <section 
      className="py-16" 
      style={{
        ...sectionStyle,
        backgroundColor: 'var(--testimonials-bg)',
      }}
    >
      <div className="container mx-auto px-4" style={{ maxWidth: 'var(--container-max-width, 1200px)' }}>
        {section.title && (
          <h2 
            className="text-3xl font-bold text-center mb-4"
            style={{ 
              fontFamily: 'var(--font-heading)',
              color: 'var(--testimonials-title-color)',
            }}
          >
            {section.title}
          </h2>
        )}
        {section.subtitle && (
          <p 
            className="text-lg text-center mb-12" 
            style={{ 
              fontFamily: 'var(--font-body)',
              color: 'var(--testimonials-subtitle-color)',
            }}
          >
            {section.subtitle}
          </p>
        )}
        <div className={`grid grid-cols-1 ${gridCols} gap-6`}>
          {section.testimonials.map((testimonial: any) => (
            <Card key={testimonial.id}>
              <CardContent className="pt-6">
                {testimonial.rating && (
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: 5 }).map((_: any, i: any) => (
                      <span key={i} className={i < testimonial.rating! ? 'text-yellow-400' : 'text-gray-300'}>
                        ★
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-muted-foreground mb-4 italic">&quot;{testimonial.content}&quot;</p>
                <div className="flex items-center gap-4">
                  {testimonial.image && (
                    <div className="relative w-12 h-12 rounded-full overflow-hidden">
                      <Image
                        src={testimonial.image}
                        alt={testimonial.name}
                        fill
                        className="object-contain"
                        sizes="48px"
                      />
                    </div>
                  )}
                  <div>
                    <p className="font-semibold">{testimonial.name}</p>
                    {(testimonial.role || testimonial.company) && (
                      <p className="text-sm text-muted-foreground">
                        {testimonial.role}
                        {testimonial.role && testimonial.company && ', '}
                        {testimonial.company}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function TextSectionComponent({ 
  section, 
  isPreview 
}: { 
  section: Extract<PageSection, { type: 'text' }>; 
  isPreview: boolean;
}) {
  // Set CSS variables on section for better performance (section-specific naming)
  const sectionStyle = {
    '--text-bg': section.background_color || 'transparent',
    '--text-color': section.text_color || 'var(--color-text, currentColor)',
    '--font-body': 'var(--font-body, inherit)',
  } as React.CSSProperties & Record<string, string | undefined>;

  return (
    <section
      className="py-16"
      style={{
        ...sectionStyle,
        backgroundColor: 'var(--text-bg)',
      }}
    >
      <div className="container mx-auto px-4" style={{ maxWidth: 'var(--container-max-width, 1200px)' }}>
        <div
          className="prose prose-lg max-w-none"
          style={{ color: 'var(--text-color)' }}
          dangerouslySetInnerHTML={{ __html: section.content }}
        />
      </div>
    </section>
  );
}

function ImageSectionComponent({ 
  section, 
  isPreview 
}: { 
  section: Extract<PageSection, { type: 'image' }>; 
  isPreview: boolean;
}) {
  return (
    <section className={`py-8 ${section.full_width ? '' : 'container mx-auto px-4'}`} style={{ maxWidth: section.full_width ? '100%' : 'var(--container-max-width, 1200px)' }}>
      <div className={section.full_width ? '' : 'max-w-4xl mx-auto'}>
        <div className="relative rounded-lg overflow-hidden">
          {section.image.startsWith('blob:') ? (
            <div className="w-full h-64 flex items-center justify-center bg-muted text-muted-foreground">
              <div className="text-center">
                <p className="text-sm font-medium">Image not available</p>
                <p className="text-xs mt-1">Please re-upload this image</p>
              </div>
            </div>
          ) : (
            <div className="relative w-full" style={{ minHeight: '200px' }}>
              <Image
                src={section.image}
                alt={section.alt_text || section.caption || 'Image'}
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    parent.innerHTML = `
                      <div class="w-full h-64 flex items-center justify-center bg-muted text-muted-foreground">
                        <div class="text-center">
                          <p class="text-sm font-medium">Image not available</p>
                          <p class="text-xs mt-1">Please check the image URL</p>
                        </div>
                      </div>
                    `;
                  }
                }}
              />
            </div>
          )}
          {section.caption && (
            <p className="text-sm text-muted-foreground text-center mt-2">{section.caption}</p>
          )}
        </div>
      </div>
    </section>
  );
}

interface Category {
  id: string;
  name: string;
  slug: string | null;
  image: string | null;
}

function CategoriesSectionComponent({ 
  section, 
  isPreview 
}: { 
  section: Extract<PageSection, { type: 'categories' }>; 
  isPreview: boolean;
}) {
  const columns = section.columns || 8;
  const gridCols = columns === 2 ? 'md:grid-cols-2' : columns === 4 ? 'md:grid-cols-4' : columns === 6 ? 'md:grid-cols-6' : 'md:grid-cols-8';
  const headingFont = 'var(--font-heading, inherit)';
  const bodyFont = 'var(--font-body, inherit)';
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isPreview) {
      setIsLoading(false);
      return;
    }

    const fetchCategories = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const params = new URLSearchParams();
        params.append('status', 'active');
        params.append('include_children', 'false');
        
        const response = await fetch(`/api/categories?${params.toString()}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch categories');
        }
        
        const data = await response.json();
        
        let fetchedCategories: Category[] = (data.categories || []).map((c: any) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          image: c.image,
        }));
        
        // Filter by selected category_ids if provided
        if (section.category_ids && section.category_ids.length > 0) {
          fetchedCategories = fetchedCategories.filter((c) =>
            section.category_ids!.includes(c.id)
          );
        } else {
          // If no specific categories selected, apply limit
          fetchedCategories = fetchedCategories.slice(0, section.limit || 8);
        }
        
        setCategories(fetchedCategories);
      } catch (err) {
        console.error('Error fetching categories:', err);
        setError(err instanceof Error ? err.message : 'Failed to load categories');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategories();
  }, [section.limit, section.category_ids, isPreview]);

  // Helper to get category image or default
  const getCategoryImage = (category: Category) => {
    if (category.image) return category.image;
    const name = category.name.toLowerCase();
    if (name.includes('meat') || name.includes('fresh')) {
      return 'https://images.unsplash.com/photo-1603048297172-c92544798d5e?w=400&h=400&fit=crop';
    } else if (name.includes('fruit')) {
      return 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=400&h=400&fit=crop';
    } else if (name.includes('vegetable')) {
      return 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=400&fit=crop';
    }
    return 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=400&fit=crop';
  };

  // Set CSS variables on section for better performance (section-specific naming)
  const sectionStyle = {
    '--categories-bg': section.background_color || 'transparent',
    '--categories-title-color': section.title_color || 'var(--color-text, currentColor)',
    '--categories-subtitle-color': section.subtitle_color || 'var(--color-text, #666666)',
    '--font-heading': 'var(--font-heading, inherit)',
    '--font-body': 'var(--font-body, inherit)',
  } as React.CSSProperties & Record<string, string | undefined>;

  return (
    <section 
      className="py-16" 
      style={{
        ...sectionStyle,
        backgroundColor: 'var(--categories-bg)',
      }}
    >
      <div className="container mx-auto px-4" style={{ maxWidth: 'var(--container-max-width, 1200px)' }}>
        {(section.title || section.subtitle) && (
          <div className="flex items-center justify-between mb-8">
            {section.title && (
              <h2 
                className="text-3xl md:text-4xl font-bold"
                style={{ 
                  fontFamily: 'var(--font-heading)',
                  color: 'var(--categories-title-color)',
                }}
              >
                {section.title}
              </h2>
            )}
            {section.subtitle && (
              <p 
                className="text-lg"
                style={{ 
                  fontFamily: 'var(--font-body)',
                  color: 'var(--categories-subtitle-color)',
                }}
              >
                {section.subtitle}
              </p>
            )}
          </div>
        )}
        {isPreview ? (
          <div className="text-center text-muted-foreground py-12 border-2 border-dashed rounded-lg">
            Categories will be displayed here
            {section.category_ids && section.category_ids.length > 0 ? (
              <p className="text-sm mt-2">{section.category_ids.length} categor{section.category_ids.length === 1 ? 'y' : 'ies'} selected</p>
            ) : section.limit ? (
              <p className="text-sm mt-2">Limit: {section.limit} categories</p>
            ) : null}
          </div>
        ) : isLoading ? (
          <div className="text-center text-muted-foreground py-12">
            Loading categories...
          </div>
        ) : error ? (
          <div className="text-center text-destructive py-12">
            {error}
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">
            No categories found
          </div>
        ) : (
          <div className={`grid grid-cols-2 ${gridCols} gap-6`}>
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/products?category=${category.slug || category.id}`}
                className="block text-center group"
              >
                <div className="relative mb-4">
                  <div className="w-24 h-24 mx-auto rounded-full overflow-hidden border-4 border-green-200 group-hover:border-green-500 transition-colors relative">
                    <Image
                      src={getCategoryImage(category)}
                      alt={category.name}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                      sizes="96px"
                    />
                  </div>
                </div>
                <h3 className="font-bold text-sm mb-1 group-hover:text-primary transition-colors">
                  {category.name}
                </h3>
                {section.show_count && (
                  <p className="text-xs text-gray-600">View Items</p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function BannersSectionComponent({ 
  section, 
  isPreview 
}: { 
  section: Extract<PageSection, { type: 'banners' }>; 
  isPreview: boolean;
}) {
  const columns = section.columns || 3;
  const gridCols = columns === 1 ? 'grid-cols-1' : columns === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3';
  const headingFont = 'var(--font-heading, inherit)';
  const bodyFont = 'var(--font-body, inherit)';
  
  // Set CSS variables on section for better performance (section-specific naming)
  const sectionStyle = {
    '--banners-bg': section.background_color || 'transparent',
    '--banners-title-color': section.title_color || 'var(--color-text, currentColor)',
    '--banners-subtitle-color': section.subtitle_color || 'var(--color-text, #666666)',
    '--font-heading': 'var(--font-heading, inherit)',
    '--font-body': 'var(--font-body, inherit)',
  } as React.CSSProperties & Record<string, string | undefined>;

  return (
    <section 
      className="py-8" 
      style={{
        ...sectionStyle,
        backgroundColor: 'var(--banners-bg)',
      }}
    >
      <div className="container mx-auto px-4" style={{ maxWidth: 'var(--container-max-width, 1200px)' }}>
        {(section.title || section.subtitle) && (
          <div className="mb-8 text-center">
            {section.title && (
              <h2 
                className="text-3xl font-bold mb-4"
                style={{ 
                  fontFamily: 'var(--font-heading)',
                  color: 'var(--banners-title-color)',
                }}
              >
                {section.title}
              </h2>
            )}
            {section.subtitle && (
              <p 
                className="text-lg mb-4"
                style={{ 
                  fontFamily: 'var(--font-body)',
                  color: 'var(--banners-subtitle-color)',
                }}
              >
                {section.subtitle}
              </p>
            )}
          </div>
        )}
        <div className={`grid ${gridCols} gap-6`}>
          {section.banners.map((banner) => {
            // Set banner-specific CSS variables
            const bannerStyle = {
              '--banner-bg': banner.background_color || 'var(--color-background, #f3f4f6)',
              '--banner-title-color': banner.title_color || 'var(--banners-title-color)',
              '--banner-subtitle-color': banner.subtitle_color || 'var(--banners-subtitle-color)',
              '--banner-cta-text-color': banner.cta_text_color || '#FFFFFF',
              '--banner-cta-bg-color': banner.cta_button_color || 'var(--color-primary, hsl(var(--primary)))',
            } as React.CSSProperties & Record<string, string | undefined>;
            
            return (
              <div
                key={banner.id}
                className="relative rounded-lg overflow-hidden shadow-lg h-48 group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                style={bannerStyle}
              >
                {banner.image && !banner.image.startsWith('blob:') && (
                  <Image
                    src={banner.image}
                    alt={banner.title}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                )}
                <div className="absolute inset-0 flex flex-col justify-center p-6">
                  {banner.subtitle && (
                    <p 
                      className="text-sm mb-2"
                      style={{ color: 'var(--banner-subtitle-color)' }}
                    >
                      {banner.subtitle}
                    </p>
                  )}
                  <h3 
                    className="text-xl font-bold mb-3"
                    style={{ 
                      fontFamily: 'var(--font-heading)',
                      color: 'var(--banner-title-color)',
                    }}
                  >
                    {banner.title}
                  </h3>
                  {banner.cta_text && banner.cta_link && (
                    <Link href={banner.cta_link}>
                      <Button
                        size="sm"
                        style={{
                          backgroundColor: 'var(--banner-cta-bg-color)',
                          color: 'var(--banner-cta-text-color)',
                        }}
                        className="w-fit"
                      >
                        {banner.cta_text}
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function SalesTabSectionComponent({ 
  section, 
  isPreview 
}: { 
  section: Extract<PageSection, { type: 'sales_tab' }>; 
  isPreview: boolean;
}) {
  const displayMode = section.display_mode || 'single_sale';
  const layout = section.layout || 'grid';
  const columns = section.columns || 4;
  const gridCols = columns === 2 ? 'md:grid-cols-2' : columns === 3 ? 'md:grid-cols-3' : 'md:grid-cols-4';
  const headingFont = 'var(--font-heading, inherit)';
  const bodyFont = 'var(--font-body, inherit)';
  
  const [sales, setSales] = useState<any[]>([]);
  /** Each block has one sale and its products – for vertical layout (one sale = title, banner, timer, products) */
  const [saleBlocks, setSaleBlocks] = useState<Array<{ sale: any; products: Product[] }>>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  const mapSaleProducts = useCallback((productsArray: any[], sale: any, limit: number): Product[] =>
    (productsArray || []).map((product: any) => {
      const regularPrice = Number(product.compareAtPrice || product.price);
      const salePrice = Number(product.price);
      const discountPercent = product.discount_percent
        ? Number(product.discount_percent)
        : product.compareAtPrice && salePrice < regularPrice
          ? Math.round(((regularPrice - salePrice) / regularPrice) * 100)
          : 0;
      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: salePrice,
        compareAtPrice: product.compareAtPrice || undefined,
        image: product.image,
        stock_quantity: product.stock_quantity,
        saleBadge: section.badge_text || sale.badge_text || 'SALE',
        saleBadgeColor: section.badge_color || sale.badge_color || '#EF4444',
        discountPercent,
      };
    }).slice(0, limit), [section.badge_text, section.badge_color]);

  useEffect(() => {
    if (isPreview) {
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (displayMode === 'single_sale' && section.sale_id) {
          // Use sale_slug if available, otherwise try to fetch from public API
          let saleSlug = section.sale_slug;
          
          // If no slug stored, we need to get it - but we can't use dashboard API from storefront
          // So we'll try to fetch from public API by trying common patterns or use the stored slug
          if (!saleSlug) {
            // Try to get slug from sale_id by checking if it's actually a slug
            // If sale_id looks like a UUID, we can't proceed without slug
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(section.sale_id);
            if (isUUID) {
              throw new Error('Sale slug not available. Please re-select the sale in the page editor.');
            } else {
              // If it's not a UUID, assume it's a slug
              saleSlug = section.sale_id;
            }
          }
          
          // Fetch sale with products using slug (public API)
          const saleResponse = await fetch(`/api/sales/${saleSlug}`);
          if (!saleResponse.ok) {
            if (saleResponse.status === 404) {
              throw new Error('Sale not found. The sale may have been deleted or is not active.');
            }
            throw new Error('Failed to fetch sale');
          }
          const saleData = await saleResponse.json();
          const saleProducts = mapSaleProducts(saleData.products || [], saleData.sale || {}, section.limit || 8);
          setProducts(saleProducts);
          setSales([saleData.sale]);
          setSaleBlocks([{ sale: saleData.sale, products: saleProducts }]);
        } else if (displayMode === 'featured_sales' && section.featured_sale_ids && section.featured_sale_ids.length > 0) {
          // Fetch featured sales from public API
          const featuredSalesResponse = await fetch('/api/sales?status=active&is_featured=true&limit=10');
          if (!featuredSalesResponse.ok) {
            throw new Error('Failed to fetch featured sales');
          }
          const featuredData = await featuredSalesResponse.json();
          const featuredSales = featuredData.sales || [];
          
          // Limit to the number of featured sales selected
          const salesToShow = featuredSales.slice(0, section.featured_sale_ids.length);
          
          // Fetch products for each featured sale
          const salesWithProducts = await Promise.all(
            salesToShow.map(async (sale: any) => {
              try {
                const saleResponse = await fetch(`/api/sales/${sale.slug}`);
                if (saleResponse.ok) {
                  const saleData = await saleResponse.json();
                  return {
                    ...saleData.sale || sale,
                    products: saleData.products || [],
                  };
                }
              } catch (error) {
                console.error(`Error fetching sale ${sale.slug}:`, error);
              }
              return null;
            })
          );
          
          const validSalesData = salesWithProducts.filter(s => s !== null);
          setSales(validSalesData);
          const blocks = validSalesData.map((s: any) => ({
            sale: s,
            products: mapSaleProducts(s.products || [], s, section.limit || 8),
          }));
          setSaleBlocks(blocks);
          if (blocks.length > 0) {
            setProducts(blocks[activeTab]?.products ?? blocks[0].products);
          } else {
            setProducts([]);
          }
        } else if (displayMode === 'all_active') {
          const salesResponse = await fetch('/api/sales?status=active&limit=10');
          if (!salesResponse.ok) throw new Error('Failed to fetch sales');
          const salesData = await salesResponse.json();
          const allSales = salesData.sales || [];
          setSales(allSales);

          const blocks: Array<{ sale: any; products: Product[] }> = [];
          for (const sale of allSales) {
            const saleResponse = await fetch(`/api/sales/${sale.slug}`);
            if (saleResponse.ok) {
              const saleData = await saleResponse.json();
              const saleProducts = mapSaleProducts(saleData.products || [], saleData.sale || sale, section.limit || 8);
              blocks.push({ sale: saleData.sale || sale, products: saleProducts });
            }
          }
          setSaleBlocks(blocks);
          setProducts(blocks[0]?.products ?? []);
        } else {
          setProducts([]);
          setSaleBlocks([]);
        }
      } catch (err) {
        console.error('Error fetching sales data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load sales');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [displayMode, section.sale_id, section.sale_slug, section.featured_sale_ids, section.limit, section.badge_text, section.badge_color, activeTab, isPreview, mapSaleProducts]);

  // Update products when active tab changes (featured_sales with tabs layout)
  useEffect(() => {
    if (displayMode === 'featured_sales' && saleBlocks.length > 0 && !isPreview) {
      const block = saleBlocks[activeTab] ?? saleBlocks[0];
      if (block) setProducts(block.products);
      return;
    }
    if (displayMode === 'featured_sales' && sales.length > 0 && !isPreview) {
      const activeSale = sales[activeTab] || sales[0];
      if (activeSale && activeSale.slug) {
        // Fallback: fetch if products not already loaded
        fetch(`/api/sales/${activeSale.slug}`)
          .then(res => res.json())
          .then(data => {
            const productsArray = data.products || [];
            const saleProducts: Product[] = productsArray.map((product: any) => {
              const regularPrice = Number(product.compareAtPrice || product.price);
              const salePrice = Number(product.price);
              const discountPercent = product.discount_percent 
                ? Number(product.discount_percent)
                : product.compareAtPrice && salePrice < regularPrice
                ? Math.round(((regularPrice - salePrice) / regularPrice) * 100)
                : 0;

              return {
                id: product.id,
                name: product.name,
                slug: product.slug,
                price: salePrice,
                compareAtPrice: product.compareAtPrice || undefined,
                image: product.image,
                stock_quantity: product.stock_quantity,
                saleBadge: section.badge_text || activeSale.badge_text || 'SALE',
                saleBadgeColor: section.badge_color || activeSale.badge_color || '#EF4444',
                discountPercent,
              };
            }).slice(0, section.limit || 8);
            setProducts(saleProducts);
          })
          .catch(err => {
            console.error('Error fetching sale products:', err);
            setProducts([]);
          });
      }
    }
  }, [activeTab, displayMode, sales, saleBlocks, section.limit, section.badge_text, section.badge_color, isPreview]);

  const renderProductCards = (productsList: Product[]) => {
    if (!productsList.length) {
      return (
        <div className="col-span-full text-center text-muted-foreground py-12">
          No products found
        </div>
      );
    }
    return productsList.map((product) => (
      <div key={product.id} className="relative">
        {section.show_badge !== false && product.saleBadge && (
          <Badge
            className="absolute top-2 left-2 z-10"
            style={{
              backgroundColor: product.saleBadgeColor || '#EF4444',
              color: '#FFFFFF',
            }}
          >
            {product.saleBadge}
            {product.discountPercent && product.discountPercent > 0 && (
              <span className="ml-1">-{product.discountPercent}%</span>
            )}
          </Badge>
        )}
        <DefaultProductCard product={product} />
      </div>
    ));
  };

  const renderProducts = () => {
    if (isPreview) {
      return (
        <div className="text-center text-muted-foreground py-12 border-2 border-dashed rounded-lg col-span-full">
          Sales Tab products will be displayed here
        </div>
      );
    }
    if (isLoading) {
      return (
        <div className="col-span-full text-center text-muted-foreground py-12">
          Loading products...
        </div>
      );
    }
    if (error) {
      return (
        <div className="col-span-full text-center text-destructive py-12">
          {error}
        </div>
      );
    }
    return renderProductCards(products);
  };

  const containerClass = 'container mx-auto px-4';
  const containerStyle = { maxWidth: 'var(--container-max-width, 1200px)' };

  if (isLoading) {
    return (
      <section className="py-16 bg-white" style={{ fontFamily: bodyFont }}>
        <div className={containerClass} style={containerStyle}>
          <div className="text-center text-muted-foreground py-12">Loading sales...</div>
        </div>
      </section>
    );
  }
  if (error) {
    return (
      <section className="py-16 bg-white" style={{ fontFamily: bodyFont }}>
        <div className={containerClass} style={containerStyle}>
          <div className="text-center text-destructive py-12">{error}</div>
        </div>
      </section>
    );
  }

  const useVerticalLayout = saleBlocks.length > 1;

  return (
    <section className="py-16 bg-white" style={{ fontFamily: bodyFont }}>
      {/* Section header (title, subtitle, top CTA) */}
      <div className={containerClass} style={containerStyle}>
        <div className="flex items-center justify-between mb-8">
          <div>
            {section.title && (
              <h2
                className="text-3xl md:text-4xl font-bold mb-2"
                style={{ fontFamily: headingFont, color: section.title_color || 'var(--color-text, currentColor)' }}
              >
                {section.title}
              </h2>
            )}
            {!useVerticalLayout && section.show_sale_name && sales.length > 0 && (
              <p className="text-lg font-semibold text-primary mb-2">{sales[0].name}</p>
            )}
            {section.subtitle && (
              <p
                className="mb-0"
                style={{ color: section.subtitle_color || 'var(--color-muted-foreground)' }}
              >
                {section.subtitle}
              </p>
            )}
          </div>
          {section.cta_position === 'top_right' && section.cta_text && section.cta_link && (
            <Link href={section.cta_link}>
              <Button variant="outline">{section.cta_text}</Button>
            </Link>
          )}
        </div>
      </div>

      {/* Tabs only when multiple sales and not using vertical layout (legacy tabs mode) */}
      {!useVerticalLayout && displayMode === 'featured_sales' && layout === 'tabs' && sales.length > 1 && (
        <div className={containerClass} style={containerStyle}>
          <div className="mb-8 border-b">
            <div className="flex gap-4 overflow-x-auto">
              {sales.map((sale, index) => (
                <button
                  key={sale.id}
                  onClick={() => setActiveTab(index)}
                  className={`px-4 py-2 border-b-2 transition-colors ${
                    activeTab === index ? 'border-primary text-primary font-semibold' : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {sale.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Per-sale blocks: each sale gets its own title, full-width banner, timer, products */}
      {useVerticalLayout ? (
        saleBlocks.map((block) => (
          <div key={block.sale.id} className="mb-12 md:mb-16">
            {section.show_sale_name && (
              <div className={containerClass} style={containerStyle}>
                <h3 className="text-2xl md:text-3xl font-bold mb-4" style={{ fontFamily: headingFont, color: 'var(--color-text, currentColor)' }}>
                  {block.sale.name}
                </h3>
              </div>
            )}
            {section.banner_style !== 'none' && block.sale.banner_image && (
              <div className={`${containerClass} mb-6`} style={containerStyle}>
                <div className="relative aspect-[21/9] overflow-hidden rounded-lg">
                  <Image
                    src={block.sale.banner_image}
                    alt={block.sale.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1200px) 100vw, 1200px"
                  />
                </div>
              </div>
            )}
            {section.show_countdown && block.sale.end_date && (
              <div className={containerClass} style={containerStyle}>
                <div className="mb-8 flex justify-center">
                  <CountdownTimer endDate={block.sale.end_date} />
                </div>
              </div>
            )}
            <div className={containerClass} style={containerStyle}>
              {layout === 'carousel' ? (
                <div className="overflow-x-auto">
                  <div className={`flex gap-6 min-w-max ${gridCols}`}>{renderProductCards(block.products)}</div>
                </div>
              ) : (
                <div className={`grid grid-cols-1 ${gridCols} gap-6`}>{renderProductCards(block.products)}</div>
              )}
            </div>
          </div>
        ))
      ) : saleBlocks.length > 0 ? (
        (() => {
          const block = saleBlocks[0];
          return (
            <>
              {section.banner_style !== 'none' && block.sale.banner_image && (
                <div className={`${containerClass} mb-8`} style={containerStyle}>
                  <div className="relative aspect-[21/9] overflow-hidden rounded-lg">
                    <Image
                      src={block.sale.banner_image}
                      alt={block.sale.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 1200px) 100vw, 1200px"
                    />
                  </div>
                </div>
              )}
              {section.show_countdown && block.sale.end_date && (
                <div className={containerClass} style={containerStyle}>
                  <div className="mb-8 flex justify-center">
                    <CountdownTimer endDate={block.sale.end_date} />
                  </div>
                </div>
              )}
              <div className={containerClass} style={containerStyle}>
                {layout === 'carousel' ? (
                  <div className="overflow-x-auto">
                    <div className={`flex gap-6 min-w-max ${gridCols}`}>{renderProducts()}</div>
                  </div>
                ) : (
                  <div className={`grid grid-cols-1 ${gridCols} gap-6`}>{renderProducts()}</div>
                )}
              </div>
            </>
          );
        })()
      ) : (
        <div className={containerClass} style={containerStyle}>
          <div className="text-center text-muted-foreground py-12">No sales found</div>
        </div>
      )}

      {section.cta_position === 'bottom_center' && section.cta_text && section.cta_link && (
        <div className={containerClass} style={containerStyle}>
          <div className="mt-8 text-center">
            <Link href={section.cta_link}>
              <Button variant="outline" size="lg">
                {section.cta_text}
              </Button>
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}

/**
 * Enhanced Split Layout Section Component
 * Based on Shopify/BigCommerce best practices
 * 
 * Features:
 * - Flexible layout ratios (50/50, 60/40, 40/60, 70/30, 30/70)
 * - Text alignment controls
 * - Mobile behavior options
 * - Spacing/padding controls
 * - Background gradients
 * - Image positioning
 * - Vertical alignment
 */
function SplitLayoutSectionComponent({ 
  section, 
  isPreview 
}: { 
  section: Extract<PageSection, { type: 'split_layout' }>; 
  isPreview: boolean;
}) {
  const headingFont = 'var(--font-heading, inherit)';
  const bodyFont = 'var(--font-body, inherit)';
  
  const [leftProducts, setLeftProducts] = useState<Product[]>([]);
  const [rightProducts, setRightProducts] = useState<Product[]>([]);
  const [isLoadingLeft, setIsLoadingLeft] = useState(true);
  const [isLoadingRight, setIsLoadingRight] = useState(true);

  // Fetch products for left side if needed
  useEffect(() => {
    if (isPreview || section.left_side.type !== 'products') {
      setIsLoadingLeft(false);
      return;
    }

    const fetchProducts = async () => {
      try {
        setIsLoadingLeft(true);
        const params = new URLSearchParams();
        params.append('status', 'active');
        params.append('limit', String(section.left_side.limit || 4));
        
        if (section.left_side.category_id) {
          params.append('category_id', section.left_side.category_id);
        }
        
        const response = await fetch(`/api/products?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          setLeftProducts((data.products || []).map((p: any) => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            price: typeof p.price === 'number' ? p.price : Number(p.price),
            image: p.image,
            stock_quantity: p.stock_quantity,
          })));
        }
      } catch (err) {
        console.error('Error fetching left products:', err);
      } finally {
        setIsLoadingLeft(false);
      }
    };

    fetchProducts();
  }, [section.left_side, isPreview]);

  // Fetch products for right side if needed
  useEffect(() => {
    if (isPreview || section.right_side.type !== 'products') {
      setIsLoadingRight(false);
      return;
    }

    const fetchProducts = async () => {
      try {
        setIsLoadingRight(true);
        const params = new URLSearchParams();
        params.append('status', 'active');
        params.append('limit', String(section.right_side.limit || 4));
        
        if (section.right_side.category_id) {
          params.append('category_id', section.right_side.category_id);
        }
        
        const response = await fetch(`/api/products?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          setRightProducts((data.products || []).map((p: any) => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            price: typeof p.price === 'number' ? p.price : Number(p.price),
            image: p.image,
            stock_quantity: p.stock_quantity,
          })));
        }
      } catch (err) {
        console.error('Error fetching right products:', err);
      } finally {
        setIsLoadingRight(false);
      }
    };

    fetchProducts();
  }, [section.right_side, isPreview]);

  // Calculate layout ratio classes
  const layoutRatio = section.layout_ratio || '50-50';
  const getGridColsClass = () => {
    switch (layoutRatio) {
      case '60-40': return 'lg:grid-cols-[60fr_40fr]';
      case '40-60': return 'lg:grid-cols-[40fr_60fr]';
      case '70-30': return 'lg:grid-cols-[70fr_30fr]';
      case '30-70': return 'lg:grid-cols-[30fr_70fr]';
      default: return 'lg:grid-cols-2';
    }
  };

  // Calculate mobile behavior classes
  const mobileBehavior = section.mobile_behavior || 'stack';
  const getMobileBehaviorClass = () => {
    switch (mobileBehavior) {
      case 'scroll': return 'flex overflow-x-auto lg:grid';
      case 'hide_left': return 'grid-cols-1 [&>*:first-child]:hidden lg:[&>*:first-child]:block';
      case 'hide_right': return 'grid-cols-1 [&>*:last-child]:hidden lg:[&>*:last-child]:block';
      case 'reverse_stack': return 'flex flex-col-reverse lg:grid';
      default: return 'grid-cols-1';
    }
  };

  // Get text alignment classes
  const getTextAlignClass = (alignment?: string) => {
    switch (alignment) {
      case 'left': return 'text-left items-start';
      case 'right': return 'text-right items-end';
      default: return 'text-center items-center';
    }
  };

  // Get vertical alignment classes
  const getVerticalAlignClass = (alignment?: string) => {
    switch (alignment) {
      case 'top': return 'justify-start';
      case 'bottom': return 'justify-end';
      default: return 'justify-center';
    }
  };

  // Get image position classes
  const getImagePositionClass = (position?: string) => {
    switch (position) {
      case 'contain': return 'object-contain';
      case 'top': return 'object-cover object-top';
      case 'bottom': return 'object-cover object-bottom';
      case 'center': return 'object-cover object-center';
      default: return 'object-cover';
    }
  };

  // Spacing configuration
  const spacing = section.spacing || {};
  const paddingTop = spacing.section_padding_top !== undefined ? `${spacing.section_padding_top}px` : '4rem';
  const paddingBottom = spacing.section_padding_bottom !== undefined ? `${spacing.section_padding_bottom}px` : '4rem';
  const columnGap = spacing.column_gap !== undefined ? `${spacing.column_gap}px` : '3rem';
  const contentPadding = spacing.content_padding !== undefined ? `${spacing.content_padding}px` : '2rem';

  // Left/right background: treat explicit 'transparent' or '' as transparent (e.g. when image position is Contain, letterboxing shows this)
  const leftBg = section.left_side.background_color;
  const leftBgTransparent = leftBg === 'transparent' || leftBg === '' || leftBg == null;
  const rightBg = section.right_side.background_color;
  const rightBgTransparent = rightBg === 'transparent' || rightBg === '' || rightBg == null;

  const sectionBgTransparent = !section.background_gradient && (section.background_color === 'transparent' || section.background_color === '' || section.background_color == null);

  // Set CSS variables on section for better performance
  const sectionStyle = {
    '--split-layout-bg': section.background_gradient || section.background_color || 'transparent',
    '--split-layout-left-bg': section.left_side.background_gradient ? 'transparent' : (leftBgTransparent ? 'transparent' : (leftBg || 'var(--color-background, #f3f4f6)')),
    '--split-layout-left-title-color': section.left_side.title_color || 'var(--color-text, currentColor)',
    '--split-layout-left-subtitle-color': section.left_side.subtitle_color || 'var(--color-text, #666666)',
    '--split-layout-left-content-color': section.left_side.content_color || 'var(--color-text, #666666)',
    '--split-layout-left-cta-text-color': section.left_side.cta_text_color || '#FFFFFF',
    '--split-layout-left-cta-bg-color': section.left_side.cta_button_color || 'var(--color-primary, hsl(var(--primary)))',
    '--split-layout-right-bg': rightBgTransparent ? 'transparent' : (rightBg || 'transparent'),
    '--split-layout-right-title-color': section.right_side.title_color || 'var(--color-text, currentColor)',
    '--split-layout-right-subtitle-color': section.right_side.subtitle_color || 'var(--color-text, #666666)',
    '--font-heading': headingFont,
    '--font-body': bodyFont,
    paddingTop,
    paddingBottom,
    backgroundImage: section.background_gradient || undefined,
    ...(section.background_gradient ? {} : sectionBgTransparent ? {} : { backgroundColor: section.background_color || 'transparent' }),
    minHeight: section.min_height ? `${section.min_height}px` : undefined,
  } as React.CSSProperties & Record<string, string | undefined>;

  const containerClass = section.full_width ? 'w-full px-4' : 'container mx-auto px-4';

  // Reverse desktop order if specified
  const shouldReverse = section.reverse_desktop;

  return (
    <section 
      className="relative" 
      style={sectionStyle}
    >
      <div className={containerClass} style={{ maxWidth: section.full_width ? '100%' : 'var(--container-max-width, 1200px)' }}>
        <div 
          className={`grid ${getMobileBehaviorClass()} ${getGridColsClass()} ${shouldReverse ? 'lg:[&>*:first-child]:order-2 lg:[&>*:last-child]:order-1' : ''}`}
          style={{ gap: columnGap }}
        >
          {/* Left Side - when background is transparent, set no backgroundColor so nothing paints behind the content */}
          <div
            className={`relative overflow-hidden ${section.left_side.border_radius ? '' : 'rounded-lg'}`}
            style={{
              backgroundImage: section.left_side.background_gradient || undefined,
              ...(section.left_side.background_gradient
                ? {}
                : leftBgTransparent
                  ? { backgroundColor: undefined }
                  : { backgroundColor: 'var(--split-layout-left-bg)' }),
              borderRadius: section.left_side.border_radius ? `${section.left_side.border_radius}px` : '0.5rem',
              minHeight: mobileBehavior === 'scroll' ? '400px' : '500px',
            }}
          >
            {/* Banner - standardized aspect ratio (4:5), image fits without cropping; image is the CTA when cta_link set */}
            {section.left_side.image && !section.left_side.image.startsWith('blob:') && (section.left_side.type === 'banner' || (section.left_side as { type?: string }).type === 'image') && (
              <div className="absolute inset-0 z-0 flex items-center justify-center">
                <div className="relative w-full max-h-full aspect-[4/5]">
                  {section.left_side.cta_link ? (
                    <Link href={section.left_side.cta_link} className="block absolute inset-0 cursor-pointer z-10" aria-label={section.left_side.alt_text || section.left_side.title || 'View more'}>
                      <Image
                        src={section.left_side.image}
                        alt={section.left_side.alt_text || section.left_side.title || 'Banner'}
                        fill
                        className="object-contain"
                        sizes="(max-width: 1024px) 100vw, 50vw"
                      />
                    </Link>
                  ) : (
                    <Image
                      src={section.left_side.image}
                      alt={section.left_side.alt_text || section.left_side.title || 'Banner'}
                      fill
                      className="object-contain"
                      sizes="(max-width: 1024px) 100vw, 50vw"
                    />
                  )}
                  {/* Overlay */}
                  {section.left_side.overlay_opacity !== undefined && section.left_side.overlay_opacity > 0 && (
                    <div 
                      className="absolute inset-0 bg-black pointer-events-none"
                      style={{ opacity: section.left_side.overlay_opacity / 100 }}
                    />
                  )}
                </div>
              </div>
            )}
            
            {/* Products for left side */}
            {section.left_side.type === 'products' && (
              <div 
                className="relative h-full"
                style={{ padding: contentPadding, zIndex: 10 }}
              >
                {section.left_side.title && (
                  <h2 
                    className={`text-2xl md:text-3xl font-bold mb-6 ${getTextAlignClass(section.left_side.text_alignment).split(' ')[0]}`}
                    style={{ 
                      fontFamily: 'var(--font-heading)',
                      color: 'var(--split-layout-left-title-color)',
                    }}
                  >
                    {section.left_side.title}
                  </h2>
                )}
                {section.left_side.subtitle && (
                  <p 
                    className={`text-lg mb-6 ${getTextAlignClass(section.left_side.text_alignment).split(' ')[0]}`}
                    style={{ 
                      fontFamily: 'var(--font-body)',
                      color: 'var(--split-layout-left-subtitle-color)',
                    }}
                  >
                    {section.left_side.subtitle}
                  </p>
                )}
                <div className={`grid gap-4 ${section.left_side.columns === 1 ? 'grid-cols-1' : section.left_side.columns === 3 ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
                  {isPreview ? (
                    <div className="text-center text-muted-foreground py-12 border-2 border-dashed rounded-lg col-span-full">
                      Products will be displayed here
                    </div>
                  ) : isLoadingLeft ? (
                    <div className="col-span-full text-center text-muted-foreground py-12">
                      Loading products...
                    </div>
                  ) : leftProducts.length === 0 ? (
                    <div className="col-span-full text-center text-muted-foreground py-12">
                      No products found
                    </div>
                  ) : (
                    leftProducts.map((product) => (
                      <DefaultProductCard 
                        key={product.id} 
                        product={{
                          id: product.id,
                          name: product.name,
                          slug: product.slug,
                          price: product.price,
                          image: product.image,
                          stock_quantity: product.stock_quantity,
                        }} 
                      />
                    ))
                  )}
                </div>
              </div>
            )}
            
            {/* Content Overlay - Show for text and form only. Banner is image-only (no text overlay). */}
            {section.left_side.type !== 'products' && section.left_side.type !== 'banner' && (section.left_side as { type?: string }).type !== 'image' && (
              <div 
                className={`relative h-full flex flex-col ${getTextAlignClass(section.left_side.text_alignment)} ${getVerticalAlignClass(section.left_side.vertical_alignment)}`}
                style={{ padding: contentPadding, zIndex: 10 }}
              >
                {section.left_side.title && (
                  <h2 
                    className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4"
                    style={{ 
                      fontFamily: 'var(--font-heading)',
                      color: 'var(--split-layout-left-title-color)',
                    }}
                  >
                    {section.left_side.title}
                  </h2>
                )}
                {section.left_side.subtitle && (
                  <p 
                    className="text-lg md:text-xl mb-4"
                    style={{ 
                      fontFamily: 'var(--font-body)',
                      color: 'var(--split-layout-left-subtitle-color)',
                    }}
                  >
                    {section.left_side.subtitle}
                  </p>
                )}
                {section.left_side.content && (
                  <div 
                    className="prose max-w-none mb-6"
                    style={{ 
                      fontFamily: 'var(--font-body)',
                      color: 'var(--split-layout-left-content-color)',
                    }}
                    dangerouslySetInnerHTML={{ __html: section.left_side.content }}
                  />
                )}
                {/* CTA button only for text (form has its own submit) */}
                {section.left_side.cta_text && section.left_side.cta_link && section.left_side.type !== 'form' && (
                  <Link href={section.left_side.cta_link}>
                    <Button
                      size="lg"
                      style={{
                        backgroundColor: 'var(--split-layout-left-cta-bg-color)',
                        color: 'var(--split-layout-left-cta-text-color)',
                      }}
                      className={section.left_side.text_alignment === 'left' ? '' : section.left_side.text_alignment === 'right' ? 'ml-auto' : 'mx-auto'}
                    >
                      {section.left_side.cta_text}
                    </Button>
                  </Link>
                )}
                
                {/* Form for left side */}
                {section.left_side.type === 'form' && (
                  <div className="w-full">
                    <SplitLayoutFormRenderer formId={section.left_side.form_id} isPreview={isPreview} />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Side - when background is transparent, set no backgroundColor so nothing paints behind the content */}
          <div 
            className={`relative overflow-hidden ${section.right_side.border_radius ? '' : 'rounded-lg'} ${section.right_side.type === 'banner' ? 'min-h-[400px]' : ''}`}
            style={{
              ...(rightBgTransparent ? {} : { backgroundColor: 'var(--split-layout-right-bg)' }),
              borderRadius: section.right_side.border_radius ? `${section.right_side.border_radius}px` : '0.5rem',
              padding: section.right_side.type === 'banner' ? 0 : contentPadding,
            }}
          >
            {/* Right side: banner - standardized aspect ratio (4:5), image fits without cropping */}
            {(section.right_side.type === 'banner' || (section.right_side as { type?: string }).type === 'image') && section.right_side.image && !section.right_side.image.startsWith('blob:') && (
              <div className="absolute inset-0 z-0 flex items-center justify-center">
                <div className="relative w-full max-h-full aspect-[4/5]">
                  {section.right_side.cta_link ? (
                    <Link href={section.right_side.cta_link} className="block absolute inset-0 z-10 cursor-pointer" aria-label={section.right_side.alt_text || section.right_side.title || 'View more'}>
                      <Image
                        src={section.right_side.image}
                        alt={section.right_side.alt_text || section.right_side.title || 'Banner'}
                        fill
                        className="object-contain"
                        sizes="(max-width: 1024px) 100vw, 50vw"
                      />
                    </Link>
                  ) : (
                    <Image
                      src={section.right_side.image}
                      alt={section.right_side.alt_text || section.right_side.title || 'Banner'}
                      fill
                      className="object-contain"
                      sizes="(max-width: 1024px) 100vw, 50vw"
                    />
                  )}
                  {section.right_side.overlay_opacity !== undefined && section.right_side.overlay_opacity > 0 && (
                    <div 
                      className="absolute inset-0 bg-black pointer-events-none"
                      style={{ opacity: section.right_side.overlay_opacity / 100 }}
                    />
                  )}
                </div>
              </div>
            )}
            {section.right_side.title && section.right_side.type !== 'banner' && (
              <h2 
                className={`text-2xl md:text-3xl font-bold mb-6 ${getTextAlignClass(section.right_side.text_alignment).split(' ')[0]}`}
                style={{ 
                  fontFamily: headingFont,
                  color: 'var(--split-layout-right-title-color)',
                }}
              >
                {section.right_side.title}
              </h2>
            )}
            {section.right_side.subtitle && section.right_side.type !== 'banner' && (
              <p 
                className={`text-lg mb-6 ${getTextAlignClass(section.right_side.text_alignment).split(' ')[0]}`}
                style={{ 
                  fontFamily: bodyFont,
                  color: 'var(--split-layout-right-subtitle-color)',
                }}
              >
                {section.right_side.subtitle}
              </p>
            )}
            
            {/* Right Side Content Based on Type */}
            {section.right_side.type === 'products' && (
              <div className={`grid gap-4 ${section.right_side.columns === 1 ? 'grid-cols-1' : section.right_side.columns === 3 ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
                {isPreview ? (
                  <div className="text-center text-muted-foreground py-12 border-2 border-dashed rounded-lg col-span-full">
                    Products will be displayed here
                  </div>
                ) : isLoadingRight ? (
                  <div className="col-span-full text-center text-muted-foreground py-12">
                    Loading products...
                  </div>
                ) : rightProducts.length === 0 ? (
                  <div className="col-span-full text-center text-muted-foreground py-12">
                    No products found
                  </div>
                ) : (
                  rightProducts.map((product) => (
                    <DefaultProductCard 
                      key={product.id} 
                      product={{
                        id: product.id,
                        name: product.name,
                        slug: product.slug,
                        price: product.price,
                        image: product.image,
                        stock_quantity: product.stock_quantity,
                      }} 
                    />
                  ))
                )}
              </div>
            )}

            {section.right_side.type === 'features' && section.right_side.features && (
              <div className="space-y-4">
                {section.right_side.features.map((feature) => (
                  <div key={feature.id} className="flex gap-4 items-start">
                    {feature.icon && (
                      <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <span className="text-2xl">{feature.icon}</span>
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                      {feature.description && (
                        <p className="text-muted-foreground">{feature.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {section.right_side.type === 'text' && section.right_side.content && (
              <div 
                className="prose max-w-none"
                style={{ fontFamily: bodyFont }}
                dangerouslySetInnerHTML={{ __html: section.right_side.content }}
              />
            )}

            {section.right_side.type === 'form' && (
              <SplitLayoutFormRenderer formId={section.right_side.form_id} isPreview={isPreview} />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Inline form renderer for split layouts
 */
function SplitLayoutFormRenderer({ formId, isPreview }: { formId?: string; isPreview: boolean }) {
  const [form, setForm] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!formId || isPreview) {
      setIsLoading(false);
      return;
    }

    const fetchForm = async () => {
      try {
        const response = await fetch(`/api/forms/${formId}`);
        if (response.ok) {
          const data = await response.json();
          setForm(data.form);
          const initialValues: Record<string, any> = {};
          data.form?.fields?.forEach((field: any) => {
            // Use field.name as the key since it's unique and used for form submission
            // Fallback to field.id if name is not available
            const fieldKey = field.name || field.id || `field-${Date.now()}-${Math.random()}`;
            initialValues[fieldKey] = field.type === 'checkbox' ? false : '';
          });
          setFormValues(initialValues);
        }
      } catch (error) {
        console.error('Error fetching form:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchForm();
  }, [formId, isPreview]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || submitting) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/forms/${formId}/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: formValues }),
      });

      if (response.ok) {
        setSubmitted(true);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormValues(prev => ({ ...prev, [fieldId]: value }));
  };

  if (isPreview) {
    return (
      <div className="p-8 border-2 border-dashed rounded-lg text-center text-muted-foreground">
        {formId ? <>Form will be displayed here</> : <>Please select a form</>}
      </div>
    );
  }

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading form...</div>;
  }

  if (!form) {
    return <div className="text-center py-8 text-muted-foreground">Form not found</div>;
  }

  if (submitted) {
    return (
      <div className="p-8 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
        <h3 className="text-xl font-semibold text-green-700 dark:text-green-400 mb-2">
          {form.success_message || 'Thank you for your submission!'}
        </h3>
        <p className="text-green-600 dark:text-green-500">We&apos;ll get back to you soon.</p>
      </div>
    );
  }

  return (
    <div>
      {form.title && <h3 className="text-xl font-semibold mb-4">{form.title}</h3>}
      {form.description && <p className="text-muted-foreground mb-6">{form.description}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        {form.fields?.map((field: any, index: number) => {
          // Use field.name as the key since it's unique and used for form submission
          // Fallback to field.id or generate a unique key if neither is available
          const fieldKey = field.name || field.id || `field-${index}`;
          
          return (
            <div key={fieldKey} className="space-y-2">
              <label className="block text-sm font-medium">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              
              {field.type === 'text' && (
                <input
                  type="text"
                  name={field.name}
                  value={formValues[fieldKey] || ''}
                  onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
                  placeholder={field.placeholder}
                  required={field.required}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              )}
              
              {field.type === 'email' && (
                <input
                  type="email"
                  name={field.name}
                  value={formValues[fieldKey] || ''}
                  onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
                  placeholder={field.placeholder}
                  required={field.required}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              )}
              
              {field.type === 'tel' && (
                <input
                  type="tel"
                  name={field.name}
                  value={formValues[fieldKey] || ''}
                  onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
                  placeholder={field.placeholder}
                  required={field.required}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              )}
              
              {field.type === 'textarea' && (
                <textarea
                  name={field.name}
                  value={formValues[fieldKey] || ''}
                  onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
                  placeholder={field.placeholder}
                  required={field.required}
                  rows={4}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              )}
              
              {field.type === 'select' && (
                <select
                  name={field.name}
                  value={formValues[fieldKey] || ''}
                  onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
                  required={field.required}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">{field.placeholder || 'Select an option'}</option>
                  {field.options?.map((option: string, optIndex: number) => (
                    <option key={optIndex} value={option}>{option}</option>
                  ))}
                </select>
              )}
              
              {field.type === 'checkbox' && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name={field.name}
                    checked={formValues[fieldKey] || false}
                    onChange={(e) => handleFieldChange(fieldKey, e.target.checked)}
                    required={field.required}
                    className="rounded border-gray-300 focus:ring-primary"
                  />
                  <span className="text-sm">{field.placeholder}</span>
                </label>
              )}
              
              {field.type === 'number' && (
                <input
                  type="number"
                  name={field.name}
                  value={formValues[fieldKey] || ''}
                  onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
                  placeholder={field.placeholder}
                  required={field.required}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              )}
              
              {field.type === 'date' && (
                <input
                  type="date"
                  name={field.name}
                  value={formValues[fieldKey] || ''}
                  onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
                  required={field.required}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              )}
            </div>
          );
        })}
        
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? 'Submitting...' : (form.submit_button_text || 'Submit')}
        </Button>
      </form>
    </div>
  );
}

function CTASectionComponent({ 
  section, 
  isPreview 
}: { 
  section: Extract<PageSection, { type: 'cta' }>; 
  isPreview: boolean;
}) {
  // Set CSS variables on section for better performance (section-specific naming)
  const sectionStyle: React.CSSProperties & Record<string, string | undefined> = {
    '--cta-bg': section.background_gradient 
      ? undefined 
      : (section.background_color || 'var(--color-primary, hsl(var(--primary)))'),
    '--cta-bg-gradient': section.background_gradient || undefined,
    '--cta-text': section.text_color || '#FFFFFF',
    '--cta-title-color': section.title_color || section.text_color || '#FFFFFF',
    '--cta-subtitle-color': section.subtitle_color || section.text_color || '#FFFFFF',
    '--cta-cta-text-color': section.cta_text_color || '#FFFFFF',
    '--cta-cta-bg-color': section.cta_button_color || 'var(--color-primary, hsl(var(--primary)))',
    '--font-heading': 'var(--font-heading, inherit)',
    '--font-body': 'var(--font-body, inherit)',
    ...(section.background_gradient 
      ? { background: section.background_gradient } 
      : { backgroundColor: 'var(--cta-bg)' }
    ),
    fontFamily: 'var(--font-body)',
    color: 'var(--cta-text)',
  };

  return (
    <section
      className="py-16 text-white"
      style={sectionStyle}
    >
      <div className="container mx-auto px-4 text-center" style={{ maxWidth: 'var(--container-max-width, 1200px)' }}>
        <h2 
          className="text-3xl md:text-4xl font-bold mb-4"
          style={{ 
            fontFamily: 'var(--font-heading)',
            color: 'var(--cta-title-color)',
          }}
        >
          {section.title}
        </h2>
        {section.subtitle && (
          <p 
            className="text-xl mb-8 opacity-90"
            style={{ color: 'var(--cta-subtitle-color)' }}
          >
            {section.subtitle}
          </p>
        )}
        {section.cta_text && section.cta_link && (
          <Link href={section.cta_link}>
            <Button
              size="lg"
              className="hover:opacity-90"
              style={{
                backgroundColor: 'var(--cta-cta-bg-color)',
                color: 'var(--cta-cta-text-color)',
              }}
            >
              {section.cta_text}
            </Button>
          </Link>
        )}
      </div>
    </section>
  );
}

function ProductTabsSectionComponent({ 
  section, 
  isPreview 
}: { 
  section: Extract<PageSection, { type: 'product_tabs' }>; 
  isPreview: boolean;
}) {
  const columns = section.columns || 4;
  const gridCols = columns === 2 ? 'md:grid-cols-2' : columns === 3 ? 'md:grid-cols-3' : 'md:grid-cols-4';
  const headingFont = 'var(--font-heading, inherit)';
  const bodyFont = 'var(--font-body, inherit)';
  
  const [activeTab, setActiveTab] = useState(section.default_tab || section.tabs[0]?.id || '');
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isPreview) {
      setIsLoading(false);
      return;
    }

    const fetchProducts = async () => {
      try {
        setIsLoading(true);
        const activeTabConfig = section.tabs.find(t => t.id === activeTab);
        if (!activeTabConfig) return;

        const params = new URLSearchParams();
        params.append('status', 'active');
        // Fetch more products to allow proper sorting/filtering
        params.append('limit', '100');
        
        if (activeTabConfig.filter === 'category' && activeTabConfig.category_id) {
          params.append('category_id', activeTabConfig.category_id);
        }
        
        // Set sort parameters based on filter
        if (activeTabConfig.filter === 'new') {
          params.append('sort_by', 'created_at');
          params.append('sort_order', 'desc');
        } else if (activeTabConfig.filter === 'low_price') {
          params.append('sort_by', 'price');
          params.append('sort_order', 'asc');
        } else if (activeTabConfig.filter === 'popular') {
          // For popular, we'll sort by created_at desc as a proxy (in real app, would use views/sales)
          // Since we don't have views/sales data, we'll use recently created as "popular"
          params.append('sort_by', 'created_at');
          params.append('sort_order', 'desc');
        }
        
        const response = await fetch(`/api/products?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          let fetchedProducts = (data.products || []).map((p: any) => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            price: typeof p.price === 'number' ? p.price : Number(p.price),
            image: p.image,
            stock_quantity: p.stock_quantity,
            created_at: p.created_at || p.createdAt, // Include for sorting (handle both formats)
          }));

          // Apply additional client-side filtering if needed
          // The API already handles sorting, but we can refine here
          if (activeTabConfig.filter === 'low_price') {
            // Ensure ascending price order
            fetchedProducts = fetchedProducts.sort((a: Product, b: Product) => a.price - b.price);
          } else if (activeTabConfig.filter === 'new') {
            // Sort by newest (created_at desc) - API should handle this, but ensure it
            fetchedProducts = fetchedProducts.sort((a: any, b: any) => {
              if (!a.created_at || !b.created_at) return 0;
              return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            });
          }

          // Apply limit after sorting
          fetchedProducts = fetchedProducts.slice(0, section.limit || 8);

          setProducts(fetchedProducts);
        }
      } catch (err) {
        console.error('Error fetching products:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, [activeTab, section.tabs, section.limit, isPreview]);

  // Set CSS variables on section for better performance (section-specific naming)
  const sectionStyle = {
    '--product-tabs-bg': section.background_color || 'transparent',
    '--product-tabs-title-color': section.title_color || 'var(--color-text, currentColor)',
    '--font-heading': 'var(--font-heading, inherit)',
    '--font-body': 'var(--font-body, inherit)',
  } as React.CSSProperties & Record<string, string | undefined>;

  return (
    <section 
      className="py-16" 
      style={{
        ...sectionStyle,
        backgroundColor: 'var(--product-tabs-bg)',
      }}
    >
      <div className="container mx-auto px-4" style={{ maxWidth: 'var(--container-max-width, 1200px)' }}>
        {section.title && (
          <div className="text-center mb-12">
            <h2 
              className="text-3xl md:text-4xl font-bold mb-4"
              style={{ 
                fontFamily: 'var(--font-heading)',
                color: 'var(--product-tabs-title-color)',
              }}
            >
              {section.title}
            </h2>
            <div className="flex justify-center gap-8 mb-8">
              {section.tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="relative pb-2 transition-colors"
                >
                  <span
                    className={`font-semibold transition-colors ${
                      activeTab === tab.id
                        ? 'text-primary'
                        : 'text-gray-600'
                    }`}
                  >
                    {tab.label}
                  </span>
                  <div
                    className={`absolute bottom-0 left-0 right-0 h-0.5 transition-colors ${
                      activeTab === tab.id
                        ? 'bg-primary'
                        : 'bg-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
        )}
        <div className={`grid grid-cols-1 ${gridCols} gap-6`}>
          {isPreview ? (
            <div className="text-center text-muted-foreground py-12 border-2 border-dashed rounded-lg col-span-full">
              Products will be displayed here based on selected tab
            </div>
          ) : isLoading ? (
            <div className="col-span-full text-center text-muted-foreground py-12">
              Loading products...
            </div>
          ) : products.length === 0 ? (
            <div className="col-span-full text-center text-muted-foreground py-12">
              No products found
            </div>
          ) : (
            products.map((product) => (
              <DefaultProductCard key={product.id} product={product} />
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function FormSectionComponent({ 
  section, 
  isPreview 
}: { 
  section: Extract<PageSection, { type: 'form' }>; 
  isPreview: boolean;
}) {
  const [form, setForm] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!section.form_id || isPreview) {
      setIsLoading(false);
      return;
    }

    const fetchForm = async () => {
      try {
        const response = await fetch(`/api/forms/${section.form_id}`);
        if (response.ok) {
          const data = await response.json();
          setForm(data.form);
          // Initialize form values
          const initialValues: Record<string, any> = {};
          data.form?.fields?.forEach((field: any) => {
            initialValues[field.id] = field.type === 'checkbox' ? false : '';
          });
          setFormValues(initialValues);
        }
      } catch (error) {
        console.error('Error fetching form:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchForm();
  }, [section.form_id, isPreview]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || submitting) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/forms/${section.form_id}/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: formValues }),
      });

      if (response.ok) {
        setSubmitted(true);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormValues(prev => ({ ...prev, [fieldId]: value }));
  };

  // Get max width class
  const maxWidthClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-full',
  }[section.max_width || 'md'];

  const sectionStyle = {
    backgroundColor: section.background_color || 'transparent',
  } as React.CSSProperties;

  const titleStyle = {
    color: section.title_color || 'inherit',
  } as React.CSSProperties;

  const subtitleStyle = {
    color: section.subtitle_color || 'var(--muted-foreground)',
  } as React.CSSProperties;

  if (isPreview) {
    return (
      <section className="py-12" style={sectionStyle}>
        <div className="container mx-auto px-4">
          <div className={`mx-auto ${maxWidthClass}`}>
            {section.title && (
              <h2 className="text-3xl font-bold mb-2" style={titleStyle}>
                {section.title}
              </h2>
            )}
            {section.subtitle && (
              <p className="text-muted-foreground mb-6" style={subtitleStyle}>
                {section.subtitle}
              </p>
            )}
            <div className="p-8 border-2 border-dashed rounded-lg text-center text-muted-foreground">
              {section.form_id ? (
                <>Form will be displayed here (ID: {section.form_id})</>
              ) : (
                <>Please select a form to display</>
              )}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="py-12" style={sectionStyle}>
        <div className="container mx-auto px-4">
          <div className={`mx-auto ${maxWidthClass} text-center`}>
            Loading form...
          </div>
        </div>
      </section>
    );
  }

  if (!form) {
    return (
      <section className="py-12" style={sectionStyle}>
        <div className="container mx-auto px-4">
          <div className={`mx-auto ${maxWidthClass} text-center text-muted-foreground`}>
            Form not found
          </div>
        </div>
      </section>
    );
  }

  if (submitted) {
    return (
      <section className="py-12" style={sectionStyle}>
        <div className="container mx-auto px-4">
          <div className={`mx-auto ${maxWidthClass} text-center`}>
            <div className="p-8 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <h3 className="text-xl font-semibold text-green-700 dark:text-green-400 mb-2">
                {form.success_message || 'Thank you for your submission!'}
              </h3>
              <p className="text-green-600 dark:text-green-500">
                We&apos;ll get back to you soon.
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12" style={sectionStyle}>
      <div className="container mx-auto px-4">
        <div className={`mx-auto ${maxWidthClass}`}>
          {section.title && (
            <h2 className="text-3xl font-bold mb-2" style={titleStyle}>
              {section.title}
            </h2>
          )}
          {section.subtitle && (
            <p className="text-muted-foreground mb-6" style={subtitleStyle}>
              {section.subtitle}
            </p>
          )}
          
          {section.show_form_title !== false && form.title && (
            <h3 className="text-xl font-semibold mb-4">{form.title}</h3>
          )}
          
          {form.description && (
            <p className="text-muted-foreground mb-6">{form.description}</p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {form.fields?.map((field: any) => (
              <div key={field.id} className="space-y-2">
                <label className="block text-sm font-medium">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                
                {field.type === 'text' && (
                  <input
                    type="text"
                    value={formValues[field.id] || ''}
                    onChange={(e) => handleFieldChange(field.id, e.target.value)}
                    placeholder={field.placeholder}
                    required={field.required}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                )}
                
                {field.type === 'email' && (
                  <input
                    type="email"
                    value={formValues[field.id] || ''}
                    onChange={(e) => handleFieldChange(field.id, e.target.value)}
                    placeholder={field.placeholder}
                    required={field.required}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                )}
                
                {field.type === 'phone' && (
                  <input
                    type="tel"
                    value={formValues[field.id] || ''}
                    onChange={(e) => handleFieldChange(field.id, e.target.value)}
                    placeholder={field.placeholder}
                    required={field.required}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                )}
                
                {field.type === 'textarea' && (
                  <textarea
                    value={formValues[field.id] || ''}
                    onChange={(e) => handleFieldChange(field.id, e.target.value)}
                    placeholder={field.placeholder}
                    required={field.required}
                    rows={4}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                )}
                
                {field.type === 'select' && (
                  <select
                    value={formValues[field.id] || ''}
                    onChange={(e) => handleFieldChange(field.id, e.target.value)}
                    required={field.required}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">{field.placeholder || 'Select an option'}</option>
                    {field.options?.map((option: string, index: number) => (
                      <option key={index} value={option}>{option}</option>
                    ))}
                  </select>
                )}
                
                {field.type === 'checkbox' && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formValues[field.id] || false}
                      onChange={(e) => handleFieldChange(field.id, e.target.checked)}
                      required={field.required}
                      className="rounded border-gray-300 focus:ring-primary"
                    />
                    <span className="text-sm">{field.placeholder}</span>
                  </label>
                )}
                
                {field.type === 'number' && (
                  <input
                    type="number"
                    value={formValues[field.id] || ''}
                    onChange={(e) => handleFieldChange(field.id, e.target.value)}
                    placeholder={field.placeholder}
                    required={field.required}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                )}
                
                {field.type === 'date' && (
                  <input
                    type="date"
                    value={formValues[field.id] || ''}
                    onChange={(e) => handleFieldChange(field.id, e.target.value)}
                    required={field.required}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                )}
              </div>
            ))}
            
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? 'Submitting...' : (form.submit_button_text || 'Submit')}
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
}

function BlogsSectionComponent({ 
  section, 
  isPreview 
}: { 
  section: Extract<PageSection, { type: 'blogs' }>; 
  isPreview: boolean;
}) {
  const [blogs, setBlogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const layout = section.layout || 'grid';
  const columns = section.columns || 3;
  const limit = section.limit || 6;
  const gridCols = columns === 2 ? 'md:grid-cols-2' : columns === 3 ? 'md:grid-cols-3' : 'md:grid-cols-4';

  useEffect(() => {
    if (isPreview) {
      setIsLoading(false);
      return;
    }

    async function fetchBlogs() {
      try {
        const params = new URLSearchParams({
          limit: String(limit),
          status: 'published',
        });

        if (section.category_id) {
          params.append('category_id', section.category_id);
        }

        if (section.order_by) {
          params.append('sort_by', section.order_by);
        }

        if (section.order_direction) {
          params.append('sort_order', section.order_direction);
        }

        const response = await fetch(`/api/blogs?${params.toString()}`);
        if (!response.ok) {
          throw new Error('Failed to fetch blogs');
        }
        const data = await response.json();
        setBlogs(data.blogs || []);
      } catch (err: any) {
        console.error('Error fetching blogs:', err);
        setError(err.message || 'Failed to load blogs');
      } finally {
        setIsLoading(false);
      }
    }

    fetchBlogs();
  }, [isPreview, limit, section.category_id, section.order_by, section.order_direction]);

  const formatDate = (date: Date | string | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <section 
        className="py-16"
        style={{ backgroundColor: section.background_color || '#ffffff' }}
      >
        <div className="container mx-auto px-4">
          <div className="text-center">
            <p className="text-muted-foreground">Loading blogs...</p>
          </div>
        </div>
      </section>
    );
  }

  if (error || blogs.length === 0) {
    if (isPreview) {
      return (
        <section 
          className="py-16"
          style={{ backgroundColor: section.background_color || '#ffffff' }}
        >
          <div className="container mx-auto px-4">
            <div className="text-center text-muted-foreground">
              <p>No blog posts available. Create some blog posts to see them here.</p>
            </div>
          </div>
        </section>
      );
    }
    return null;
  }

  return (
    <section 
      className="py-16"
      style={{ backgroundColor: section.background_color || '#ffffff' }}
    >
      <div className="container mx-auto px-4" style={{ maxWidth: 'var(--container-max-width, 1200px)' }}>
        {/* Header */}
        {(section.title || section.subtitle) && (
          <div className="text-center mb-12">
            {section.title && (
              <h2 
                className="text-3xl md:text-4xl font-bold mb-4"
                style={{ color: section.title_color || 'var(--color-text, currentColor)' }}
              >
                {section.title}
              </h2>
            )}
            {section.subtitle && (
              <p 
                className="text-lg text-muted-foreground"
                style={{ color: section.subtitle_color || 'var(--color-muted-foreground)' }}
              >
                {section.subtitle}
              </p>
            )}
          </div>
        )}

        {/* Blog Posts */}
        {layout === 'carousel' ? (
          <div className="overflow-x-auto">
            <div className={`flex gap-6 min-w-max ${gridCols}`}>
              {blogs.map((blog) => (
                <BlogCard
                  key={blog.id}
                  blog={blog}
                  section={section}
                  formatDate={formatDate}
                  className="min-w-[300px]"
                />
              ))}
            </div>
          </div>
        ) : layout === 'list' ? (
          <div className="space-y-6">
            {blogs.map((blog) => (
              <BlogCard
                key={blog.id}
                blog={blog}
                section={section}
                formatDate={formatDate}
                layout="list"
              />
            ))}
          </div>
        ) : (
          <div className={`grid grid-cols-1 ${gridCols} gap-6`}>
            {blogs.map((blog) => (
              <BlogCard
                key={blog.id}
                blog={blog}
                section={section}
                formatDate={formatDate}
              />
            ))}
          </div>
        )}

        {/* CTA Button - uses theme primary (same as login button) */}
        {section.cta_text && section.cta_link && (
          <div className="text-center mt-12">
            <Link
              href={section.cta_link}
              className="inline-block bg-primary text-primary-foreground hover:bg-accent px-8 py-4 rounded-lg hover:shadow-lg transition-colors font-medium"
            >
              {section.cta_text}
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

function BlogCard({ 
  blog, 
  section, 
  formatDate,
  layout = 'grid',
  className = ''
}: { 
  blog: any; 
  section: Extract<PageSection, { type: 'blogs' }>; 
  formatDate: (date: Date | string | null) => string;
  layout?: 'grid' | 'list';
  className?: string;
}) {
  const { Calendar, Tag, User } = LucideIcons;

  if (layout === 'list') {
    return (
      <Link
        href={blog.slug ? `/blog/${blog.slug}` : `/blog/${blog.id}`}
        className="group flex gap-6 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden"
      >
        <div className="relative w-64 h-48 flex-shrink-0 bg-[#e7e9eb] overflow-hidden">
          {blog.image ? (
            <Image
              src={blog.image}
              alt={blog.title}
              fill
              className="object-cover group-hover:scale-110 transition-transform duration-500"
              sizes="256px"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#0025cc] to-[#001a99] flex items-center justify-center">
              <Tag className="w-12 h-12 text-white opacity-50" />
            </div>
          )}
        </div>
        <div className="flex-1 p-6">
          <div className="flex items-center gap-4 mb-3 text-xs text-muted-foreground">
            {section.show_date && (
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{formatDate(blog.created_at)}</span>
              </div>
            )}
            {section.show_category && blog.blog_categories && (
              <div className="flex items-center gap-1">
                <Tag className="w-3 h-3 text-[#0025cc]" />
                <span>{blog.blog_categories.name}</span>
              </div>
            )}
            {section.show_author && blog.author && (
              <div className="flex items-center gap-1">
                <User className="w-3 h-3" />
                <span>{blog.author}</span>
              </div>
            )}
          </div>
          <h3 className="text-xl font-semibold text-[#0c0528] mb-2 line-clamp-2">
            {blog.title}
          </h3>
          {section.show_excerpt && blog.excerpt && (
            <p className="text-sm text-[#8d8d8d] mb-4 line-clamp-3">
              {blog.excerpt}
            </p>
          )}
          {section.show_read_more && (
            <span className="text-primary text-sm font-medium hover:underline">
              Read More →
            </span>
          )}
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={blog.slug ? `/blog/${blog.slug}` : `/blog/${blog.id}`}
      className={`group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 overflow-hidden ${className}`}
    >
      {/* Post Image */}
      <div className="relative h-48 bg-[#e7e9eb] overflow-hidden">
        {blog.image ? (
          <Image
            src={blog.image}
            alt={blog.title}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-500"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#0025cc] to-[#001a99] flex items-center justify-center">
            <Tag className="w-12 h-12 text-white opacity-50" />
          </div>
        )}
      </div>

      {/* Post Meta */}
      {(section.show_date || section.show_category || section.show_author) && (
        <div className="relative -mt-6 mx-4 mb-4">
          <div className="bg-white rounded-full shadow-lg px-4 py-2 flex items-center gap-3 text-xs flex-wrap">
            {section.show_date && (
              <div className="flex items-center gap-1 text-[#8d8d8d]">
                <Calendar className="w-3 h-3" />
                <span>{formatDate(blog.created_at)}</span>
              </div>
            )}
            {section.show_category && blog.blog_categories && (
              <div className="flex items-center gap-1 text-[#0c0528]">
                <Tag className="w-3 h-3 text-[#0025cc]" />
                <span>{blog.blog_categories.name}</span>
              </div>
            )}
            {section.show_author && blog.author && (
              <div className="flex items-center gap-1 text-[#8d8d8d]">
                <User className="w-3 h-3" />
                <span>{blog.author}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Post Content */}
      <div className="px-4 pb-6">
        <h3 className="text-lg font-semibold text-[#0c0528] mb-2 line-clamp-2">
          {blog.title}
        </h3>
        {section.show_excerpt && blog.excerpt && (
          <p className="text-sm text-[#8d8d8d] mb-4 line-clamp-2">
            {blog.excerpt}
          </p>
        )}
        {section.show_read_more && (
          <span className="text-primary text-sm font-medium hover:underline">
            Read More →
          </span>
        )}
      </div>
    </Link>
  );
}

function LocationSectionComponent({ 
  section, 
  isPreview 
}: { 
  section: Extract<PageSection, { type: 'location' }>; 
  isPreview: boolean;
}) {
  // Build Google Maps embed URL
  // Using the standard Google Maps embed format (no API key required for basic usage)
  const buildMapUrl = () => {
    const address = encodeURIComponent(section.address || '');
    const zoom = section.zoom || 15;
    
    // If we have precise coordinates, use them
    if (section.latitude && section.longitude) {
      return `https://www.google.com/maps?q=${section.latitude},${section.longitude}&hl=en&z=${zoom}&output=embed`;
    }
    
    // Otherwise, use address search
    return `https://www.google.com/maps?q=${address}&hl=en&z=${zoom}&output=embed`;
  };

  const mapHeight = section.height || 400;
  const sectionStyle = {
    '--location-bg': section.background_color || 'transparent',
    '--location-title-color': section.title_color || 'var(--color-text, #000000)',
    '--location-subtitle-color': section.subtitle_color || 'var(--color-text, #666666)',
  } as React.CSSProperties & Record<string, string | undefined>;

  return (
    <section
      className="py-16"
      style={{
        ...sectionStyle,
        backgroundColor: 'var(--location-bg)',
      }}
    >
      <div className={`${section.full_width ? '' : 'container mx-auto px-4'}`} style={{ maxWidth: section.full_width ? '100%' : 'var(--container-max-width, 1200px)' }}>
        {(section.title || section.subtitle) && (
          <div className="mb-8 text-center">
            {section.title && (
              <h2 
                className="text-3xl md:text-4xl font-bold mb-4"
                style={{ color: 'var(--location-title-color)' }}
              >
                {section.title}
              </h2>
            )}
            {section.subtitle && (
              <p 
                className="text-lg text-muted-foreground"
                style={{ color: 'var(--location-subtitle-color)' }}
              >
                {section.subtitle}
              </p>
            )}
          </div>
        )}
        
        <div className="rounded-lg overflow-hidden shadow-lg">
          {isPreview ? (
            <div 
              className="w-full bg-gray-200 flex items-center justify-center"
              style={{ height: `${mapHeight}px` }}
            >
              <div className="text-center text-gray-500">
                <p className="text-lg font-semibold mb-2">📍 Map Preview</p>
                <p className="text-sm">{section.address || 'Enter an address to see the map'}</p>
              </div>
            </div>
          ) : (
            <iframe
              width="100%"
              height={mapHeight}
              style={{ border: 0 }}
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              src={buildMapUrl()}
              title={section.title || 'Location Map'}
            />
          )}
        </div>
        
        {section.address && (
          <div className="mt-6 text-center">
            <p className="text-muted-foreground">
              <strong>Address:</strong> {section.address}
            </p>
            {section.show_info_window && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(section.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-4 text-primary hover:underline"
              >
                Open in Google Maps →
              </a>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

