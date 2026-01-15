/**
 * Storefront Header Component
 * 
 * Header for customer-facing storefront pages with navigation and cart icon
 */

'use client';

import { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ShoppingCartIcon, Bars3Icon, XMarkIcon, UserIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { usePreview } from '@/lib/themes/preview-context';

interface StorefrontHeaderProps {
  storeName?: string;
  storeLogo?: string | null;
}

export default function StorefrontHeader({ 
  storeName = 'DukaNest',
  storeLogo = null 
}: StorefrontHeaderProps = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { isPreview, onNavigate } = usePreview();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartItemCount, setCartItemCount] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Removed debug logging

  // Initialize search query from URL params (if on products page)
  useEffect(() => {
    if (!isPreview && pathname === '/products') {
      const urlParams = new URLSearchParams(window.location.search);
      const searchParam = urlParams.get('search');
      if (searchParam) {
        setSearchQuery(searchParam);
      }
    }
  }, [pathname, isPreview]);

  // Fetch cart item count using lightweight endpoint
  // Optimized: Only fetch when needed, use event-driven updates, reduce redundant calls
  // Skip API calls in preview mode to prevent hanging
  useEffect(() => {
    // Skip all API calls in preview mode
    if (isPreview) {
      setCartItemCount(0);
      setIsAuthenticated(false);
      return;
    }

    let isMounted = true;
    let abortController: AbortController | null = null;
    let authChecked = false;

    async function fetchCartCount() {
      // Cancel previous request if still pending
      if (abortController) {
        abortController.abort();
      }
      
      abortController = new AbortController();
      
      // Add timeout
      const timeoutId = setTimeout(() => abortController?.abort(), 3000); // 3 second timeout
      
      try {
        const response = await fetch('/api/cart/count', {
          signal: abortController.signal,
          // Use cache for better performance - 10 seconds cache
          cache: 'default',
          next: { revalidate: 10 },
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok && isMounted) {
          const data: { count: number } = await response.json();
          setCartItemCount(data.count);
        }
      } catch (error: any) {
        clearTimeout(timeoutId);
        // Silently fail - user might not be authenticated or request was aborted
        if (error.name !== 'AbortError' && isMounted) {
          setCartItemCount(0);
        }
      }
    }

    // Check authentication status - only once on mount
    async function checkAuth() {
      if (authChecked) return;
      authChecked = true;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
      
      try {
        const response = await fetch('/api/customers/profile', {
          signal: controller.signal,
          cache: 'default',
          next: { revalidate: 60 }, // Cache for 60 seconds
          // Suppress error logging for 401 (unauthorized) - this is expected for unauthenticated users
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok && isMounted) {
          setIsAuthenticated(true);
        } else {
          // 401 is expected for unauthenticated users - don't treat as error
          // Only set to false if component is still mounted
          if (isMounted) {
            setIsAuthenticated(false);
          }
        }
      } catch (error: any) {
        clearTimeout(timeoutId);
        // Silently handle errors - user might not be authenticated
        // Don't log 401 errors as they're expected for unauthenticated users
        if (isMounted && error.name !== 'AbortError') {
          setIsAuthenticated(false);
        }
      }
    }

    // Check auth only once on mount
    checkAuth();

    // Initial fetch - debounced to avoid multiple simultaneous calls
    const timeoutId = setTimeout(() => {
      if (isMounted) {
        fetchCartCount();
      }
    }, 100);
    
    // Listen for cart updates from other components (real-time updates)
    // Fetch immediately with no cache to get fresh count
    const handleCartUpdate = () => {
      if (!isMounted) return;
      
      // Cancel any pending request
      if (abortController) {
        abortController.abort();
      }
      
      // Immediate update with optimistic increment, then verify
      // Optimistically increment the count for immediate UI feedback
      setCartItemCount(prev => prev + 1);
      
      // Then verify with server after a short delay
      setTimeout(() => {
        if (!isMounted) return;
        
        const updateController = new AbortController();
        const timeoutId = setTimeout(() => updateController.abort(), 3000);
        
        // Fetch immediately with no cache for real-time update
        fetch('/api/cart/count', {
          cache: 'no-store',
          signal: updateController.signal,
          headers: {
            'Cache-Control': 'no-cache',
          },
        })
          .then(res => {
            clearTimeout(timeoutId);
            if (res.ok && isMounted) {
              return res.json();
            }
            return null;
          })
          .then(data => {
            if (data && isMounted) {
              setCartItemCount(data.count || 0);
            }
          })
          .catch((error: any) => {
            clearTimeout(timeoutId);
            // Silently fail if aborted or network error
            if (error.name !== 'AbortError' && isMounted) {
              // Only log non-abort errors
              console.debug('Cart count update failed:', error);
            }
          });
      }, 100); // Reduced delay for faster verification
    };
    
    window.addEventListener('cartUpdated', handleCartUpdate);
    
    // Only poll every 120 seconds (reduced from 60) - most updates happen via events
    const interval = setInterval(() => {
      if (isMounted) {
        fetchCartCount();
      }
    }, 120000); // 2 minutes
    
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      clearInterval(interval);
      window.removeEventListener('cartUpdated', handleCartUpdate);
      if (abortController) {
        abortController.abort();
      }
    };
  }, [isPreview]);

  // Ecommerce storefront navigation
  // Popular e-commerce stores (Amazon, Target, Best Buy, etc.) typically include "Deals" or "Sales" 
  // in their main navigation to make promotions easily discoverable
  const navigation = [
    { name: 'Home', href: '/' },
    { name: 'Products', href: '/products' },
    { name: 'Sales', href: '/sales' },
    { name: 'About Us', href: '/about' },
    { name: 'Contact Us', href: '/contact' },
    { name: 'Blogs', href: '/blog' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white">
      <nav className="container mx-auto px-2 sm:px-4 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          {/* Best practice: Very tight spacing (4px) between logo and brand name for unified brand identity */}
          <div className="flex items-center gap-1" suppressHydrationWarning>
            {isPreview && onNavigate ? (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate('/');
                }}
                className="flex items-center gap-1"
              >
                {storeLogo && (
                  <img 
                    src={storeLogo} 
                    alt={storeName}
                    className="h-10 w-auto sm:h-12 md:h-16 object-contain max-w-[120px] sm:max-w-[180px] md:max-w-[300px]"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                )}
                <span className="text-lg md:text-xl font-bold text-primary hover:text-accent transition-colors">
                  {storeName}
                </span>
              </button>
            ) : (
              <Link href="/" className="flex items-center gap-1">
                {storeLogo && (
                  <img 
                    src={storeLogo} 
                    alt={storeName}
                    className="h-10 w-auto sm:h-12 md:h-16 object-contain max-w-[120px] sm:max-w-[180px] md:max-w-[300px]"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                )}
                <span className="text-lg md:text-xl font-bold text-primary hover:text-accent transition-colors">
                  {storeName}
                </span>
              </Link>
            )}
          </div>

          {/* Desktop Navigation & Search */}
          <div className="hidden md:flex md:items-center md:flex-1 md:justify-center md:gap-8 md:max-w-2xl md:mx-8">
            {/* Navigation Links */}
            <div className="flex items-center gap-6">
              {navigation.map((item: any) => {
                const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));
                if (isPreview && onNavigate) {
                  return (
                    <button
                      key={item.name}
                      onClick={(e) => {
                        e.preventDefault();
                        onNavigate(item.href);
                      }}
                      className={`text-sm font-medium transition-colors ${
                        isActive ? 'text-accent' : 'text-primary hover:text-accent'
                      }`}
                    >
                      {item.name}
                    </button>
                  );
                }
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`text-sm font-medium transition-colors ${
                      isActive ? 'text-accent' : 'text-primary hover:text-accent'
                    }`}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </div>
            
            {/* Search Bar */}
            <form
              className="flex-1 max-w-md"
              onSubmit={(e) => {
                e.preventDefault();
                if (searchQuery.trim()) {
                  if (isPreview && onNavigate) {
                    onNavigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
                  } else {
                    router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
                  }
                }
              }}
            >
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 focus-visible:!border-primary focus-visible:!ring-primary"
                />
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
            </form>
          </div>

          {/* Right side - Account, Cart and Mobile Menu */}
          <div className="flex items-center gap-2">
            {/* Account / Login */}
            {isAuthenticated ? (
              <Link href="/account">
                <Button variant="ghost" size="sm" className="text-primary hover:text-accent transition-colors">
                  <UserIcon className="h-5 w-5 mr-2" />
                  <span className="hidden sm:inline">Account</span>
                </Button>
              </Link>
            ) : (
              <div className="flex items-center gap-2">
                {isPreview && onNavigate ? (
                  <Button
                    size="sm"
                    variant="default"
                    className="bg-primary text-primary-foreground hover:bg-accent transition-colors"
                    onClick={(e) => {
                      e.preventDefault();
                      onNavigate('/customer-login');
                    }}
                  >
                    Login
                  </Button>
                ) : (
                  <Link href="/customer-login">
                    <Button 
                      size="sm" 
                      variant="default"
                      className="bg-primary text-primary-foreground hover:bg-accent transition-colors"
                    >
                      Login
                    </Button>
                  </Link>
                )}
              </div>
            )}

            {/* Cart Icon */}
            {isPreview ? (
              <Button variant="ghost" size="icon" className="relative group" title="Cart (Preview Mode)">
                <ShoppingCartIcon className="h-6 w-6 text-primary transition-all duration-300 group-hover:scale-110" />
                {cartItemCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full p-0 text-xs"
                  >
                    {cartItemCount > 99 ? '99+' : cartItemCount}
                  </Badge>
                )}
                <span className="sr-only">Shopping cart</span>
              </Button>
            ) : (
              <Link href="/cart">
                <Button variant="ghost" size="icon" className="relative group">
                  <ShoppingCartIcon className="h-6 w-6 text-primary transition-all duration-300 group-hover:scale-110" />
                  {cartItemCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full p-0 text-xs"
                    >
                      {cartItemCount > 99 ? '99+' : cartItemCount}
                    </Badge>
                  )}
                  <span className="sr-only">Shopping cart</span>
                </Button>
              </Link>
            )}

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <XMarkIcon className="h-6 w-6" />
              ) : (
                <Bars3Icon className="h-6 w-6" />
              )}
              <span className="sr-only">Toggle menu</span>
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden">
            <div className="space-y-1 border-t pb-3 pt-4">
              {/* Mobile Search */}
              <div className="px-3 pb-3">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (searchQuery.trim()) {
                      setMobileMenuOpen(false);
                      if (isPreview && onNavigate) {
                        onNavigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
                      } else {
                        router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
                      }
                    }
                  }}
                >
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="Search products..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 focus-visible:!border-primary focus-visible:!ring-primary"
                    />
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </div>
                </form>
              </div>
              
              {navigation.map((item: any) => {
                const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));
                if (isPreview && onNavigate) {
                  return (
                    <button
                      key={item.name}
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onNavigate(item.href);
                      }}
                      className={`block w-full text-left px-3 py-2 text-base font-medium transition-colors ${
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      {item.name}
                    </button>
                  );
                }
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block px-3 py-2 text-base font-medium transition-colors ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    {item.name}
                  </Link>
                );
              })}
              <div className="border-t mt-2 pt-2">
                {isAuthenticated ? (
                  <Link
                    href="/account"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 text-base font-medium text-primary hover:bg-muted hover:text-accent transition-colors"
                  >
                    My Account
                  </Link>
                ) : (
                  <Link
                    href="/customer-login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 text-base font-medium text-primary hover:bg-muted hover:text-accent transition-colors"
                  >
                    Login
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}

