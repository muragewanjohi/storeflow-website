/**
 * Track Order Client Component
 * 
 * Allows customers to look up orders using order number and email
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';

export default function TrackOrderClient() {
  const router = useRouter();
  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleTrackOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!orderNumber.trim() || !email.trim()) {
      toast.error('Please enter both order number and email');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/orders/track?order_number=${encodeURIComponent(orderNumber)}&email=${encodeURIComponent(email)}`);
      const data = await response.json();

      if (response.ok && data.order) {
        // Redirect to order detail page
        router.push(`/orders/${data.order.id}?order_number=${orderNumber}&email=${encodeURIComponent(email)}`);
      } else {
        toast.error(data.error || 'Order not found. Please check your order number and email.');
      }
    } catch (error) {
      console.error('Error tracking order:', error);
      toast.error('Failed to track order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Track Your Order</CardTitle>
            <CardDescription>
              Enter your order number and email address to view your order status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleTrackOrder} className="space-y-4">
              <div>
                <Label htmlFor="order_number">Order Number</Label>
                <Input
                  id="order_number"
                  type="text"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  placeholder="e.g., ORD-123456"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  required
                  disabled={loading}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Use the email address you provided during checkout
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  'Searching...'
                ) : (
                  <>
                    <MagnifyingGlassIcon className="w-4 h-4 mr-2" />
                    Track Order
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t">
              <p className="text-sm text-muted-foreground text-center">
                Don&apos;t have an account?{' '}
                <button
                  onClick={() => router.push('/register')}
                  className="text-primary hover:underline font-medium"
                >
                  Create an account
                </button>
                {' '}to view all your orders in one place.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

