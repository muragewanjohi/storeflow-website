/**
 * Customer Orders List Client Component
 * 
 * Displays list of customer orders with status, date, and total
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRightIcon } from '@heroicons/react/24/outline';

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
  created_at: Date | null;
  order_products: OrderProduct[];
}

interface OrdersListClientProps {
  initialOrders: Order[];
}

export default function OrdersListClient({ initialOrders }: Readonly<OrdersListClientProps>) {
  const [orders] = useState<Order[]>(initialOrders);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const getStatusColor = (status: string | null) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'shipped':
        return 'bg-purple-100 text-purple-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status: string | null) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'refunded':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (orders.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <h2 className="text-2xl font-bold mb-4">No Orders Yet</h2>
                <p className="text-muted-foreground mb-6">
                  You haven&apos;t placed any orders yet. Start shopping to see your orders here.
                </p>
                <Link href="/products">
                  <Button>Browse Products</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">My Orders</h1>
          <p className="text-muted-foreground mt-2">
            View and track all your orders
          </p>
        </div>

        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  {/* Order Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-3">
                      <div>
                        <h3 className="font-semibold text-lg">Order #{order.order_number}</h3>
                        <p className="text-sm text-muted-foreground">
                          {order.created_at
                            ? new Date(order.created_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })
                            : 'N/A'}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Badge className={getStatusColor(order.status)}>
                          {order.status?.toUpperCase() || 'PENDING'}
                        </Badge>
                        <Badge className={getPaymentStatusColor(order.payment_status)}>
                          {order.payment_status?.toUpperCase() || 'PENDING'}
                        </Badge>
                      </div>
                    </div>

                    {/* Order Items Preview */}
                    <div className="flex gap-2 mb-3">
                      {order.order_products.slice(0, 3).map((item) => (
                        <div key={item.id} className="relative w-12 h-12 rounded-md overflow-hidden bg-muted flex-shrink-0">
                          {item.products?.image ? (
                            <Image
                              src={item.products.image}
                              alt={item.products.name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                              No Image
                            </div>
                          )}
                        </div>
                      ))}
                      {order.order_products.length > 3 && (
                        <div className="relative w-12 h-12 rounded-md bg-muted flex items-center justify-center text-xs text-muted-foreground">
                          +{order.order_products.length - 3}
                        </div>
                      )}
                    </div>

                    <p className="text-sm text-muted-foreground">
                      {order.order_products.length} item{order.order_products.length !== 1 ? 's' : ''}
                    </p>
                  </div>

                  {/* Order Total & Actions */}
                  <div className="flex flex-col items-end gap-3">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Total</p>
                      <p className="text-xl font-bold">{formatPrice(order.total_amount)}</p>
                    </div>
                    <Link href={`/orders/${order.id}`}>
                      <Button variant="outline" size="sm">
                        View Details
                        <ArrowRightIcon className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

