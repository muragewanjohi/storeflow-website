/**
 * PesaPal embedded checkout page.
 * Loads PesaPal payment in an iframe so users stay on our site.
 * Only allows PesaPal domains for security.
 */

import PesapalCheckoutClient from './pesapal-checkout-client';

export default function PesapalCheckoutPage() {
  return <PesapalCheckoutClient />;
}
