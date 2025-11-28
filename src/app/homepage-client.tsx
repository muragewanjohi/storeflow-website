/**
 * Default Homepage Client Component
 * 
 * Default homepage when no custom page builder content exists
 * 
 * Day 30: Tenant Storefront - Homepage
 */

'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Image from 'next/image';
import { useCurrency } from '@/lib/currency/currency-context';

interface Product {
  id: string;
  name: string;
  slug: string | null;
  price: number;
  image: string | null;
  stock_quantity: number | null;
}

interface HomepageClientProps {
  featuredProducts: Product[];
  tenantName: string;
}

export default function HomepageClient({
  featuredProducts,
  tenantName,
}: Readonly<HomepageClientProps>) {
  const { formatCurrency } = useCurrency();
  
  // Using formatCurrency from useCurrency hook
  const formatPrice = (price: number) => formatCurrency(price);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-16 md:py-24 bg-gradient-to-b from-primary/10 to-background">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Welcome to {tenantName}
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Discover amazing products at great prices
            </p>
            <div className="flex gap-4 justify-center">
              <Button asChild size="lg">
                <Link href="/products">Shop Now</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/products">Browse Products</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      {featuredProducts.length > 0 && (
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold">Featured Products</h2>
              <Button asChild variant="outline">
                <Link href="/products">View All</Link>
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts.map((product: any) => (
                <Link key={product.id} href={`/products/${product.slug}`}>
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                    <CardContent className="p-0">
                      <div className="relative aspect-square bg-muted rounded-t-lg overflow-hidden">
                        {product.image ? (
                          <Image
                            src={product.image}
                            alt={product.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            No Image
                          </div>
                        )}
                        {product.stock_quantity === 0 && (
                          <div className="absolute top-2 right-2 bg-destructive text-destructive-foreground px-2 py-1 rounded text-xs font-medium">
                            Out of Stock
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold mb-2 line-clamp-2">{product.name}</h3>
                        <p className="text-lg font-bold">{formatPrice(product.price)}</p>
                        {product.stock_quantity !== null && product.stock_quantity > 0 && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {product.stock_quantity} in stock
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-16 bg-muted/50">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Shop?</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Browse our full collection of products
          </p>
          <Button asChild size="lg">
            <Link href="/products">View All Products</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

