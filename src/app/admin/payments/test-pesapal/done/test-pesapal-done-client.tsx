'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';

const ADMIN_PAYMENTS_PATH = '/admin/payments';

export default function TestPesaPalDoneClient() {
  const searchParams = useSearchParams();
  const [redirected, setRedirected] = useState(false);

  const pesapal = searchParams.get('pesapal');
  const reason = searchParams.get('reason');
  const success = pesapal === 'success';

  useEffect(() => {
    if (redirected) return;
    const params = new URLSearchParams();
    if (pesapal) params.set('pesapal', pesapal);
    if (reason) params.set('reason', reason);
    const qs = params.toString();
    const target = `${ADMIN_PAYMENTS_PATH}${qs ? `?${qs}` : ''}`;
    if (typeof window !== 'undefined') {
      if (window.top !== window.self) {
        window.top!.location.href = target;
      } else {
        window.location.href = target;
      }
      setRedirected(true);
    }
  }, [searchParams, pesapal, reason, redirected]);

  const message = success
    ? 'Payment successful!'
    : pesapal === 'error' || pesapal === 'not_found'
      ? 'Payment could not be completed.'
      : 'Redirecting...';

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-6 p-8">
      {success ? (
        <CheckCircleIcon className="h-16 w-16 text-green-600 dark:text-green-400" />
      ) : pesapal && pesapal !== 'success' ? (
        <XCircleIcon className="h-16 w-16 text-destructive" />
      ) : null}
      <p className="text-center text-lg text-muted-foreground">{message}</p>
      <p className="text-sm text-muted-foreground">Redirecting you back...</p>
      <Button asChild variant="outline">
        <Link href={ADMIN_PAYMENTS_PATH}>Back to payments</Link>
      </Button>
    </div>
  );
}
