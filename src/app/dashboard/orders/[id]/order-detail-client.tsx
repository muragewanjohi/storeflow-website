/**
 * Order Detail Client Component
 * 
 * Displays order details with status updates, timeline, and fulfillment options
 */

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ArrowLeftIcon,
  TruckIcon,
  PrinterIcon,
  XMarkIcon,
  CheckCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { formatOrderStatus, formatPaymentStatus } from '@/lib/orders/utils';
import { Loader2, CalculatorIcon, MapPinIcon } from 'lucide-react';
import { useCurrency } from '@/lib/currency/currency-context';
import { toast } from 'sonner';

interface OrderItem {
  id: string;
  product_id: string | null;
  variant_id: string | null;
  product_name: string;
  product_image: string | null;
  product_sku: string | null;
  variant_sku: string | null;
  quantity: number;
  price: number;
  total: number;
}

interface Order {
  id: string;
  order_number: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  total_amount: number;
  status: string | null;
  payment_status: string | null;
  payment_gateway: string | null;
  transaction_id: string | null;
  payment_meta: any | null;
  tumizi_refund_status: string | null;
  tumizi_refund_reference: string | null;
  invoice_number: string | null;
  shipping_address: any;
  billing_address: any;
  coupon: string | null;
  coupon_discounted: number | null;
  message: string | null;
  delivery_zone_id: string | null;
  delivery_zone_name: string | null;
  delivery_fee: number | null;
  delivery_fee_status: string | null;
  delivery_fee_quote: number | null;
  delivery_fee_notes: string | null;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
}

interface OrderDetailClientProps {
  initialOrder: Order | null;
  error: string | null;
}

