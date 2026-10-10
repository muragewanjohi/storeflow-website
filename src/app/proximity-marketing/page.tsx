import type { Metadata } from 'next';
import ProximityMarketingPage from './proximity-marketing-page';

export const metadata: Metadata = {
  title: 'Proximity marketing | DukaNest',
  description:
    'Show a brand offer in the supermarket aisle where the shopper is standing. Vendors book a branch and product section. The store approves the card.',
  openGraph: {
    title: 'Proximity marketing | DukaNest',
    description:
      'A card in the supermarket app when a shopper pauses in a product section. Vendors book the section. The store approves what shoppers see.',
    type: 'website',
  },
};

export default function Page() {
  return <ProximityMarketingPage />;
}
