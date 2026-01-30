/**
 * Test PesaPal Payment Page
 *
 * Allows landlord admin to test PesaPal payments by entering amount.
 * User is redirected to PesaPal to complete payment (card or M-Pesa).
 */

import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import TestPesaPalClient from './test-pesapal-client';

export default function TestPesaPalPage() {
  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/payments">
            <ArrowLeftIcon className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Test PesaPal Payment
          </h1>
          <p className="text-muted-foreground mt-2">
            Enter amount to test PesaPal payment (card or M-Pesa on PesaPal)
          </p>
        </div>
      </div>
      <TestPesaPalClient />
    </div>
  );
}
