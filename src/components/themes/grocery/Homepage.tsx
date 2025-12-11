/**
 * Grocery Theme Homepage
 * 
 * Complete homepage with categories, flash sales, features, and products
 */

'use client';

import { memo, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, ShoppingCart, Leaf, Shield, Truck, Thermometer, Zap } from 'lucide-react';
import type { DemoProduct } from '@/lib/themes/demo-content';
import GroceryProductGrid from './ProductGrid';
import GroceryHero from './Hero';
import { usePreview } from '@/lib/themes/preview-context';

interface GroceryHomepageProps {
  products?: DemoProduct[];
  categories?: Array<{ name: string; slug: string; description: string }>;
}

function GroceryHomepage({ products = [], categories = [] }: GroceryHomepageProps) {
  const { onProductClick: onProductClickPreview, onNavigate } = usePreview();
  
  // Memoize product mapping
  const featuredProducts = useMemo(() => {
    return products.slice(0, 8).map((p: any) => ({
      id: p.sku,
      name: p.name,
      slug: p.sku.toLowerCase().replace(/\s+/g, '-'),
      price: p.price,
      compareAtPrice: p.compareAtPrice,
      image: p.image,
      stock_quantity: p.stock_quantity,
      metadata: p.metadata,
    }));
  }, [products]);

  const handleProductClick = useCallback((product: { id: string; name: string; slug: string | null; price: number; compareAtPrice?: number; image: string | null; stock_quantity: number | null; metadata?: Record<string, unknown> }) => {
    if (onProductClickPreview) {
      onProductClickPreview(product.id);
    }
  }, [onProductClickPreview]);

  // Category images from Unsplash
  const getCategoryImage = (categoryName: string) => {
    const name = categoryName.toLowerCase();
    if (name.includes('meat') || name.includes('fresh')) {
      return 'https://images.unsplash.com/photo-1603048297172-c92544798d5e?w=400&h=400&fit=crop';
    } else if (name.includes('fruit')) {
      return 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=400&h=400&fit=crop';
    } else if (name.includes('vegetable')) {
      return 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=400&fit=crop';
    } else if (name.includes('spice')) {
      return 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&h=400&fit=crop';
    } else if (name.includes('bread')) {
      return 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=400&fit=crop';
    } else {
      return 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=400&fit=crop';
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section with Multiple Banners */}
      <section className="bg-white py-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Hero Banner (Left - 2 columns) */}
            <div className="lg:col-span-2 relative rounded-lg overflow-hidden shadow-lg">
              <div className="relative h-full min-h-[400px] bg-gradient-to-br from-orange-50 to-yellow-50">
                <img
                  src="https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&h=600&fit=crop"
                  alt="Organic Food"
                  className="w-full h-full object-cover opacity-90"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent"></div>
                <div className="absolute inset-0 flex flex-col justify-center p-8 text-white">
                  <div className="mb-4">
                    <span className="inline-block px-4 py-2 bg-green-600 text-white rounded-full text-sm font-semibold">
                      Today get 20% off now!
                    </span>
                  </div>
                  <h1 className="text-4xl md:text-5xl font-bold mb-4">
                    Organic Food For Health
                  </h1>
                  <p className="text-lg mb-6 max-w-md">
                    We collect pure natural organic healthy food and provide you through packaging.
                  </p>
                  {onNavigate ? (
                    <Button
                      size="lg"
                      className="bg-green-600 hover:bg-green-700 text-white w-fit"
                      onClick={(e) => {
                        e.preventDefault();
                        onNavigate('/products');
                      }}
                    >
                      Order Now
                    </Button>
                  ) : (
                    <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white w-fit" asChild>
                      <Link href="/products">Order Now</Link>
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Side Banners (Right - 1 column) */}
            <div className="space-y-6">
              {/* Top Right Banner */}
              <div className="relative rounded-lg overflow-hidden shadow-lg h-[190px]">
                <div className="relative h-full bg-gradient-to-br from-orange-100 to-yellow-100">
                  <img
                    src="https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=600&h=400&fit=crop"
                    alt="Fresh Fruits"
                    className="w-full h-full object-cover opacity-80"
                  />
                  <div className="absolute inset-0 flex flex-col justify-center p-6">
                    <p className="text-sm text-gray-700 mb-2">Organic fruits provider</p>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">
                      Pure Best Fresh Fruits For You
                    </h3>
                    {onNavigate ? (
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white w-fit"
                        onClick={(e) => {
                          e.preventDefault();
                          onNavigate('/products?category=pure-fruits');
                        }}
                      >
                        Buy Now
                      </Button>
                    ) : (
                      <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white w-fit" asChild>
                        <Link href="/products?category=pure-fruits">Buy Now</Link>
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Right Banner */}
              <div className="relative rounded-lg overflow-hidden shadow-lg h-[190px]">
                <div className="relative h-full bg-gradient-to-br from-green-100 to-emerald-100">
                  <img
                    src="https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&h=400&fit=crop"
                    alt="Fresh Vegetables"
                    className="w-full h-full object-cover opacity-80"
                  />
                  <div className="absolute inset-0 flex flex-col justify-center p-6">
                    <p className="text-sm text-gray-700 mb-2">Trusted food partner</p>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">
                      New Vegetable Items For You
                    </h3>
                    {onNavigate ? (
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white w-fit"
                        onClick={(e) => {
                          e.preventDefault();
                          onNavigate('/products?category=vegetables');
                        }}
                      >
                        Buy Now
                      </Button>
                    ) : (
                      <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white w-fit" asChild>
                        <Link href="/products?category=vegetables">Buy Now</Link>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      {categories.length > 0 && (
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                Browse By Categories
              </h2>
              <div className="flex gap-2">
                <button className="p-2 bg-green-100 hover:bg-green-200 rounded-lg transition-colors">
                  <ArrowRight className="h-5 w-5 text-green-700 rotate-180" />
                </button>
                <button className="p-2 bg-green-100 hover:bg-green-200 rounded-lg transition-colors">
                  <ArrowRight className="h-5 w-5 text-green-700" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-6">
              {categories.slice(0, 8).map((category: any) => {
                // Count items in this category (mock data for demo)
                const itemCount = Math.floor(Math.random() * 5);
                return (
                  <div key={category.slug}>
                    {onNavigate ? (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          onNavigate(`/products?category=${category.slug}`);
                        }}
                        className="w-full text-center group"
                      >
                        <div className="relative mb-4">
                          <div className="w-24 h-24 mx-auto rounded-full overflow-hidden border-4 border-green-200 group-hover:border-green-500 transition-colors">
                            <img
                              src={getCategoryImage(category.name)}
                              alt={category.name}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                              loading="lazy"
                            />
                          </div>
                        </div>
                        <h3 className="font-bold text-sm mb-1 group-hover:text-green-600 transition-colors">
                          {category.name}
                        </h3>
                        <p className="text-xs text-gray-600">
                          {itemCount} {itemCount === 1 ? 'Item' : 'Items'}
                        </p>
                      </button>
                    ) : (
                      <Link href={`/products?category=${category.slug}`} className="block text-center group">
                        <div className="relative mb-4">
                          <div className="w-24 h-24 mx-auto rounded-full overflow-hidden border-4 border-green-200 group-hover:border-green-500 transition-colors">
                            <img
                              src={getCategoryImage(category.name)}
                              alt={category.name}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                              loading="lazy"
                            />
                          </div>
                        </div>
                        <h3 className="font-bold text-sm mb-1 group-hover:text-green-600 transition-colors">
                          {category.name}
                        </h3>
                        <p className="text-xs text-gray-600">
                          {itemCount} {itemCount === 1 ? 'Item' : 'Items'}
                        </p>
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Promotional Banners */}
      <section className="py-8 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Banner 1 */}
            <div className="relative rounded-lg overflow-hidden shadow-lg h-48 bg-gradient-to-br from-orange-50 to-yellow-50">
              <img
                src="https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=600&h=400&fit=crop"
                alt="Fruits"
                className="w-full h-full object-cover opacity-60"
              />
              <div className="absolute inset-0 flex flex-col justify-center p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Now Get 20% Off For Fruits
                </h3>
                {onNavigate ? (
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white w-fit"
                    onClick={(e) => {
                      e.preventDefault();
                      onNavigate('/products?category=pure-fruits');
                    }}
                  >
                    Buy Now
                  </Button>
                ) : (
                  <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white w-fit" asChild>
                    <Link href="/products?category=pure-fruits">Buy Now</Link>
                  </Button>
                )}
              </div>
            </div>

            {/* Banner 2 */}
            <div className="relative rounded-lg overflow-hidden shadow-lg h-48 bg-gradient-to-br from-green-50 to-emerald-50">
              <img
                src="https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&h=400&fit=crop"
                alt="Vegetables"
                className="w-full h-full object-cover opacity-60"
              />
              <div className="absolute inset-0 flex flex-col justify-center p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Pure Vegetables For Health
                </h3>
                {onNavigate ? (
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white w-fit"
                    onClick={(e) => {
                      e.preventDefault();
                      onNavigate('/products?category=vegetables');
                    }}
                  >
                    Buy Now
                  </Button>
                ) : (
                  <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white w-fit" asChild>
                    <Link href="/products?category=vegetables">Buy Now</Link>
                  </Button>
                )}
              </div>
            </div>

            {/* Banner 3 */}
            <div className="relative rounded-lg overflow-hidden shadow-lg h-48 bg-gradient-to-br from-pink-50 to-purple-50">
              <img
                src="https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&h=400&fit=crop"
                alt="Beauty"
                className="w-full h-full object-cover opacity-60"
              />
              <div className="absolute inset-0 flex flex-col justify-center p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Face Nourishing Beauty creams
                </h3>
                {onNavigate ? (
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white w-fit"
                    onClick={(e) => {
                      e.preventDefault();
                      onNavigate('/products');
                    }}
                  >
                    Buy Now
                  </Button>
                ) : (
                  <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white w-fit" asChild>
                    <Link href="/products">Buy Now</Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Flash Sale Section */}
      {featuredProducts.length > 0 && (
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                Super Flash Sale
              </h2>
              {onNavigate ? (
                <Button
                  variant="outline"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate('/products?on_sale=flash_sale');
                  }}
                >
                  Shop More <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button variant="outline" asChild>
                  <Link href="/products?on_sale=flash_sale">
                    Shop More <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              )}
            </div>
            <GroceryProductGrid
              products={featuredProducts.slice(0, 4)}
              columns={4}
              onProductClick={handleProductClick}
            />
          </div>
        </section>
      )}

      {/* Features Section */}
      <section className="py-16 bg-green-50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                <Leaf className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-gray-900">Handmade Products</h3>
              <p className="text-gray-600">We collect fresh natural fruits for your healthy life.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                <ShoppingCart className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-gray-900">Organic and Fresh</h3>
              <p className="text-gray-600">Our all products 100% natural and fresh.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                <Zap className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-gray-900">150+ Organic Items</h3>
              <p className="text-gray-600">We have 150+ organic food for our trusted customers.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                <Shield className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-gray-900">100% Secure Payment</h3>
              <p className="text-gray-600">We make sure our all client&apos;s payment method secure.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                <Thermometer className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-gray-900">Temperature Control</h3>
              <p className="text-gray-600">We always try to control our items for healthy.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                <Truck className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-gray-900">Super Fast Delivery</h3>
              <p className="text-gray-600">Our all delivery services fast and secure from damage.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Best Selling Products */}
      {featuredProducts.length > 0 && (
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
                Weekly Best Selling Organic Items
              </h2>
              <div className="flex justify-center gap-4 mb-8">
                <button className="px-4 py-2 bg-green-600 text-white rounded-md font-semibold">Popular</button>
                <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md font-semibold hover:bg-gray-200">Newly Added</button>
                <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md font-semibold hover:bg-gray-200">Low Price</button>
              </div>
            </div>
            <GroceryProductGrid
              products={featuredProducts.slice(0, 8)}
              columns={4}
              onProductClick={handleProductClick}
            />
            <div className="text-center mt-12">
              {onNavigate ? (
                <Button
                  variant="outline"
                  size="lg"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate('/products');
                  }}
                >
                  View All Products <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button variant="outline" size="lg" asChild>
                  <Link href="/products">
                    View All Products <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Top Rated and Top Selling Sections */}
      {featuredProducts.length > 0 && (
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Left Side - Banner */}
              <div className="relative rounded-lg overflow-hidden shadow-lg h-full min-h-[500px] bg-gradient-to-br from-green-50 to-emerald-50">
                <img
                  src="https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&h=800&fit=crop"
                  alt="Organic Vegetables"
                  className="w-full h-full object-cover opacity-70"
                />
                <div className="absolute inset-0 flex flex-col justify-center p-8 text-center">
                  <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                    Enjoy Our Organic Vegetables
                  </h2>
                  {onNavigate ? (
                    <Button
                      size="lg"
                      className="bg-green-600 hover:bg-green-700 text-white w-fit mx-auto"
                      onClick={(e) => {
                        e.preventDefault();
                        onNavigate('/products?category=vegetables');
                      }}
                    >
                      Order Now
                    </Button>
                  ) : (
                    <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white w-fit mx-auto" asChild>
                      <Link href="/products?category=vegetables">Order Now</Link>
                    </Button>
                  )}
                </div>
              </div>

              {/* Right Side - Top Rated and Top Selling */}
              <div className="space-y-8">
                {/* Top Rated */}
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Top Rated</h2>
                    <div className="flex gap-2">
                      <button className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg">
                        <ArrowRight className="h-4 w-4 text-gray-700 rotate-180" />
                      </button>
                      <button className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg">
                        <ArrowRight className="h-4 w-4 text-gray-700" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {featuredProducts.slice(0, 4).map((product: any) => (
                      <div key={product.id} className="flex gap-4 p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                        <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                          <img
                            src={product.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&h=200&fit=crop'}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-500 mb-1">{product.metadata?.category || 'Product'}</p>
                          <h3 className="font-semibold text-sm mb-1 line-clamp-2">{product.name}</h3>
                          <div className="flex items-center gap-2 mb-1">
                            <div className="flex text-yellow-400">
                              {'★'.repeat(4)}{'☆'.repeat(1)}
                            </div>
                            <span className="text-xs text-gray-500">(2)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-green-600">${product.price.toFixed(2)}</span>
                            {product.compareAtPrice && (
                              <span className="text-xs text-gray-500 line-through">${product.compareAtPrice.toFixed(2)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Selling */}
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Top Selling</h2>
                    <div className="flex gap-2">
                      <button className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg">
                        <ArrowRight className="h-4 w-4 text-gray-700 rotate-180" />
                      </button>
                      <button className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg">
                        <ArrowRight className="h-4 w-4 text-gray-700" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {featuredProducts.slice(4, 8).map((product: any) => (
                      <div key={product.id} className="flex gap-4 p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                        <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                          <img
                            src={product.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&h=200&fit=crop'}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-500 mb-1">{product.metadata?.category || 'Product'}</p>
                          <h3 className="font-semibold text-sm mb-1 line-clamp-2">{product.name}</h3>
                          <div className="flex items-center gap-2 mb-1">
                            <div className="flex text-yellow-400">
                              {'★'.repeat(4)}{'☆'.repeat(1)}
                            </div>
                            <span className="text-xs text-gray-500">(3)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-green-600">${product.price.toFixed(2)}</span>
                            {product.compareAtPrice && (
                              <span className="text-xs text-gray-500 line-through">${product.compareAtPrice.toFixed(2)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-green-600 to-emerald-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            We Make Your Daily Life More Easy
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Fresh, Affordable, and Delivered to Your Door!
          </p>
          {onNavigate ? (
            <Button
              size="lg"
              className="bg-white text-green-600 hover:bg-gray-100"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('/products');
              }}
            >
              Continue Your Shopping <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          ) : (
            <Button size="lg" className="bg-white text-green-600 hover:bg-gray-100" asChild>
              <Link href="/products">
                Continue Your Shopping <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}

export default memo(GroceryHomepage);
