'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import { ImageWithFallback } from './image-with-fallback';

export function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center space-x-2">
            <ImageWithFallback
              src="/logo_with_name.png"
              alt="DukaNest"
              className="h-12 md:h-14 w-auto object-contain"
            />
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="#home" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Home
            </Link>
            <Link href="#shops" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Shops
            </Link>
            <Link href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </Link>
            <Link href="#themes" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Templates
            </Link>
            <Link href="#blog" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Blog
            </Link>
            <Link href="#contact" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Contact
            </Link>
            <Button asChild>
              <Link href="/customer-login">Login</Link>
            </Button>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 space-y-4">
            <Link href="#home" className="block text-sm font-medium text-muted-foreground hover:text-foreground">
              Home
            </Link>
            <Link href="#shops" className="block text-sm font-medium text-muted-foreground hover:text-foreground">
              Shops
            </Link>
            <Link href="#pricing" className="block text-sm font-medium text-muted-foreground hover:text-foreground">
              Pricing
            </Link>
            <Link href="#themes" className="block text-sm font-medium text-muted-foreground hover:text-foreground">
              Templates
            </Link>
            <Link href="#blog" className="block text-sm font-medium text-muted-foreground hover:text-foreground">
              Blog
            </Link>
            <Link href="#contact" className="block text-sm font-medium text-muted-foreground hover:text-foreground">
              Contact
            </Link>
            <Button asChild className="w-full">
              <Link href="/customer-login">Login</Link>
            </Button>
          </div>
        )}
      </div>
    </nav>
  );
}
