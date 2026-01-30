/**
 * Test PesaPal Client Component
 *
 * Client component for testing PesaPal payments (card or M-Pesa via PesaPal).
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowPathIcon, ArrowLeftIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import Link from 'next/link';

interface PesapalEnv {
  environment: string;
  isSandbox: boolean;
}

export default function TestPesaPalClient() {
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pesapalEnv, setPesapalEnv] = useState<PesapalEnv | null>(null);

  useEffect(() => {
    fetch('/api/admin/payments/pesapal-env')
      .then((res) => res.json())
      .then((data) => setPesapalEnv(data))
      .catch(() => setPesapalEnv(null));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;

    if (!amount.trim() || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast.error('Please enter a valid amount greater than 0');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/admin/payments/test-pesapal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Number(amount), embed: true }),
      });

      const data = await response.json();

      if (response.ok && data.redirect_url) {
        toast.success('Opening PesaPal in this page...', {
          description: 'Complete payment using card or M-Pesa. You can stay on our site.',
          duration: 2000,
        });
        const checkoutUrl = `/admin/payments/test-pesapal/checkout?redirect_url=${encodeURIComponent(data.redirect_url)}`;
        window.location.href = checkoutUrl;
        return;
      }

      toast.error(data.error || 'Failed to initiate PesaPal payment');
      setIsSubmitting(false);
    } catch (error) {
      console.error('Error initiating test PesaPal payment:', error);
      toast.error('An error occurred while initiating the payment');
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Test PesaPal Payment</CardTitle>
            <CardDescription>
              Enter amount to test PesaPal. You will be redirected to PesaPal to
              pay with card or M-Pesa.
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/payments">
              <ArrowLeftIcon className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {pesapalEnv && (
          <Alert
            className={`mb-6 ${pesapalEnv.isSandbox ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : 'border-orange-500 bg-orange-50 dark:bg-orange-950'}`}
          >
            <InformationCircleIcon className="h-4 w-4" />
            <AlertDescription>
              <strong>Environment:</strong>{' '}
              {pesapalEnv.environment.toUpperCase()}
              {pesapalEnv.isSandbox && (
                <span className="text-blue-700 dark:text-blue-300">
                  {' '}
                  – Use PesaPal sandbox test card/M-Pesa
                </span>
              )}
              {!pesapalEnv.isSandbox && (
                <span className="text-orange-700 dark:text-orange-300 font-semibold">
                  {' '}
                  – Live: real money will be charged
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (KES)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="100"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isSubmitting}
              min="1"
              step="0.01"
              required
            />
            <p className="text-sm text-muted-foreground">
              Enter amount in Kenyan Shillings. You can pay with card or M-Pesa
              on PesaPal.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <ArrowPathIcon className="mr-2 h-4 w-4 animate-spin" />
                  Redirecting...
                </>
              ) : (
                'Test PesaPal Payment'
              )}
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href="/admin/payments">Cancel</Link>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
