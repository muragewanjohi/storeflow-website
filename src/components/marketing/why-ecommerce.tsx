'use client';

import Link from 'next/link';
import { 
  Clock, 
  DollarSign, 
  Code, 
  Shield, 
  Globe, 
  TrendingUp,
  Users,
  ShoppingBag,
  ArrowRight,
  CheckCircle2,
  XCircle
} from 'lucide-react';

const whyEcommerceBenefits = [
  {
    icon: Globe,
    title: '24/7 Global Reach',
    description: 'Your store never closes. Reach customers worldwide, anytime, anywhere, without geographical limitations.',
    color: 'from-blue-400 to-blue-600'
  },
  {
    icon: TrendingUp,
    title: 'Scalable Growth',
    description: 'Start small and grow without limits. Add products, expand inventory, and handle traffic spikes effortlessly.',
    color: 'from-green-400 to-green-600'
  },
  {
    icon: Users,
    title: 'Customer Insights',
    description: 'Track customer behavior, preferences, and buying patterns with built-in analytics to make data-driven decisions.',
    color: 'from-purple-400 to-purple-600'
  },
  {
    icon: ShoppingBag,
    title: 'Lower Overhead Costs',
    description: 'No physical store rent, utilities, or staff costs. Operate efficiently with minimal infrastructure investment.',
    color: 'from-orange-400 to-orange-600'
  }
];

const buildVsBuy = [
  {
    aspect: 'Time to Launch',
    buildYourself: '3-6 months',
    withDukaNest: 'Minutes',
    icon: Clock,
    color: 'text-blue-600'
  },
  {
    aspect: 'Development Cost',
    buildYourself: '$1,000 - $5,000+',
    withDukaNest: 'Starting at $10/month',
    icon: DollarSign,
    color: 'text-green-600'
  },
  {
    aspect: 'Technical Skills Required',
    buildYourself: 'Expert-level coding',
    withDukaNest: 'No coding needed',
    icon: Code,
    color: 'text-purple-600'
  },
  {
    aspect: 'Security & Updates',
    buildYourself: 'Your responsibility',
    withDukaNest: 'Handled automatically',
    icon: Shield,
    color: 'text-red-600'
  }
];

export function WhyEcommerce() {
  return (
    <section id="why-ecommerce" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-[#0025cc] font-medium mb-2">Why Ecommerce Matters</p>
          <h2 className="text-4xl lg:text-5xl font-bold text-[#0c0528] mb-4">
            Why You Need an{' '}
            <span className="bg-gradient-to-r from-[#0025cc] to-[#001a99] bg-clip-text text-transparent">
              Online Store
            </span>
          </h2>
          <p className="text-[#8d8d8d] mt-4 text-lg">
            The digital marketplace is where modern businesses thrive. Here&apos;s why having an online store is essential for your success.
          </p>
        </div>

        {/* Why Ecommerce Benefits Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {whyEcommerceBenefits.map((benefit, index) => {
            const IconComponent = benefit.icon;
            return (
              <div
                key={index}
                className="group bg-white p-6 rounded-2xl border border-[#eaeaea] hover:border-blue-300 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2"
              >
                <div className={`inline-flex p-3 rounded-lg bg-gradient-to-br ${benefit.color} mb-4 group-hover:scale-110 transition-transform`}>
                  <IconComponent className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-[#0c0528] mb-2">
                  {benefit.title}
                </h3>
                <p className="text-sm text-[#8d8d8d] leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Build vs Buy Comparison */}
        <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 rounded-3xl p-8 md:p-12 mb-16">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <p className="text-[#0025cc] font-medium mb-2">The Smart Choice</p>
            <h2 className="text-4xl lg:text-5xl font-bold text-[#0c0528] mb-4">
              Build Yourself vs{' '}
              <span className="bg-gradient-to-r from-[#0025cc] to-[#001a99] bg-clip-text text-transparent">
                Use DukaNest
              </span>
            </h2>
            <p className="text-[#8d8d8d] mt-4 text-lg">
              Building an ecommerce website from scratch is time-consuming, expensive, and complex. Here&apos;s why DukaNest is the smarter choice.
            </p>
          </div>

          {/* Comparison Table */}
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl overflow-hidden shadow-lg">
              {/* Table Header */}
              <div className="grid grid-cols-3 gap-4 p-6 bg-gradient-to-r from-[#0025cc] to-[#001a99] text-white">
                <div className="font-semibold text-lg">Aspect</div>
                <div className="font-semibold text-lg text-center">Building Yourself</div>
                <div className="font-semibold text-lg text-center">With DukaNest</div>
              </div>

              {/* Table Rows */}
              {buildVsBuy.map((item, index) => {
                const IconComponent = item.icon;
                return (
                  <div
                    key={index}
                    className={`grid grid-cols-3 gap-4 p-6 border-b border-[#eaeaea] last:border-b-0 hover:bg-slate-50 transition-colors ${
                      index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <IconComponent className={`w-5 h-5 ${item.color}`} />
                      <span className="font-semibold text-[#0c0528]">{item.aspect}</span>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <XCircle className="w-5 h-5 text-red-500" />
                      <span className="text-[#8d8d8d] text-sm">{item.buildYourself}</span>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                      <span className="text-[#0c0528] font-medium text-sm">{item.withDukaNest}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Additional Benefits */}
          <div className="mt-12 grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="bg-white p-6 rounded-xl border border-[#eaeaea]">
              <h3 className="font-semibold text-[#0c0528] mb-2">Built-in Features</h3>
              <p className="text-sm text-[#8d8d8d]">
                Payment gateways, inventory management, analytics, and more - all included out of the box.
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-[#eaeaea]">
              <h3 className="font-semibold text-[#0c0528] mb-2">Ongoing Support</h3>
              <p className="text-sm text-[#8d8d8d]">
                Get help when you need it. Our team handles updates, security patches, and technical support.
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-[#eaeaea]">
              <h3 className="font-semibold text-[#0c0528] mb-2">Proven Platform</h3>
              <p className="text-sm text-[#8d8d8d]">
                Trusted by thousands of businesses. Focus on selling, not maintaining infrastructure.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <p className="text-lg text-[#8d8d8d] mb-6">
            Ready to start your online store? Get started in minutes, not months.
          </p>
          <Link 
            href="/pricing" 
            className="group bg-gradient-to-r from-[#0025cc] to-[#001a99] text-white px-8 py-4 rounded-lg hover:shadow-xl transform hover:-translate-y-1 transition-all inline-flex items-center gap-2"
          >
            Start Your Store Today
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </section>
  );
}
