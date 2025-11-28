/**
 * Minimal Theme Product Grid
 * 
 * Ultra-minimal product grid with generous spacing
 */

'use client';

import MinimalProductCard from './ProductCard';

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

interface MinimalProductGridProps {
  products: Product[];
  columns?: number;
  className?: string;
  onProductClick?: (product: Product) => void;
}

export default function MinimalProductGrid({
  products,
  columns = 4,
  className,
  onProductClick,
}: MinimalProductGridProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={`grid ${gridCols[columns as keyof typeof gridCols] || gridCols[4]} gap-12 ${className}`}>
      {products.map((product: any) => (
        <div key={product.id} data-product-id={product.id}>
          <MinimalProductCard product={product} />
        </div>
      ))}
    </div>
  );
}

