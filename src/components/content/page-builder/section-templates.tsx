/**
 * Section Template Components
 * 
 * Reusable section components for page builder
 * 
 * Day 28: Content Management - Simple Page Builder
 */

'use client';

import { PageSection } from '@/lib/content/page-builder-types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Image from 'next/image';

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
              <img
                src={section.image}
                alt={section.title || 'Hero image'}
                className="w-full h-full object-cover"
              />
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
          {isPreview && (
            <div className="text-center text-muted-foreground py-12 border-2 border-dashed rounded-lg">
              Products will be displayed here
              {section.product_ids && section.product_ids.length > 0 && (
                <p className="text-sm mt-2">{section.product_ids.length} product(s) selected</p>
              )}
              {section.category_id && (
                <p className="text-sm mt-2">Category: {section.category_id}</p>
              )}
            </div>
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
                    {Array.from({ length: 5 }).map((_, i) => (
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
          <img
            src={section.image}
            alt={section.alt_text || section.caption || 'Image'}
            className="w-full h-auto"
          />
          {section.caption && (
            <p className="text-sm text-muted-foreground text-center mt-2">{section.caption}</p>
          )}
        </div>
      </div>
    </section>
  );
}

