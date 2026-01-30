'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';

const SUBSCRIPTION_PATH = '/dashboard/subscription';

export default function PesapalDoneClient() {
  const searchParams = useSearchParams();
  const [redirected, setRedirected] = useState(false);

  const success = searchParams.get('success') === '1';
  const cancelled = searchParams.get('cancelled') === '1';
  const error = searchParams.get('error');

  useEffect(() => {
    if (redirected) return;
    const params = new URLSearchParams(searchParams.toString());
    const target = `${SUBSCRIPTION_PATH}${params.toString() ? `?${params.toString()}` : ''}`;
    if (typeof window !== 'undefined') {
      if (window.top !== window.self) {
        window.top!.location.href = target;
      } else {
        window.location.href = target;
      }
      setRedirected(true);
    }
  }, [searchParams, redirected]);

  const message = cancelled
    ? 'Payment was cancelled.'
    : success
      ? 'Payment successful!'
      : error
        ? 'Payment could not be completed.'
        : 'Redirecting...';

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-6 p-8">
      {success ? (
        <CheckCircleIcon className="h-16 w-16 text-green-600 dark:text-green-400" />
      ) : error && !cancelled ? (
        <XCircleIcon className="h-16 w-16 text-destructive" />
      ) : null}
      <p className="text-center text-lg text-muted-foreground">{message}</p>
      <p className="text-sm text-muted-foreground">Redirecting you back...</p>
      <Button asChild variant="outline">
        <Link href={SUBSCRIPTION_PATH}>Back to subscription</Link>
      </Button>
    </div>
  );
}
