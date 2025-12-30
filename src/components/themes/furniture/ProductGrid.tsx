/**
 * Furniture Theme Product Grid
 * 
 * Product grid component matching Figma design
 */

'use client';

import FurnitureProductCard from './ProductCard';

interface Product {
  id: string;
  name: string;
  slug: string | null;
  price: number;
  sale_price?: number | null;
  image: string | null;
  stock_quantity: number | null;
  metadata?: Record<string, unknown>;
}

interface FurnitureProductGridProps {
  products: Product[];
  columns?: number;
  className?: string;
  onProductClick?: (product: Product) => void;
}

export default function FurnitureProductGrid({
  products,
  columns = 4,
  className,
  onProductClick,
}: Readonly<FurnitureProductGridProps>) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={`grid ${gridCols[columns as keyof typeof gridCols] || gridCols[4]} gap-8 ${className || ''}`}>
      {products.map((product) => (
        <FurnitureProductCard
          key={product.id}
          product={product}
          onProductClick={onProductClick}
        />
      ))}
    </div>
  );
}

