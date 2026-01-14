/**
 * About Page Loading State
 * 
 * Displays skeleton UI while about page loads (content only, no header)
 */

export default function AboutLoading() {
  return (
    <>
      {/* Hero Skeleton */}
      <div className="bg-gradient-to-b from-gray-50 to-white py-16 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="h-12 w-64 mx-auto bg-gray-200 rounded animate-pulse mb-4" />
          <div className="h-6 w-96 mx-auto bg-gray-200 rounded animate-pulse" />
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="container mx-auto max-w-4xl px-4 py-12">
        <div className="space-y-8">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-4">
              <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
              <div className="space-y-2">
                <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
