/**
 * Minimal Theme Header
 * 
 * Ultra-minimal header with clean lines
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingBagIcon, Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePreview } from '@/lib/themes/preview-context';

export default function MinimalHeader() {
  const pathname = usePathname();
  const { isPreview, onNavigate } = usePreview();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartItemCount, setCartItemCount] = useState(0);

  useEffect(() => {
    // Skip all API calls in preview mode to prevent hanging
    if (isPreview) {
      setCartItemCount(0);
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

    fetchCartCount();
    const interval = setInterval(fetchCartCount, 120000);
    return () => clearInterval(interval);
  }, [isPreview]);

  const navigation = [
    { name: 'Home', href: '/' },
    { name: 'Products', href: '/products' },
    { name: 'About', href: '/about' },
    { name: 'Contact', href: '/contact' },
  ];

  return (
    <header className="border-b border-border/40 bg-background">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          {/* Logo - Minimal */}
          <div className="flex items-center">
            {isPreview && onNavigate ? (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate('/');
                }}
                className="flex items-center"
              >
                <span className="text-2xl font-light tracking-widest">STORE</span>
              </button>
            ) : (
              <Link href="/" className="flex items-center">
                <span className="text-2xl font-light tracking-widest">STORE</span>
              </Link>
            )}
          </div>

          {/* Desktop Navigation - Minimal spacing */}
          <div className="hidden md:flex md:items-center md:gap-12">
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
                    className={`text-xs font-light tracking-widest uppercase transition-colors ${
                      isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
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
                  className={`text-xs font-light tracking-widest uppercase transition-colors ${
                    isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}
          </div>

          {/* Right side - Cart only */}
          <div className="flex items-center gap-2">
            {isPreview ? (
              <Button variant="ghost" size="icon" className="relative" title="Cart (Preview Mode)">
                <ShoppingBagIcon className="h-5 w-5" />
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
                  <ShoppingBagIcon className="h-5 w-5" />
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
                      className="block w-full text-left px-3 py-2 text-xs font-light tracking-widest uppercase text-muted-foreground hover:bg-muted hover:text-foreground"
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
                    className="block px-3 py-2 text-xs font-light tracking-widest uppercase text-muted-foreground hover:bg-muted hover:text-foreground"
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

