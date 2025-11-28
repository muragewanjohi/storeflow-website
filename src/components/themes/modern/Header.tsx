/**
 * Modern Theme Header
 * 
 * Electronics-focused header with tech styling
 * Day 37: Theme Templates
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingCartIcon, Bars3Icon, XMarkIcon, UserIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { usePreview } from '@/lib/themes/preview-context';

export default function ModernHeader() {
  const pathname = usePathname();
  const { isPreview, onNavigate } = usePreview();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartItemCount, setCartItemCount] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

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
    { name: 'Home', href: '/' },
    { name: 'Products', href: '/products' },
    { name: 'Categories', href: '/products?category=all' },
    { name: 'Support', href: '/support' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Top Bar - Tech-focused */}
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-2 text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>Free shipping on orders over $100</span>
            <span>Tech Support: 24/7 Available</span>
          </div>
        </div>
      </div>

      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            {isPreview && onNavigate ? (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate('/');
                }}
                className="flex items-center gap-2"
              >
                <div className="h-8 w-8 rounded bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-sm">T</span>
                </div>
                <span className="text-xl font-bold">TechStore</span>
              </button>
            ) : (
              <Link href="/" className="flex items-center gap-2">
                <div className="h-8 w-8 rounded bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-sm">T</span>
                </div>
                <span className="text-xl font-bold">TechStore</span>
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

          {/* Right side - Search, Account, Cart */}
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="hidden md:block relative">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSearchOpen(!searchOpen)}
                className="relative"
              >
                <MagnifyingGlassIcon className="h-5 w-5" />
              </Button>
              {searchOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-background border rounded-lg shadow-lg p-4">
                  <Input placeholder="Search products..." className="w-full" />
                </div>
              )}
            </div>

            {/* Account */}
            {isAuthenticated ? (
              <Link href="/account">
                <Button variant="ghost" size="sm">
                  <UserIcon className="h-5 w-5 mr-2" />
                  <span className="hidden sm:inline">Account</span>
                </Button>
              </Link>
            ) : (
              isPreview && onNavigate ? (
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
              ) : (
                <Link href="/customer-login">
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </Link>
              )
            )}

            {/* Cart */}
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

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t">
            <div className="space-y-1 py-4">
              {navigation.map((item: any) => {
                if (isPreview && onNavigate) {
                  return (
                    <button
                      key={item.name}
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onNavigate(item.href);
                      }}
                      className="block w-full text-left px-3 py-2 text-base font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
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
                    className="block px-3 py-2 text-base font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}

