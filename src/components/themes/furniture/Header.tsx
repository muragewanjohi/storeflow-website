/**
 * Furniture Theme Header
 * 
 * Header component matching Figma design for Furniro furniture theme
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MagnifyingGlassIcon, HeartIcon, ShoppingCartIcon, UserIcon } from '@heroicons/react/24/outline';
import { usePreview } from '@/lib/themes/preview-context';

export default function FurnitureHeader() {
  const pathname = usePathname();
  const { isPreview, onNavigate } = usePreview();
  const [cartItemCount, setCartItemCount] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
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
      } catch (error) {
        console.error('Error fetching cart count:', error);
      }
    }

    async function checkAuth() {
      try {
        const response = await fetch('/api/auth/me');
        setIsAuthenticated(response.ok);
      } catch (error) {
        setIsAuthenticated(false);
      }
    }

    fetchCartCount();
    checkAuth();

    // Listen for cart updates
    const handleCartUpdate = () => {
      fetchCartCount();
    };
    window.addEventListener('cartUpdated', handleCartUpdate);

    return () => {
      window.removeEventListener('cartUpdated', handleCartUpdate);
    };
  }, [isPreview]);

  const navigation = [
    { name: 'Home', href: '/' },
    { name: 'Shop', href: '/products' },
    { name: 'About', href: '/about' },
    { name: 'Contact', href: '/contact' },
  ];

  return (
    <header className="furniture-header bg-white">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-[100px]">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-[50px] h-[32px] flex items-center justify-center">
              <svg width="50" height="32" viewBox="0 0 50 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M25 0L50 32H0L25 0Z" fill="var(--color-primary)"/>
              </svg>
            </div>
            <span className="text-[34px] font-bold text-black" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              Furniro
            </span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navigation.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));
              if (isPreview && onNavigate) {
                return (
                  <button
                    key={item.name}
                    onClick={(e) => {
                      e.preventDefault();
                      onNavigate(item.href);
                    }}
                    className={`text-[16px] font-medium transition-colors ${
                      isActive ? 'text-black' : 'text-black hover:text-[var(--color-primary)]'
                    }`}
                    style={{ fontFamily: 'Poppins, sans-serif' }}
                  >
                    {item.name}
                  </button>
                );
              }
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`text-[16px] font-medium transition-colors ${
                    isActive ? 'text-black' : 'text-black hover:text-[var(--color-primary)]'
                  }`}
                  style={{ fontFamily: 'Poppins, sans-serif' }}
                >
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Icons */}
          <div className="flex items-center gap-6">
            <Link
              href={isAuthenticated ? '/dashboard' : '/customer-login'}
              className="p-2 hover:opacity-70 transition-opacity"
              aria-label="Account"
            >
              <UserIcon className="w-6 h-6 text-black" />
            </Link>
            <button
              className="p-2 hover:opacity-70 transition-opacity"
              aria-label="Search"
            >
              <MagnifyingGlassIcon className="w-6 h-6 text-black" />
            </button>
            <button
              className="p-2 hover:opacity-70 transition-opacity relative"
              aria-label="Wishlist"
            >
              <HeartIcon className="w-6 h-6 text-black" />
            </button>
            <Link
              href="/cart"
              className="p-2 hover:opacity-70 transition-opacity relative"
              aria-label="Shopping Cart"
            >
              <ShoppingCartIcon className="w-6 h-6 text-black" />
              {cartItemCount > 0 && (
                <span className="absolute top-0 right-0 bg-[var(--color-primary)] text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {cartItemCount > 9 ? '9+' : cartItemCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

