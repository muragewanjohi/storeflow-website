/**
 * Minimal Theme Product Card
 * 
 * Ultra-minimal product card with clean design
 */

'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { usePreview } from '@/lib/themes/preview-context';

interface Product {
  id: string;
  name: string;
  slug: string | null;
  price: number;
  compareAtPrice?: number;
  image: string | null;
  stock_quantity: number | null;
  metadata?: Record<string, unknown>;
}

interface MinimalProductCardProps {
  product: Product;
  className?: string;
}

export default function MinimalProductCard({ product, className }: MinimalProductCardProps) {
  const { isPreview, onProductClick } = usePreview();
  const isOutOfStock = (product.stock_quantity ?? 0) <= 0;

  const handleClick = (e: React.MouseEvent) => {
    if (isPreview && onProductClick) {
      e.preventDefault();
      onProductClick(product.id);
    }
  };

  return (
    <Card className={`group overflow-hidden border-0 shadow-none hover:shadow-sm transition-shadow ${className}`}>
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
            <div className="relative aspect-square bg-muted/30 overflow-hidden">
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent && !parent.querySelector('.image-fallback')) {
                      const fallback = document.createElement('div');
                      fallback.className = 'image-fallback w-full h-full flex items-center justify-center bg-muted/30';
                      fallback.innerHTML = '<span class="text-3xl opacity-30">📦</span>';
                      parent.appendChild(fallback);
                    }
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-3xl opacity-30">📦</span>
                </div>
              )}
              {isOutOfStock && (
                <div className="absolute inset-0 bg-background/90 flex items-center justify-center">
                  <span className="text-xs font-light tracking-widest uppercase text-muted-foreground">Out of Stock</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <Link href={`/products/${product.slug || product.id}`}>
            <div className="relative aspect-square bg-muted/30 overflow-hidden">
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent && !parent.querySelector('.image-fallback')) {
                      const fallback = document.createElement('div');
                      fallback.className = 'image-fallback w-full h-full flex items-center justify-center bg-muted/30';
                      fallback.innerHTML = '<span class="text-3xl opacity-30">📦</span>';
                      parent.appendChild(fallback);
                    }
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-3xl opacity-30">📦</span>
                </div>
              )}
              {isOutOfStock && (
                <div className="absolute inset-0 bg-background/90 flex items-center justify-center">
                  <span className="text-xs font-light tracking-widest uppercase text-muted-foreground">Out of Stock</span>
                </div>
              )}
            </div>
          </Link>
        )}
      </div>
      
      <CardContent className="p-6 space-y-2">
        {isPreview ? (
          <h3 
            className="text-sm font-light tracking-wide cursor-pointer" 
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
            <h3 className="text-sm font-light tracking-wide hover:text-foreground transition-colors">
              {product.name}
            </h3>
          </Link>
        )}
        
        <div className="flex items-center justify-between pt-2">
          <span className="text-sm font-light">${product.price.toFixed(2)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

