'use client';

import Link from 'next/link';
import { 
  Calendar,
  Palette,
  Store,
  DollarSign,
  Package,
  CreditCard,
  TrendingUp,
  Settings,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';

const howItWorksSteps = [
  {
    icon: Calendar,
    title: 'Start 14-Day Free Trial',
    description: 'Sign up and start building your store immediately with a full-featured plan. No credit card required. Explore all features risk-free for 14 days.',
    color: 'from-emerald-400 to-emerald-600'
  },
  {
    icon: Palette,
    title: 'Choose Theme',
    description: 'Select a visually appealing theme to personalize your website and enhance the user experience.',
    color: 'from-purple-400 to-purple-600'
  },
  {
    icon: Store,
    title: 'Setup Store',
    description: 'Upload product details, images, and prices to create an appealing store that attracts potential customers.',
    color: 'from-indigo-400 to-indigo-600'
  },
  {
    icon: DollarSign,
    title: 'Set Currencies',
    description: 'Add and configure multiple currencies to provide a seamless shopping experience for customers worldwide.',
    color: 'from-green-400 to-green-600'
  },
  {
    icon: Package,
    title: 'Add Products',
    description: 'Upload new products with descriptions, prices, and images to expand your offerings and attract customers.',
    color: 'from-orange-400 to-orange-600'
  },
  {
    icon: CreditCard,
    title: 'Set Payment Methods',
    description: 'Enable various payment options to ensure smooth and secure transactions for your customers.',
    color: 'from-pink-400 to-pink-600'
  },
  {
    icon: TrendingUp,
    title: 'Sell Products',
    description: 'List your products with detailed descriptions and prices to start selling and attract potential buyers.',
    color: 'from-cyan-400 to-cyan-600'
  },
  {
    icon: Settings,
    title: 'Manage Orders',
    description: 'Track, process, and update customer orders efficiently to ensure timely fulfillment and satisfaction.',
    color: 'from-red-400 to-red-600'
  },
  {
    icon: RefreshCw,
    title: 'Renew Subscription',
    description: 'After experiencing the platform and seeing results, choose to continue with a subscription plan that fits your growing business needs.',
    color: 'from-blue-400 to-blue-600'
  }
];

export function HowItWorks() {
  return (
    <section id="features" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-[#0025cc] font-medium mb-2">Why Choose Us</p>
          <h2 className="text-4xl lg:text-5xl font-bold text-[#0c0528] mb-4">
            How It{' '}
            <span className="bg-gradient-to-r from-[#0025cc] to-[#001a99] bg-clip-text text-transparent">
              Works
            </span>
          </h2>
          <p className="text-[#8d8d8d] mt-4">
            9 Step Power Builders
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {howItWorksSteps.map((step, index) => {
            const IconComponent = step.icon;
            return (
              <div
                key={index}
                className="group relative bg-white p-6 rounded-2xl border border-[#eaeaea] hover:border-blue-300 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2"
              >
                {/* Icon */}
                <div className={`inline-flex p-3 rounded-lg bg-gradient-to-br ${step.color} mb-4 group-hover:scale-110 transition-transform`}>
                  <IconComponent className="w-6 h-6 text-white" />
                </div>

                {/* Content */}
                <h3 className="text-lg font-semibold text-[#0c0528] mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-[#8d8d8d] leading-relaxed">
                  {step.description}
                </p>

                {/* Step Number Badge */}
                <div className="absolute -top-3 -right-3 bg-gradient-to-r from-[#0025cc] to-[#001a99] text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shadow-lg">
                  {index + 1}
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA Section */}
        <div className="text-center mt-16">
          <Link href="/pricing" className="group bg-gradient-to-r from-[#0025cc] to-[#001a99] text-white px-8 py-4 rounded-lg hover:shadow-xl transform hover:-translate-y-1 transition-all inline-flex items-center gap-2">
            Get Started Now
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </section>
  );
}
