/**
 * All Sales Client Component
 * 
 * Displays grid of all active sales with modern e-commerce design
 * 
 * Phase 4: Storefront - Sales Implementation
 */

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import CountdownTimer from '@/components/storefront/countdown-timer';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import { getSaleImageOrFallback, shouldUseUnoptimizedImage } from '@/lib/images/fallbacks';
import { storefrontSalePath } from '@/lib/sales/slug-url';

interface Sale {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  banner_image: string | null;
  badge_text: string | null;
  badge_color: string | null;
  start_date: Date | string | null;
  end_date: Date | string | null;
  is_featured: boolean;
  _count: {
    product_sales: number;
  };
}

interface AllSalesClientProps {
  sales: Sale[];
}

export default function AllSalesClient({ sales }: Readonly<AllSalesClientProps>) {
  if (sales.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Sales</h1>
          <p className="text-muted-foreground">No active sales at the moment. Check back soon!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="mb-8 md:mb-12">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">All Sales</h1>
        <p className="text-base md:text-lg text-muted-foreground">
          Browse our current sales and special offers
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {sales.map((sale) => (
          <Card 
            key={sale.id} 
            className="group overflow-hidden hover:shadow-xl transition-all duration-300 h-full flex flex-col border-2 hover:border-primary/20"
          >
            {/* Image Section with Overlay */}
            <div className="relative aspect-[4/3] overflow-hidden bg-transparent">
              <Image
                src={getSaleImageOrFallback(sale.name, sale.banner_image)}
                alt={sale.name}
                fill
                className="object-contain group-hover:scale-105 transition-transform duration-500"
                priority={sale.is_featured}
                unoptimized={shouldUseUnoptimizedImage(getSaleImageOrFallback(sale.name, sale.banner_image))}
              />
              
              {/* Gradient Overlay - pointer-events-none so it never blocks clicks on card/content below */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" aria-hidden="true" />
              
              {/* Badges */}
              <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2 z-10">
                {sale.badge_text && (
                  <Badge
                    className="px-3 py-1.5 text-xs font-semibold shadow-lg"
                    style={{
                      backgroundColor: sale.badge_color || '#EF4444',
                      color: '#FFFFFF',
                    }}
                  >
                    {sale.badge_text}
                  </Badge>
                )}
                {sale.is_featured && (
                  <Badge className="px-3 py-1.5 text-xs font-semibold bg-green-500 hover:bg-green-600 text-white shadow-lg">
                    Featured
                  </Badge>
                )}
              </div>

              {/* Product Count Badge */}
              <div className="absolute bottom-3 left-3 z-10">
                <Badge variant="secondary" className="px-3 py-1.5 text-xs font-medium bg-white/90 backdrop-blur-sm">
                  {sale._count.product_sales} {sale._count.product_sales === 1 ? 'product' : 'products'}
                </Badge>
              </div>
            </div>

            {/* Content Section */}
            <div className="p-6 flex flex-col flex-1">
              {/* Title - links to sale page */}
              <Link
                href={storefrontSalePath(sale.slug)}
                className="block mb-3 group/title"
              >
                <h2 className="text-xl md:text-2xl font-bold mb-2 group-hover/title:text-primary transition-colors line-clamp-2">
                  {sale.name}
                </h2>
              </Link>
              
              {/* Description */}
              {sale.description && (
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2 flex-1">
                  {sale.description}
                </p>
              )}

              {/* Countdown Timer */}
              {sale.end_date && (
                <div className="mb-4 pb-4 border-b">
                  <CountdownTimer 
                    endDate={sale.end_date} 
                    showLabels={true}
                  />
                </div>
              )}

              {/* Shop Now - native anchor so navigation always goes to individual sale page */}
              {sale.slug ? (
                <div className="mt-auto">
                  <a
                    href={storefrontSalePath(sale.slug)}
                    className={cn(
                      'inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors',
                      'hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                      'group/btn'
                    )}
                  >
                    Shop Now
                    <ArrowRightIcon className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                  </a>
                </div>
              ) : (
                <div className="mt-auto">
                  <span
                    className={cn(
                      'inline-flex h-11 w-full cursor-not-allowed items-center justify-center gap-2 rounded-md border border-input bg-muted px-8 text-sm font-medium text-muted-foreground'
                    )}
                  >
                    Shop Now
                    <ArrowRightIcon className="h-4 w-4" />
                  </span>
                  <p className="text-xs text-muted-foreground mt-1 text-center">
                    Sale slug missing
                  </p>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
