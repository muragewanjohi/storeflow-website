/**
 * Test PesaPal done page (embedded flow).
 * When loaded in an iframe after callback, breaks out and redirects to admin payments.
 */

import TestPesaPalDoneClient from './test-pesapal-done-client';

export default function TestPesaPalDonePage() {
  return <TestPesaPalDoneClient />;
}
