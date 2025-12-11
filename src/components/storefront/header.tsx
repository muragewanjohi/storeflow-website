/**
 * Storefront Header Component
 * 
 * Header for customer-facing storefront pages with navigation and cart icon
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ShoppingCartIcon, Bars3Icon, XMarkIcon, UserIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  const { isPreview, onNavigate } = usePreview();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartItemCount, setCartItemCount] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Prevent hydration mismatch by only showing logo after mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

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
      
      try {
        const response = await fetch('/api/cart/count', {
          signal: abortController.signal,
          // Use cache for better performance - 10 seconds cache
          cache: 'default',
          next: { revalidate: 10 },
        });
        
        if (response.ok && isMounted) {
          const data: { count: number } = await response.json();
          setCartItemCount(data.count);
        }
      } catch (error: any) {
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
      
      try {
        const response = await fetch('/api/customers/profile', {
          cache: 'default',
          next: { revalidate: 60 }, // Cache for 60 seconds
          // Suppress error logging for 401 (unauthorized) - this is expected for unauthenticated users
        });
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
    const handleCartUpdate = () => {
      if (isMounted) {
        fetchCartCount();
      }
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

  const navigation = [
    { name: 'Home', href: '/' },
    { name: 'Products', href: '/products' },
    { name: 'About', href: '/about' },
    { name: 'Contact', href: '/contact' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3 md:gap-4" suppressHydrationWarning>
            {isPreview && onNavigate ? (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate('/');
                }}
                className="flex items-center gap-3 md:gap-4"
              >
                {isMounted && storeLogo && !logoError ? (
                  <img 
                    src={storeLogo} 
                    alt={storeName}
                    className="h-10 md:h-12 w-auto object-contain max-w-[180px] md:max-w-[240px]"
                    onError={() => setLogoError(true)}
                  />
                ) : null}
                <span className="text-lg md:text-xl font-bold" suppressHydrationWarning>
                  {storeName}
                </span>
              </button>
            ) : (
              <Link href="/" className="flex items-center gap-3 md:gap-4">
                {isMounted && storeLogo && !logoError ? (
                  <img 
                    src={storeLogo} 
                    alt={storeName}
                    className="h-10 md:h-12 w-auto object-contain max-w-[180px] md:max-w-[240px]"
                    onError={() => setLogoError(true)}
                  />
                ) : null}
                <span className="text-lg md:text-xl font-bold" suppressHydrationWarning>
                  {storeName}
                </span>
              </Link>
            )}
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:gap-6">
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
                    className={`text-sm font-medium transition-colors hover:text-primary ${
                      isActive ? 'text-primary' : 'text-muted-foreground'
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
                  className={`text-sm font-medium transition-colors hover:text-primary ${
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}
          </div>

          {/* Right side - Account, Cart and Mobile Menu */}
          <div className="flex items-center gap-2">
            {/* Account / Login */}
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <Link href="/account">
                  <Button variant="ghost" size="sm">
                    <UserIcon className="h-5 w-5 mr-2" />
                    <span className="hidden sm:inline">Account</span>
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    try {
                      const response = await fetch('/api/customers/auth/logout', {
                        method: 'POST',
                      });
                      if (response.ok) {
                        router.push('/');
                        router.refresh();
                        setIsAuthenticated(false);
                      }
                    } catch (error) {
                      console.error('Error logging out:', error);
                    }
                  }}
                  className="hidden sm:inline-flex"
                >
                  Sign Out
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {isPreview && onNavigate ? (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        onNavigate('/customer-login');
                      }}
                    >
                      Sign In
                    </Button>
                    <Button
                      size="sm"
                      className="hidden sm:inline-flex"
                      onClick={(e) => {
                        e.preventDefault();
                        // Sign up could also navigate to sign-in in preview
                        onNavigate('/customer-login');
                      }}
                    >
                      Sign Up
                    </Button>
                  </>
                ) : (
                  <>
                    <Link href="/customer-login">
                      <Button variant="ghost" size="sm">
                        Sign In
                      </Button>
                    </Link>
                    <Link href="/customer-register">
                      <Button size="sm" className="hidden sm:inline-flex">
                        Sign Up
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            )}

            {/* Cart Icon */}
            {isPreview ? (
              <Button variant="ghost" size="icon" className="relative" title="Cart (Preview Mode)">
                <ShoppingCartIcon className="h-6 w-6" />
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
                <Button variant="ghost" size="icon" className="relative">
                  <ShoppingCartIcon className="h-6 w-6" />
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
                  <>
                    <Link
                      href="/account"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-3 py-2 text-base font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      My Account
                    </Link>
                    <button
                      onClick={async () => {
                        try {
                          const response = await fetch('/api/customers/auth/logout', {
                            method: 'POST',
                          });
                          if (response.ok) {
                            setMobileMenuOpen(false);
                            router.push('/');
                            router.refresh();
                            setIsAuthenticated(false);
                          }
                        } catch (error) {
                          console.error('Error logging out:', error);
                        }
                      }}
                      className="block w-full text-left px-3 py-2 text-base font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/customer-login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-3 py-2 text-base font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/customer-register"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-3 py-2 text-base font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      Sign Up
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}

