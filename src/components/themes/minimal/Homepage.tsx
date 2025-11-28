/**
 * Minimal Theme Homepage
 * 
 * Ultra-minimal homepage with clean design
 */

'use client';

import type { DemoProduct } from '@/lib/themes/demo-content';
import MinimalProductGrid from './ProductGrid';
import { usePreview } from '@/lib/themes/preview-context';

interface MinimalHomepageProps {
  products?: DemoProduct[];
  categories?: Array<{ name: string; slug: string; description: string }>;
}

export default function MinimalHomepage({ products = [], categories = [] }: MinimalHomepageProps) {
  const { onProductClick } = usePreview();
  const featuredProducts = products.slice(0, 8);

  return (
    <div className="min-h-screen bg-background">
      {/* Featured Products Section - Minimal */}
      {featuredProducts.length > 0 && (
        <section className="py-24">
          <div className="container mx-auto px-4">
            <div className="mb-16 text-center">
              <h2 className="text-4xl font-light tracking-widest uppercase mb-4" style={{ fontFamily: 'var(--font-heading, inherit)' }}>
                Featured Products
              </h2>
              <div className="w-24 h-px bg-border mx-auto"></div>
            </div>
            <MinimalProductGrid
              products={featuredProducts.map((p: any) => ({
                id: p.sku,
                name: p.name,
                slug: p.sku.toLowerCase().replace(/\s+/g, '-'),
                price: p.price,
                compareAtPrice: p.compareAtPrice,
                image: p.image,
                stock_quantity: p.stock_quantity,
                metadata: p.metadata,
              }))}
              columns={4}
              onProductClick={onProductClick}
            />
          </div>
        </section>
      )}
    </div>
  );
}

