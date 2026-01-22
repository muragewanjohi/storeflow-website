'use client';

/**
 * Detailed Pricing Page
 * 
 * Comprehensive pricing page with full feature comparison table
 * Following best practices from Shopify, WooCommerce, and BigCommerce
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ArrowRight, Loader2, Zap, X, Check } from 'lucide-react';
import { detectUserLocationClient, detectLocationByIP } from '@/lib/pricing/location-client';
import { getPlanFeatures } from '@/lib/pricing/features';

interface PricingPlan {
  id: string;
  name: string;
  price: number;
  duration_months: number;
  trial_days: number | null;
  features: any;
  status: string | null;
  currency?: 'KES' | 'USD';
  currencySymbol?: 'Ksh' | '$';
}

interface PricingResponse {
  plans: PricingPlan[];
  location?: {
    country: string;
    currency: 'KES' | 'USD';
    currencySymbol: 'Ksh' | '$';
  };
}

// Comprehensive feature categories for comparison table
interface FeatureCategory {
  category: string;
  features: {
    name: string;
    basic: string | boolean;
    pro: string | boolean;
    premium: string | boolean;
  }[];
}

const featureCategories: FeatureCategory[] = [
  {
    category: 'Store Management',
    features: [
      { name: 'Staff Users', basic: '1', pro: '5', premium: '10' },
      { name: 'Products', basic: '100', pro: '1,000', premium: 'Unlimited' },
      { name: 'Orders per Month', basic: '500', pro: '5,000', premium: 'Unlimited' },
      { name: 'Storage', basic: '5 GB', pro: '25 GB', premium: '200 GB' },
      { name: 'Customers', basic: '1,000', pro: '10,000', premium: 'Unlimited' },
    ],
  },
  {
    category: 'Content & Pages',
    features: [
      { name: 'Custom Pages', basic: '10', pro: '50', premium: 'Unlimited' },
      { name: 'Blog Posts', basic: 'Unlimited', pro: '100', premium: 'Unlimited' },
      { name: 'Languages', basic: '2', pro: '4', premium: 'Unlimited' },
      { name: 'Custom Themes', basic: true, pro: true, premium: true },
      { name: 'Theme Customization', basic: true, pro: true, premium: true },
    ],
  },
  {
    category: 'E-commerce Features',
    features: [
      { name: 'Product Catalog', basic: true, pro: true, premium: true },
      { name: 'Shopping Cart', basic: true, pro: true, premium: true },
      { name: 'Checkout System', basic: true, pro: true, premium: true },
      { name: 'Payment Methods', basic: 'Cash, M-Pesa', pro: 'Cash, M-Pesa, Stripe', premium: 'All Payment Methods' },
      { name: 'Delivery Zones', basic: true, pro: true, premium: true },
      { name: 'Tax Management', basic: true, pro: true, premium: true },
      { name: 'Inventory Management', basic: true, pro: true, premium: true },
      { name: 'Order Tracking', basic: true, pro: true, premium: true },
    ],
  },
  {
    category: 'Marketing & Sales',
    features: [
      { name: 'Sales & Discounts', basic: true, pro: true, premium: true },
      { name: 'Abandoned Cart Recovery', basic: false, pro: 'Coming Soon', premium: true },
      { name: 'Gift Cards', basic: false, pro: 'Coming Soon', premium: true },
      { name: 'Email Marketing', basic: true, pro: true, premium: true },
      { name: 'SEO Tools', basic: true, pro: true, premium: true },
    ],
  },
  {
    category: 'Analytics & Reports',
    features: [
      { name: 'Basic Reports', basic: true, pro: true, premium: true },
      { name: 'Advanced Reports', basic: true, pro: true, premium: true },
      { name: 'Advanced Analytics', basic: false, pro: false, premium: true },
      { name: 'Sales Dashboard', basic: true, pro: true, premium: true },
      { name: 'Customer Analytics', basic: true, pro: true, premium: true },
    ],
  },
  {
    category: 'Support & Services',
    features: [
      { name: 'Email Support', basic: true, pro: true, premium: true },
      { name: 'Priority Support', basic: false, pro: true, premium: true },
      { name: 'Chat Support', basic: false, pro: false, premium: true },
      { name: 'Documentation', basic: true, pro: true, premium: true },
      { name: 'Video Tutorials', basic: true, pro: true, premium: true },
    ],
  },
  {
    category: 'Advanced Features',
    features: [
      { name: 'API Access', basic: false, pro: false, premium: true },
      { name: 'Custom Domain', basic: false, pro: 'Coming Soon', premium: 'Coming Soon' },
      { name: 'Automatic Payment Verification', basic: false, pro: 'Coming Soon', premium: 'Coming Soon' },
      { name: 'White Label Options', basic: false, pro: false, premium: 'Available' },
      { name: 'Multi-store Management', basic: false, pro: false, premium: 'Available' },
    ],
  },
];

export default function PricingPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currencySymbol, setCurrencySymbol] = useState<'Ksh' | '$'>('$');
  const [isKenya, setIsKenya] = useState(false);

  useEffect(() => {
    async function fetchPlans() {
      try {
        let locationInfo = detectUserLocationClient();
        
        if (!locationInfo.isKenya) {
          try {
            locationInfo = await detectLocationByIP();
          } catch (ipError) {
            console.log('IP detection failed, using browser detection');
          }
        }

        setIsKenya(locationInfo.isKenya);
        setCurrencySymbol(locationInfo.currencySymbol);

        const response = await fetch('/api/pricing', {
          headers: {
            'X-User-Country': locationInfo.isKenya ? 'KE' : 'US',
            'X-User-Currency': locationInfo.currency,
          },
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch pricing plans');
        }
        const data: PricingResponse = await response.json();
        
        setPlans(data.plans || []);
        
        if (data.location?.currencySymbol) {
          setCurrencySymbol(data.location.currencySymbol);
        } else {
          setCurrencySymbol(locationInfo.currencySymbol);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load pricing plans');
      } finally {
        setIsLoading(false);
      }
    }
    fetchPlans();
  }, []);

  const handleSelectPlan = (planId: string) => {
    router.push(`/register?plan=${planId}`);
  };

  const getPlanByName = (name: string): PricingPlan | undefined => {
    return plans.find(p => p.name.toLowerCase().includes(name.toLowerCase()));
  };

  const basicPlan = getPlanByName('basic');
  const proPlan = getPlanByName('pro') || getPlanByName('standard');
  const premiumPlan = getPlanByName('premium') || getPlanByName('enterprise');

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Loader2 className="h-8 w-8 animate-spin text-[#0025cc]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button asChild>
            <Link href="/">Go Back Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold text-[#0025cc]">
              DukaNest
            </Link>
            <div className="flex items-center gap-4">
              <Button asChild variant="ghost">
                <Link href="/#pricing">View Summary</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/">Back to Home</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-[#0025cc] font-medium mb-2">Pricing Plans</p>
          <h1 className="text-4xl lg:text-6xl font-bold text-[#0c0528] mb-4">
            Choose the Perfect Plan for Your Business
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Compare all features and find the plan that fits your needs. All plans include a 14-day free trial.
          </p>
        </div>
      </section>

      {/* Pricing Cards - Quick Overview */}
      <section className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {[basicPlan, proPlan, premiumPlan].map((plan, index) => {
              if (!plan) return null;
              const isPopular = index === 1;
              
              return (
                <div
                  key={plan.id}
                  className={`relative bg-white rounded-2xl p-8 transition-all duration-300 ${
                    isPopular
                      ? 'shadow-2xl transform scale-105 border-2 border-[#0025cc]'
                      : 'shadow-lg hover:shadow-xl'
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <span className="bg-gradient-to-r from-[#0025cc] to-[#001a99] text-white px-6 py-2 rounded-full text-sm font-medium shadow-lg flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div className="text-center mb-6">
                    <h3 className={`text-2xl font-bold mb-2 ${isPopular ? 'text-[#5B8AC4]' : 'text-[#0c0528]'}`}>
                      {plan.name}
                    </h3>
                    <div className="flex items-baseline justify-center">
                      <span className={`text-5xl font-bold ${isPopular ? 'text-[#5B8AC4]' : 'text-[#0c0528]'}`}>
                        {(plan.currencySymbol || currencySymbol) === 'Ksh' 
                          ? `Ksh ${plan.price.toLocaleString('en-KE')}`
                          : `${(plan.currencySymbol || currencySymbol)}${plan.price.toFixed(2)}`
                        }
                      </span>
                      <span className={`ml-2 ${isPopular ? 'text-[#5B8AC4]/80' : 'text-[#8d8d8d]'}`}>
                        /month
                      </span>
                    </div>
                    {plan.trial_days && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {plan.trial_days}-Day Free Trial
                      </p>
                    )}
                  </div>

                  <Button
                    onClick={() => handleSelectPlan(plan.id)}
                    className={`w-full ${
                      isPopular
                        ? 'bg-gradient-to-r from-[#0025cc] to-[#001a99] text-white hover:shadow-xl'
                        : 'bg-gray-100 text-[#0025cc] hover:bg-[#0025cc] hover:text-white'
                    }`}
                  >
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-white/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-[#0c0528] mb-4">
              Compare All Features
            </h2>
            <p className="text-muted-foreground">
              See exactly what&apos;s included in each plan
            </p>
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left p-4 font-semibold text-[#0c0528]">Feature</th>
                  <th className="text-center p-4 font-semibold text-[#0c0528]">
                    {basicPlan?.name || 'Basic'}
                  </th>
                  <th className="text-center p-4 font-semibold text-[#0c0528] bg-blue-50">
                    {proPlan?.name || 'Pro'}
                  </th>
                  <th className="text-center p-4 font-semibold text-[#0c0528]">
                    {premiumPlan?.name || 'Premium'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {featureCategories.map((category, catIndex) => (
                  <React.Fragment key={catIndex}>
                    <tr className="bg-gray-50">
                      <td colSpan={4} className="p-4 font-bold text-[#0025cc] text-lg">
                        {category.category}
                      </td>
                    </tr>
                    {category.features.map((feature, featIndex) => (
                      <tr key={featIndex} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="p-4 text-[#0c0528]">{feature.name}</td>
                        <td className="p-4 text-center">
                          {typeof feature.basic === 'boolean' ? (
                            feature.basic ? (
                              <Check className="w-5 h-5 text-green-600 mx-auto" />
                            ) : (
                              <X className="w-5 h-5 text-gray-300 mx-auto" />
                            )
                          ) : (
                            <span className="text-sm text-muted-foreground">{feature.basic}</span>
                          )}
                        </td>
                        <td className="p-4 text-center bg-blue-50/30">
                          {typeof feature.pro === 'boolean' ? (
                            feature.pro ? (
                              <Check className="w-5 h-5 text-green-600 mx-auto" />
                            ) : (
                              <X className="w-5 h-5 text-gray-300 mx-auto" />
                            )
                          ) : (
                            <span className="text-sm text-muted-foreground">{feature.pro}</span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          {typeof feature.premium === 'boolean' ? (
                            feature.premium ? (
                              <Check className="w-5 h-5 text-green-600 mx-auto" />
                            ) : (
                              <X className="w-5 h-5 text-gray-300 mx-auto" />
                            )
                          ) : (
                            <span className="text-sm text-muted-foreground">{feature.premium}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden space-y-8">
            {featureCategories.map((category, catIndex) => (
              <div key={catIndex} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="bg-[#0025cc] text-white p-4 font-bold text-lg">
                  {category.category}
                </div>
                <div className="divide-y">
                  {category.features.map((feature, featIndex) => (
                    <div key={featIndex} className="p-4">
                      <div className="font-semibold text-[#0c0528] mb-3">{feature.name}</div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div className="text-center">
                          <div className="font-medium text-muted-foreground mb-1">Basic</div>
                          {typeof feature.basic === 'boolean' ? (
                            feature.basic ? (
                              <Check className="w-5 h-5 text-green-600 mx-auto" />
                            ) : (
                              <X className="w-5 h-5 text-gray-300 mx-auto" />
                            )
                          ) : (
                            <span className="text-muted-foreground">{feature.basic}</span>
                          )}
                        </div>
                        <div className="text-center bg-blue-50/30 rounded p-2">
                          <div className="font-medium text-muted-foreground mb-1">Pro</div>
                          {typeof feature.pro === 'boolean' ? (
                            feature.pro ? (
                              <Check className="w-5 h-5 text-green-600 mx-auto" />
                            ) : (
                              <X className="w-5 h-5 text-gray-300 mx-auto" />
                            )
                          ) : (
                            <span className="text-muted-foreground">{feature.pro}</span>
                          )}
                        </div>
                        <div className="text-center">
                          <div className="font-medium text-muted-foreground mb-1">Premium</div>
                          {typeof feature.premium === 'boolean' ? (
                            feature.premium ? (
                              <Check className="w-5 h-5 text-green-600 mx-auto" />
                            ) : (
                              <X className="w-5 h-5 text-gray-300 mx-auto" />
                            )
                          ) : (
                            <span className="text-muted-foreground">{feature.premium}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-[#0c0528] mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Start your 14-day free trial. No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {basicPlan && (
              <Button
                onClick={() => handleSelectPlan(basicPlan.id)}
                variant="outline"
                size="lg"
                className="bg-white"
              >
                Start with {basicPlan.name}
              </Button>
            )}
            {proPlan && (
              <Button
                onClick={() => handleSelectPlan(proPlan.id)}
                size="lg"
                className="bg-gradient-to-r from-[#0025cc] to-[#001a99] text-white"
              >
                Start with {proPlan.name}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-8">
            All plans include a free trial. Cancel anytime.
          </p>
        </div>
      </section>
    </div>
  );
}
