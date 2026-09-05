/**
 * PesaPal done page (embedded flow).
 * When loaded in an iframe after callback, breaks out and redirects to subscription page.
 */

import PesapalDoneClient from './pesapal-done-client';

export default function PesapalDonePage() {
  return <PesapalDoneClient />;
}
