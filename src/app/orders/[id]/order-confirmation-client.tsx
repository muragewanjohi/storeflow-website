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
import { CheckCircleIcon, TruckIcon, StarIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
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
import { Badge } from '@/components/ui/badge';
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

  // Using formatCurrency from useCurrency hook
  const formatPrice = (price: number) => formatCurrency(price);

  // Extract tracking information from order_details JSON
  const trackingNumber = order.order_details?.tracking_number || null;
  const shippingCarrier = order.order_details?.shipping_carrier || null;
  const isShipped = order.status?.toLowerCase() === 'shipped';
  const isPaid = order.payment_status?.toLowerCase() === 'paid';

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
                    Thank you for your order. We&apos;ve received your order and will begin processing it right away.
                  </p>
                </div>
              </div>
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
                  onClick={() => router.push('/orders')}
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Details */}
          <div className="lg:col-span-2 space-y-6">
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
                    <p className="font-semibold capitalize">{order.payment_status}</p>
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
                                  {reviewStatus?.reviewStatus === 'pending' && (
                                    <span className="text-xs text-muted-foreground">(Pending approval)</span>
                                  )}
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
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
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
                    <span className="text-muted-foreground">Included</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>{formatPrice(order.total_amount)}</span>
                  </div>
                </div>

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
                        onClick={() => router.push('/orders')}
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
    </div>
  );
}