export default function OrderDetailClient({
  initialOrder,
  error,
}: Readonly<OrderDetailClientProps>) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { formatCurrency } = useCurrency();
  const [order, setOrder] = useState<Order | null>(initialOrder);
  const [newStatus, setNewStatus] = useState<string>(order?.status || 'pending');
  const [newPaymentStatus, setNewPaymentStatus] = useState<string>(order?.payment_status || 'pending');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [shippingCarrier, setShippingCarrier] = useState('');
  const [statusNotes, setStatusNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Delivery quote state
  const [deliveryFeeQuote, setDeliveryFeeQuote] = useState<string>(
    order?.delivery_fee_quote?.toString() || ''
  );
  const [deliveryFeeNotes, setDeliveryFeeNotes] = useState<string>(
    order?.delivery_fee_notes || ''
  );
  const [isSubmittingQuote, setIsSubmittingQuote] = useState(false);

  if (error || !order) {
    return (
      <div className="px-4 pb-24 pt-4 md:px-0 md:pb-0 md:pt-0">
        <div className="mb-6">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/orders">
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              Back to Orders
            </Link>
          </Button>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">{error || 'Order not found'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusBadgeVariant = (status: string | null) => {
    if (!status) return 'secondary';
    switch (status.toLowerCase()) {
      case 'pending':
        return 'secondary';
      case 'processing':
        return 'default';
      case 'shipped':
        return 'default';
      case 'delivered':
        return 'default';
      case 'cancelled':
        return 'destructive';
      case 'refunded':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getPaymentStatusBadgeVariant = (status: string | null) => {
    if (!status) return 'secondary';
    switch (status.toLowerCase()) {
      case 'pending':
        return 'secondary';
      case 'paid':
        return 'default';
      case 'failed':
        return 'destructive';
      case 'refunded':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getRefundStatusBadgeVariant = (status: string | null) => {
    if (!status) return 'secondary';
    switch (status.toLowerCase()) {
      case 'completed':
      case 'success':
      case 'successful':
        return 'default';
      case 'failed':
      case 'cancelled':
      case 'declined':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const handleStatusUpdate = async () => {
    setIsUpdating(true);
    setUpdateError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/orders/${order.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          notes: statusNotes,
          tracking_number: trackingNumber || undefined,
          shipping_carrier: shippingCarrier || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update order status');
      }

      const data = await response.json();
      setOrder({ ...order, status: data.order.status });
      setSuccessMessage('Order status updated successfully');
      
      // Clear form
      setStatusNotes('');
      if (newStatus === 'shipped') {
        setTrackingNumber('');
        setShippingCarrier('');
      }

      // Refresh page after a short delay
      setTimeout(() => {
        router.refresh();
      }, 1500);
    } catch (err: any) {
      setUpdateError(err.message || 'Failed to update order status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePaymentStatusUpdate = async () => {
    setIsUpdating(true);
    setUpdateError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/orders/${order.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment_status: newPaymentStatus,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update payment status');
      }

      const data = await response.json();
      setOrder({ ...order, payment_status: data.order.payment_status });
      setSuccessMessage('Payment status updated successfully');

      // Refresh page after a short delay
      setTimeout(() => {
        router.refresh();
      }, 1500);
    } catch (err: any) {
      setUpdateError(err.message || 'Failed to update payment status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!cancelReason.trim()) {
      setUpdateError('Please provide a cancellation reason');
      return;
    }

    setIsCancelling(true);
    setUpdateError(null);

    try {
      const response = await fetch(`/api/orders/${order.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: cancelReason,
          refund: true,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to cancel order');
      }

      const data = await response.json();
      const expectedTumiziRefundPending =
        order.payment_gateway === 'tumizi' && order.payment_status === 'paid';
      setOrder({
        ...order,
        status: data.order.status,
        payment_status: data.order.payment_status,
        tumizi_refund_status: expectedTumiziRefundPending ? 'pending' : order.tumizi_refund_status,
      });
      setShowCancelDialog(false);
      setCancelReason('');
      setSuccessMessage('Order cancelled successfully');

      // Refresh page after a short delay
      setTimeout(() => {
        router.refresh();
      }, 1500);
    } catch (err: any) {
      setUpdateError(err.message || 'Failed to cancel order');
    } finally {
      setIsCancelling(false);
    }
  };

  const handlePrintShippingLabel = () => {
    // Placeholder for shipping label printing
    // In production, this would integrate with shipping providers (e.g., ShipStation, EasyPost)
    window.print();
  };

  const handleSubmitDeliveryQuote = async () => {
    const fee = parseFloat(deliveryFeeQuote);
    if (isNaN(fee) || fee < 0) {
      toast.error('Please enter a valid delivery fee');
      return;
    }

    setIsSubmittingQuote(true);
    setUpdateError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/admin/orders/${order.id}/delivery-quote`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          delivery_fee_quote: fee,
          delivery_fee_notes: deliveryFeeNotes || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit delivery quote');
      }

      if (data.success) {
        setOrder({ 
          ...order, 
          delivery_fee_quote: fee,
          delivery_fee_notes: deliveryFeeNotes || null,
          delivery_fee_status: 'quoted'
        });
        setSuccessMessage('Delivery quote sent to customer successfully');
        toast.success('Delivery quote sent to customer');
        
        // Refresh page after a short delay
        setTimeout(() => {
          router.refresh();
        }, 1500);
      }
    } catch (err: any) {
      setUpdateError(err.message || 'Failed to submit delivery quote');
      toast.error(err.message || 'Failed to submit delivery quote');
    } finally {
      setIsSubmittingQuote(false);
    }
  };

  // Build order timeline
  const timeline = [
    {
      status: 'pending',
      label: 'Order Placed',
      icon: ClockIcon,
      completed: ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'].includes(order.status || ''),
      date: order.created_at,
    },
    {
      status: 'processing',
      label: 'Processing',
      icon: CheckCircleIcon,
      completed: ['processing', 'shipped', 'delivered'].includes(order.status || ''),
      date: order.status === 'processing' || ['shipped', 'delivered'].includes(order.status || '') ? order.updated_at : null,
    },
    {
      status: 'shipped',
      label: 'Shipped',
      icon: TruckIcon,
      completed: ['shipped', 'delivered'].includes(order.status || ''),
      date: order.status === 'shipped' || order.status === 'delivered' ? order.updated_at : null,
    },
    {
      status: 'delivered',
      label: 'Delivered',
      icon: CheckCircleIcon,
      completed: order.status === 'delivered',
      date: order.status === 'delivered' ? order.updated_at : null,
    },
  ];

  return (
    <div className="min-h-screen bg-[#f3f4f6] px-4 pb-24 pt-4 md:min-h-0 md:bg-transparent md:px-0 md:pb-0 md:pt-0">
      <div className="mb-5 flex flex-col gap-4 md:mb-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3 md:items-center md:gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/orders">
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              Back to Orders
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Order {order.order_number}</h1>
            <p className="mt-1 text-sm text-muted-foreground md:mt-2 md:text-base">
              Created on {new Date(order.created_at).toLocaleDateString()} at{' '}
              {new Date(order.created_at).toLocaleTimeString()}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:flex md:flex-wrap md:justify-end">
          {order.status !== 'cancelled' && order.status !== 'delivered' && (
            <Button
              variant={order.delivery_fee_status === 'rejected' ? 'destructive' : 'outline'}
              size="sm"
              onClick={() => setShowCancelDialog(true)}
              className={`w-full sm:w-auto ${order.delivery_fee_status === 'rejected' ? 'bg-red-600 hover:bg-red-700' : ''}`}
            >
              <XMarkIcon className="mr-2 h-4 w-4" />
              {order.delivery_fee_status === 'rejected' ? 'Cancel Order (Required)' : 'Cancel Order'}
            </Button>
          )}
          {order.status === 'processing' && (
            <Button variant="outline" size="sm" onClick={handlePrintShippingLabel} className="w-full sm:w-auto">
              <PrinterIcon className="mr-2 h-4 w-4" />
              Print Label
            </Button>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.open(`/api/orders/${order.id}/invoice/download`, '_blank')}
            className="w-full sm:w-auto"
          >
            <PrinterIcon className="mr-2 h-4 w-4" />
            {order.payment_status === 'paid' ? 'Download Receipt' : 'Download Invoice'}
          </Button>
        </div>
      </div>

      {updateError && (
        <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{updateError}</p>
        </div>
      )}

      {successMessage && (
        <div className="mb-4 rounded-md border border-green-500/50 bg-green-500/10 p-4">
          <p className="text-sm text-green-800">{successMessage}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-4 md:space-y-6 lg:col-span-2">
          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle>Order Items</CardTitle>
              <CardDescription>{order.items.length} item(s) in this order</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.items.map((item: any) => (
                  <div key={item.id} className="flex flex-col gap-3 border-b pb-4 last:border-0 sm:flex-row sm:items-start sm:gap-4">
                    {item.product_image && (
                      <img
                        src={item.product_image}
                        alt={item.product_name}
                        className="h-14 w-14 rounded-md object-cover sm:h-16 sm:w-16"
                      />
                    )}
                    <div className="flex-1">
                      <h4 className="font-medium">{item.product_name}</h4>
                      <p className="text-sm text-muted-foreground">
                        SKU: {item.variant_sku || item.product_sku || 'N/A'}
                      </p>
                      <p className="text-sm text-muted-foreground">Quantity: {item.quantity}</p>
                    </div>
                    <div className="flex items-center justify-between sm:block sm:text-right">
                      <p className="font-medium">{formatCurrency(item.total)}</p>
                      <p className="text-sm text-muted-foreground">{formatCurrency(item.price)} each</p>
                    </div>
                  </div>
                ))}
              </div>
              <Separator className="my-4" />
              <div className="flex items-center justify-between">
                <span className="text-base font-semibold md:text-lg">Total</span>
                <span className="text-xl font-bold md:text-2xl">{formatCurrency(order.total_amount)}</span>
              </div>
              {order.coupon_discounted && (
                <div className="mt-2 flex items-center justify-between text-sm text-muted-foreground">
                  <span>Coupon Discount ({order.coupon})</span>
                  <span>-{formatCurrency(order.coupon_discounted)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Order Timeline</CardTitle>
              <CardDescription>Track the progress of this order</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {timeline.map((step: any, index: any) => {
                  const Icon = step.icon;
                  return (
                    <div key={step.status} className="flex items-start gap-4">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full ${
                          step.completed
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <p className={`font-medium ${step.completed ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {step.label}
                        </p>
                        {step.date && (
                          <p className="text-sm text-muted-foreground">
                            {new Date(step.date).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Shipping Address */}
          {order.shipping_address && (
            <Card>
              <CardHeader>
                <CardTitle>Shipping Address</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <p className="font-medium">{order.shipping_address.name}</p>
                  <p className="text-muted-foreground">{order.shipping_address.address_line_1}</p>
                  {order.shipping_address.address_line_2 && (
                    <p className="text-muted-foreground">{order.shipping_address.address_line_2}</p>
                  )}
                  <p className="text-muted-foreground">
                    {order.shipping_address.city}, {order.shipping_address.state}{' '}
                    {order.shipping_address.postal_code}
                  </p>
                  <p className="text-muted-foreground">{order.shipping_address.country}</p>
                  {order.shipping_address.phone && (
                    <p className="text-muted-foreground mt-2">Phone: {order.shipping_address.phone}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Billing Address */}
          {order.billing_address && (
            <Card>
              <CardHeader>
                <CardTitle>Billing Address</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <p className="font-medium">{order.billing_address.name}</p>
                  <p className="text-muted-foreground">{order.billing_address.address_line_1}</p>
                  {order.billing_address.address_line_2 && (
                    <p className="text-muted-foreground">{order.billing_address.address_line_2}</p>
                  )}
                  <p className="text-muted-foreground">
                    {order.billing_address.city}, {order.billing_address.state}{' '}
                    {order.billing_address.postal_code}
                  </p>
                  <p className="text-muted-foreground">{order.billing_address.country}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4 md:space-y-6">
          {/* Delivery Fee Quote Section - Show First */}
          {order.delivery_fee_status === 'pending' && (
            <Card className="border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalculatorIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                  Delivery Fee Quote Required
                </CardTitle>
                <CardDescription>
                  This order is outside standard delivery zones. Calculate and send a delivery fee quote to the customer.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {order.shipping_address && (
                  <div>
                    <Label className="text-sm font-semibold flex items-center gap-2 mb-2">
                      <MapPinIcon className="h-4 w-4" />
                      Delivery Address
                    </Label>
                    <div className="p-3 bg-background rounded-lg border text-sm">
                      {order.shipping_address.address_line_1 && <p>{order.shipping_address.address_line_1}</p>}
                      {order.shipping_address.address_line_2 && <p>{order.shipping_address.address_line_2}</p>}
                      <p>
                        {[
                          order.shipping_address.city,
                          order.shipping_address.state,
                          order.shipping_address.postal_code,
                        ]
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                      {order.shipping_address.country && <p>{order.shipping_address.country}</p>}
                    </div>
                  </div>
                )}
                
                <div>
                  <Label htmlFor="delivery_fee_quote">Delivery Fee *</Label>
                  <Input
                    id="delivery_fee_quote"
                    type="number"
                    min="0"
                    step="0.01"
                    value={deliveryFeeQuote}
                    onChange={(e) => setDeliveryFeeQuote(e.target.value)}
                    placeholder="0.00"
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter the calculated delivery fee for this location
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="delivery_fee_notes">Notes (Optional)</Label>
                  <Textarea
                    id="delivery_fee_notes"
                    value={deliveryFeeNotes}
                    onChange={(e) => setDeliveryFeeNotes(e.target.value)}
                    placeholder="Add any notes about the delivery fee calculation"
                    className="mt-2"
                    rows={3}
                  />
                </div>
                
                <Button
                  onClick={handleSubmitDeliveryQuote}
                  disabled={!deliveryFeeQuote || isSubmittingQuote}
                  className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
                >
                  {isSubmittingQuote ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <CalculatorIcon className="mr-2 h-4 w-4" />
                      Send Quote to Customer
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Delivery Zone Info - Show for all orders with delivery zone info */}
          {(order.delivery_zone_name || order.delivery_fee_status) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPinIcon className="h-5 w-5" />
                  Delivery Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {order.delivery_zone_name && (
                  <div>
                    <Label className="text-sm font-semibold">Zone Name</Label>
                    <p className="text-sm text-muted-foreground mt-1">{order.delivery_zone_name}</p>
                  </div>
                )}
                {order.delivery_fee && (
                  <div>
                    <Label className="text-sm font-semibold">Delivery Fee</Label>
                    <p className="text-sm font-semibold text-primary mt-1">{formatCurrency(order.delivery_fee)}</p>
                  </div>
                )}
                {order.delivery_fee_status && (
                  <div>
                    <Label className="text-sm font-semibold">Fee Status</Label>
                    <div className="mt-1">
                      {order.delivery_fee_status === 'approved' && (
                        <Badge variant="default" className="bg-green-600">
                          Customer Approved
                        </Badge>
                      )}
                      {order.delivery_fee_status === 'rejected' && (
                        <Badge variant="destructive">
                          Customer Rejected
                        </Badge>
                      )}
                      {order.delivery_fee_status === 'quoted' && (
                        <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary">
                          Quote Sent - Awaiting Customer Approval
                        </Badge>
                      )}
                      {order.delivery_fee_status === 'pending' && (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-200">
                          Quote Pending
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
                {order.delivery_fee_status === 'quoted' && order.delivery_fee_quote && (
                  <div>
                    <Label className="text-sm font-semibold">Quoted Fee</Label>
                    <p className="text-sm font-semibold mt-1">{formatCurrency(order.delivery_fee_quote)}</p>
                    {order.delivery_fee_notes && (
                      <p className="text-xs text-muted-foreground mt-1 italic">{order.delivery_fee_notes}</p>
                    )}
                  </div>
                )}
                {(order.delivery_fee_status === 'pending' || order.delivery_fee_status === 'quoted') && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <p className="text-xs text-amber-800 dark:text-amber-200">
                      ⚠️ Order status and payment status cannot be updated until the customer approves the delivery fee quote.
                    </p>
                  </div>
                )}
                {order.delivery_fee_status === 'rejected' && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm font-semibold text-red-800 dark:text-red-200 mb-1">
                      ❌ Customer Rejected Delivery Fee
                    </p>
                    <p className="text-xs text-red-700 dark:text-red-300">
                      The customer has rejected the delivery fee quote. Since delivery cannot proceed, you can only cancel this order.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Order Status */}
          <Card>
            <CardHeader>
              <CardTitle>Order Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Current Status</Label>
                <div className="mt-2">
                  <Badge variant={getStatusBadgeVariant(order.status)} className="text-sm">
                    {formatOrderStatus(order.status || 'pending')}
                  </Badge>
                </div>
              </div>
              {order.status !== 'cancelled' && order.status !== 'delivered' && (
                <>
                  <div>
                    <Label htmlFor="new_status">Update Status</Label>
                    <Select 
                      value={newStatus} 
                      onValueChange={setNewStatus}
                      disabled={
                        order.delivery_fee_status === 'pending' || 
                        order.delivery_fee_status === 'quoted' ||
                        order.delivery_fee_status === 'rejected'
                      }
                    >
                      <SelectTrigger id="new_status" className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="shipped">Shipped</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                      </SelectContent>
                    </Select>
                    {(order.delivery_fee_status === 'pending' || order.delivery_fee_status === 'quoted') && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Status cannot be updated until delivery fee is approved
                      </p>
                    )}
                    {order.delivery_fee_status === 'rejected' && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-medium">
                        Status cannot be updated. Order must be cancelled since delivery was rejected.
                      </p>
                    )}
                  </div>
                  {newStatus === 'shipped' && (
                    <>
                      <div>
                        <Label htmlFor="tracking_number">Tracking Number</Label>
                        <Input
                          id="tracking_number"
                          value={trackingNumber}
                          onChange={(e) => setTrackingNumber(e.target.value)}
                          placeholder="Enter tracking number"
                          className="mt-2"
                          disabled={order.delivery_fee_status === 'pending' || order.delivery_fee_status === 'quoted'}
                        />
                      </div>
                      <div>
                        <Label htmlFor="shipping_carrier">Shipping Carrier</Label>
                        <Input
                          id="shipping_carrier"
                          value={shippingCarrier}
                          onChange={(e) => setShippingCarrier(e.target.value)}
                          placeholder="e.g., UPS, FedEx, DHL"
                          className="mt-2"
                          disabled={order.delivery_fee_status === 'pending' || order.delivery_fee_status === 'quoted'}
                        />
                      </div>
                    </>
                  )}
                  <div>
                    <Label htmlFor="status_notes">Notes (optional)</Label>
                    <Textarea
                      id="status_notes"
                      value={statusNotes}
                      onChange={(e) => setStatusNotes(e.target.value)}
                      placeholder="Add notes about this status update"
                      className="mt-2"
                      rows={3}
                      disabled={order.delivery_fee_status === 'pending' || order.delivery_fee_status === 'quoted'}
                    />
                  </div>
                  <Button
                    onClick={handleStatusUpdate}
                    disabled={
                      isUpdating || 
                      newStatus === order.status ||
                      order.delivery_fee_status === 'pending' ||
                      order.delivery_fee_status === 'quoted' ||
                      order.delivery_fee_status === 'rejected'
                    }
                    className="w-full"
                  >
                    {isUpdating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      'Update Status'
                    )}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Payment Status */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Current Payment Status</Label>
                <div className="mt-2">
                  <Badge variant={getPaymentStatusBadgeVariant(order.payment_status)} className="text-sm">
                    {formatPaymentStatus(order.payment_status || 'pending')}
                  </Badge>
                </div>
              </div>
              {order.payment_gateway && (
                <div>
                  <Label>Payment Gateway</Label>
                  <p className="text-sm text-muted-foreground mt-1">{order.payment_gateway}</p>
                </div>
              )}
              {order.transaction_id && (
                <div>
                  <Label>Transaction ID</Label>
                  <p className="text-sm text-muted-foreground mt-1 font-mono">{order.transaction_id}</p>
                </div>
              )}
              {order.payment_gateway === 'tumizi' && order.tumizi_refund_status && (
                <div>
                  <Label>Tumizi Refund</Label>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge variant={getRefundStatusBadgeVariant(order.tumizi_refund_status)} className="text-sm">
                      {order.tumizi_refund_status.toLowerCase() === 'completed'
                        ? 'Refund Completed'
                        : order.tumizi_refund_status.toLowerCase() === 'failed'
                          ? 'Refund Failed'
                          : 'Refund Pending'}
                    </Badge>
                    {order.tumizi_refund_reference && (
                      <span className="text-xs text-muted-foreground font-mono">
                        {order.tumizi_refund_reference}
                      </span>
                    )}
                  </div>
                </div>
              )}
              
              {/* Payment Verification Details (for M-Pesa) */}
              {order.payment_gateway === 'mpesa' && order.payment_meta && (
                <div className="mt-4 rounded-lg border bg-primary/10 p-4">
                  <h4 className="font-semibold text-sm mb-3">Payment Verification Details</h4>
                  <div className="space-y-2 text-sm">
                    {order.payment_meta.transaction_id && (
                      <div>
                        <span className="font-medium">Transaction ID:</span>{' '}
                        <span className="font-mono">{order.payment_meta.transaction_id}</span>
                      </div>
                    )}
                    {order.payment_meta.reference && (
                      <div>
                        <span className="font-medium">Reference:</span>{' '}
                        <span>{order.payment_meta.reference}</span>
                      </div>
                    )}
                    {order.payment_meta.notes && (
                      <div>
                        <span className="font-medium">Customer Notes:</span>{' '}
                        <span className="text-muted-foreground">{order.payment_meta.notes}</span>
                      </div>
                    )}
                    {order.payment_meta.submitted_at && (
                      <div>
                        <span className="font-medium">Submitted:</span>{' '}
                        <span className="text-muted-foreground">
                          {new Date(order.payment_meta.submitted_at).toLocaleString()}
                        </span>
                      </div>
                    )}
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Verification Status:</span>
                        <Badge 
                          variant={
                            order.payment_meta.verification_status === 'verified' ? 'default' :
                            order.payment_meta.verification_status === 'rejected' ? 'destructive' :
                            'secondary'
                          }
                        >
                          {order.payment_meta.verification_status === 'verified' ? 'Verified' :
                           order.payment_meta.verification_status === 'rejected' ? 'Rejected' :
                           'Pending Verification'}
                        </Badge>
                      </div>
                      {order.payment_meta.verified_at && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Verified: {new Date(order.payment_meta.verified_at).toLocaleString()}
                          {order.payment_meta.verified_by && ` by ${order.payment_meta.verified_by}`}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Admin Verification Actions */}
                  {order.payment_meta.verification_status === 'pending' && (
                    <div className="mt-4 flex flex-col gap-2 border-t pt-4 sm:flex-row">
                      <Button
                        size="sm"
                        onClick={async () => {
                          try {
                            const response = await fetch(`/api/admin/orders/${order.id}/verify-payment`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ action: 'verify' }),
                            });
                            if (response.ok) {
                              const data = await response.json();
                              setOrder({ ...order, payment_meta: data.order.payment_meta });
                              toast.success('Payment verified successfully');
                              router.refresh();
                            } else {
                              const data = await response.json();
                              toast.error(data.error || 'Failed to verify payment');
                            }
                          } catch (error) {
                            toast.error('Failed to verify payment');
                          }
                        }}
                      >
                        <CheckCircleIcon className="h-4 w-4 mr-2" />
                        Verify Payment
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={async () => {
                          if (!confirm('Are you sure you want to reject this payment? The order payment status will be changed to pending.')) {
                            return;
                          }
                          try {
                            const response = await fetch(`/api/admin/orders/${order.id}/verify-payment`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ action: 'reject' }),
                            });
                            if (response.ok) {
                              const data = await response.json();
                              setOrder({ ...order, payment_status: data.order.payment_status, payment_meta: data.order.payment_meta });
                              toast.success('Payment rejected');
                              router.refresh();
                            } else {
                              const data = await response.json();
                              toast.error(data.error || 'Failed to reject payment');
                            }
                          } catch (error) {
                            toast.error('Failed to reject payment');
                          }
                        }}
                      >
                        <XMarkIcon className="h-4 w-4 mr-2" />
                        Reject Payment
                      </Button>
                    </div>
                  )}
                </div>
              )}
              
              {order.payment_status !== 'refunded' && (
                <>
                  <div>
                    <Label htmlFor="new_payment_status">Update Payment Status</Label>
                    <Select 
                      value={newPaymentStatus} 
                      onValueChange={setNewPaymentStatus}
                      disabled={
                        order.delivery_fee_status === 'pending' || 
                        order.delivery_fee_status === 'quoted' ||
                        order.delivery_fee_status === 'rejected'
                      }
                    >
                      <SelectTrigger id="new_payment_status" className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                        <SelectItem value="refunded">Refunded</SelectItem>
                      </SelectContent>
                    </Select>
                    {(order.delivery_fee_status === 'pending' || order.delivery_fee_status === 'quoted') && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Payment status cannot be updated until delivery fee is approved
                      </p>
                    )}
                    {order.delivery_fee_status === 'rejected' && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-medium">
                        Payment status cannot be updated. Order must be cancelled since delivery was rejected.
                      </p>
                    )}
                  </div>
                  <Button
                    onClick={handlePaymentStatusUpdate}
                    disabled={
                      isUpdating || 
                      newPaymentStatus === order.payment_status ||
                      order.delivery_fee_status === 'pending' ||
                      order.delivery_fee_status === 'quoted' ||
                      order.delivery_fee_status === 'rejected'
                    }
                    variant="outline"
                    className="w-full"
                  >
                    {isUpdating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      'Update Payment Status'
                    )}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>


          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <Label>Name</Label>
                <p className="text-sm text-muted-foreground">{order.name || 'N/A'}</p>
              </div>
              <div>
                <Label>Email</Label>
                <p className="text-sm text-muted-foreground">{order.email || 'N/A'}</p>
              </div>
              {order.phone && (
                <div>
                  <Label>Phone</Label>
                  <p className="text-sm text-muted-foreground">{order.phone}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order Notes */}
          {order.message && (
            <Card>
              <CardHeader>
                <CardTitle>Order Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{order.message}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Cancel Order Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {order.delivery_fee_status === 'rejected' ? 'Cancel Order (Required)' : 'Cancel Order'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {order.delivery_fee_status === 'rejected' ? (
                <>
                  The customer has rejected the delivery fee quote. Since delivery cannot proceed, this order must be cancelled.
                  {order.payment_status === 'paid' && ' A refund will be processed automatically.'}
                </>
              ) : (
                <>
                  Are you sure you want to cancel this order? This action cannot be undone. A refund will be processed
                  automatically.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="cancel_reason">Cancellation Reason *</Label>
              <Textarea
                id="cancel_reason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Please provide a reason for cancellation"
                rows={4}
                className="mt-2"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelOrder}
              disabled={isCancelling || !cancelReason.trim()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isCancelling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cancelling...
                </>
              ) : (
                'Cancel Order'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

