/**
 * Marketing Landing Page Wrapper
 *
 * Server component: loads Inter font and renders the client landing page.
 */

import { Inter } from 'next/font/google';
import MarketingLandingPage from './landing-page';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
});

export default function MarketingLandingPageWrapper() {
  return (
    <div className={inter.className}>
      <MarketingLandingPage />
    </div>
  );
}
