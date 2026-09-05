/**
 * Test PesaPal embedded checkout page.
 * Loads PesaPal payment in an iframe so users stay on our site.
 */

import TestPesaPalCheckoutClient from './test-pesapal-checkout-client';

export default function TestPesaPalCheckoutPage() {
  return <TestPesaPalCheckoutClient />;
}
