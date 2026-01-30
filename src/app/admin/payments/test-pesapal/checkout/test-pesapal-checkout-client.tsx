'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeftIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const ALLOWED_PESAPAL_ORIGINS = [
  'https://pay.pesapal.com',
  'https://cybqa.pesapal.com',
];

function isValidPesapalUrl(url: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    return ALLOWED_PESAPAL_ORIGINS.some(
      (origin) => parsed.origin === origin || parsed.href.startsWith(origin + '/')
    );
  } catch {
    return false;
  }
}

function TestPesaPalCheckoutContent() {
  const searchParams = useSearchParams();
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const url = searchParams.get('redirect_url');
    if (!url) {
      setError('Missing payment URL. Please start the test again from the test PesaPal page.');
      return;
    }
    const decoded = decodeURIComponent(url);
    if (!isValidPesapalUrl(decoded)) {
      setError('Invalid payment URL. Please start the test again from the test PesaPal page.');
      return;
    }
    setRedirectUrl(decoded);
  }, [searchParams]);

  const cancelled = searchParams.get('cancelled') === '1';

  if (cancelled) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Redirecting back...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto max-w-2xl py-12">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 dark:border-amber-800 dark:bg-amber-950">
          <ExclamationTriangleIcon className="h-10 w-10 text-amber-600 dark:text-amber-400" />
          <h2 className="mt-4 text-lg font-semibold">Cannot load payment</h2>
          <p className="mt-2 text-muted-foreground">{error}</p>
          <Button asChild className="mt-6">
            <Link href="/admin/payments/test-pesapal">
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              Back to test PesaPal
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!redirectUrl) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Loading payment...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[80vh]">
      <div className="border-b bg-muted/30 px-4 py-3 flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Complete your test payment below. You remain on our site.
        </p>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/payments/test-pesapal">Back to test</Link>
        </Button>
      </div>
      <div className="flex-1 w-full min-h-[70vh]">
        <iframe
          src={redirectUrl}
          title="PesaPal payment"
          className="w-full h-full min-h-[70vh] border-0"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation"
        />
      </div>
      <div className="border-t bg-muted/20 px-4 py-2 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <span>Payment complete?</span>
        <Link
          href="/admin/payments?pesapal=success"
          className="font-medium text-primary hover:underline"
        >
          Return to payments
        </Link>
      </div>
    </div>
  );
}

export default function TestPesaPalCheckoutClient() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      }
    >
      <TestPesaPalCheckoutContent />
    </Suspense>
  );
}
