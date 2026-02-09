'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

const moreFeatures = [
  {
    icon: '📊',
    title: 'Powerful Dashboard',
    description: 'Manage products, orders, customers, and analytics from one intuitive dashboard. Everything at your fingertips.'
  },
  {
    icon: '📦',
    title: 'Smart Inventory',
    description: 'Track stock levels in real time with low-stock alerts, bulk updates, and inventory history. Never run out of a best-seller again.'
  },
  {
    icon: '📈',
    title: 'Built to Scale',
    description: 'Start with 50 products and grow to unlimited. Our platform scales with your business, from side hustle to full enterprise.'
  },
  {
    icon: '💬',
    title: '24/7 Support',
    description: 'Get help whenever you need it. Our support team is available around the clock to keep your store running smoothly.'
  }
];

const whoIsThisFor = [
  {
    emoji: '🛍️',
    title: 'Retail Shops Going Online',
    description: 'Take your physical store to the internet and reach customers beyond your neighbourhood.'
  },
  {
    emoji: '🚀',
    title: 'New Entrepreneurs',
    description: 'Starting your first business? Launch an online store without technical skills or a big budget.'
  },
  {
    emoji: '🔄',
    title: 'Switching Platforms',
    description: 'Frustrated with your current setup? Migrate to DukaNest for better features and local payment support.'
  }
];

export function MoreFeatures() {
  return (
    <section className="py-20 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-6">
            <p className="text-[#0025cc] font-medium">Everything You Need to Succeed</p>
            <h2 className="text-4xl lg:text-5xl font-bold text-[#0c0528] leading-tight">
              More Features, More{' '}
              <span className="bg-gradient-to-r from-[#0025cc] to-[#001a99] bg-clip-text text-transparent">
                Profit
              </span>
            </h2>
            <p className="text-[#555] leading-relaxed text-lg">
              Powerful tools, seamless integrations, and reliable performance &mdash; all included out of the box. Focus on selling, we handle the tech.
            </p>
            <Link 
              href="/register" 
              className="group bg-gradient-to-r from-[#0025cc] to-[#001a99] text-white px-8 py-4 rounded-lg hover:shadow-xl transform hover:-translate-y-1 transition-all inline-flex items-center gap-2 font-semibold"
            >
              Create Your Store
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Right Content - Features Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            {moreFeatures.map((feature, index) => (
              <div
                key={index}
                className="bg-white p-6 rounded-2xl border border-[#eaeaea] hover:border-[#0025cc] hover:shadow-lg transition-all"
              >
                <div className="text-4xl mb-3">{feature.icon}</div>
                <h3 className="text-lg font-semibold text-[#0c0528] mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-[#8d8d8d] leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Who Is This For */}
        <div className="mt-20 pt-16 border-t border-[#0025cc]/10">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <p className="text-[#0025cc] font-medium mb-2">Built For You</p>
            <h2 className="text-4xl lg:text-5xl font-bold text-[#0c0528] mb-4">
              Who Is DukaNest{' '}
              <span className="bg-gradient-to-r from-[#0025cc] to-[#001a99] bg-clip-text text-transparent">
                For?
              </span>
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {whoIsThisFor.map((item, index) => (
              <div key={index} className="bg-white p-8 rounded-2xl border border-[#eaeaea] hover:shadow-lg transition-all text-center">
                <div className="text-5xl mb-4">{item.emoji}</div>
                <h3 className="text-xl font-semibold text-[#0c0528] mb-3">{item.title}</h3>
                <p className="text-[#8d8d8d] leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
