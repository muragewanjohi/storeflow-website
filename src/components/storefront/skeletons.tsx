/**
 * Storefront Skeleton Components
 * 
 * Loading skeleton components for better UX during data fetching
 */

import { Card, CardContent, CardHeader } from '@/components/ui/card';

/**
 * Product Card Skeleton
 */
export function ProductCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="aspect-square w-full bg-muted animate-pulse" />
      <CardHeader>
        <div className="h-4 bg-muted rounded animate-pulse w-3/4 mb-2" />
        <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
      </CardHeader>
      <CardContent>
        <div className="h-6 bg-muted rounded animate-pulse w-1/3" />
      </CardContent>
    </Card>
  );
}

/**
 * Product Grid Skeleton
 */
export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Cart Item Skeleton
 */
export function CartItemSkeleton() {
  return (
    <div className="flex gap-4 p-4 border rounded-lg">
      <div className="w-20 h-20 bg-muted rounded animate-pulse flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
        <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
        <div className="h-4 bg-muted rounded animate-pulse w-1/4" />
      </div>
      <div className="w-20 h-8 bg-muted rounded animate-pulse" />
    </div>
  );
}

/**
 * Order Card Skeleton
 */
export function OrderCardSkeleton() {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1 space-y-3">
            <div className="h-5 bg-muted rounded animate-pulse w-1/3" />
            <div className="h-4 bg-muted rounded animate-pulse w-1/4" />
            <div className="flex gap-2">
              <div className="w-12 h-12 bg-muted rounded animate-pulse" />
              <div className="w-12 h-12 bg-muted rounded animate-pulse" />
              <div className="w-12 h-12 bg-muted rounded animate-pulse" />
            </div>
          </div>
          <div className="flex flex-col items-end gap-3">
            <div className="h-6 bg-muted rounded animate-pulse w-24" />
            <div className="h-9 bg-muted rounded animate-pulse w-32" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Page Skeleton (for full page loading)
 */
export function PageSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="space-y-4">
        <div className="h-8 bg-muted rounded animate-pulse w-1/3" />
        <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
      </div>
      <ProductGridSkeleton count={8} />
    </div>
  );
}

