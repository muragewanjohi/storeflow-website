'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';

const pricingPlans = {
  monthly: [
    {
      name: 'Free',
      badge: 'Risk free',
      price: '$0',
      period: '/mo',
      features: ['Page 20', 'Product 20', 'Blog 20', 'Storage 2000 MB'],
      cta: 'Get Now',
      highlight: false,
    },
    {
      name: 'Business',
      badge: 'Advance Plan',
      price: '$350',
      period: '/mo',
      features: ['Page 20', 'Product 20', 'Blog 20', 'Storage 100 MB'],
      cta: 'Try Now',
      highlight: false,
    },
    {
      name: 'Ultimate',
      badge: 'Ultimate Plan',
      price: '$599',
      period: '/mo',
      features: ['Page 50', 'Product 500', 'Blog 100', 'Storage 500 MB'],
      cta: 'Try Now',
      highlight: true,
    },
  ],
  yearly: [
    {
      name: 'Royal',
      badge: 'Large Plan',
      price: '$500',
      period: '/yr',
      features: ['Page 50', 'Product 50', 'Blog 50', 'Storage 500 MB'],
      cta: 'Try Now',
      highlight: false,
    },
    {
      name: 'Digital Plan',
      badge: 'DigiPlan',
      price: '$799',
      period: '/yr',
      features: ['Page 50', 'Product 50', 'Blog 50', 'Storage 500 MB'],
      cta: 'Buy Now',
      highlight: false,
    },
    {
      name: 'All Feature Plan',
      badge: 'All Feature Plan',
      price: '$789',
      period: '/yr',
      features: ['Page 50', 'Product 50', 'Blog 50', 'Storage 500 MB'],
      cta: 'Try Now',
      highlight: true,
    },
  ],
  lifetime: [
    {
      name: 'Enterprise',
      badge: 'Medium Plan',
      price: '$999',
      period: '/lt',
      features: ['Page 100', 'Product 200', 'Blog 100', 'Storage 50 MB'],
      cta: 'Buy Now',
      highlight: false,
    },
    {
      name: 'Life Time',
      badge: 'Life Time Package',
      price: '$889',
      period: '/lt',
      features: ['Page 100', 'Product 100', 'Blog 100', 'Storage 500 MB'],
      cta: 'Buy Now',
      highlight: false,
    },
  ],
};

export function Pricing() {
  const [pricingTab, setPricingTab] = useState<'monthly' | 'yearly' | 'lifetime'>('monthly');

  return (
    <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Pricing Plan</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit.
          </p>
          
          {/* Pricing Tabs */}
          <div className="flex justify-center gap-4 mb-12">
            <Button
              variant={pricingTab === 'monthly' ? 'default' : 'outline'}
              onClick={() => setPricingTab('monthly')}
            >
              Monthly
            </Button>
            <Button
              variant={pricingTab === 'yearly' ? 'default' : 'outline'}
              onClick={() => setPricingTab('yearly')}
            >
              Yearly
            </Button>
            <Button
              variant={pricingTab === 'lifetime' ? 'default' : 'outline'}
              onClick={() => setPricingTab('lifetime')}
            >
              Lifetime
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {pricingPlans[pricingTab].map((plan, index) => (
            <div
              key={index}
              className={`p-8 rounded-lg border-2 ${
                plan.highlight ? 'border-primary bg-primary/5' : 'bg-background'
              } hover:shadow-lg transition-all duration-300 relative`}
            >
              {plan.highlight && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </span>
                </div>
              )}
              <div className="text-sm text-muted-foreground mb-2">{plan.badge}</div>
              <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold">{plan.price}</span>
                <span className="text-muted-foreground">{plan.period}</span>
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center space-x-3">
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              <div className="mb-4">
                <Link href="#pricing" className="text-sm text-primary hover:underline">
                  View All Features
                </Link>
              </div>
              <Button asChild className="w-full" variant={plan.highlight ? 'default' : 'outline'}>
                <Link href="/pricing">{plan.cta}</Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
