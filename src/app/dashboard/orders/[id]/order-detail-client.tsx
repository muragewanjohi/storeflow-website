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
import { Loader2 } from 'lucide-react';

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
  shipping_address: any;
  billing_address: any;
  coupon: string | null;
  coupon_discounted: number | null;
  message: string | null;
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

  if (error || !order) {
    return (
      <div>
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
      setOrder({ ...order, status: data.order.status, payment_status: data.order.payment_status });
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
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/orders">
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              Back to Orders
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Order {order.order_number}</h1>
            <p className="text-muted-foreground mt-2">
              Created on {new Date(order.created_at).toLocaleDateString()} at{' '}
              {new Date(order.created_at).toLocaleTimeString()}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {order.status !== 'cancelled' && order.status !== 'delivered' && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowCancelDialog(true)}
            >
              <XMarkIcon className="mr-2 h-4 w-4" />
              Cancel Order
            </Button>
          )}
          {order.status === 'processing' && (
            <Button variant="outline" size="sm" onClick={handlePrintShippingLabel}>
              <PrinterIcon className="mr-2 h-4 w-4" />
              Print Label
            </Button>
          )}
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle>Order Items</CardTitle>
              <CardDescription>{order.items.length} item(s) in this order</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-start gap-4 border-b pb-4 last:border-0">
                    {item.product_image && (
                      <img
                        src={item.product_image}
                        alt={item.product_name}
                        className="h-16 w-16 rounded-md object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <h4 className="font-medium">{item.product_name}</h4>
                      <p className="text-sm text-muted-foreground">
                        SKU: {item.variant_sku || item.product_sku || 'N/A'}
                      </p>
                      <p className="text-sm text-muted-foreground">Quantity: {item.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${item.total.toFixed(2)}</p>
                      <p className="text-sm text-muted-foreground">${item.price.toFixed(2)} each</p>
                    </div>
                  </div>
                ))}
              </div>
              <Separator className="my-4" />
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">Total</span>
                <span className="text-2xl font-bold">${order.total_amount.toFixed(2)}</span>
              </div>
              {order.coupon_discounted && (
                <div className="flex justify-between items-center mt-2 text-sm text-muted-foreground">
                  <span>Coupon Discount ({order.coupon})</span>
                  <span>-${order.coupon_discounted.toFixed(2)}</span>
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
                {timeline.map((step, index) => {
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
        <div className="space-y-6">
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
                    <Select value={newStatus} onValueChange={setNewStatus}>
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
                    />
                  </div>
                  <Button
                    onClick={handleStatusUpdate}
                    disabled={isUpdating || newStatus === order.status}
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
              {order.payment_status !== 'refunded' && (
                <>
                  <div>
                    <Label htmlFor="new_payment_status">Update Payment Status</Label>
                    <Select value={newPaymentStatus} onValueChange={setNewPaymentStatus}>
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
                  </div>
                  <Button
                    onClick={handlePaymentStatusUpdate}
                    disabled={isUpdating || newPaymentStatus === order.payment_status}
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
            <AlertDialogTitle>Cancel Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this order? This action cannot be undone. A refund will be processed
              automatically.
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

