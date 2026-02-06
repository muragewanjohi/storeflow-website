/**
 * Marketing Landing Page
 * 
 * Modern landing page for DukaNest platform
 * Inspired by Nazmart.net layout and design
 */

'use client';

import { useEffect } from 'react';
import { Navigation } from './navigation';
import { Hero } from './hero';
import { HowItWorks } from './how-it-works';
import { MoreFeatures } from './more-features';
import { Themes } from './themes';
import { Stats } from './stats';
import { WhyChooseUs } from './why-choose-us';
import { WhyEcommerce } from './why-ecommerce';
import { Pricing } from './pricing';
import { Testimonials } from './testimonials';
import { Blog } from './blog';
import { FAQ } from './faq';
import { Newsletter } from './newsletter';
import { LandingFooter } from './landing-footer';
import { Footer } from './footer';
import { trackEvent } from '@/lib/analytics/google-analytics';

export default function MarketingLandingPage() {
  useEffect(() => {
    // Track landing page specific event
    trackEvent('landing_page_view', {
      page_title: 'Landing Page',
    });

    // Handle anchor links when navigating from another page
    // This ensures smooth scrolling works when coming from /contact or other pages
    const handleHashScroll = () => {
      if (window.location.hash) {
        const hash = window.location.hash.substring(1);
        const element = document.getElementById(hash);
        if (element) {
          // Small delay to ensure page is fully rendered
          setTimeout(() => {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 100);
        }
      }
    };

    // Run on mount and when hash changes
    handleHashScroll();
    window.addEventListener('hashchange', handleHashScroll);

    return () => {
      window.removeEventListener('hashchange', handleHashScroll);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <Hero />
      <WhyEcommerce />
      <HowItWorks />
      <MoreFeatures />
      <Themes />
      {/* <Stats /> */}
      <Pricing />
      <Testimonials />
      <Blog />
      <FAQ />
      <Newsletter />
      <Footer />
    </div>
  );
}
