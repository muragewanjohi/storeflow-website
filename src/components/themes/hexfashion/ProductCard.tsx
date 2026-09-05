/**
 * HexFashion Theme Product Card
 * 
 * Fashion-focused product card with catalog styling
 * Day 37: Theme Templates
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ShoppingCartIcon } from '@heroicons/react/24/outline';
import { usePreview } from '@/lib/themes/preview-context';
import { useCurrency } from '@/lib/currency/currency-context';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

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

interface HexFashionProductCardProps {
  product: Product;
  className?: string;
}

export default function HexFashionProductCard({ product, className }: HexFashionProductCardProps) {
  const { isPreview, onProductClick } = usePreview();
  const router = useRouter();
  const { formatCurrency } = useCurrency();
  const [addingToCart, setAddingToCart] = useState(false);
  const isOnSale = product.compareAtPrice && product.compareAtPrice > product.price;
  const isOutOfStock = (product.stock_quantity ?? 0) <= 0;
  const isDemoProduct =
    product.metadata?.is_demo === true ||
    product.metadata?.is_demo === 'true' ||
    product.metadata?.source === 'starter_pack_ai';

  const handleClick = (e: React.MouseEvent) => {
    if (isPreview && onProductClick) {
      e.preventDefault();
      onProductClick(product.id);
    }
  };

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isPreview) return;
    if (isDemoProduct) {
      toast.error('This is a demo product and cannot be purchased');
      return;
    }
    if (isOutOfStock) {
      toast.error('Product is out of stock');
      return;
    }

    setAddingToCart(true);
    try {
      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_id: product.id,
          quantity: 1,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        if (response.status === 401) {
          toast.error('Please login to add items to cart', {
            description: 'You need to be logged in to add items to your cart',
            action: {
              label: 'Login',
              onClick: () => router.push('/login?redirect=/products'),
            },
          });
        } else {
          throw new Error(data.error || 'Failed to add to cart');
        }
        return;
      }

      const data = await response.json();
      window.dispatchEvent(new Event('cartUpdated'));
      toast.success('Item added to cart!', {
        description: `${product.name} has been added to your cart`,
        action: {
          label: 'View Cart',
          onClick: () => router.push('/cart'),
        },
      });
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('Failed to add item to cart', {
        description: error instanceof Error ? error.message : 'Please try again',
      });
    } finally {
      setAddingToCart(false);
    }
  };

  const ProductImage = () => {
    if (!product.image) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-[#f0eeed]">
          <span className="text-4xl">👕</span>
        </div>
      );
    }

    // Use regular img tag for all images to match Figma design
    return (
      <img
        src={product.image}
        alt={product.name}
        className="w-full h-full object-cover"
      />
    );
  };

  // Calculate discount percentage
  const discountPercent = isOnSale && product.compareAtPrice
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
    : 0;

  // Mock rating (in real app, this would come from product data)
  const rating = 4.5;
  const ratingDisplay = rating.toFixed(1);

  return (
    <div className={`product-card ${className || ''}`}>
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
            <div className="product-image-container">
              <ProductImage />
              {isOnSale && discountPercent > 0 && (
                <div className="product-discount">
                  -{discountPercent}%
                </div>
              )}
              {isOutOfStock && (
                <div className="absolute inset-0 bg-white/90 flex items-center justify-center z-10">
                  <span className="text-sm font-medium text-gray-600">Out of Stock</span>
                </div>
              )}
              {isDemoProduct && (
                <div className="absolute top-3 right-3 z-10 rounded-full bg-white/90 px-2 py-1 text-xs font-medium text-gray-700">
                  Demo
                </div>
              )}
            </div>
          </div>
        ) : (
          <Link href={`/products/${product.slug || product.id}`} className="block">
            <div className="product-image-container">
              <ProductImage />
              {isOnSale && discountPercent > 0 && (
                <div className="product-discount">
                  -{discountPercent}%
                </div>
              )}
              {isOutOfStock && (
                <div className="absolute inset-0 bg-white/90 flex items-center justify-center z-10">
                  <span className="text-sm font-medium text-gray-600">Out of Stock</span>
                </div>
              )}
              {isDemoProduct && (
                <div className="absolute top-3 right-3 z-10 rounded-full bg-white/90 px-2 py-1 text-xs font-medium text-gray-700">
                  Demo
                </div>
              )}
            </div>
          </Link>
        )}
      </div>
      
      <div className="product-info">
        {isPreview ? (
          <h3 
            className="product-name" 
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
            <h3 className="product-name">
              {product.name}
            </h3>
          </Link>
        )}
        
        {/* Rating */}
        <div className="product-rating">
          <div className="flex items-center gap-2">
            {/* Star rating display - using SVG stars */}
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg
                  key={star}
                  className="w-[18.49px] h-[18.49px]"
                  fill={star <= Math.floor(rating) ? '#FFBA5C' : 'none'}
                  stroke={star <= Math.floor(rating) ? '#FFBA5C' : '#D1D5DB'}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                  />
                </svg>
              ))}
            </div>
            <span className="text-[14px] text-black">
              {ratingDisplay}/<span className="text-[rgba(0,0,0,0.6)]">5</span>
            </span>
          </div>
        </div>
        
        {/* Price and Cart */}
        <div className="flex items-center justify-between">
          <div className="product-price">
            <span className="product-price-current">
              {formatCurrency(product.price)}
            </span>
            {isOnSale && product.compareAtPrice && (
              <>
                <span className="product-price-old">
                  {formatCurrency(product.compareAtPrice)}
                </span>
              </>
            )}
          </div>
          {!isPreview && (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 rounded-full hover:bg-gray-100"
              onClick={handleAddToCart}
              disabled={isOutOfStock || addingToCart || isDemoProduct}
              title={isDemoProduct ? 'Demo products cannot be purchased' : isOutOfStock ? 'Out of stock' : 'Add to cart'}
            >
              <ShoppingCartIcon className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

