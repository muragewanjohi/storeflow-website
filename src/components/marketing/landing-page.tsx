/**
 * Marketing Landing Page
 * 
 * Modern landing page for DukaNest platform
 * Inspired by Nazmart.net layout and design
 */

'use client';

import { Navigation } from './navigation';
import { Hero } from './hero';
import { HowItWorks } from './how-it-works';
import { MoreFeatures } from './more-features';
import { Themes } from './themes';
import { Stats } from './stats';
import { WhyChooseUs } from './why-choose-us';
import { Pricing } from './pricing';
import { Testimonials } from './testimonials';
import { Blog } from './blog';
import { FAQ } from './faq';
import { Newsletter } from './newsletter';
import { LandingFooter } from './landing-footer';

export default function MarketingLandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <Hero />
      <HowItWorks />
      <MoreFeatures />
      <Themes />
      <Stats />
      <WhyChooseUs />
      <Pricing />
      <Testimonials />
      <Blog />
      <FAQ />
      <Newsletter />
      <LandingFooter />
    </div>
  );
}
