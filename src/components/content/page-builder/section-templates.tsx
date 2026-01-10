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
import Image from 'next/image';
import Link from 'next/link';
import DefaultProductCard from '@/components/themes/default/ProductCard';

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
    case 'flash_sale':
      return <FlashSaleSectionComponent section={section} isPreview={isPreview} />;
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
  // Use theme CSS variables for colors
  const backgroundColor = section.background_color || 'var(--color-background, transparent)';
  const textColor = 'var(--color-text, currentColor)';
  const headingFont = 'var(--font-heading, inherit)';
  const bodyFont = 'var(--font-body, inherit)';

  return (
    <section
      className="relative py-16 md:py-24"
      style={{ 
        backgroundColor,
        color: textColor,
        fontFamily: bodyFont,
      }}
    >
      <div className="container mx-auto px-4" style={{ maxWidth: 'var(--container-max-width, 1200px)' }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div>
            {section.title && (
              <h1 
                className="text-4xl md:text-5xl font-bold mb-4"
                style={{ 
                  fontFamily: headingFont,
                  color: 'var(--color-primary, currentColor)',
                }}
              >
                {section.title}
              </h1>
            )}
            {section.subtitle && (
              <h2 
                className="text-2xl md:text-3xl text-muted-foreground mb-4"
                style={{ fontFamily: headingFont }}
              >
                {section.subtitle}
              </h2>
            )}
            {section.description && (
              <p className="text-lg text-muted-foreground mb-6" style={{ fontFamily: bodyFont }}>
                {section.description}
              </p>
            )}
            {section.cta_text && section.cta_link && (
              <Button 
                asChild
                style={{ 
                  backgroundColor: 'var(--color-primary, hsl(var(--primary)))',
                  color: 'var(--color-text, hsl(var(--primary-foreground)))',
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
                <img
                  src={section.image}
                  alt={section.title || 'Hero image'}
                  className="w-full h-full object-cover"
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
  const headingFont = 'var(--font-heading, inherit)';
  const bodyFont = 'var(--font-body, inherit)';

  return (
    <section className="py-16" style={{ fontFamily: bodyFont }}>
      <div className="container mx-auto px-4" style={{ maxWidth: 'var(--container-max-width, 1200px)' }}>
        {section.title && (
          <h2 
            className="text-3xl font-bold text-center mb-4"
            style={{ 
              fontFamily: headingFont,
              color: 'var(--color-primary, currentColor)',
            }}
          >
            {section.title}
          </h2>
        )}
        {section.subtitle && (
          <p className="text-lg text-muted-foreground text-center mb-12" style={{ fontFamily: bodyFont }}>
            {section.subtitle}
          </p>
        )}
        <div className={`grid grid-cols-1 ${gridCols} gap-6`}>
          {section.features.map((feature: any) => (
            <Card key={feature.id}>
              <CardContent className="pt-6">
                {feature.image && (
                  <div className="relative aspect-video mb-4 rounded-lg overflow-hidden">
                    <img
                      src={feature.image}
                      alt={feature.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                {feature.icon && (
                  <div className="text-4xl mb-4">{feature.icon}</div>
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
  image: string | null;
  stock_quantity: number | null;
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

  return (
    <section className="py-16" style={{ fontFamily: bodyFont }}>
      <div className="container mx-auto px-4" style={{ maxWidth: 'var(--container-max-width, 1200px)' }}>
        {section.title && (
          <h2 
            className="text-3xl font-bold text-center mb-4"
            style={{ 
              fontFamily: headingFont,
              color: 'var(--color-primary, currentColor)',
            }}
          >
            {section.title}
          </h2>
        )}
        {section.subtitle && (
          <p className="text-lg text-muted-foreground text-center mb-12" style={{ fontFamily: bodyFont }}>
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

  return (
    <section className="py-16 bg-muted/50" style={{ fontFamily: bodyFont }}>
      <div className="container mx-auto px-4" style={{ maxWidth: 'var(--container-max-width, 1200px)' }}>
        {section.title && (
          <h2 
            className="text-3xl font-bold text-center mb-4"
            style={{ 
              fontFamily: headingFont,
              color: 'var(--color-primary, currentColor)',
            }}
          >
            {section.title}
          </h2>
        )}
        {section.subtitle && (
          <p className="text-lg text-muted-foreground text-center mb-12" style={{ fontFamily: bodyFont }}>
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
                      <img
                        src={testimonial.image}
                        alt={testimonial.name}
                        className="w-full h-full object-cover"
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
  const bodyFont = 'var(--font-body, inherit)';

  return (
    <section
      className="py-16"
      style={{ 
        backgroundColor: section.background_color || 'var(--color-background, transparent)',
        fontFamily: bodyFont,
      }}
    >
      <div className="container mx-auto px-4" style={{ maxWidth: 'var(--container-max-width, 1200px)' }}>
        <div
          className="prose prose-lg max-w-none"
          style={{ color: 'var(--color-text, currentColor)' }}
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
            <img
              src={section.image}
              alt={section.alt_text || section.caption || 'Image'}
              className="w-full h-auto"
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

  return (
    <section className="py-16 bg-white" style={{ fontFamily: bodyFont }}>
      <div className="container mx-auto px-4" style={{ maxWidth: 'var(--container-max-width, 1200px)' }}>
        {(section.title || section.subtitle) && (
          <div className="flex items-center justify-between mb-8">
            {section.title && (
              <h2 
                className="text-3xl md:text-4xl font-bold"
                style={{ 
                  fontFamily: headingFont,
                  color: 'var(--color-text, currentColor)',
                }}
              >
                {section.title}
              </h2>
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

  return (
    <section className="py-8 bg-white" style={{ fontFamily: bodyFont }}>
      <div className="container mx-auto px-4" style={{ maxWidth: 'var(--container-max-width, 1200px)' }}>
        <div className={`grid ${gridCols} gap-6`}>
          {section.banners.map((banner) => (
            <div
              key={banner.id}
              className="relative rounded-lg overflow-hidden shadow-lg h-48 group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
              style={{
                backgroundColor: banner.background_color || 'var(--color-background, #f3f4f6)',
              }}
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
                  <p className="text-sm text-gray-700 mb-2">{banner.subtitle}</p>
                )}
                <h3 
                  className="text-xl font-bold mb-3"
                  style={{ 
                    fontFamily: headingFont,
                    color: 'var(--color-text, currentColor)',
                  }}
                >
                  {banner.title}
                </h3>
                {banner.cta_text && banner.cta_link && (
                  <Link href={banner.cta_link}>
                    <Button
                      size="sm"
                      style={{
                        backgroundColor: 'var(--color-primary, hsl(var(--primary)))',
                        color: 'var(--color-text, white)',
                      }}
                      className="w-fit"
                    >
                      {banner.cta_text}
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FlashSaleSectionComponent({ 
  section, 
  isPreview 
}: { 
  section: Extract<PageSection, { type: 'flash_sale' }>; 
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
    if (isPreview) {
      setIsLoading(false);
      return;
    }

    const fetchProducts = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const params = new URLSearchParams();
        params.append('status', 'active');
        params.append('limit', String(section.limit || 4));
        
        if (section.category_id) {
          params.append('category_id', section.category_id);
        }
        
        const response = await fetch(`/api/products?${params.toString()}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch products');
        }
        
        const data = await response.json();
        
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

  return (
    <section className="py-16 bg-white" style={{ fontFamily: bodyFont }}>
      <div className="container mx-auto px-4" style={{ maxWidth: 'var(--container-max-width, 1200px)' }}>
        <div className="flex items-center justify-between mb-8">
          {section.title && (
            <h2 
              className="text-3xl md:text-4xl font-bold"
              style={{ 
                fontFamily: headingFont,
                color: 'var(--color-text, currentColor)',
              }}
            >
              {section.title}
            </h2>
          )}
          {section.cta_text && section.cta_link && (
            <Link href={section.cta_link}>
              <Button variant="outline">
                {section.cta_text}
              </Button>
            </Link>
          )}
        </div>
        <div className={`grid grid-cols-1 ${gridCols} gap-6`}>
          {isPreview ? (
            <div className="text-center text-muted-foreground py-12 border-2 border-dashed rounded-lg col-span-full">
              Flash sale products will be displayed here
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
              <div key={product.id} className="relative">
                {section.badge_text && (
                  <div className="absolute top-3 left-3 z-10 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                    {section.badge_text}
                  </div>
                )}
                <DefaultProductCard product={product} />
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

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

  return (
    <section className="py-16 bg-white" style={{ fontFamily: bodyFont }}>
      <div className="container mx-auto px-4" style={{ maxWidth: 'var(--container-max-width, 1200px)' }}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Left Side - Banner */}
          <div
            className="relative rounded-lg overflow-hidden shadow-lg h-full min-h-[500px]"
            style={{
              backgroundColor: section.left_side.background_color || 'var(--color-background, #f3f4f6)',
            }}
          >
            {section.left_side.image && !section.left_side.image.startsWith('blob:') && (
              <Image
                src={section.left_side.image}
                alt={section.left_side.title || 'Banner'}
                fill
                className="object-cover opacity-70"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            )}
            <div className="absolute inset-0 flex flex-col justify-center p-8 text-center">
              {section.left_side.title && (
                <h2 
                  className="text-3xl md:text-4xl font-bold mb-4"
                  style={{ 
                    fontFamily: headingFont,
                    color: 'var(--color-text, currentColor)',
                  }}
                >
                  {section.left_side.title}
                </h2>
              )}
              {section.left_side.cta_text && section.left_side.cta_link && (
                <Link href={section.left_side.cta_link}>
                  <Button
                    size="lg"
                    style={{
                      backgroundColor: 'var(--color-primary, hsl(var(--primary)))',
                      color: 'white',
                    }}
                    className="w-fit mx-auto"
                  >
                    {section.left_side.cta_text}
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Right Side - Products or Features */}
          <div className="space-y-8">
            {section.right_side.title && (
              <h2 
                className="text-2xl md:text-3xl font-bold"
                style={{ 
                  fontFamily: headingFont,
                  color: 'var(--color-text, currentColor)',
                }}
              >
                {section.right_side.title}
              </h2>
            )}
            {section.right_side.type === 'products' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {isPreview ? (
                  <div className="text-center text-muted-foreground py-12 border-2 border-dashed rounded-lg">
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
  const headingFont = 'var(--font-heading, inherit)';
  const bodyFont = 'var(--font-body, inherit)';
  
  const backgroundStyle = section.background_gradient
    ? { background: section.background_gradient }
    : { backgroundColor: section.background_color || 'var(--color-primary, hsl(var(--primary)))' };

  return (
    <section
      className="py-16 text-white"
      style={{
        ...backgroundStyle,
        fontFamily: bodyFont,
        color: section.text_color || 'white',
      }}
    >
      <div className="container mx-auto px-4 text-center" style={{ maxWidth: 'var(--container-max-width, 1200px)' }}>
        <h2 
          className="text-3xl md:text-4xl font-bold mb-4"
          style={{ fontFamily: headingFont }}
        >
          {section.title}
        </h2>
        {section.subtitle && (
          <p className="text-xl mb-8 opacity-90">
            {section.subtitle}
          </p>
        )}
        {section.cta_text && section.cta_link && (
          <Link href={section.cta_link}>
            <Button
              size="lg"
              className="bg-white hover:bg-gray-100"
              style={{
                color: section.background_color || 'var(--color-primary, hsl(var(--primary)))',
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

  return (
    <section className="py-16 bg-white" style={{ fontFamily: bodyFont }}>
      <div className="container mx-auto px-4" style={{ maxWidth: 'var(--container-max-width, 1200px)' }}>
        {section.title && (
          <div className="text-center mb-12">
            <h2 
              className="text-3xl md:text-4xl font-bold mb-4"
              style={{ 
                fontFamily: headingFont,
                color: 'var(--color-text, currentColor)',
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

