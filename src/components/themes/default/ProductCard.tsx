/**
 * Default Theme Product Card
 * 
 * Versatile product card suitable for any store type
 */

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCartIcon } from '@heroicons/react/24/outline';
import { usePreview } from '@/lib/themes/preview-context';
import { useCurrency } from '@/lib/currency/currency-context';
import RatingDisplay from '@/components/storefront/rating-display';

interface Product {
  id: string;
  name: string;
  slug: string | null;
  price: number;
  compareAtPrice?: number;
  image: string | null;
  stock_quantity: number | null;
  metadata?: Record<string, unknown>;
  saleBadge?: string;
  saleBadgeColor?: string;
  discountPercent?: number;
  averageRating?: number;
  totalReviews?: number;
}

interface DefaultProductCardProps {
  product: Product;
  className?: string;
}

export default function DefaultProductCard({ product, className }: DefaultProductCardProps) {
  const { isPreview, onProductClick } = usePreview();
  const { formatCurrency } = useCurrency();
  const isOnSale = product.compareAtPrice && product.compareAtPrice > product.price;
  const isOutOfStock = (product.stock_quantity ?? 0) <= 0;
  
  // Determine sale badge text and color
  const saleBadgeText = product.saleBadge || (isOnSale ? 'Sale' : null);
  const saleBadgeColor = product.saleBadgeColor || '#EF4444';

  const handleClick = (e: React.MouseEvent) => {
    if (isPreview && onProductClick) {
      e.preventDefault();
      onProductClick(product.id);
    }
  };

  return (
    <Card className={`group overflow-hidden hover:shadow-lg transition-shadow ${className}`}>
      <div className="relative">
        {isPreview ? (
          <div
            onClick={handleClick}
            className="w-full cursor-pointer"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleClick(e as any);
              }
            }}
          >
            <div className="relative aspect-square bg-muted overflow-hidden">
              {product.image ? (
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                  onError={(e) => {
                    // Fallback on image error
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      const fallback = document.createElement('div');
                      fallback.className = 'w-full h-full flex items-center justify-center bg-muted';
                      fallback.innerHTML = '<span class="text-4xl">📦</span>';
                      parent.appendChild(fallback);
                    }
                  }}
                  unoptimized={product.image.startsWith('blob:') || product.image.startsWith('data:')}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-4xl">📦</span>
                </div>
              )}
              {saleBadgeText && (
                <Badge 
                  className="absolute top-2 left-2 z-10" 
                  style={{
                    backgroundColor: saleBadgeColor,
                    color: '#FFFFFF',
                  }}
                >
                  {product.discountPercent ? `${product.discountPercent}% OFF` : saleBadgeText}
                </Badge>
              )}
              {isOutOfStock && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
                  <Badge variant="secondary">Out of Stock</Badge>
                </div>
              )}
            </div>
          </div>
        ) : (
          <Link href={`/products/${product.slug || product.id}`}>
            <div className="relative aspect-square bg-muted overflow-hidden">
              {product.image ? (
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                  onError={(e) => {
                    // Fallback on image error
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent && !parent.querySelector('.image-fallback')) {
                      const fallback = document.createElement('div');
                      fallback.className = 'image-fallback w-full h-full flex items-center justify-center bg-muted';
                      fallback.innerHTML = '<span class="text-4xl">📦</span>';
                      parent.appendChild(fallback);
                    }
                  }}
                  unoptimized={product.image.startsWith('blob:') || product.image.startsWith('data:')}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-4xl">📦</span>
                </div>
              )}
              {saleBadgeText && (
                <Badge 
                  className="absolute top-2 left-2 z-10" 
                  style={{
                    backgroundColor: saleBadgeColor,
                    color: '#FFFFFF',
                  }}
                >
                  {product.discountPercent ? `${product.discountPercent}% OFF` : saleBadgeText}
                </Badge>
              )}
              {isOutOfStock && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
                  <Badge variant="secondary">Out of Stock</Badge>
                </div>
              )}
            </div>
          </Link>
        )}
      </div>
      
      <CardContent className="p-4">
        {isPreview ? (
          <h3 
            className="font-semibold mb-2 hover:text-primary transition-colors line-clamp-2 cursor-pointer" 
            onClick={handleClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleClick(e as any);
              }
            }}
          >
            {product.name}
          </h3>
        ) : (
          <Link href={`/products/${product.slug || product.id}`}>
            <h3 className="font-semibold mb-2 hover:text-primary transition-colors line-clamp-2">
              {product.name}
            </h3>
          </Link>
        )}
        
        {/* Rating Display */}
        {(product.averageRating !== undefined && product.averageRating > 0) && (
          <div className="mb-2">
            <RatingDisplay
              rating={product.averageRating}
              totalReviews={product.totalReviews}
              size="sm"
              showCount={false}
            />
          </div>
        )}
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold">{formatCurrency(product.price)}</span>
            {isOnSale && product.compareAtPrice && (
              <span className="text-sm text-muted-foreground line-through">
                {formatCurrency(product.compareAtPrice)}
              </span>
            )}
          </div>
          
          <Button
            size="sm"
            variant="outline"
            disabled={isOutOfStock}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation(); // Prevent triggering parent click
              // Add to cart logic here
            }}
          >
            <ShoppingCartIcon className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

