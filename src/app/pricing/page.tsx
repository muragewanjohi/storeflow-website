/**
 * Pricing Page
 * 
 * Public page where users can view and select pricing plans
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';
import { detectUserLocationClient, detectLocationByIP } from '@/lib/pricing/location-client';

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

export default function PricingPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
        setPlans(data.plans || []);
        
        // Use client-detected currency if API didn't provide it
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

  const formatFeatures = (features: any): string[] => {
    if (!features || typeof features !== 'object') return [];
    
    const featureList: string[] = [];
    if (features.max_products !== undefined) {
      featureList.push(
        features.max_products === -1 
          ? 'Unlimited Products' 
          : `Up to ${features.max_products} Products`
      );
    }
    if (features.max_orders !== undefined) {
      featureList.push(
        features.max_orders === -1 
          ? 'Unlimited Orders' 
          : `Up to ${features.max_orders} Orders`
      );
    }
    if (features.max_customers !== undefined) {
      featureList.push(
        features.max_customers === -1 
          ? 'Unlimited Customers' 
          : `Up to ${features.max_customers} Customers`
      );
    }
    if (features.max_storage_mb !== undefined) {
      const storageGB = features.max_storage_mb / 1024;
      featureList.push(
        features.max_storage_mb === -1 
          ? 'Unlimited Storage' 
          : `${storageGB} GB Storage`
      );
    }
    if (features.max_pages !== undefined) {
      featureList.push(
        features.max_pages === -1 
          ? 'Unlimited Pages' 
          : `Up to ${features.max_pages} Pages`
      );
    }
    if (features.max_blogs !== undefined) {
      featureList.push(
        features.max_blogs === -1 
          ? 'Unlimited Blog Posts' 
          : `Up to ${features.max_blogs} Blog Posts`
      );
    }
    if (features.max_staff_users !== undefined) {
      featureList.push(
        features.max_staff_users === -1 
          ? 'Unlimited Staff Users' 
          : `Up to ${features.max_staff_users} Staff Users`
      );
    }
    return featureList;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
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
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold text-primary">
              DukaNest
            </Link>
            <Button asChild variant="outline">
              <Link href="/">Back to Home</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Pricing Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Choose Your Plan</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Select the perfect plan for your business. All plans include a 14-day free trial.
            </p>
          </div>

          {plans.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No pricing plans available at the moment.</p>
              <Button asChild>
                <Link href="/">Go Back Home</Link>
              </Button>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {plans.map((plan, index) => {
                const features = formatFeatures(plan.features);
                const isPopular = index === Math.floor(plans.length / 2); // Middle plan is popular
                
                return (
                  <div
                    key={plan.id}
                    className={`p-8 rounded-lg border-2 ${
                      isPopular ? 'border-primary bg-primary/5' : 'bg-background'
                    } hover:shadow-lg transition-all duration-300 relative`}
                  >
                    {isPopular && (
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                        <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                          Most Popular
                        </span>
                      </div>
                    )}
                    <div className="text-sm text-muted-foreground mb-2">
                      {plan.trial_days ? `${plan.trial_days}-Day Trial` : 'No Trial'}
                    </div>
                    <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                    <div className="mb-6">
                      <span className="text-4xl font-bold">
                        {plan.currencySymbol || currencySymbol}
                        {plan.currencySymbol === 'Ksh' 
                          ? plan.price.toLocaleString('en-KE')
                          : plan.price.toFixed(2)
                        }
                      </span>
                      <span className="text-muted-foreground">/{plan.duration_months === 1 ? 'month' : `${plan.duration_months} months`}</span>
                    </div>
                    <ul className="space-y-3 mb-8">
                      {features.map((feature, idx) => (
                        <li key={idx} className="flex items-center space-x-3">
                          <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      onClick={() => handleSelectPlan(plan.id)}
                      className={`w-full ${isPopular ? '' : 'variant-outline'}`}
                      variant={isPopular ? 'default' : 'outline'}
                    >
                      Get Started
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="text-center mt-12">
            <p className="text-muted-foreground mb-4">
              All plans include 14-day free trial. No credit card required.
            </p>
            <Link href="/" className="text-primary hover:underline text-sm font-medium">
              ← Back to Home
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

