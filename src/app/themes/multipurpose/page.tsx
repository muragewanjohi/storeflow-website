/**
 * Multipurpose Theme Page
 *
 * Dedicated page for the Multipurpose theme with cards per business type.
 * Users can filter by business type and click a card to open the demo store.
 */

import MarketingHeader from '@/components/marketing/header';
import { Footer as MarketingFooter } from '@/components/marketing/footer';
import MultipurposeThemeClient from './multipurpose-theme-client';

export const metadata = {
  title: 'Multipurpose Theme | DukaNest',
  description:
    'See the Multipurpose theme in action across different business types. Preview live demos for Electronics, Grocery, Fashion, and more.',
};

export default function MultipurposeThemePage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <MarketingHeader />
      <main className="flex-1">
        <MultipurposeThemeClient />
      </main>
      <MarketingFooter />
    </div>
  );
}
