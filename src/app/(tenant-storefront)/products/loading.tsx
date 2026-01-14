/**
 * Products Page Loading State
 * 
 * Simplified - just show a simple loading message
 * The page should load quickly, so this should rarely be seen
 */

export default function ProductsLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl md:text-3xl font-bold mb-6">Products</h1>
      <div className="text-center py-12">
        <p className="text-lg text-muted-foreground">Loading products...</p>
      </div>
    </div>
  );
}
