/**
 * HexFashion Theme Header
 * 
 * Fashion-focused minimal header
 * Day 37: Theme Templates
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingBagIcon, Bars3Icon, XMarkIcon, UserIcon, HeartIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePreview } from '@/lib/themes/preview-context';

export default function HexFashionHeader() {
  const pathname = usePathname();
  const { isPreview, onNavigate } = usePreview();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.classList.add('mobile-menu-open');
    } else {
      document.body.classList.remove('mobile-menu-open');
    }
    return () => {
      document.body.classList.remove('mobile-menu-open');
    };
  }, [mobileMenuOpen]);
  const [cartItemCount, setCartItemCount] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Skip all API calls in preview mode to prevent hanging
    if (isPreview) {
      setCartItemCount(0);
      setIsAuthenticated(false);
      return;
    }

    async function fetchCartCount() {
      try {
        const response = await fetch('/api/cart/count');
        if (response.ok) {
          const data: { count: number } = await response.json();
          setCartItemCount(data.count);
        }
      } catch {
        setCartItemCount(0);
      }
    }

    async function checkAuth() {
      try {
        const response = await fetch('/api/customers/profile');
        if (response.ok) {
          setIsAuthenticated(true);
        }
      } catch {
        setIsAuthenticated(false);
      }
    }

    checkAuth();
    fetchCartCount();
    const interval = setInterval(fetchCartCount, 120000);
    return () => clearInterval(interval);
  }, [isPreview]);

  const navigation = [
    { name: 'Shop', href: '/products', hasDropdown: true },
    { name: 'On Sale', href: '/products?sort=sale' },
    { name: 'New Arrivals', href: '/products?sort=newest' },
    { name: 'Brands', href: '/brands' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          {/* Logo - Centered */}
          <div className="flex-1 flex justify-start">
            {isPreview && onNavigate ? (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate('/');
                }}
                className="flex items-center"
              >
                <span className="text-2xl font-light tracking-wider">HEXFASHION</span>
              </button>
            ) : (
              <Link href="/" className="flex items-center">
                <span className="text-2xl font-light tracking-wider">HEXFASHION</span>
              </Link>
            )}
          </div>

          {/* Desktop Navigation - Centered */}
          <div className="hidden md:flex md:items-center md:gap-6 flex-1 justify-center">
            {navigation.map((item: any) => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));
              if (isPreview && onNavigate) {
                return (
                  <div key={item.name} className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        onNavigate(item.href);
                      }}
                      className={`text-[16px] font-normal transition-colors hover:text-black ${
                        isActive ? 'text-black' : 'text-[rgba(0,0,0,0.6)]'
                      }`}
                    >
                      {item.name}
                    </button>
                    {item.hasDropdown && (
                      <ChevronRightIcon className="w-4 h-4 rotate-[-90deg] text-[rgba(0,0,0,0.6)]" />
                    )}
                  </div>
                );
              }
              return (
                <div key={item.name} className="flex items-center gap-1">
                  <Link
                    href={item.href}
                    className={`text-[16px] font-normal transition-colors hover:text-black ${
                      isActive ? 'text-black' : 'text-[rgba(0,0,0,0.6)]'
                    }`}
                  >
                    {item.name}
                  </Link>
                  {item.hasDropdown && (
                    <ChevronRightIcon className="w-4 h-4 rotate-[-90deg] text-[rgba(0,0,0,0.6)]" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Right side - Account, Wishlist, Cart */}
          <div className="flex items-center gap-4 flex-1 justify-end">
            {/* Account */}
            {isAuthenticated ? (
              <Link href="/account">
                <Button variant="ghost" size="sm" className="hidden sm:flex">
                  <UserIcon className="h-5 w-5" />
                </Button>
              </Link>
            ) : (
              isPreview && onNavigate ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="hidden sm:flex"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate('/customer-login');
                  }}
                >
                  Sign In
                </Button>
              ) : (
                <Link href="/customer-login">
                  <Button variant="ghost" size="sm" className="hidden sm:flex">
                    Sign In
                  </Button>
                </Link>
              )
            )}

            {/* Wishlist */}
            <Button variant="ghost" size="icon" className="hidden sm:flex">
              <HeartIcon className="h-5 w-5" />
            </Button>

            {/* Cart */}
            {isPreview ? (
              <Button variant="ghost" size="icon" className="relative" title="Cart (Preview Mode)">
                <ShoppingBagIcon className="h-6 w-6" />
                {cartItemCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full p-0 text-xs"
                  >
                    {cartItemCount > 99 ? '99+' : cartItemCount}
                  </Badge>
                )}
              </Button>
            ) : (
              <Link href="/cart">
                <Button variant="ghost" size="icon" className="relative">
                  <ShoppingBagIcon className="h-6 w-6" />
                  {cartItemCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full p-0 text-xs"
                    >
                      {cartItemCount > 99 ? '99+' : cartItemCount}
                    </Badge>
                  )}
                </Button>
              </Link>
            )}

            {/* Mobile menu */}
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
            </Button>
          </div>
        </div>

        {/* Mobile Menu Overlay & Drawer */}
        {mobileMenuOpen && (
          <>
            {/* Dark Overlay - 20% opacity matching Figma */}
            <div
              className="fixed inset-0 bg-[rgba(0,0,0,0.2)] z-40 md:hidden"
              onClick={() => setMobileMenuOpen(false)}
              aria-hidden="true"
            />
            
            {/* Mobile Menu Drawer - Slides up from bottom */}
            <div className="fixed bottom-0 left-0 right-0 bg-white rounded-tl-[20px] rounded-tr-[20px] z-50 md:hidden max-h-[80vh] overflow-y-auto mobile-menu-drawer">
              <div className="px-[19px] py-5">
                {/* Drawer Header */}
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-[20px] font-bold text-black">Menu</h2>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    aria-label="Close menu"
                  >
                    <XMarkIcon className="w-6 h-6 text-black" />
                  </button>
                </div>
                
                {/* Divider */}
                <div className="h-px bg-[rgba(0,0,0,0.1)] mb-6" />
                
                {/* Navigation Links */}
                <div className="space-y-5">
                  {navigation.map((item: any) => {
                    if (isPreview && onNavigate) {
                      return (
                        <button
                          key={item.name}
                          onClick={() => {
                            setMobileMenuOpen(false);
                            onNavigate(item.href);
                          }}
                          className="w-full flex items-center justify-between text-[16px] text-[rgba(0,0,0,0.6)] hover:text-black transition-colors"
                        >
                          <span>{item.name}</span>
                          {item.hasDropdown && (
                            <ChevronRightIcon className="w-4 h-4 rotate-[-90deg]" />
                          )}
                        </button>
                      );
                    }
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className="w-full flex items-center justify-between text-[16px] text-[rgba(0,0,0,0.6)] hover:text-black transition-colors"
                      >
                        <span>{item.name}</span>
                        {item.hasDropdown && (
                          <ChevronRightIcon className="w-4 h-4 rotate-[-90deg]" />
                        )}
                      </Link>
                    );
                  })}
                </div>
                
                {/* Account Section */}
                <div className="mt-8 pt-6 border-t border-[rgba(0,0,0,0.1)]">
                  {isAuthenticated ? (
                    <div className="space-y-3">
                      <Link
                        href="/account"
                        onClick={() => setMobileMenuOpen(false)}
                        className="block text-[16px] text-[rgba(0,0,0,0.6)] hover:text-black transition-colors"
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
                              window.location.href = '/';
                            }
                          } catch (error) {
                            console.error('Error logging out:', error);
                          }
                        }}
                        className="block w-full text-left text-[16px] text-[rgba(0,0,0,0.6)] hover:text-black transition-colors"
                      >
                        Sign Out
                      </button>
                    </div>
                  ) : (
                    <Link
                      href="/customer-login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block text-[16px] text-[rgba(0,0,0,0.6)] hover:text-black transition-colors"
                    >
                      Sign In
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </nav>
    </header>
  );
}

