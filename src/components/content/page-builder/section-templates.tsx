/**
 * Section Template Components
 * 
 * Reusable section components for page builder
 * 
 * Day 28: Content Management - Simple Page Builder
 */

'use client';

import { useState, useEffect } from 'react';
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
    default:
      return null;
  }
}

function HeroSectionComponent({ 
  section, 
  isPreview 
}: { 
  section: Extract<PageSection, { type: 'hero' }>; 
  isPreview: boolean;
}) {
  // Set CSS variables on section for better performance (section-specific naming)
  const sectionStyle = {
    '--hero-bg': section.background_color || 'var(--color-background, transparent)',
    '--hero-text': 'var(--color-text, currentColor)',
    '--hero-title-color': section.title_color || 'var(--color-primary, currentColor)',
    '--hero-subtitle-color': section.subtitle_color || 'var(--color-text, #666666)',
    '--hero-description-color': section.description_color || 'var(--color-text, #666666)',
    '--hero-cta-text-color': section.cta_text_color || 'var(--color-button-text, #FFFFFF)',
    '--hero-cta-bg-color': section.cta_button_color || 'var(--color-primary, hsl(var(--primary)))',
    '--font-heading': 'var(--font-heading, inherit)',
    '--font-body': 'var(--font-body, inherit)',
  } as React.CSSProperties & Record<string, string | undefined>;

  return (
    <section
      className="relative py-16 md:py-24"
      style={{
        ...sectionStyle,
        backgroundColor: 'var(--hero-bg)',
      }}
    >
      <div className="container mx-auto px-4" style={{ maxWidth: 'var(--container-max-width, 1200px)' }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div>
            {section.title && (
              <h1 
                className="text-4xl md:text-5xl font-bold mb-4"
                style={{ 
                  fontFamily: 'var(--font-heading)',
                  color: 'var(--hero-title-color)',
                }}
              >
                {section.title}
              </h1>
            )}
            {section.subtitle && (
              <h2 
                className="text-2xl md:text-3xl mb-4"
                style={{ 
                  fontFamily: 'var(--font-heading)',
                  color: 'var(--hero-subtitle-color)',
                }}
              >
                {section.subtitle}
              </h2>
            )}
            {section.description && (
              <p 
                className="text-lg mb-6" 
                style={{ 
                  fontFamily: 'var(--font-body)',
                  color: 'var(--hero-description-color)',
                }}
              >
                {section.description}
              </p>
            )}
            {section.cta_text && section.cta_link && (
              <Button 
                asChild
                style={{ 
                  backgroundColor: 'var(--hero-cta-bg-color)',
                  color: 'var(--hero-cta-text-color)',
                }}
              >
                <a href={section.cta_link}>{section.cta_text}</a>
              </Button>
            )}
          </div>
          {section.image && (
            <div className="relative aspect-video rounded-lg overflow-hidden">
              {section.image.startsWith('blob:') ? (
                <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground">
                  <div className="text-center">
                    <p className="text-sm font-medium">Image not available</p>
                    <p className="text-xs mt-1">Please re-upload this image</p>
                  </div>
                </div>
              ) : (
                <div className="relative w-full h-full">
                  <Image
                    src={section.image}
                    alt={section.title || 'Hero image'}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 50vw"
                    onError={(e) => {
                      // Fallback if image fails to load
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        parent.innerHTML = `
                          <div class="w-full h-full flex items-center justify-center bg-muted text-muted-foreground">
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
                      className="object-cover"
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
                        className="object-cover"
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
                    className="object-cover opacity-60 group-hover:scale-110 transition-transform duration-500"
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
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);

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
          // First get sale details to get slug
          const saleDetailsResponse = await fetch(`/api/dashboard/sales/${section.sale_id}`);
          if (!saleDetailsResponse.ok) {
            throw new Error('Failed to fetch sale details');
          }
          const saleDetails = await saleDetailsResponse.json();
          
          // Then fetch sale with products using slug
          const saleResponse = await fetch(`/api/sales/${saleDetails.sale.slug}`);
          if (!saleResponse.ok) {
            throw new Error('Failed to fetch sale');
          }
          const saleData = await saleResponse.json();
          
          const saleProducts: Product[] = (saleData.sale?.products || []).map((ps: any) => {
            const product = ps.product;
            const regularPrice = Number(product.price);
            const salePrice = ps.sale_price ? Number(ps.sale_price) : (product.sale_price ? Number(product.sale_price) : regularPrice);
            const discountPercent = ps.discount_percent 
              ? Number(ps.discount_percent)
              : salePrice < regularPrice
              ? Math.round(((regularPrice - salePrice) / regularPrice) * 100)
              : 0;

            return {
              id: product.id,
              name: product.name,
              slug: product.slug,
              price: salePrice,
              compareAtPrice: salePrice < regularPrice ? regularPrice : undefined,
              image: product.image,
              stock_quantity: product.stock_quantity,
              saleBadge: section.badge_text || saleData.sale?.badge_text || 'SALE',
              saleBadgeColor: section.badge_color || saleData.sale?.badge_color || '#EF4444',
              discountPercent,
            };
          }).slice(0, section.limit || 8);

          setProducts(saleProducts);
          setSales([saleData.sale]);
        } else if (displayMode === 'featured_sales' && section.featured_sale_ids && section.featured_sale_ids.length > 0) {
          // Fetch multiple featured sales - first get details to get slugs
          const salesDetailsPromises = section.featured_sale_ids.map((saleId: string) =>
            fetch(`/api/dashboard/sales/${saleId}`).then(res => res.json())
          );
          const salesDetails = await Promise.all(salesDetailsPromises);
          
          // Then fetch each sale with products using slugs
          const salesPromises = salesDetails
            .filter(s => s.sale && s.sale.slug)
            .map((s: any) => fetch(`/api/sales/${s.sale.slug}`).then(res => res.json()));
          const salesData = await Promise.all(salesPromises);
          const validSales = salesData.filter(s => s.sale).map(s => s.sale);
          setSales(validSales);

          // Load products from first sale or active tab
          if (validSales.length > 0) {
            const activeSale = validSales[activeTab] || validSales[0];
            const saleProducts: Product[] = (activeSale.products || []).map((ps: any) => {
              const product = ps.product;
              const regularPrice = Number(product.price);
              const salePrice = ps.sale_price ? Number(ps.sale_price) : (product.sale_price ? Number(product.sale_price) : regularPrice);
              const discountPercent = ps.discount_percent 
                ? Number(ps.discount_percent)
                : salePrice < regularPrice
                ? Math.round(((regularPrice - salePrice) / regularPrice) * 100)
                : 0;

              return {
                id: product.id,
                name: product.name,
                slug: product.slug,
                price: salePrice,
                compareAtPrice: salePrice < regularPrice ? regularPrice : undefined,
                image: product.image,
                stock_quantity: product.stock_quantity,
                saleBadge: section.badge_text || activeSale.badge_text || 'SALE',
                saleBadgeColor: section.badge_color || activeSale.badge_color || '#EF4444',
                discountPercent,
              };
            }).slice(0, section.limit || 8);
            setProducts(saleProducts);
          }
        } else if (displayMode === 'all_active') {
          // Fetch all active sales
          const salesResponse = await fetch('/api/sales?status=active&limit=10');
          if (!salesResponse.ok) {
            throw new Error('Failed to fetch sales');
          }
          const salesData = await salesResponse.json();
          const allSales = salesData.sales || [];
          setSales(allSales);

          // Get products from all sales (combined)
          const allProducts: Product[] = [];
          for (const sale of allSales.slice(0, 3)) { // Limit to first 3 sales
            const saleResponse = await fetch(`/api/sales/${sale.slug}`);
            if (saleResponse.ok) {
              const saleData = await saleResponse.json();
              const saleProducts = (saleData.sale?.products || []).map((ps: any) => {
                const product = ps.product;
                const regularPrice = Number(product.price);
                const salePrice = ps.sale_price ? Number(ps.sale_price) : (product.sale_price ? Number(product.sale_price) : regularPrice);
                const discountPercent = ps.discount_percent 
                  ? Number(ps.discount_percent)
                  : salePrice < regularPrice
                  ? Math.round(((regularPrice - salePrice) / regularPrice) * 100)
                  : 0;

                return {
                  id: product.id,
                  name: product.name,
                  slug: product.slug,
                  price: salePrice,
                  compareAtPrice: salePrice < regularPrice ? regularPrice : undefined,
                  image: product.image,
                  stock_quantity: product.stock_quantity,
                  saleBadge: section.badge_text || sale.badge_text || 'SALE',
                  saleBadgeColor: section.badge_color || sale.badge_color || '#EF4444',
                  discountPercent,
                };
              });
              allProducts.push(...saleProducts);
            }
          }
          setProducts(allProducts.slice(0, section.limit || 8));
        } else {
          setProducts([]);
        }
      } catch (err) {
        console.error('Error fetching sales data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load sales');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [displayMode, section.sale_id, section.featured_sale_ids, section.limit, section.badge_text, section.badge_color, activeTab, isPreview]);

  // Update products when active tab changes (for featured_sales mode)
  useEffect(() => {
    if (displayMode === 'featured_sales' && sales.length > 0 && !isPreview) {
      const activeSale = sales[activeTab] || sales[0];
      if (activeSale) {
        fetch(`/api/sales/${activeSale.slug}`)
          .then(res => res.json())
          .then(data => {
            const saleProducts: Product[] = (data.sale?.products || []).map((ps: any) => {
              const product = ps.product;
              const regularPrice = Number(product.price);
              const salePrice = ps.sale_price ? Number(ps.sale_price) : (product.sale_price ? Number(product.sale_price) : regularPrice);
              const discountPercent = ps.discount_percent 
                ? Number(ps.discount_percent)
                : salePrice < regularPrice
                ? Math.round(((regularPrice - salePrice) / regularPrice) * 100)
                : 0;

              return {
                id: product.id,
                name: product.name,
                slug: product.slug,
                price: salePrice,
                compareAtPrice: salePrice < regularPrice ? regularPrice : undefined,
                image: product.image,
                stock_quantity: product.stock_quantity,
                saleBadge: section.badge_text || activeSale.badge_text || 'SALE',
                saleBadgeColor: section.badge_color || activeSale.badge_color || '#EF4444',
                discountPercent,
              };
            }).slice(0, section.limit || 8);
            setProducts(saleProducts);
          })
          .catch(err => console.error('Error fetching sale products:', err));
      }
    }
  }, [activeTab, displayMode, sales, section.limit, section.badge_text, section.badge_color, isPreview]);

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

    if (products.length === 0) {
      return (
        <div className="col-span-full text-center text-muted-foreground py-12">
          No products found
        </div>
      );
    }

    return products.map((product) => (
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

  return (
    <section className="py-16 bg-white" style={{ fontFamily: bodyFont }}>
      <div className="container mx-auto px-4" style={{ maxWidth: 'var(--container-max-width, 1200px)' }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            {section.title && (
              <h2 
                className="text-3xl md:text-4xl font-bold mb-2"
                style={{ 
                  fontFamily: headingFont,
                  color: 'var(--color-text, currentColor)',
                }}
              >
                {section.title}
              </h2>
            )}
            {section.subtitle && (
              <p className="text-muted-foreground">{section.subtitle}</p>
            )}
          </div>
          {section.cta_position === 'top_right' && section.cta_text && section.cta_link && (
            <Link href={section.cta_link}>
              <Button variant="outline">
                {section.cta_text}
              </Button>
            </Link>
          )}
        </div>

        {/* Banner (if enabled) */}
        {section.banner_style !== 'none' && sales.length > 0 && sales[0]?.banner_image && (
          <div className={`mb-8 ${section.banner_style === 'full_width' ? 'w-full' : 'max-w-4xl mx-auto'}`}>
            <div className="relative aspect-video overflow-hidden rounded-lg">
              <Image
                src={sales[0].banner_image}
                alt={sales[0].name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
              />
            </div>
          </div>
        )}

        {/* Countdown Timer (if enabled) */}
        {section.show_countdown && sales.length > 0 && sales[0]?.end_date && (
          <div className="mb-8 flex justify-center">
            <CountdownTimer endDate={sales[0].end_date} />
          </div>
        )}

        {/* Tabs (for featured_sales mode) */}
        {displayMode === 'featured_sales' && layout === 'tabs' && sales.length > 1 && (
          <div className="mb-8 border-b">
            <div className="flex gap-4 overflow-x-auto">
              {sales.map((sale, index) => (
                <button
                  key={sale.id}
                  onClick={() => setActiveTab(index)}
                  className={`px-4 py-2 border-b-2 transition-colors ${
                    activeTab === index
                      ? 'border-primary text-primary font-semibold'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {sale.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Products Grid/Carousel */}
        {layout === 'carousel' ? (
          <div className="overflow-x-auto">
            <div className={`flex gap-6 min-w-max ${gridCols}`}>
              {renderProducts()}
            </div>
          </div>
        ) : (
          <div className={`grid grid-cols-1 ${gridCols} gap-6`}>
            {renderProducts()}
          </div>
        )}

        {/* Bottom CTA */}
        {section.cta_position === 'bottom_center' && section.cta_text && section.cta_link && (
          <div className="mt-8 text-center">
            <Link href={section.cta_link}>
              <Button variant="outline" size="lg">
                {section.cta_text}
              </Button>
            </Link>
          </div>
        )}
      </div>
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
  
  const [rightProducts, setRightProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch products for right side if needed
  useEffect(() => {
    if (isPreview || section.right_side.type !== 'products') {
      setIsLoading(false);
      return;
    }

    const fetchProducts = async () => {
      try {
        setIsLoading(true);
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
        console.error('Error fetching products:', err);
      } finally {
        setIsLoading(false);
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

  // Set CSS variables on section for better performance
  const sectionStyle = {
    '--split-layout-bg': section.background_gradient || section.background_color || 'transparent',
    '--split-layout-left-bg': section.left_side.background_gradient || section.left_side.background_color || 'var(--color-background, #f3f4f6)',
    '--split-layout-left-title-color': section.left_side.title_color || 'var(--color-text, currentColor)',
    '--split-layout-left-subtitle-color': section.left_side.subtitle_color || 'var(--color-text, #666666)',
    '--split-layout-left-content-color': section.left_side.content_color || 'var(--color-text, #666666)',
    '--split-layout-left-cta-text-color': section.left_side.cta_text_color || '#FFFFFF',
    '--split-layout-left-cta-bg-color': section.left_side.cta_button_color || 'var(--color-primary, hsl(var(--primary)))',
    '--split-layout-right-bg': section.right_side.background_color || 'transparent',
    '--split-layout-right-title-color': section.right_side.title_color || 'var(--color-text, currentColor)',
    '--split-layout-right-subtitle-color': section.right_side.subtitle_color || 'var(--color-text, #666666)',
    '--font-heading': headingFont,
    '--font-body': bodyFont,
    paddingTop,
    paddingBottom,
    backgroundImage: section.background_gradient || undefined,
    backgroundColor: section.background_gradient ? undefined : (section.background_color || 'transparent'),
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
          {/* Left Side */}
          <div
            className={`relative overflow-hidden ${section.left_side.border_radius ? '' : 'rounded-lg'}`}
            style={{
              backgroundImage: section.left_side.background_gradient || undefined,
              backgroundColor: section.left_side.background_gradient ? undefined : 'var(--split-layout-left-bg)',
              borderRadius: section.left_side.border_radius ? `${section.left_side.border_radius}px` : '0.5rem',
              minHeight: mobileBehavior === 'scroll' ? '400px' : '500px',
            }}
          >
            {/* Background Image (if any) */}
            {section.left_side.image && !section.left_side.image.startsWith('blob:') && section.left_side.type !== 'text' && (
              <div className="absolute inset-0">
                <Image
                  src={section.left_side.image}
                  alt={section.left_side.alt_text || section.left_side.title || 'Banner'}
                  fill
                  className={getImagePositionClass(section.left_side.image_position)}
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
                {/* Overlay */}
                {section.left_side.overlay_opacity !== undefined && (
                  <div 
                    className="absolute inset-0 bg-black"
                    style={{ opacity: section.left_side.overlay_opacity / 100 }}
                  />
                )}
              </div>
            )}
            
            {/* Content Overlay */}
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
              {section.left_side.cta_text && section.left_side.cta_link && (
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
            </div>
          </div>

          {/* Right Side */}
          <div 
            className={`${section.right_side.border_radius ? '' : 'rounded-lg'}`}
            style={{
              backgroundColor: 'var(--split-layout-right-bg)',
              borderRadius: section.right_side.border_radius ? `${section.right_side.border_radius}px` : '0.5rem',
              padding: contentPadding,
            }}
          >
            {section.right_side.title && (
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
            {section.right_side.subtitle && (
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
                ) : isLoading ? (
                  <div className="col-span-full text-center text-muted-foreground py-12">
                    Loading products...
                  </div>
                ) : rightProducts.length === 0 ? (
                  <div className="col-span-full text-center text-muted-foreground py-12">
                    No products found
                  </div>
                ) : (
                  rightProducts.map((product) => (
                    <div key={product.id} className="flex gap-4 p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                      <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 relative">
                        <Image
                          src={product.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&h=200&fit=crop'}
                          alt={product.name}
                          fill
                          className="object-cover"
                          sizes="80px"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm mb-1 line-clamp-2">{product.name}</h3>
                        <div className="flex items-center gap-2">
                          <span className="font-bold" style={{ color: 'var(--color-primary, currentColor)' }}>
                            ${product.price.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
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

            {section.right_side.type === 'image' && section.right_side.image && !section.right_side.image.startsWith('blob:') && (
              <div className="relative aspect-video rounded-lg overflow-hidden">
                <Image
                  src={section.right_side.image}
                  alt={section.right_side.alt_text || 'Image'}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
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

