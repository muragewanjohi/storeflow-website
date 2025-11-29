/**
 * Default Theme Hero Section
 * 
 * Appealing hero section with computer/electronics focus
 */

'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Star, Shield, Truck } from 'lucide-react';
import { usePreview } from '@/lib/themes/preview-context';

interface DefaultHeroProps {
  title?: string;
  subtitle?: string;
  ctaText?: string;
  ctaLink?: string;
  image?: string;
}

export default function DefaultHero({
  title = 'Premium Computers & Electronics',
  subtitle = 'Discover the latest technology and computing solutions for your home and office',
  ctaText = 'Shop Now',
  ctaLink = '/products',
  image,
}: DefaultHeroProps) {
  const { isPreview, onNavigate } = usePreview();

  const handleCTAClick = (e: React.MouseEvent) => {
    if (isPreview && onNavigate) {
      e.preventDefault();
      onNavigate(ctaLink);
    }
  };

  return (
    <section className="relative bg-gradient-to-br from-primary/5 via-background to-accent/5 py-24 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 
                className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-tight"
                style={{ fontFamily: 'var(--font-heading, inherit)' }}
              >
                {title}
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl leading-relaxed">
                {subtitle}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              {isPreview && onNavigate ? (
                <>
                  <Button 
                    size="lg" 
                    className="group text-lg px-8 py-6"
                    onClick={handleCTAClick}
                  >
                    {ctaText}
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="lg" 
                    className="text-lg px-8 py-6"
                    onClick={(e) => {
                      e.preventDefault();
                      onNavigate('/products');
                    }}
                  >
                    Browse All Products
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild size="lg" className="group text-lg px-8 py-6">
                    <Link href={ctaLink}>
                      {ctaText}
                      <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="text-lg px-8 py-6">
                    <Link href="/products">Browse All Products</Link>
                  </Button>
                </>
              )}
            </div>
            
            {/* Features */}
            <div className="grid grid-cols-3 gap-6 pt-8 border-t">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
                  <Star className="h-6 w-6 text-primary" />
                </div>
                <div className="text-2xl font-bold text-primary mb-1">4.9/5</div>
                <div className="text-sm text-muted-foreground">Customer Rating</div>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <div className="text-2xl font-bold text-primary mb-1">2-Year</div>
                <div className="text-sm text-muted-foreground">Warranty</div>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
                  <Truck className="h-6 w-6 text-primary" />
                </div>
                <div className="text-2xl font-bold text-primary mb-1">Free</div>
                <div className="text-sm text-muted-foreground">Shipping</div>
              </div>
            </div>
          </div>

          {/* Image */}
          <div className="relative">
            {image ? (
              <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                <img
                  src={image}
                  alt={title}
                  className="w-full h-auto object-cover"
                  loading="eager"
                />
              </div>
            ) : (
              <div className="relative aspect-square bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl overflow-hidden shadow-2xl">
                <img
                  src="https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&h=800&fit=crop"
                  alt="Premium Computers"
                  className="w-full h-full object-cover"
                  loading="eager"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

