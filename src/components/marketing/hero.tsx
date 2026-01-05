'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
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
            <div className="inline-flex items-center gap-2 text-[#0c0528]">
              <span className="text-base">{`Our Platform, Your Success Icon `}</span>
              <span className="text-xl">🎯</span>
            </div>

            {/* Main Heading */}
            <h1 className="text-5xl lg:text-6xl font-bold text-[#0c0528] leading-tight">
              Build your Online Shop site within{' '}
              <span className="bg-gradient-to-r from-[#0025cc] to-[#001a99] bg-clip-text text-transparent">
                minutes
              </span>
            </h1>

            {/* Description */}
            <p className="text-lg text-[#8d8d8d] leading-relaxed">
              Create your own online store with a unique web address and dedicated dashboard. Manage products, payments, and sales effortlessly. Everything you need to grow your business is just a click away. Start today and simplify your e-commerce journey.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <Link 
                href="/pricing" 
                className="group bg-gradient-to-r from-[#0025cc] to-[#001a99] text-white px-8 py-4 rounded-lg hover:shadow-2xl transform hover:-translate-y-1 transition-all flex items-center gap-2"
              >
                Get Started Now
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link 
                href="/pricing" 
                className="bg-white text-[#0025cc] px-8 py-4 rounded-full border-2 border-[#0025cc] hover:bg-[#0025cc] hover:text-white transition-all flex items-center justify-center gap-2"
              >
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>

          {/* Right Content - Hero Image */}
          <div className="relative flex items-end justify-end self-stretch">
            <div className="relative w-full lg:w-[130%] xl:w-[150%] -mr-0 lg:-mr-[28px] xl:-mr-[60px] h-full">
              <ImageWithFallback
                alt="Build your online shop"
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
