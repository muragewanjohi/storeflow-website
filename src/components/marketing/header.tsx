/**
 * Marketing Site Header
 * 
 * Simple header for marketing pages (help, pricing, etc.)
 */

'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function MarketingHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold">DukaNest</span>
          </Link>
          
          <div className="flex items-center gap-6">
            <Link href="/pricing" className="text-sm font-medium hover:text-primary transition-colors">
              Pricing
            </Link>
            <Link href="/help" className="text-sm font-medium hover:text-primary transition-colors">
              Help
            </Link>
            <Button asChild variant="outline" size="sm">
              <Link href="/register">Get Started</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/admin/login">Login</Link>
            </Button>
          </div>
        </div>
      </nav>
    </header>
  );
}

