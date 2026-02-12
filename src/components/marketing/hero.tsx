'use client';

import Link from 'next/link';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { trackMetaPixelEvent } from '@/lib/analytics/meta-pixel';
import { ImageWithFallback } from './image-with-fallback';

export function Hero() {
  return (
    <section id="home" className="relative overflow-hidden py-16 lg:py-24 bg-gradient-to-br from-white to-[#f6faff]">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#0025cc]/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#0025cc]/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1000ms' }}></div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[600px] lg:min-h-[700px]">
          {/* Left Content */}
          <div className="space-y-8 lg:ml-5">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-[#0025cc]/10 text-[#0025cc] px-4 py-2 rounded-full text-sm font-semibold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0025cc] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0025cc]"></span>
              </span>
              14-Day Free Trial &mdash; No Credit Card Required
            </div>

            {/* Main Heading */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#0c0528] leading-tight">
              Launch Your Online Store in{' '}
              <span className="bg-gradient-to-r from-[#0025cc] to-[#001a99] bg-clip-text text-transparent">
                Minutes, Not Months
              </span>
            </h1>

            {/* Value Proposition */}
            <p className="text-lg text-[#555] leading-relaxed max-w-xl">
              The all-in-one ecommerce platform built for diverse businesses. Get your own branded store with payments, inventory, and analytics &mdash; everything you need to sell online, without writing a single line of code.
            </p>

            {/* Trust Signals */}
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-[#555]">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Free 14-day trial
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                No credit card needed
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Cancel anytime
              </span>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <Link 
                href="/register" 
                onClick={() => trackMetaPixelEvent('Lead', { content_name: 'Start Your Free Trial', content_category: 'hero' })}
                className="group bg-gradient-to-r from-[#0025cc] to-[#001a99] text-white px-8 py-4 rounded-lg hover:shadow-2xl transform hover:-translate-y-1 transition-all flex items-center gap-2 text-lg font-semibold"
              >
                Start Your Free Trial
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link 
                href="#pricing" 
                onClick={() => trackMetaPixelEvent('Lead', { content_name: 'View Pricing Plans', content_category: 'hero' })}
                className="bg-white text-[#0025cc] px-8 py-4 rounded-lg border-2 border-[#0025cc] hover:bg-[#0025cc] hover:text-white transition-all font-semibold"
              >
                View Pricing Plans
              </Link>
            </div>
          </div>

          {/* Right Content - Hero Image */}
          <div className="relative flex items-end justify-end self-stretch">
            <div className="relative w-full lg:w-[130%] xl:w-[150%] -mr-0 lg:-mr-[28px] xl:-mr-[60px] h-full">
              <ImageWithFallback
                alt="DukaNest ecommerce platform dashboard"
                src="/hero_image.png"
                className="w-full h-full object-contain object-bottom"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
