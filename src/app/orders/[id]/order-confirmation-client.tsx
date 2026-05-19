/**
 * Order Confirmation Client Component
 * 
 * Displays order confirmation details
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CheckCircleIcon, TruckIcon, StarIcon, ArrowLeftIcon, ExclamationTriangleIcon, XCircleIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import { useCurrency } from '@/lib/currency/currency-context';
import RatingInput from '@/components/storefront/rating-input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
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
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface OrderProduct {
  id: string;
  product_id: string | null;
  variant_id: string | null;
  quantity: number;
  price: number;
  total: number;
  products: {
    id: string;
    name: string;
    image: string | null;
    slug: string | null;
  } | null;
}

interface Order {
  id: string;
  order_number: string;
  total_amount: number;
  status: string | null;
  payment_status: string | null;
  payment_gateway: string | null;
  shipping_address: any;
  billing_address: any;
  order_details: any; // Contains tracking_number and shipping_carrier
  created_at: Date | null;
  delivery_fee: number | null;
  delivery_fee_status: string | null;
  delivery_fee_quote: number | null;
  delivery_fee_notes: string | null;
  delivery_zone_name: string | null;
  order_products: OrderProduct[];
}

interface ProductReviewStatus {
  productId: string;
  canReview: boolean;
  hasReviewed: boolean;
  reviewStatus?: 'pending' | 'approved';
  reviewId?: string;
}

interface OrderConfirmationClientProps {
  order: Order;
  isAuthenticated?: boolean;
  showConfirmation?: boolean; // Only show confirmation message for fresh orders
}

export default function OrderConfirmationClient({ 
  order, 
  isAuthenticated = false,
  showConfirmation = false 
}: Readonly<OrderConfirmationClientProps>) {
  const router = useRouter();
  const { formatCurrency } = useCurrency();
  const [reviewStatuses, setReviewStatuses] = useState<Record<string, ProductReviewStatus>>({});
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<OrderProduct | null>(null);
  const [isLoadingReviews, setIsLoadingReviews] = useState(true);
  const [isProcessingQuote, setIsProcessingQuote] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [paymentStatus, setPaymentStatus] = useState(order.payment_status);

  // Using formatCurrency from useCurrency hook
  const formatPrice = (price: number) => formatCurrency(price);

  // Extract tracking information from order_details JSON
  const trackingNumber = order.order_details?.tracking_number || null;
  const shippingCarrier = order.order_details?.shipping_carrier || null;
  const isShipped = order.status?.toLowerCase() === 'shipped';
  const isPaid = paymentStatus?.toLowerCase() === 'paid';
  const isTumiziOrder = order.payment_gateway === 'tumizi';
  const isTumiziPaymentPending = isTumiziOrder && paymentStatus === 'pending';

  // Handle approve delivery quote
  const handleApproveQuote = async () => {
    setIsProcessingQuote(true);
    try {
      const response = await fetch(`/api/orders/${order.id}/delivery-fee`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to approve quote');
      }

      toast.success('Delivery fee approved! Your order will proceed.');
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve delivery fee');
    } finally {
      setIsProcessingQuote(false);
    }
  };

  // Handle reject delivery quote
  const handleRejectQuote = async () => {
    setIsProcessingQuote(true);
    try {
      const response = await fetch(`/api/orders/${order.id}/delivery-fee`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'reject',
          reason: rejectReason || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to reject quote');
      }

      toast.success('Delivery fee rejected. You can cancel the order if needed.');
      setRejectReason('');
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to reject delivery fee');
    } finally {
      setIsProcessingQuote(false);
      setShowRejectDialog(false);
    }
  };

  // Handle cancel order
  const handleCancelOrder = async () => {
    setIsProcessingQuote(true);
    try {
      // First reject the quote if not already rejected
      if (order.delivery_fee_status === 'quoted') {
        await fetch(`/api/orders/${order.id}/delivery-fee`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action: 'reject',
            reason: cancelReason || 'Customer cancelled due to delivery fee',
          }),
        });
      }

      // Then cancel the order
      const response = await fetch(`/api/customers/orders/${order.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          reason: cancelReason || 'Order cancelled by customer due to delivery fee rejection',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to cancel order');
      }

      toast.success('Order cancelled successfully.');
      setCancelReason('');
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to cancel order');
    } finally {
      setIsProcessingQuote(false);
      setShowCancelDialog(false);
    }
  };

  // Poll Tumizi for payment confirmation (STK push) after checkout
  useEffect(() => {
    if (!isTumiziOrder || paymentStatus === 'paid' || paymentStatus === 'failed') {
      return;
    }

    let attempts = 0;
    const maxAttempts = 24;

    const syncTumiziPayment = async () => {
      const query = window.location.search.replace(/^\?/, '');
      const url = `/api/orders/${order.id}/tumizi/sync-payment${query ? `?${query}` : ''}`;
      try {
        const response = await fetch(url);
        const data = await response.json();
        if (response.ok && data.success && data.payment_status) {
          setPaymentStatus(data.payment_status);
          if (data.payment_status === 'paid') {
            toast.success('Payment received. Thank you!');
          }
        }
      } catch (error) {
        console.error('[Order confirmation] Tumizi sync failed:', error);
      }
    };

    void syncTumiziPayment();
    const interval = setInterval(() => {
      attempts += 1;
      void syncTumiziPayment();
      if (attempts >= maxAttempts) {
        clearInterval(interval);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [order.id, isTumiziOrder, paymentStatus]);

  // Check review status for all products in order
  useEffect(() => {
    const checkReviewStatuses = async () => {
      if (!isAuthenticated || !isPaid) {
        setIsLoadingReviews(false);
        return;
      }

      try {
        const statuses: Record<string, ProductReviewStatus> = {};
        
        // Check review status for each product
        await Promise.all(
          order.order_products
            .filter((item) => item.product_id)
            .map(async (item) => {
              try {
                const response = await fetch(`/api/products/${item.product_id}/can-review`);
                if (response.ok) {
                  const data = await response.json();
                  statuses[item.product_id!] = {
                    productId: item.product_id!,
                    canReview: data.canReview || false,
                    hasReviewed: data.hasReviewed || false,
                  };
                } else {
                  statuses[item.product_id!] = {
                    productId: item.product_id!,
                    canReview: false,
                    hasReviewed: false,
                  };
                }
              } catch (error) {
                console.error(`Error checking review status for product ${item.product_id}:`, error);
                statuses[item.product_id!] = {
                  productId: item.product_id!,
                  canReview: false,
                  hasReviewed: false,
                };
              }
            })
        );

        setReviewStatuses(statuses);
      } catch (error) {
        console.error('Error checking review statuses:', error);
      } finally {
        setIsLoadingReviews(false);
      }
    };

    checkReviewStatuses();
  }, [order.order_products, isAuthenticated, isPaid]);

  const handleReviewSubmit = async (rating: number, comment: string) => {
    if (!selectedProduct?.product_id) return;

    try {
      const response = await fetch('/api/products/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: selectedProduct.product_id,
          rating,
          comment: comment.trim() || undefined, // Comment is optional
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit review');
      }

      toast.success('Review submitted successfully!', {
        description: 'Your review will be visible after approval',
      });

      // Update review status
      setReviewStatuses((prev) => ({
        ...prev,
        [selectedProduct.product_id!]: {
          productId: selectedProduct.product_id!,
          canReview: false,
          hasReviewed: true,
          reviewStatus: 'pending',
        },
      }));

      setReviewDialogOpen(false);
      setSelectedProduct(null);
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to submit review');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Success Message - Only show for fresh orders */}
        {showConfirmation && (
          <Card className="mb-6 border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                  <CheckCircleIcon className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-green-900">Order Confirmed!</h1>
                  <p className="text-green-700">
                    {isTumiziPaymentPending
                      ? 'Complete the M-Pesa prompt on your phone. We will confirm payment automatically.'
                      : 'Thank you for your order. We&apos;ve received your order and will begin processing it right away.'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {isTumiziPaymentPending && (
          <Card className="mb-6 border-amber-200 bg-amber-50">
            <CardContent className="pt-6">
              <p className="text-sm text-amber-900">
                Waiting for M-Pesa payment via Tumizi. This page updates automatically when payment is
                confirmed—no need to enter a transaction code.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Order Status Header - Show when not fresh confirmation */}
        {!showConfirmation && (
          <div className="mb-6">
            {/* Back to Orders Button - Only show if authenticated */}
            {isAuthenticated && (
              <div className="mb-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/account/orders')}
                  className="gap-2"
                >
                  <ArrowLeftIcon className="h-4 w-4" />
                  Back to Orders
                </Button>
              </div>
            )}
            <h1 className="text-3xl font-bold mb-2">Order #{order.order_number}</h1>
            <p className="text-muted-foreground">
              {order.created_at
                ? `Placed on ${new Date(order.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}`
                : 'Order details'}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Order Details */}
          <div className="lg:col-span-3 space-y-6">
            {/* Order Information */}
            <Card>
              <CardHeader>
                <CardTitle>Order Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Order Number</p>
                    <p className="font-semibold">{order.order_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Order Date</p>
                    <p className="font-semibold">
                      {order.created_at
                        ? new Date(order.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <p className="font-semibold capitalize">{order.status}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Payment Status</p>
                    <p className="font-semibold capitalize">{paymentStatus}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Order Items */}
            <Card>
              <CardHeader>
                <CardTitle>Order Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {order.order_products.map((item: any) => {
                    const productId = item.product_id;
                    const reviewStatus = productId ? reviewStatuses[productId] : null;
                    const canReview = reviewStatus?.canReview && isPaid && isAuthenticated;
                    const hasReviewed = reviewStatus?.hasReviewed;

                    return (
                      <div key={item.id} className="flex gap-4 pb-4 border-b last:border-b-0 last:pb-0">
                        {item.products?.image && (
                          <div className="relative w-20 h-20 rounded-md overflow-hidden bg-muted flex-shrink-0">
                            <Image
                              src={item.products.image}
                              alt={item.products.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <Link 
                                href={item.products?.slug ? `/products/${item.products.slug}` : `/products/${item.products?.id}`}
                                className="hover:text-primary transition-colors"
                              >
                                <h3 className="font-semibold">{item.products?.name || 'Product'}</h3>
                              </Link>
                              <p className="text-sm text-muted-foreground">
                                Quantity: {item.quantity} × {formatPrice(item.price)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">{formatPrice(item.total)}</p>
                            </div>
                          </div>
                          
                          {/* Review Section - Only show if order is paid and user is authenticated */}
                          {isPaid && isAuthenticated && productId && (
                            <div className="mt-3 pt-3 border-t">
                              {isLoadingReviews ? (
                                <p className="text-sm text-muted-foreground">Checking review status...</p>
                              ) : canReview ? (
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedProduct(item);
                                      setReviewDialogOpen(true);
                                    }}
                                    className="gap-2"
                                  >
                                    <StarIcon className="w-4 h-4" />
                                    Write a Review
                                  </Button>
                                  <span className="text-xs text-muted-foreground">
                                    Share your experience with this product
                                  </span>
                                </div>
                              ) : hasReviewed ? (
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge variant="secondary" className="gap-1">
                                    <StarIcon className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                    Review Submitted
                                  </Badge>
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground">
                                  Review not available
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Tracking Information - Show when order is shipped */}
            {isShipped && (trackingNumber || shippingCarrier) && (
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TruckIcon className="w-5 h-5" />
                    Shipping Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {trackingNumber && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Tracking Number</p>
                      <p className="font-semibold">{trackingNumber}</p>
                    </div>
                  )}
                  {shippingCarrier && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Shipping Carrier</p>
                      <p className="font-semibold">{shippingCarrier}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Shipping Address */}
            {order.shipping_address && (
              <Card>
                <CardHeader>
                  <CardTitle>Shipping Address</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm">
                    <p className="font-semibold">{order.shipping_address.name}</p>
                    <p className="text-muted-foreground">{order.shipping_address.email}</p>
                    <p className="text-muted-foreground">{order.shipping_address.phone}</p>
                    <p className="mt-2">{order.shipping_address.address_line_1}</p>
                    {order.shipping_address.address_line_2 && (
                      <p>{order.shipping_address.address_line_2}</p>
                    )}
                    <p>
                      {order.shipping_address.city}, {order.shipping_address.state}{' '}
                      {order.shipping_address.postal_code}
                    </p>
                    <p>{order.shipping_address.country}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-2">
            <Card className="sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>{formatPrice(order.total_amount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Shipping</span>
                    <span className={order.delivery_fee_status === 'pending' ? 'text-yellow-600 font-medium' : 'text-muted-foreground'}>
                      {order.delivery_fee_status === 'pending' 
                        ? 'Excluded' 
                        : order.delivery_fee && order.delivery_fee > 0
                        ? formatPrice(order.delivery_fee)
                        : order.delivery_fee_quote && order.delivery_fee_quote > 0
                        ? formatPrice(order.delivery_fee_quote)
                        : 'Included'}
                    </span>
                  </div>
                  {order.delivery_fee_status === 'pending' && (
                    <div className="text-xs text-yellow-600 bg-yellow-50 dark:bg-yellow-950/20 p-2 rounded">
                      Delivery fee will be calculated and sent to you separately.
                    </div>
                  )}
                  {order.delivery_fee_status === 'quoted' && order.delivery_fee_quote && (
                    <div className="text-xs text-blue-600 bg-blue-50 dark:bg-blue-950/20 p-2 rounded">
                      Delivery fee quote sent. Please check your email or order details to approve.
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>
                      {order.delivery_fee_status === 'pending'
                        ? formatPrice(order.total_amount)
                        : order.delivery_fee && order.delivery_fee > 0
                        ? formatPrice(order.total_amount + order.delivery_fee)
                        : order.delivery_fee_quote && order.delivery_fee_quote > 0
                        ? formatPrice(order.total_amount + order.delivery_fee_quote)
                        : formatPrice(order.total_amount)}
                    </span>
                  </div>
                </div>

                <Separator />

                {/* Delivery Fee Quote Action - Show when quote is sent */}
                {order.delivery_fee_status === 'quoted' && order.delivery_fee_quote && (
                  <div className="space-y-3 p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg overflow-hidden">
                    <div className="flex items-start gap-3">
                      <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2 text-sm">
                          Delivery Fee Quote Received
                        </h3>
                        <div className="mb-3 space-y-2">
                          <p className="text-xs text-yellow-800 dark:text-yellow-200 break-words">
                            A delivery fee quote has been sent for your order. Please review and take action.
                          </p>
                          <div className="bg-white dark:bg-gray-800 p-2 rounded border border-yellow-200 dark:border-yellow-800">
                            <p className="text-xs text-muted-foreground mb-1">Delivery Fee Quote</p>
                            <p className="text-lg font-bold text-yellow-900 dark:text-yellow-100">
                              {formatPrice(order.delivery_fee_quote)}
                            </p>
                            {order.delivery_fee_notes && (
                              <p className="text-xs text-muted-foreground mt-1 italic break-words">
                                &quot;{order.delivery_fee_notes}&quot;
                              </p>
                            )}
                          </div>
                          <div className="bg-white dark:bg-gray-800 p-2 rounded border border-yellow-200 dark:border-yellow-800">
                            <p className="text-xs text-muted-foreground mb-1">New Total (including delivery)</p>
                            <p className="text-base font-bold">
                              {formatPrice(order.total_amount + order.delivery_fee_quote)}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button
                            onClick={handleApproveQuote}
                            disabled={isProcessingQuote}
                            className="w-full bg-green-600 hover:bg-green-700 text-white text-sm py-2"
                            size="sm"
                          >
                            {isProcessingQuote ? 'Processing...' : '✓ Approve Quote'}
                          </Button>
                          <Button
                            onClick={() => setShowRejectDialog(true)}
                            disabled={isProcessingQuote}
                            variant="outline"
                            className="w-full border-red-300 text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 text-sm py-2"
                            size="sm"
                          >
                            ✗ Reject Quote
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <Separator />

                <div>
                  <p className="text-sm text-muted-foreground mb-2">Payment Method</p>
                  <p className="font-semibold capitalize">
                    {order.payment_gateway?.replace('_', ' ') || 'N/A'}
                  </p>
                </div>

                <Separator />

                <div className="space-y-2">
                  {isAuthenticated ? (
                    <>
                      <Button
                        onClick={() => router.push('/account/orders')}
                        className="w-full"
                        variant="outline"
                      >
                        View All Orders
                      </Button>
                      <Link href="/products">
                        <Button className="w-full" variant="outline">
                          Continue Shopping
                        </Button>
                      </Link>
                    </>
                  ) : (
                    <>
                      <Button
                        onClick={() => router.push('/track-order')}
                        className="w-full"
                        variant="outline"
                      >
                        Track Another Order
                      </Button>
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <p className="text-sm text-blue-900 mb-2">
                          <strong>Create an account</strong> to view all your orders in one place.
                        </p>
                        <Button
                          onClick={() => router.push('/register')}
                          className="w-full"
                          size="sm"
                          variant="default"
                        >
                          Create Account
                        </Button>
                      </div>
                      <Link href="/products">
                        <Button className="w-full" variant="outline">
                          Continue Shopping
                        </Button>
                      </Link>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Product</DialogTitle>
            <DialogDescription>
              {selectedProduct?.products?.name && (
                <>Share your experience with {selectedProduct.products.name}</>
              )}
            </DialogDescription>
          </DialogHeader>
          {selectedProduct && (
            <div className="mt-4">
              <RatingInput
                productId={selectedProduct.product_id!}
                onSubmit={handleReviewSubmit}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Quote Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Delivery Fee Quote?</AlertDialogTitle>
            <AlertDialogDescription>
              If you reject this delivery fee quote, you can choose to cancel the order. 
              Would you like to provide a reason for rejecting the quote?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="reject-reason">Reason (optional)</Label>
              <Textarea
                id="reject-reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g., Delivery fee is too high, location is too far..."
                rows={3}
                className="mt-2"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRejectReason('')}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowRejectDialog(false);
                setShowCancelDialog(true);
              }}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              Reject & Cancel Order
            </AlertDialogAction>
            <AlertDialogAction
              onClick={handleRejectQuote}
              className="bg-red-600 hover:bg-red-700"
            >
              Reject Only
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Order Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Order?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel order {order.order_number}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="cancel-reason">Reason for cancellation (optional)</Label>
              <Textarea
                id="cancel-reason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g., Delivery fee too high..."
                rows={3}
                className="mt-2"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setCancelReason('');
              setRejectReason('');
            }}>Keep Order</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelOrder}
              className="bg-red-600 hover:bg-red-700"
            >
              Yes, Cancel Order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

