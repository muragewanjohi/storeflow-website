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
import { ShoppingBagIcon, Bars3Icon, XMarkIcon, UserIcon, HeartIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function HexFashionHeader() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartItemCount, setCartItemCount] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
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
  }, []);

  const navigation = [
    { name: 'Home', href: '/' },
    { name: 'New Arrivals', href: '/products?sort=newest' },
    { name: 'Collections', href: '/products?category=all' },
    { name: 'About', href: '/about' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          {/* Logo - Centered */}
          <div className="flex-1 flex justify-start">
            <Link href="/" className="flex items-center">
              <span className="text-2xl font-light tracking-wider">HEXFASHION</span>
            </Link>
          </div>

          {/* Desktop Navigation - Centered */}
          <div className="hidden md:flex md:items-center md:gap-8 flex-1 justify-center">
            {navigation.map((item: any) => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`text-sm font-light tracking-wide transition-colors hover:text-primary uppercase ${
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  {item.name}
                </Link>
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
              <Link href="/customer-login">
                <Button variant="ghost" size="sm" className="hidden sm:flex">
                  Sign In
                </Button>
              </Link>
            )}

            {/* Wishlist */}
            <Button variant="ghost" size="icon" className="hidden sm:flex">
              <HeartIcon className="h-5 w-5" />
            </Button>

            {/* Cart */}
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
              {navigation.map((item: any) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 text-base font-light text-muted-foreground hover:bg-muted hover:text-foreground uppercase"
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}

