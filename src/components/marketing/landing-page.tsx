/**
 * Marketing Landing Page
 *
 * Premium SaaS landing page for DukaNest — see docs/context/design/01-HomepageRedesign.md
 */

'use client';

import { useEffect } from 'react';
import { Navigation } from './navigation';
import { Hero } from './hero';
import { SocialProof } from './social-proof';
import { ProblemSolution } from './problem-solution';
import { ProductShowcase } from './product-showcase';
import { BuiltForKenya } from './built-for-kenya';
import { HowItWorks } from './how-it-works';
import { Testimonials } from './testimonials';
import { RevenueCalculator } from './revenue-calculator';
import { Pricing } from './pricing';
import { ComparisonSection } from './comparison-section';
import { FAQ } from './faq';
import { FinalCTA } from './final-cta';
import { Footer } from './footer';
import { MobileLandingPage } from './mobile-landing-page';
import { trackEvent } from '@/lib/analytics/google-analytics';

export default function MarketingLandingPage() {
  useEffect(() => {
    trackEvent('landing_page_view', {
      page_title: 'Landing Page',
    });

    const handleHashScroll = () => {
      if (window.location.hash) {
        const hash = window.location.hash.substring(1);
        const element = document.getElementById(hash);
        if (element) {
          setTimeout(() => {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 100);
        }
      }
    };

    handleHashScroll();
    window.addEventListener('hashchange', handleHashScroll);

    return () => {
      window.removeEventListener('hashchange', handleHashScroll);
    };
  }, []);

  return (
      <div className="min-h-screen bg-white antialiased">
        <div className="md:hidden">
          <MobileLandingPage />
        </div>

        <div className="hidden md:block">
          <Navigation />
          <Hero />
          <SocialProof />
          <ProblemSolution />
          <ProductShowcase />
          <BuiltForKenya />
          <HowItWorks />
          <Testimonials />
          <RevenueCalculator />
          <Pricing />
          <ComparisonSection />
          <FAQ />
          <FinalCTA />
          <Footer />
        </div>
      </div>
  );
}
