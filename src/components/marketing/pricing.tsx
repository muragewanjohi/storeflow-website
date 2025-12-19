'use client';

import { Check, Zap, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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

export function Pricing() {
  const router = useRouter();
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currencySymbol, setCurrencySymbol] = useState<'Ksh' | '$'>('$');

  useEffect(() => {
    async function fetchPlans() {
      try {
        // First, detect location on client side
        let locationInfo = detectUserLocationClient();
        
        // Try IP-based detection as fallback (only if browser detection didn't find Kenya)
        if (!locationInfo.isKenya) {
          try {
            locationInfo = await detectLocationByIP();
          } catch (ipError) {
            // If IP detection fails, use browser detection result
            console.log('IP detection failed, using browser detection');
          }
        }

        setCurrencySymbol(locationInfo.currencySymbol);

        // Fetch plans with location header
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
        
        // API should already return correct prices based on location
        setPlans(data.plans || []);
        
        // Use client-detected currency if API didn't provide it
        if (data.location?.currencySymbol) {
          setCurrencySymbol(data.location.currencySymbol);
        } else {
          setCurrencySymbol(locationInfo.currencySymbol);
        }
      } catch (err) {
        console.error('Error fetching pricing plans:', err);
        // On error, show empty state or fallback
        setPlans([]);
      } finally {
        setIsLoading(false);
      }
    }
    fetchPlans();
  }, []);

  const handleSelectPlan = (planId: string) => {
    router.push(`/register?plan=${planId}`);
  };

  // Use original hardcoded features instead of formatting from API
  const getFeatures = (planName: string): string[] => {
    return getPlanFeatures(planName);
  };

  if (isLoading) {
    return (
      <section id="pricing" className="py-20 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#0025cc]" />
          </div>
        </div>
      </section>
    );
  }

  if (plans.length === 0) {
    return null; // Don't show pricing section if no plans available
  }

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
          {plans.map((plan, index) => {
            const features = getFeatures(plan.name);
            const isPopular = index === Math.floor(plans.length / 2); // Middle plan is popular
            
            return (
              <div
                key={plan.id}
                className={`relative bg-white rounded-2xl p-8 transition-all duration-300 ${
                  isPopular
                    ? 'shadow-2xl transform scale-105 border-2 border-[#0025cc]'
                    : 'shadow-lg hover:shadow-xl hover:transform hover:scale-105'
                }`}
              >
                {/* Popular Badge */}
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-[#0025cc] to-[#001a99] text-white px-6 py-2 rounded-full text-sm font-medium shadow-lg flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      Most Popular
                    </span>
                  </div>
                )}

                {/* Plan Name */}
                <div className="text-center mb-6">
                  <h3 className={`text-2xl font-bold mb-2 ${isPopular ? 'text-[#5B8AC4]' : 'text-[#0c0528]'}`}>
                    {plan.name}
                  </h3>
                </div>

                {/* Price */}
                <div className="text-center mb-6">
                  <div className="flex items-baseline justify-center">
                    <span className={`text-5xl font-bold ${isPopular ? 'text-[#5B8AC4]' : 'text-[#0c0528]'}`}>
                      {(plan.currencySymbol || currencySymbol) === 'Ksh' 
                        ? `Ksh ${plan.price.toLocaleString('en-KE')}`
                        : `${(plan.currencySymbol || currencySymbol)}${plan.price.toFixed(2)}`
                      }
                    </span>
                    <span className={`ml-2 ${isPopular ? 'text-[#5B8AC4]/80' : 'text-[#8d8d8d]'}`}>
                      / {plan.duration_months === 1 ? 'month' : `${plan.duration_months} months`}
                    </span>
                  </div>
                  {plan.trial_days && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {plan.trial_days}-Day Free Trial
                    </p>
                  )}
                </div>

                {/* What's Included */}
                <div className={`mb-6 ${isPopular ? 'text-[#0025cc]/90' : 'text-[#0c0528]'}`}>
                  <p className="font-semibold text-lg mb-4">{`What's Included`}</p>
                </div>

                {/* Features List */}
                <div className="space-y-3 mb-8">
                  {features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-start gap-3">
                      <div className={`rounded-full p-1 mt-0.5 ${
                        isPopular ? 'bg-[#0025cc]/20' : 'bg-[#0025cc]'
                      }`}>
                        <Check className={`w-3 h-3 ${isPopular ? 'text-[#0025cc]' : 'text-white'}`} />
                      </div>
                      <span className={`text-sm ${isPopular ? 'text-[#0025cc]/90' : 'text-[#8d8d8d]'}`}>
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>

                {/* CTA Button */}
                <button
                  onClick={() => plan.name.toLowerCase() !== 'premium' && handleSelectPlan(plan.id)}
                  disabled={plan.name.toLowerCase() === 'premium'}
                  className={`w-full py-4 rounded-lg font-medium transition-all ${
                    plan.name.toLowerCase() === 'premium'
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : isPopular
                      ? 'bg-gradient-to-r from-[#0025cc] to-[#001a99] text-white hover:shadow-xl transform hover:-translate-y-1'
                      : 'bg-gray-100 text-[#0025cc] hover:bg-[#0025cc] hover:text-white'
                  }`}
                >
                  {plan.name.toLowerCase() === 'premium' ? 'Coming Soon' : 'Get Started'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
