/**
 * Products Page Loading State
 * 
 * Displays skeleton UI while products page loads
 */

export default function ProductsLoading() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header Skeleton */}
      <div className="sticky top-0 z-50 w-full border-b bg-white">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
            <div className="flex items-center gap-4">
              <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
              <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
              <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="h-10 w-64 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
        </div>

        {/* Products Grid Skeleton */}
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {/* Image skeleton */}
              <div className="aspect-square bg-gray-200 animate-pulse" />
              
              {/* Content skeleton */}
              <div className="p-4 space-y-3">
                <div className="h-5 bg-gray-200 rounded animate-pulse" />
                <div className="h-5 w-3/4 bg-gray-200 rounded animate-pulse" />
                <div className="h-6 w-20 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
