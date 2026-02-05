/**
 * Sale Page Client Component
 * 
 * Client-side rendering for sale page with countdown, products, and filters
 * 
 * Phase 4: Storefront - Sales Implementation
 */

'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import CountdownTimer from '@/components/storefront/countdown-timer';
import { loadThemeProductCard } from '@/lib/themes/theme-loader';
import DefaultProductCard from '@/components/themes/default/ProductCard';
import { useCurrency } from '@/lib/currency/currency-context';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

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

interface SalePageClientProps {
  sale: Sale;
  products: Product[];
  total: number;
  page: number;
  limit: number;
  themeSlug: string;
}

export default function SalePageClient({
  sale,
  products: initialProducts,
  total,
  page: initialPage,
  limit,
  themeSlug,
}: Readonly<SalePageClientProps>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [products] = useState(initialProducts);
  const [sortBy, setSortBy] = useState((searchParams.get('sort') as string) || 'order');

  const { formatCurrency } = useCurrency();

  // Load theme-specific product card
  const ProductCard = loadThemeProductCard(themeSlug) || DefaultProductCard;

  const handleSortChange = (value: string) => {
    setSortBy(value);
    const params = new URLSearchParams(searchParams.toString());
    params.set('sort', value);
    params.set('page', '1'); // Reset to first page on sort
    startTransition(() => {
      router.push(`/sales/${sale.slug}?${params.toString()}`);
    });
  };

  const totalPages = Math.ceil(total / limit);
  const hasNextPage = initialPage < totalPages;
  const hasPrevPage = initialPage > 1;

  // Sort products client-side (in a real app, this would be server-side)
  const sortedProducts = [...products].sort((a, b) => {
    switch (sortBy) {
      case 'price_asc':
        return a.price - b.price;
      case 'price_desc':
        return b.price - a.price;
      case 'name_asc':
        return a.name.localeCompare(b.name);
      case 'name_desc':
        return b.name.localeCompare(a.name);
      case 'discount_desc':
        return (b.discountPercent || 0) - (a.discountPercent || 0);
      default:
        return 0; // Keep original order
    }
  });

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumbs */}
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          Home
        </Link>
        <span className="mx-2">/</span>
        <Link href="/sales" className="hover:text-foreground">
          Sales
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{sale.name}</span>
      </nav>

      {/* Sale Banner */}
      {sale.banner_image && (
        <div className="relative mb-8 aspect-[3/1] w-full overflow-hidden rounded-lg">
          <Image
            src={sale.banner_image}
            alt={sale.name}
            fill
            className="object-contain"
            priority
          />
        </div>
      )}

      {/* Sale Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-4xl font-bold mb-2">{sale.name}</h1>
            {sale.description && (
              <p className="text-lg text-muted-foreground">{sale.description}</p>
            )}
          </div>
          {sale.end_date && (
            <CountdownTimer
              endDate={sale.end_date}
              className="flex-shrink-0"
            />
          )}
        </div>

        {/* Sale Badge Preview */}
        {(sale.badge_text || sale.badge_color) && (
          <div className="flex items-center gap-2 mb-4">
            <Badge
              style={{
                backgroundColor: sale.badge_color || '#EF4444',
                color: '#FFFFFF',
              }}
            >
              {sale.badge_text || 'SALE'}
            </Badge>
            {sale.is_featured && <Badge variant="default">Featured</Badge>}
          </div>
        )}
      </div>

      {/* Products Section */}
      <div className="mb-6 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {((initialPage - 1) * limit) + 1} to {Math.min(initialPage * limit, total)} of{' '}
          {total} products
        </div>
        <Select value={sortBy} onValueChange={handleSortChange}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="order">Default Order</SelectItem>
            <SelectItem value="price_asc">Price: Low to High</SelectItem>
            <SelectItem value="price_desc">Price: High to Low</SelectItem>
            <SelectItem value="name_asc">Name: A to Z</SelectItem>
            <SelectItem value="name_desc">Name: Z to A</SelectItem>
            <SelectItem value="discount_desc">Discount: Highest First</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Products Grid */}
      {sortedProducts.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">No products in this sale yet.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
            {sortedProducts.map((product) => (
              <div key={product.id} className="relative">
                {product.saleBadge && (
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
                <ProductCard product={product} />
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!hasPrevPage || isPending}
                onClick={() => {
                  const params = new URLSearchParams(searchParams.toString());
                  params.set('page', String(initialPage - 1));
                  router.push(`/sales/${sale.slug}?${params.toString()}`);
                }}
              >
                <ChevronLeftIcon className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <div className="text-sm text-muted-foreground">
                Page {initialPage} of {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={!hasNextPage || isPending}
                onClick={() => {
                  const params = new URLSearchParams(searchParams.toString());
                  params.set('page', String(initialPage + 1));
                  router.push(`/sales/${sale.slug}?${params.toString()}`);
                }}
              >
                Next
                <ChevronRightIcon className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
