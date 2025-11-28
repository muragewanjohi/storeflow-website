/**
 * Order Confirmation Client Component
 * 
 * Displays order confirmation details
 */

'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CheckCircleIcon, TruckIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import { useCurrency } from '@/lib/currency/currency-context';

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

  // Using formatCurrency from useCurrency hook
  const formatPrice = (price: number) => formatCurrency(price);

  // Extract tracking information from order_details JSON
  const trackingNumber = order.order_details?.tracking_number || null;
  const shippingCarrier = order.order_details?.shipping_carrier || null;
  const isShipped = order.status?.toLowerCase() === 'shipped';

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
                  {order.order_products.map((item: any) => (
                    <div key={item.id} className="flex gap-4">
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
                        <h3 className="font-semibold">{item.products?.name || 'Product'}</h3>
                        <p className="text-sm text-muted-foreground">
                          Quantity: {item.quantity} × {formatPrice(item.price)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatPrice(item.total)}</p>
                      </div>
                    </div>
                  ))}
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
                    <Button
                      onClick={() => router.push('/orders')}
                      className="w-full"
                      variant="outline"
                    >
                      View All Orders
                    </Button>
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
                    </>
                  )}
                  <Link href="/products">
                    <Button className="w-full" variant="outline">
                      Continue Shopping
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

