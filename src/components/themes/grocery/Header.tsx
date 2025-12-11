/**
 * Grocery Theme Header
 * 
 * Header matching the reference grocery site with utility bar, search, and navigation
 */

'use client';

import Link from 'next/link';
import { ShoppingCartIcon, HeartIcon, UserIcon, MagnifyingGlassIcon, PhoneIcon, EnvelopeIcon, GlobeAltIcon } from '@heroicons/react/24/outline';
import { usePreview } from '@/lib/themes/preview-context';

export default function GroceryHeader() {
  const { isPreview, onNavigate } = usePreview();

  const handleLink = (url: string, e: React.MouseEvent) => {
    if (isPreview && onNavigate) {
      e.preventDefault();
      onNavigate(url);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm">
      {/* Utility Bar */}
      <div className="bg-gray-800 text-white text-sm py-2">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <PhoneIcon className="h-4 w-4" />
                <span>24/7 Hours Support</span>
              </div>
              <div className="flex items-center gap-2">
                <EnvelopeIcon className="h-4 w-4" />
                <span>support@grocery.com</span>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-4">
              <span>Get up to 50% off using <strong>*8EA70*</strong> this coupon code</span>
              <div className="flex items-center gap-2">
                <GlobeAltIcon className="h-4 w-4" />
                <span>English</span>
              </div>
              <div className="flex items-center gap-2">
                <span>$ USD</span>
              </div>
              {isPreview && onNavigate ? (
                <button
                  onClick={(e) => handleLink('/customer/dashboard', e)}
                  className="flex items-center gap-2 hover:text-green-400 transition-colors"
                >
                  <UserIcon className="h-4 w-4" />
                  <span>My Account</span>
                </button>
              ) : (
                <Link href="/customer/dashboard" className="flex items-center gap-2 hover:text-green-400 transition-colors">
                  <UserIcon className="h-4 w-4" />
                  <span>My Account</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Logo */}
            <div className="flex items-center">
              {isPreview && onNavigate ? (
                <button
                  onClick={(e) => handleLink('/', e)}
                  className="flex items-center gap-2 text-2xl font-bold text-green-600 hover:text-green-700 transition-colors"
                >
                  <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                    <span className="text-white text-xl">🛒</span>
                  </div>
                  <span>Grocery</span>
                </button>
              ) : (
                <Link href="/" className="flex items-center gap-2 text-2xl font-bold text-green-600 hover:text-green-700 transition-colors">
                  <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                    <span className="text-white text-xl">🛒</span>
                  </div>
                  <span>Grocery</span>
                </Link>
              )}
            </div>

            {/* Search Bar */}
            <div className="flex-1 max-w-2xl hidden md:flex">
              <div className="w-full flex">
                <select className="px-4 py-2 bg-gray-100 border border-gray-300 rounded-l-lg text-sm focus:outline-none">
                  <option>All Categories</option>
                </select>
                <input
                  type="text"
                  placeholder="I'm searching for..."
                  className="flex-1 px-4 py-2 border border-gray-300 border-l-0 focus:outline-none focus:border-green-500"
                />
                <button className="px-6 py-2 bg-green-600 text-white rounded-r-lg hover:bg-green-700 transition-colors">
                  <MagnifyingGlassIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4">
              {isPreview && onNavigate ? (
                <>
                  <button
                    onClick={(e) => handleLink('/customer/wishlist', e)}
                    className="flex flex-col items-center gap-1 text-gray-700 hover:text-green-600 transition-colors"
                  >
                    <HeartIcon className="h-6 w-6" />
                    <span className="text-xs">Wishlist</span>
                    <span className="text-xs text-green-600">0</span>
                  </button>
                  <button
                    onClick={(e) => handleLink('/cart', e)}
                    className="flex flex-col items-center gap-1 text-gray-700 hover:text-green-600 transition-colors relative"
                  >
                    <ShoppingCartIcon className="h-6 w-6" />
                    <span className="text-xs">Cart</span>
                    <span className="text-xs text-green-600">0</span>
                  </button>
                </>
              ) : (
                <>
                  <Link href="/customer/wishlist" className="flex flex-col items-center gap-1 text-gray-700 hover:text-green-600 transition-colors">
                    <HeartIcon className="h-6 w-6" />
                    <span className="text-xs">Wishlist</span>
                    <span className="text-xs text-green-600">0</span>
                  </Link>
                  <Link href="/cart" className="flex flex-col items-center gap-1 text-gray-700 hover:text-green-600 transition-colors">
                    <ShoppingCartIcon className="h-6 w-6" />
                    <span className="text-xs">Cart</span>
                    <span className="text-xs text-green-600">0</span>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Bar */}
      <div className="bg-green-700 text-white">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-6">
            <button className="px-4 py-3 bg-green-800 hover:bg-green-900 transition-colors font-semibold flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              Browse All Categories
            </button>
            <nav className="flex items-center gap-6">
              {isPreview && onNavigate ? (
                <>
                  <button onClick={(e) => handleLink('/', e)} className="py-3 hover:text-green-200 transition-colors font-medium">Home</button>
                  <button onClick={(e) => handleLink('/products', e)} className="py-3 hover:text-green-200 transition-colors font-medium">Shop</button>
                  <button onClick={(e) => handleLink('/about', e)} className="py-3 hover:text-green-200 transition-colors font-medium">About Us</button>
                  <button onClick={(e) => handleLink('/blog', e)} className="py-3 hover:text-green-200 transition-colors font-medium">Blog</button>
                  <button onClick={(e) => handleLink('/contact', e)} className="py-3 hover:text-green-200 transition-colors font-medium">Contact</button>
                </>
              ) : (
                <>
                  <Link href="/" className="py-3 hover:text-green-200 transition-colors font-medium">Home</Link>
                  <Link href="/products" className="py-3 hover:text-green-200 transition-colors font-medium">Shop</Link>
                  <Link href="/about" className="py-3 hover:text-green-200 transition-colors font-medium">About Us</Link>
                  <Link href="/blog" className="py-3 hover:text-green-200 transition-colors font-medium">Blog</Link>
                  <Link href="/contact" className="py-3 hover:text-green-200 transition-colors font-medium">Contact</Link>
                </>
              )}
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}
