'use client';

import { Check, Zap } from 'lucide-react';
import { useState } from 'react';

const plans = [
  {
    name: 'Basic',
    price: '10',
    popular: false,
    features: [
      'Staff Users: 1',
      'Products: 100',
      'Orders: 500/month',
      'Storage: 5 GB',
      'Customers: 1,000',
      'Custom Pages: 10',
      'Blog Posts: Unlimited',
      'Languages: 2',
      'Advanced Reports',
      'Email Support'
    ]
  },
  {
    name: 'Standard',
    price: '30',
    popular: true,
    features: [
      'Staff Users: 5',
      'Products: 1,000',
      'Orders: 5,000/month',
      'Storage: 25 GB',
      'Customers: 10,000',
      'Custom Pages: 50',
      'Blog Posts: 100',
      'Languages: 4',
      'Advanced Reports',
      'Abandoned Cart Recovery - Coming Soon',
      'Gift Cards - Coming Soon',
      'Priority Support',
      'Automatic payment verification (Mpesa,Stripe) - Coming Soon',
      'Add and buy custom domain - Coming Soon'
    ]
  },
  {
    name: 'Premium',
    price: '60',
    popular: false,
    features: [
      'Staff Users: 10',
      'Products: Unlimited',
      'Orders: Unlimited',
      'Storage: 200 GB',
      'Customers: Unlimited',
      'Custom Pages: Unlimited',
      'Blog Posts: Unlimited',
      'Languages: Unlimited',
      'Advanced Analytics',
      'Abandoned Cart Recovery',
      'Gift Cards',
      'API Access',
      'Priority Support (Email + Chat)',
      'Automatic payment verification (Mpesa,Stripe) - Coming Soon',
      'Add and buy custom domain - Coming Soon'
    ]
  }
];

const billingPeriods = ['Monthly', 'Yearly', 'Lifetime'];

export function Pricing() {
  const [activePeriod, setActivePeriod] = useState('Monthly');

  return (
    <section id="pricing" className="py-20 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <p className="text-[#0025cc] font-medium mb-2">Pricing Plan</p>
          <h2 className="text-4xl lg:text-5xl font-bold text-[#0c0528] mb-4">
            Choose Your Perfect Business Plan
          </h2>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative bg-white rounded-2xl p-8 transition-all duration-300 ${
                plan.popular
                  ? 'shadow-2xl transform scale-105 border-2 border-[#0025cc]'
                  : 'shadow-lg hover:shadow-xl hover:transform hover:scale-105'
              }`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-[#0025cc] to-[#001a99] text-white px-6 py-2 rounded-full text-sm font-medium shadow-lg flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Most Popular
                  </span>
                </div>
              )}

              {/* Plan Name */}
              <div className="text-center mb-6">
                <h3 className={`text-2xl font-bold mb-2 ${plan.popular ? 'text-[#5B8AC4]' : 'text-[#0c0528]'}`}>
                  {plan.name}
                </h3>
              </div>

              {/* Price */}
              <div className="text-center mb-6">
                <div className="flex items-baseline justify-center">
                  <span className={`text-5xl font-bold ${plan.popular ? 'text-[#5B8AC4]' : 'text-[#0c0528]'}`}>
                    ${plan.price}
                  </span>
                  <span className={`ml-2 ${plan.popular ? 'text-[#5B8AC4]/80' : 'text-[#8d8d8d]'}`}>
                    / monthly
                  </span>
                </div>
              </div>

              {/* What's Included */}
              <div className={`mb-6 ${plan.popular ? 'text-[#0025cc]/90' : 'text-[#0c0528]'}`}>
                <p className="font-semibold text-lg mb-4">{`What's Included`}</p>
              </div>

              {/* Features List */}
              <div className="space-y-3 mb-8">
                {plan.features.map((feature, featureIndex) => (
                  <div key={featureIndex} className="flex items-start gap-3">
                    <div className={`rounded-full p-1 mt-0.5 ${
                      plan.popular ? 'bg-[#0025cc]/20' : 'bg-[#0025cc]'
                    }`}>
                      <Check className={`w-3 h-3 ${plan.popular ? 'text-[#0025cc]' : 'text-white'}`} />
                    </div>
                    <span className={`text-sm ${plan.popular ? 'text-[#0025cc]/90' : 'text-[#8d8d8d]'}`}>
                      {feature}
                    </span>
                  </div>
                ))}
              </div>

              {/* CTA Button */}
              <button
                disabled={plan.name === 'Premium'}
                className={`w-full py-4 rounded-lg font-medium transition-all ${
                  plan.name === 'Premium'
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : plan.popular
                    ? 'bg-gradient-to-r from-[#0025cc] to-[#001a99] text-white hover:shadow-xl transform hover:-translate-y-1'
                    : 'bg-gray-100 text-[#0025cc] hover:bg-[#0025cc] hover:text-white'
                }`}
              >
                {plan.name === 'Premium' ? 'Coming Soon' : 'Get Started'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
