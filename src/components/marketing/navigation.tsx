'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Menu, X, ChevronDown, BookOpen, WalletCards } from 'lucide-react';
import { ImageWithFallback } from './image-with-fallback';

export function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const resourcesRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (resourcesRef.current && !resourcesRef.current.contains(event.target as Node)) {
        setResourcesOpen(false);
      }
    };

    if (resourcesOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [resourcesOpen]);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#0025cc]/10 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
            <Link href="/#home" className="text-sm font-medium text-[#0c0528] hover:text-[#0025cc] transition-colors">
              Home
            </Link>
            <Link href="/#pricing" className="text-sm font-medium text-[#0c0528] hover:text-[#0025cc] transition-colors">
              Pricing
            </Link>
            <Link href="/#themes" className="text-sm font-medium text-[#0c0528] hover:text-[#0025cc] transition-colors">
              Themes
            </Link>
            
            {/* Resources Dropdown */}
            <div className="relative" ref={resourcesRef}>
              <button
                onClick={() => setResourcesOpen(!resourcesOpen)}
                className="text-sm font-medium text-[#0c0528] hover:text-[#0025cc] transition-colors flex items-center gap-1"
              >
                Resources
                <ChevronDown className={`w-4 h-4 transition-transform ${resourcesOpen ? 'rotate-180' : ''}`} />
              </button>
              {resourcesOpen && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  <Link
                    href="/help"
                    className="flex items-center gap-2 px-4 py-2 text-[#0c0528] hover:bg-[#0025cc]/10 transition-colors"
                    onClick={() => setResourcesOpen(false)}
                  >
                    <BookOpen className="w-4 h-4 text-[#0025cc]" />
                    Knowledge Center (Help)
                  </Link>
                  <Link
                    href="/tumizi"
                    className="flex items-center gap-2 px-4 py-2 text-[#0c0528] hover:bg-[#0025cc]/10 transition-colors"
                    onClick={() => setResourcesOpen(false)}
                  >
                    <WalletCards className="w-4 h-4 text-[#0025cc]" />
                    Tumizi Virtual Wallet
                  </Link>
                </div>
              )}
            </div>

            <Link href="/contact" className="text-sm font-medium text-[#0c0528] hover:text-[#0025cc] transition-colors">
              Contact
            </Link>
            <Link 
              href="/register"
              className="bg-gradient-to-r from-[#0025cc] to-[#001a99] text-white px-6 py-2 rounded-lg hover:shadow-lg transform hover:-translate-y-0.5 transition-all font-medium"
            >
              Get Started
            </Link>
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
            <Link href="/#home" className="block text-sm font-medium text-[#0c0528] hover:text-[#0025cc] transition-colors">
              Home
            </Link>
            <Link href="/#pricing" className="block text-sm font-medium text-[#0c0528] hover:text-[#0025cc] transition-colors">
              Pricing
            </Link>
            <Link href="/#themes" className="block text-sm font-medium text-[#0c0528] hover:text-[#0025cc] transition-colors">
              Themes
            </Link>
            
            {/* Resources Mobile */}
            <div>
              <button
                onClick={() => setResourcesOpen(!resourcesOpen)}
                className="w-full flex items-center justify-between text-sm font-medium text-[#0c0528] hover:text-[#0025cc] transition-colors"
              >
                Resources
                <ChevronDown className={`w-4 h-4 transition-transform ${resourcesOpen ? 'rotate-180' : ''}`} />
              </button>
              {resourcesOpen && (
                <div className="pl-4 mt-2 space-y-2">
                  <Link
                    href="/help"
                    className="flex items-center gap-2 text-sm font-medium text-[#0c0528] hover:text-[#0025cc] transition-colors"
                    onClick={() => {
                      setResourcesOpen(false);
                      setMobileMenuOpen(false);
                    }}
                  >
                    <BookOpen className="w-4 h-4 text-[#0025cc]" />
                    Knowledge Center (Help)
                  </Link>
                  <Link
                    href="/tumizi"
                    className="flex items-center gap-2 text-sm font-medium text-[#0c0528] hover:text-[#0025cc] transition-colors"
                    onClick={() => {
                      setResourcesOpen(false);
                      setMobileMenuOpen(false);
                    }}
                  >
                    <WalletCards className="w-4 h-4 text-[#0025cc]" />
                    Tumizi Virtual Wallet
                  </Link>
                </div>
              )}
            </div>

            <Link href="/contact" className="block text-sm font-medium text-[#0c0528] hover:text-[#0025cc] transition-colors">
              Contact
            </Link>
            <Link 
              href="/register"
              className="block w-full bg-gradient-to-r from-[#0025cc] to-[#001a99] text-white px-6 py-2 rounded-lg hover:shadow-lg transition-all text-center font-medium"
            >
              Get Started
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
