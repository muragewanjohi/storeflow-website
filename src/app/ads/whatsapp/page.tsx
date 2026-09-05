'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  CheckCircle2,
  XCircle,
  MessageCircle,
  ShoppingBag,
  BarChart3,
  Package,
  Clock,
  Star,
  Quote,
  Store,
  Shield,
  Truck,
} from 'lucide-react';
import { trackMarketingFunnelEvent } from '@/lib/analytics/google-analytics';
import { trackMetaPixelEvent } from '@/lib/analytics/meta-pixel';
import { ImageWithFallback } from '@/components/marketing/image-with-fallback';

const UTM_PARAMS = '?utm_source=facebook&utm_medium=paid&utm_campaign=whatsapp_sellers';

function getRegisterUrl() {
  return `/register${UTM_PARAMS}`;
}

export default function WhatsAppAdLandingPage() {
  useEffect(() => {
    trackMarketingFunnelEvent('ad_landing_page_view', {
      page_title: 'WhatsApp Sellers Ad Landing Page',
      campaign: 'whatsapp_sellers',
    });
    trackMetaPixelEvent('ViewContent', {
      content_name: 'WhatsApp Sellers Landing Page',
      content_category: 'ad_landing_page',
      campaign: 'whatsapp_sellers',
    });
  }, []);

  const handleCtaClick = (location: string) => {
    trackMarketingFunnelEvent('ad_cta_click', {
      page_title: 'WhatsApp Sellers Ad Landing Page',
      cta_location: location,
      campaign: 'whatsapp_sellers',
    });
    trackMetaPixelEvent('Lead', {
      content_name: 'WhatsApp Sellers CTA',
      content_category: location,
      campaign: 'whatsapp_sellers',
    });
  };

  return (
    <div className="min-h-screen bg-white pb-24 md:pb-0">
      {/* Minimal Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center">
              <ImageWithFallback
                src="/logo_with_name.png"
                alt="DukaNest"
                className="h-10 md:h-12 w-auto object-contain"
              />
            </Link>
            <Link
              href={getRegisterUrl()}
              onClick={() => handleCtaClick('header')}
              className="bg-gradient-to-r from-[#0025cc] to-[#001a99] text-white px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg hover:shadow-lg transform hover:-translate-y-0.5 transition-all text-xs sm:text-sm font-semibold"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-24 pb-16 lg:pt-32 lg:pb-24 bg-gradient-to-br from-white via-[#f6faff] to-[#eef4ff] overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#25D366]/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#0025cc]/10 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-12 items-center">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-[#25D366]/10 text-[#128C7E] px-4 py-2 rounded-full text-sm font-semibold mb-6">
                <MessageCircle className="w-4 h-4" />
                For WhatsApp Sellers
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#0c0528] leading-tight mb-6">
                Tired of Losing Orders in{' '}
                <span className="bg-gradient-to-r from-[#25D366] to-[#128C7E] bg-clip-text text-transparent">
                  WhatsApp Chats?
                </span>
              </h1>

              <p className="text-lg sm:text-xl text-[#555] leading-relaxed mb-8 max-w-2xl mx-auto lg:mx-0">
                You&apos;re already selling. Your customers are growing. But your WhatsApp is overflowing
                with orders, &ldquo;Price?&rdquo; messages, delivery fee questions, and missed follow-ups.
                It&apos;s time to get organized.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start items-center mb-8">
                <Link
                  href={getRegisterUrl()}
                  onClick={() => handleCtaClick('hero')}
                  className="group w-full sm:w-auto justify-center bg-gradient-to-r from-[#0025cc] to-[#001a99] text-white px-8 py-4 rounded-lg hover:shadow-2xl transform hover:-translate-y-1 transition-all flex items-center gap-2 text-lg font-semibold"
                >
                  Get Your Own Online Store
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-[#555] justify-center lg:justify-start">
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
                  Set up in 5 minutes
                </span>
              </div>
            </div>

            <div className="flex justify-center lg:justify-end">
              <div className="w-full max-w-sm sm:max-w-md rounded-2xl overflow-hidden shadow-xl border border-[#0025cc]/10">
                <ImageWithFallback
                  src="/images/whatsapp_conversation.png"
                  alt="WhatsApp conversation showing repeated price questions from customers"
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section - "Sound Familiar?" */}
      <section className="py-16 lg:py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-[#0c0528] mb-4">
              Sound Familiar?
            </h2>
            <p className="text-[#555] text-lg max-w-2xl mx-auto">
              If you sell on WhatsApp, you probably deal with these problems every single day.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: MessageCircle,
                problem: '"Price?" messages all day',
                description:
                  'Customers keep asking the same question. You type the same prices over and over again, wasting hours every week.',
              },
              {
                icon: Package,
                problem: 'Orders lost in chats',
                description:
                  'Someone ordered 3 days ago... but which chat was it? You scroll through hundreds of messages trying to find it.',
              },
              {
                icon: Clock,
                problem: 'No time to grow',
                description:
                  'You spend all day replying to messages instead of getting new customers or adding new products.',
              },
              {
                icon: BarChart3,
                problem: "Can't track stock",
                description:
                  'You sold that last piece but forgot to tell the next customer. Embarrassing apologies and lost trust.',
              },
              {
                icon: Shield,
                problem: 'Customers don\'t trust you',
                description:
                  'New customers hesitate to pay upfront. They want a real website, not just a WhatsApp number.',
              },
              {
                icon: Truck,
                problem: 'Delivery fee confusion',
                description:
                  'Customers keep asking, "How much is delivery to my area?" You calculate manually in chats and still get disputes.',
              },
            ].map((item, index) => (
              <div
                key={index}
                className="bg-red-50/60 border border-red-100 rounded-xl p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <item.icon className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <XCircle className="w-4 h-4 text-red-400" />
                      <h3 className="font-semibold text-[#0c0528]">{item.problem}</h3>
                    </div>
                    <p className="text-sm text-[#555] leading-relaxed">{item.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Transition CTA */}
      <section className="py-12 bg-gradient-to-r from-[#0025cc] to-[#001a99] text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">
            What if all of this was solved for you?
          </h2>
          <p className="text-white/80 text-lg">
            With your own online store, customers order themselves and see delivery fees upfront.
          </p>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-16 lg:py-20 bg-gradient-to-br from-[#f6faff] to-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-[#0025cc] font-semibold mb-2">The Solution</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-[#0c0528] mb-4">
              Your Own Professional Online Store
            </h2>
            <p className="text-[#555] text-lg max-w-2xl mx-auto">
              DukaNest gives you everything you need to move from WhatsApp chaos to organized, professional selling.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Store,
                title: 'Your Own Branded Website',
                description:
                  'Customers see your products, prices, and photos on a beautiful website with your brand name. No more "Price?" messages.',
                highlight: 'yourstore.dukanest.com',
              },
              {
                icon: ShoppingBag,
                title: 'Automatic Order Tracking',
                description:
                  'Every order is recorded automatically. See pending, confirmed, and delivered orders in one dashboard. Never lose an order again.',
                highlight: 'Zero orders lost',
              },
              {
                icon: Package,
                title: 'Stock Management',
                description:
                  'Know exactly what you have in stock. Get alerts when items run low. Never oversell a product again.',
                highlight: 'Real-time inventory',
              },
              {
                icon: Truck,
                title: 'Delivery Zones & Clear Fees',
                description:
                  'Set delivery zones once and show delivery charges by location at checkout. No more back-and-forth in chats.',
                highlight: 'Fewer delivery disputes',
              },
              {
                icon: BarChart3,
                title: 'Sales Analytics',
                description:
                  'See which products sell most, your daily revenue, and customer trends. Make smarter business decisions with real data.',
                highlight: 'Know your numbers',
              },
              {
                icon: MessageCircle,
                title: 'Share Your Store Link on WhatsApp',
                description:
                  'Instead of typing prices, share your store link. Customers browse, pick what they want, and order themselves.',
                highlight: 'Works with your WhatsApp workflow',
              },
            ].map((item, index) => (
              <div
                key={index}
                className="bg-white border border-[#0025cc]/10 rounded-xl p-6 hover:shadow-lg hover:-translate-y-1 transition-all"
              >
                <div className="w-12 h-12 bg-[#0025cc]/10 rounded-xl flex items-center justify-center mb-4">
                  <item.icon className="w-6 h-6 text-[#0025cc]" />
                </div>
                <h3 className="font-semibold text-[#0c0528] mb-2">{item.title}</h3>
                <p className="text-sm text-[#555] leading-relaxed mb-3">{item.description}</p>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 px-3 py-1 rounded-full">
                  <CheckCircle2 className="w-3 h-3" />
                  {item.highlight}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 lg:py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-[#0c0528] mb-4">
              Set Up Your Store in 3 Steps
            </h2>
            <p className="text-[#555] text-lg">No coding. No designer. No developer. Just you and 5 minutes.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '1',
                title: 'Sign Up & Pick a Theme',
                description: 'Choose your store name and a beautiful theme that fits your business. Done in 2 minutes.',
              },
              {
                step: '2',
                title: 'Add Your Products',
                description:
                  'Upload photos, set prices, and organize into categories. Just like posting on Instagram, but for your own store.',
              },
              {
                step: '3',
                title: 'Share Your Link & Start Selling',
                description: 'Share your store link on WhatsApp, Instagram, or Facebook. Customers order and pay directly through your site.',
              },
            ].map((item, index) => (
              <div key={index} className="text-center">
                <div className="w-14 h-14 bg-gradient-to-br from-[#0025cc] to-[#001a99] text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold text-[#0c0528] mb-2">{item.title}</h3>
                <p className="text-sm text-[#555] leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="py-16 lg:py-20 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <p className="text-[#0025cc] font-semibold mb-2">Real Story</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-[#0c0528]">
              From WhatsApp Chaos to Organized Business
            </h2>
          </div>

          <div className="bg-white rounded-2xl p-8 sm:p-10 shadow-lg relative overflow-hidden">
            <div className="absolute top-4 right-4 text-blue-100">
              <Quote className="w-16 h-16" />
            </div>

            <div className="inline-flex items-center bg-green-50 text-green-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-6">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              From WhatsApp chaos to organized order management
            </div>

            <div className="flex gap-1 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
              ))}
            </div>

            <blockquote className="text-[#555] text-lg leading-relaxed mb-8 relative z-10">
              &ldquo;Before DukaNest, I was juggling orders through phone calls and WhatsApp
              messages &mdash; things kept falling through the cracks. Now every order is tracked
              automatically in my dashboard. I can see what&rsquo;s pending, what&rsquo;s been
              delivered, and the analytics show me exactly which products are selling best.
              Scaling my business finally feels manageable.&rdquo;
            </blockquote>

            <div className="flex items-center gap-4 pt-4 border-t border-gray-100">
              <div className="relative w-14 h-14 rounded-full overflow-hidden ring-2 ring-blue-100">
                <Image
                  src="https://images.unsplash.com/photo-1668752741330-8adc5cef7485?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxBZnJpY2FuJTIwd29tYW4lMjBwcm9mZXNzaW9uYWx8ZW58MXx8fHwxNzY1OTA5ODAzfDA&ixlib=rb-4.1.0&q=80&w=1080"
                  alt="Wanjiku Kamau"
                  fill
                  className="object-cover"
                  sizes="56px"
                />
              </div>
              <div>
                <h4 className="font-semibold text-[#0c0528]">Wanjiku Kamau</h4>
                <p className="text-sm text-[#8d8d8d]">Boutique Owner</p>
                <p className="text-xs text-[#0025cc]">Nairobi Fashion Hub</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Teaser */}
      <section className="py-16 lg:py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-[#0c0528] mb-4">
            More Affordable Than You Think
          </h2>
          <p className="text-[#555] text-lg mb-8 max-w-xl mx-auto">
            A developer would charge you Ksh 50,000+ for a website. With DukaNest, you get your own professional store starting at:
          </p>

          <div className="bg-gradient-to-br from-[#f6faff] to-white border-2 border-[#0025cc]/20 rounded-2xl p-8 sm:p-10 max-w-md mx-auto mb-8">
            <p className="text-sm text-[#0025cc] font-semibold mb-1">Basic Plan</p>
            <div className="flex items-baseline justify-center gap-1 mb-2">
              <span className="text-5xl font-bold text-[#0c0528]">Ksh 1,000</span>
              <span className="text-[#8d8d8d]">/month</span>
            </div>
            <p className="text-sm text-[#555] mb-6">14-day free trial &middot; No credit card required</p>

            <ul className="text-left space-y-3 mb-8">
              {[
                'Your own branded store',
                'Up to 100 products',
                'Delivery zones by location',
                'Order management dashboard',
                'Stock tracking',
                'WhatsApp share button',
              ].map((feature, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-[#555]">
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>

            <Link
              href={getRegisterUrl()}
              onClick={() => handleCtaClick('pricing')}
              className="group w-full bg-gradient-to-r from-[#0025cc] to-[#001a99] text-white px-8 py-4 rounded-lg hover:shadow-2xl transform hover:-translate-y-1 transition-all flex items-center justify-center gap-2 text-lg font-semibold"
            >
              Start Your Free Trial
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <p className="text-sm text-[#8d8d8d]">
            That&apos;s less than what you spend on data bundles. And it could 10x your sales.
          </p>
        </div>
      </section>

      {/* Before vs After */}
      <section className="py-16 lg:py-20 bg-gradient-to-br from-[#f6faff] to-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-[#0c0528] mb-4">
              Before vs After DukaNest
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Before */}
            <div className="bg-red-50/60 border border-red-200 rounded-2xl p-8">
              <h3 className="text-lg font-bold text-red-700 mb-6 flex items-center gap-2">
                <XCircle className="w-5 h-5" />
                Selling on WhatsApp Only
              </h3>
              <ul className="space-y-4">
                {[
                  'Answer "Price?" 50 times a day',
                  'Orders lost in chat history',
                  'Argue about delivery costs in DMs',
                  'No idea what\'s in stock',
                  'Customers don\'t trust you',
                  'Can\'t grow beyond WhatsApp',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-[#555]">
                    <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* After */}
            <div className="bg-green-50/60 border border-green-200 rounded-2xl p-8">
              <h3 className="text-lg font-bold text-green-700 mb-6 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                Selling with DukaNest
              </h3>
              <ul className="space-y-4">
                {[
                  'Prices shown on your website automatically',
                  'Every order tracked in your dashboard',
                  'Delivery fees shown by location',
                  'Real-time stock levels & alerts',
                  'Professional brand builds trust',
                  'Share your store link anywhere & grow',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-[#555]">
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 lg:py-20 bg-gradient-to-r from-[#0025cc] to-[#001a99] text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Stop Losing Orders in WhatsApp
          </h2>
          <p className="text-white/80 text-lg mb-8 max-w-xl mx-auto">
            Join hundreds of business owners who moved from WhatsApp selling to their own professional online store with clear delivery zones. Start your free 14-day trial today.
          </p>

          <Link
            href={getRegisterUrl()}
            onClick={() => handleCtaClick('final_cta')}
            className="group inline-flex w-full sm:w-auto justify-center items-center gap-2 bg-white text-[#0025cc] px-6 sm:px-10 py-4 rounded-lg hover:shadow-2xl transform hover:-translate-y-1 transition-all text-lg font-bold"
          >
            Create Your Store Now — It&apos;s Free
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>

          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/70 justify-center mt-6">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-green-300" />
              14-day free trial
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-green-300" />
              No credit card required
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-green-300" />
              Cancel anytime
            </span>
          </div>
        </div>
      </section>

      {/* Sticky Mobile CTA */}
      <div className="fixed md:hidden bottom-0 inset-x-0 z-50 border-t border-[#0025cc]/10 bg-white/95 backdrop-blur-md p-3">
        <div className="max-w-5xl mx-auto">
          <Link
            href={getRegisterUrl()}
            onClick={() => handleCtaClick('mobile_sticky')}
            className="group w-full justify-center bg-gradient-to-r from-[#0025cc] to-[#001a99] text-white px-5 py-3 rounded-lg hover:shadow-lg transition-all flex items-center gap-2 text-sm font-semibold"
          >
            Start Free Trial
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>

      {/* Minimal Footer */}
      <footer className="py-8 bg-[#0c0528] text-white/60">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <ImageWithFallback
                src="/logo_with_name.png"
                alt="DukaNest"
                className="h-8 w-auto object-contain brightness-200"
              />
              <span className="text-sm">&copy; {new Date().getFullYear()} DukaNest</span>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <Link href="/privacy" className="hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:text-white transition-colors">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
