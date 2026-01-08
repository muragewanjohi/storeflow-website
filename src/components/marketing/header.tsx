/**
 * Marketing Site Header
 * 
 * Simple header for marketing pages (help, pricing, etc.)
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { ImageWithFallback } from './image-with-fallback';

export default function MarketingHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/">
              <ImageWithFallback
                src="/logo_with_name.png"
                alt="DukaNest"
                className="h-10 w-auto"
              />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="#home" className="text-gray-700 hover:text-[#0025cc] transition-colors">
              Home
            </Link>
            {/* <Link href="#shops" className="text-gray-700 hover:text-[#0025cc] transition-colors">
              Shops
            </Link> */}
            <Link href="#pricing" className="text-gray-700 hover:text-[#0025cc] transition-colors">
              Pricing
            </Link>
            <Link href="#themes" className="text-gray-700 hover:text-[#0025cc] transition-colors">
              Templates
            </Link>
            {/* <Link href="#blog" className="text-gray-700 hover:text-[#0025cc] transition-colors">
              Blog
            </Link> */}
            <Link href="#contact" className="text-gray-700 hover:text-[#0025cc] transition-colors">
              Contact
            </Link>
            {/* <Link 
              href="/customer-login"
              className="bg-gradient-to-r from-[#0025cc] to-[#001a99] text-white px-6 py-2 rounded-lg hover:shadow-lg transform hover:-translate-y-0.5 transition-all"
            >
              Login
            </Link> */}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-gray-100"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 space-y-4">
            <Link href="#home" className="block text-gray-700 hover:text-[#0025cc] transition-colors">
              Home
            </Link>
            <Link href="#shops" className="block text-gray-700 hover:text-[#0025cc] transition-colors">
              Shops
            </Link>
            <Link href="#pricing" className="block text-gray-700 hover:text-[#0025cc] transition-colors">
              Pricing
            </Link>
            <Link href="#themes" className="block text-gray-700 hover:text-[#0025cc] transition-colors">
              Templates
            </Link>
            <Link href="#blog" className="block text-gray-700 hover:text-[#0025cc] transition-colors">
              Blog
            </Link>
            <Link href="#contact" className="block text-gray-700 hover:text-[#0025cc] transition-colors">
              Contact
            </Link>
            <Link 
              href="/customer-login"
              className="block w-full text-left text-gray-700 hover:text-[#0025cc] transition-colors"
            >
              Sign In
            </Link>
            <Link 
              href="/register"
              className="block w-full bg-gradient-to-r from-[#0025cc] to-[#001a99] text-white px-6 py-2 rounded-lg hover:shadow-lg transition-all text-center"
            >
              Get Started
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}

