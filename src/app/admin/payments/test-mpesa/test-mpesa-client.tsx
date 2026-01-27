/**
 * Test Mpesa Client Component
 * 
 * Client component for testing Mpesa payments
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowPathIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import Link from 'next/link';

export default function TestMpesaClient() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phoneNumber.trim()) {
      toast.error('Please enter a phone number');
      return;
    }

    if (!amount.trim() || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast.error('Please enter a valid amount greater than 0');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/admin/payments/test-mpesa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone_number: phoneNumber.trim(),
          amount: Number(amount),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Mpesa payment initiated successfully!', {
          description: data.message || 'Check your phone to complete the payment.',
          duration: 5000,
        });
        // Reset form
        setPhoneNumber('');
        setAmount('');
        // Optionally redirect to payments page after a delay
        setTimeout(() => {
          router.push('/admin/payments');
        }, 2000);
      } else {
        toast.error(data.error || 'Failed to initiate Mpesa payment');
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error('Error initiating test payment:', error);
      toast.error('An error occurred while initiating the payment');
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Test Mpesa Payment</CardTitle>
            <CardDescription>
              Enter phone number and amount to test Mpesa STK Push payment
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
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Phone Number</Label>
            <Input
              id="phoneNumber"
              type="text"
              placeholder="254712345678 or 0712345678"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              disabled={isSubmitting}
              required
            />
            <p className="text-sm text-muted-foreground">
              Enter phone number in format: 254XXXXXXXXX or 0XXXXXXXXX
            </p>
          </div>

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
              step="1"
              required
            />
            <p className="text-sm text-muted-foreground">
              Enter amount in Kenyan Shillings (KES). Must be a whole number.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <ArrowPathIcon className="mr-2 h-4 w-4 animate-spin" />
                  Initiating Payment...
                </>
              ) : (
                'Initiate Payment'
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
