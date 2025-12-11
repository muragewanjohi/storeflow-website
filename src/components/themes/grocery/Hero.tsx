/**
 * Grocery Theme Hero Section
 * 
 * Organic food focused hero with banner carousel
 */

'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { usePreview } from '@/lib/themes/preview-context';

interface GroceryHeroProps {
  title?: string;
  subtitle?: string;
  ctaText?: string;
  ctaLink?: string;
  image?: string;
  badge?: string;
}

export default function GroceryHero({
  title = 'Organic Food For Health',
  subtitle = 'We collect pure natural organic healthy food and provide you through packaging.',
  ctaText = 'Order Now',
  ctaLink = '/products',
  image,
  badge = 'Today get 20% off now!',
}: GroceryHeroProps) {
  const { isPreview, onNavigate } = usePreview();

  const handleCTAClick = (e: React.MouseEvent) => {
    if (isPreview && onNavigate) {
      e.preventDefault();
      onNavigate(ctaLink);
    }
  };

  return (
    <section className="relative bg-gradient-to-br from-green-50 via-white to-green-50 py-16 md:py-24 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 right-0 w-96 h-96 bg-green-500 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500 rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-center">
          {/* Content */}
          <div className="space-y-6 text-center lg:text-left">
            {badge && (
              <div className="inline-block px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-semibold mb-4">
                {badge}
              </div>
            )}
            
            <div className="space-y-4">
              <h1 
                className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight text-gray-900"
                style={{ fontFamily: 'var(--font-heading, inherit)' }}
              >
                {title}
              </h1>
              <p className="text-lg md:text-xl text-gray-700 max-w-2xl leading-relaxed">
                {subtitle}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              {isPreview && onNavigate ? (
                <Button 
                  size="lg" 
                  className="group text-lg px-8 py-6 bg-green-600 hover:bg-green-700 text-white"
                  onClick={handleCTAClick}
                >
                  {ctaText}
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              ) : (
                <Button asChild size="lg" className="group text-lg px-8 py-6 bg-green-600 hover:bg-green-700 text-white">
                  <Link href={ctaLink}>
                    {ctaText}
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
              )}
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
              <div className="relative aspect-square bg-gradient-to-br from-green-100 to-emerald-100 rounded-2xl overflow-hidden shadow-2xl">
                <img
                  src="https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&h=800&fit=crop"
                  alt="Fresh Organic Groceries"
                  className="w-full h-full object-cover"
                  loading="eager"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent"></div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
