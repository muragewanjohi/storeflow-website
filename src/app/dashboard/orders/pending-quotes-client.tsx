/**
 * Pending Delivery Quotes Client Component
 * 
 * Displays orders that need delivery fee quotes (out-of-zone orders)
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, MapPinIcon, CalculatorIcon, CheckIcon, XIcon } from 'lucide-react';
import { useCurrency } from '@/lib/currency/currency-context';

interface PendingQuote {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  total_amount: number;
  status: string | null;
  payment_status: string | null;
  shipping_address: any;
  delivery_zone_name: string | null;
  created_at: Date | null;
}

export default function PendingQuotesClient() {
  const router = useRouter();
  const { formatCurrency } = useCurrency();
  const [quotes, setQuotes] = useState<PendingQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [deliveryFee, setDeliveryFee] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<string | null>(null);

  const fetchPendingQuotes = async () => {
    try {
      const response = await fetch('/api/admin/orders/pending-delivery-quotes');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setQuotes(data.orders);
        }
      }
    } catch (error) {
      console.error('Error fetching pending quotes:', error);
      toast.error('Failed to load pending quotes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingQuotes();
  }, []);

  const handleSubmitQuote = async (orderId: string) => {
    const fee = parseFloat(deliveryFee);
    if (isNaN(fee) || fee < 0) {
      toast.error('Please enter a valid delivery fee');
      return;
    }

    setSubmitting(orderId);

    try {
      const response = await fetch(`/api/admin/orders/${orderId}/delivery-quote`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          delivery_fee_quote: fee,
          delivery_fee_notes: notes || null,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Delivery quote sent to customer');
        setSelectedOrderId(null);
        setDeliveryFee('');
        setNotes('');
        fetchPendingQuotes(); // Refresh list
      } else {
        toast.error(data.error || 'Failed to submit quote');
      }
    } catch (error) {
      console.error('Error submitting quote:', error);
      toast.error('Failed to submit quote');
    } finally {
      setSubmitting(null);
    }
  };

  const formatAddress = (address: any) => {
    if (!address) return 'N/A';
    const parts = [
      address.address_line_1,
      address.address_line_2,
      address.city,
      address.state,
      address.postal_code,
      address.country,
    ].filter(Boolean);
    return parts.join(', ') || 'N/A';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Pending Delivery Quotes</h1>
        <p className="text-muted-foreground mt-2">
          Calculate and send delivery fee quotes for out-of-zone orders
        </p>
      </div>

      {quotes.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <CalculatorIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                No orders pending delivery quotes
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {quotes.map((quote) => (
            <Card key={quote.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Order #{quote.order_number}</CardTitle>
                    <CardDescription>
                      {quote.customer_name} • {quote.customer_email}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-200">
                    Quote Needed
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-semibold">Customer Information</Label>
                    <div className="mt-2 space-y-1 text-sm">
                      <p><strong>Name:</strong> {quote.customer_name}</p>
                      <p><strong>Email:</strong> {quote.customer_email}</p>
                      <p><strong>Phone:</strong> {quote.customer_phone}</p>
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-semibold">Order Details</Label>
                    <div className="mt-2 space-y-1 text-sm">
                      <p><strong>Subtotal:</strong> {formatCurrency(quote.total_amount)}</p>
                      <p><strong>Status:</strong> {quote.status || 'Pending'}</p>
                      <p><strong>Payment:</strong> {quote.payment_status || 'Pending'}</p>
                      <p><strong>Date:</strong> {quote.created_at 
                        ? new Date(quote.created_at).toLocaleDateString()
                        : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <MapPinIcon className="h-4 w-4" />
                    Delivery Address
                  </Label>
                  <div className="mt-2 p-3 bg-muted rounded-lg">
                    <p className="text-sm">{formatAddress(quote.shipping_address)}</p>
                  </div>
                </div>

                {selectedOrderId === quote.id ? (
                  <Card className="border-primary">
                    <CardHeader>
                      <CardTitle className="text-lg">Calculate Delivery Fee</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor={`fee-${quote.id}`}>Delivery Fee *</Label>
                        <Input
                          id={`fee-${quote.id}`}
                          type="number"
                          min="0"
                          step="0.01"
                          value={deliveryFee}
                          onChange={(e) => setDeliveryFee(e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor={`notes-${quote.id}`}>Notes (Optional)</Label>
                        <Textarea
                          id={`notes-${quote.id}`}
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Add any notes about the delivery fee calculation..."
                          rows={3}
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleSubmitQuote(quote.id)}
                          disabled={submitting === quote.id}
                        >
                          {submitting === quote.id ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <CheckIcon className="mr-2 h-4 w-4" />
                              Send Quote to Customer
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSelectedOrderId(null);
                            setDeliveryFee('');
                            setNotes('');
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Button
                    onClick={() => {
                      setSelectedOrderId(quote.id);
                      setDeliveryFee('');
                      setNotes('');
                    }}
                    className="w-full"
                  >
                    <CalculatorIcon className="mr-2 h-4 w-4" />
                    Calculate & Send Quote
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
