'use client';

import Link from 'next/link';
import { 
  UserPlus,
  Palette,
  Package,
  Rocket,
  ArrowRight,
} from 'lucide-react';

const howItWorksSteps = [
  {
    icon: UserPlus,
    title: 'Sign Up for Free',
    description: 'Create your account in seconds. No credit card required &mdash; start your 14-day free trial with full access to every feature.',
    color: 'from-emerald-400 to-emerald-600'
  },
  {
    icon: Palette,
    title: 'Customize Your Store',
    description: 'Pick a professionally designed theme and make it yours. Add your logo, brand colours, and configure your store settings.',
    color: 'from-purple-400 to-purple-600'
  },
  {
    icon: Package,
    title: 'Add Products & Payments',
    description: 'Upload your products with photos, prices, and descriptions. Add payment methods like M-Pesa and delivery options in a few clicks.',
    color: 'from-orange-400 to-orange-600'
  },
  {
    icon: Rocket,
    title: 'Launch & Start Selling',
    description: 'Your store is live with its own web address. Share it with customers, track orders from your dashboard, and watch your business grow.',
    color: 'from-blue-400 to-blue-600'
  }
];

export function HowItWorks() {
  return (
    <section id="features" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-[#0025cc] font-medium mb-2">Simple Setup</p>
          <h2 className="text-4xl lg:text-5xl font-bold text-[#0c0528] mb-4">
            From Zero to Selling in{' '}
            <span className="bg-gradient-to-r from-[#0025cc] to-[#001a99] bg-clip-text text-transparent">
              4 Easy Steps
            </span>
          </h2>
          <p className="text-[#8d8d8d] mt-4 text-lg">
            No technical skills needed. If you can use a phone, you can build your online store.
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
                {/* Step Number Badge */}
                <div className="absolute -top-3 -right-3 bg-gradient-to-r from-[#0025cc] to-[#001a99] text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shadow-lg">
                  {index + 1}
                </div>

                {/* Icon */}
                <div className={`inline-flex p-3 rounded-lg bg-gradient-to-br ${step.color} mb-4 group-hover:scale-110 transition-transform`}>
                  <IconComponent className="w-6 h-6 text-white" />
                </div>

                {/* Content */}
                <h3 className="text-lg font-semibold text-[#0c0528] mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-[#8d8d8d] leading-relaxed" dangerouslySetInnerHTML={{ __html: step.description }} />

                {/* Connector line (except last) */}
                {index < howItWorksSteps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-4 w-8 border-t-2 border-dashed border-[#0025cc]/30" />
                )}
              </div>
            );
          })}
        </div>

        {/* CTA Section */}
        <div className="text-center mt-16">
          <Link href="/register" className="group bg-gradient-to-r from-[#0025cc] to-[#001a99] text-white px-8 py-4 rounded-lg hover:shadow-xl transform hover:-translate-y-1 transition-all inline-flex items-center gap-2 font-semibold">
            Start Your Free Trial
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <p className="text-sm text-[#8d8d8d] mt-3">No credit card required &bull; Cancel anytime</p>
        </div>
      </div>
    </section>
  );
}
