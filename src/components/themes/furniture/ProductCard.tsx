/**
 * Furniture Theme Product Card
 * 
 * Product card component matching Figma design
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCurrency } from '@/lib/currency/currency-context';
import { ShareIcon, HeartIcon } from '@heroicons/react/24/outline';

interface Product {
  id: string;
  name: string;
  slug: string | null;
  price: number;
  sale_price?: number | null;
  image: string | null;
  stock_quantity: number | null;
  metadata?: {
    description?: string;
    isNew?: boolean;
    [key: string]: unknown;
  };
}

interface FurnitureProductCardProps {
  product: Product;
  onProductClick?: (product: Product) => void;
}

export default function FurnitureProductCard({ product, onProductClick }: Readonly<FurnitureProductCardProps>) {
  const { formatCurrency } = useCurrency();
  const [isHovered, setIsHovered] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  const displayPrice = product.sale_price ?? product.price;
  const isDemoProduct =
    product.metadata?.is_demo === true ||
    product.metadata?.is_demo === 'true' ||
    product.metadata?.source === 'starter_pack_ai';
  const hasDiscount = product.sale_price !== null && product.sale_price !== undefined && product.sale_price < product.price;
  const discountPercent = hasDiscount && product.sale_price !== null && product.sale_price !== undefined
    ? Math.round(((product.price - product.sale_price) / product.price) * 100)
    : 0;

  const handleClick = (e: React.MouseEvent) => {
    if (onProductClick) {
      e.preventDefault();
      onProductClick(product);
    }
  };

  return (
    <Link
      href={`/products/${product.slug || product.id}`}
      onClick={handleClick}
      className="block furniture-product-card group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative bg-[#f4f5f7] rounded-lg overflow-hidden">
        {/* Product Image */}
        <div className="relative w-full h-[301px] bg-[#f4f5f7]">
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[#898989]">
              No Image
            </div>
          )}

          {/* Discount Badge */}
          {hasDiscount && discountPercent > 0 && (
            <div className="absolute top-6 right-6 w-12 h-12 bg-[#E97171] rounded-full flex items-center justify-center">
              <span className="text-white text-[16px] font-medium">-{discountPercent}%</span>
            </div>
          )}

          {/* New Badge */}
          {product.metadata?.isNew && (
            <div className="absolute top-6 right-6 w-12 h-12 bg-[#2EC1AC] rounded-full flex items-center justify-center">
              <span className="text-white text-[16px] font-medium">New</span>
            </div>
          )}

          {isDemoProduct && (
            <div className="absolute top-6 left-6 rounded-full bg-white/90 px-3 py-1">
              <span className="text-xs font-semibold text-[#3a3a3a]">Demo</span>
            </div>
          )}

          {/* Hover Overlay */}
          {isHovered && (
            <div className="absolute inset-0 bg-[#3a3a3a] bg-opacity-72 flex items-center justify-center">
              <div className="flex flex-col gap-6 items-center">
                <button className="bg-white text-[#B88E2F] px-[59px] py-3 text-[16px] font-semibold hover:bg-[#B88E2F] hover:text-white transition-colors">
                  {isDemoProduct ? 'Preview only' : 'Add to cart'}
                </button>
                <div className="flex gap-5 items-center">
                  <button className="flex items-center gap-2 text-white text-[16px] font-semibold hover:opacity-70">
                    <ShareIcon className="w-4 h-4" />
                    Share
                  </button>
                  <button className="flex items-center gap-2 text-white text-[16px] font-semibold hover:opacity-70">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    Compare
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      setIsLiked(!isLiked);
                    }}
                    className="flex items-center gap-2 text-white text-[16px] font-semibold hover:opacity-70"
                  >
                    <HeartIcon className={`w-4 h-4 ${isLiked ? 'fill-white' : ''}`} />
                    Like
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="p-4 bg-[#f4f5f7]">
          <h3 className="text-[24px] font-semibold text-[#3a3a3a] mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
            {product.name}
          </h3>
          <p className="text-[16px] font-medium text-[#898989] mb-3" style={{ fontFamily: 'Poppins, sans-serif' }}>
            {product.metadata?.description as string || 'Furniture item'}
          </p>
          <div className="flex items-center gap-4">
            <span className="text-[20px] font-semibold text-[#3a3a3a]" style={{ fontFamily: 'Poppins, sans-serif' }}>
              {formatCurrency(displayPrice)}
            </span>
            {hasDiscount && (
              <span className="text-[16px] text-[#b0b0b0] line-through" style={{ fontFamily: 'Poppins, sans-serif' }}>
                {formatCurrency(product.price)}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

