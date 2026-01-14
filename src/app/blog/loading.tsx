/**
 * Blog Page Loading State
 * 
 * Displays skeleton UI while blog page loads (content only)
 */

export default function BlogLoading() {
  return (
    <>
      {/* Content Skeleton */}
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="h-10 w-48 mx-auto bg-gray-200 rounded animate-pulse mb-2" />
          <div className="h-6 w-96 mx-auto bg-gray-200 rounded animate-pulse" />
        </div>

        {/* Blog Posts Grid Skeleton */}
        <div className="grid gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {/* Image skeleton */}
              <div className="aspect-video bg-gray-200 animate-pulse" />
              
              {/* Content skeleton */}
              <div className="p-6 space-y-3">
                <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                <div className="h-6 bg-gray-200 rounded animate-pulse" />
                <div className="h-6 w-3/4 bg-gray-200 rounded animate-pulse" />
                <div className="space-y-2 pt-2">
                  <div className="h-3 w-full bg-gray-200 rounded animate-pulse" />
                  <div className="h-3 w-full bg-gray-200 rounded animate-pulse" />
                  <div className="h-3 w-2/3 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
