/**
 * Blog Post Loading State
 * 
 * Displays skeleton UI while blog post loads (content only, no header)
 */

export default function BlogPostLoading() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      {/* Post Header Skeleton */}
      <div className="mb-8">
        <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-4" />
        <div className="h-12 w-3/4 bg-gray-200 rounded animate-pulse mb-4" />
        <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
      </div>

      {/* Featured Image Skeleton */}
      <div className="aspect-video bg-gray-200 rounded-lg animate-pulse mb-8" />

      {/* Content Skeleton */}
      <div className="space-y-4 mb-12">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Related Posts Skeleton */}
      <div className="border-t pt-12">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="aspect-video bg-gray-200 animate-pulse" />
              <div className="p-4 space-y-2">
                <div className="h-5 bg-gray-200 rounded animate-pulse" />
                <div className="h-5 w-2/3 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
