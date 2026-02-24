'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

const painAndSolution = [
  {
    icon: '😩',
    pain: '"Price?" messages flooding your DMs',
    solution: 'Customers see your prices and order directly',
  },
  {
    icon: '📋',
    pain: 'Orders lost in long WhatsApp chats',
    solution: 'Every order tracked in your dashboard',
  },
  {
    icon: '📦',
    pain: 'Stock count guesswork &mdash; selling what you don&rsquo;t have',
    solution: 'Real-time inventory with low-stock alerts',
  },
  {
    icon: '🚚',
    pain: '"How much is delivery?" every single time',
    solution: 'Delivery zones with clear fees shown at checkout',
  },
];

const whoIsThisFor = [
  {
    emoji: '📱',
    title: 'Social & Chat Sellers',
    description: 'You already sell through WhatsApp, Instagram, Facebook, Jiji, or Jumia and want a professional store your customers can browse and order from.',
  },
  {
    emoji: '🛍️',
    title: 'Product Businesses of All Types',
    description: 'Fashion, beauty, electronics, home goods, groceries, baby products, and more &mdash; if you sell physical products online, DukaNest is built for you.',
  },
  {
    emoji: '🏪',
    title: 'Small Shops Going Online',
    description: 'Take your physical shop to the internet. Reach customers beyond your neighbourhood without hiring a developer.',
  },
  {
    emoji: '💰',
    title: 'Budget-Conscious Entrepreneurs',
    description: 'Developers quote Ksh 50,000+. DukaNest gives you a full store from just Ksh 1,000/month &mdash; no hidden costs.',
  },
];

export function MoreFeatures() {
  return (
    <>
      {/* Who Is This For - Self-Identification Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <p className="text-[#0025cc] font-medium mb-2">Sound Familiar?</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-[#0c0528] mb-4">
              DukaNest Is Built for{' '}
              <span className="bg-gradient-to-r from-[#0025cc] to-[#001a99] bg-clip-text text-transparent">
                Sellers Like You
              </span>
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {whoIsThisFor.map((item, index) => (
              <div key={index} className="bg-gradient-to-br from-slate-50 to-blue-50 p-6 rounded-2xl border border-[#eaeaea] hover:border-[#0025cc] hover:shadow-lg transition-all text-center">
                <div className="text-4xl mb-3">{item.emoji}</div>
                <h3 className="text-lg font-semibold text-[#0c0528] mb-2">{item.title}</h3>
                <p className="text-sm text-[#8d8d8d] leading-relaxed" dangerouslySetInnerHTML={{ __html: item.description }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pain vs Solution Section */}
      <section className="py-20 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <p className="text-[#0025cc] font-medium">Stop the Daily Struggle</p>
              <h2 className="text-3xl lg:text-4xl font-bold text-[#0c0528] leading-tight">
                Your Biggest Headaches,{' '}
                <span className="bg-gradient-to-r from-[#0025cc] to-[#001a99] bg-clip-text text-transparent">
                  Solved
                </span>
              </h2>
              <p className="text-[#555] leading-relaxed text-lg">
                You&rsquo;re already selling and your customers love your products. But the way you take orders is holding you back. DukaNest organizes everything so you can focus on growing.
              </p>
              <Link 
                href="/register" 
                className="group bg-gradient-to-r from-[#0025cc] to-[#001a99] text-white px-8 py-4 rounded-lg hover:shadow-xl transform hover:-translate-y-1 transition-all inline-flex items-center gap-2 font-semibold"
              >
                Get Your Store &mdash; Free for 14 Days
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            <div className="space-y-4">
              {painAndSolution.map((item, index) => (
                <div
                  key={index}
                  className="bg-white p-5 rounded-2xl border border-[#eaeaea] hover:border-[#0025cc] hover:shadow-lg transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className="text-3xl flex-shrink-0">{item.icon}</div>
                    <div>
                      <p className="text-[#0c0528] font-medium line-through decoration-red-400/60 mb-1" dangerouslySetInnerHTML={{ __html: item.pain }} />
                      <p className="text-[#0025cc] font-medium flex items-center gap-1.5">
                        <span className="text-green-500">&#10003;</span> {item.solution}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
