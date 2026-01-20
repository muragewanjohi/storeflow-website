/**
 * Customer Orders List Client Component
 * 
 * Displays list of customer orders with status, date, and total
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowRightIcon, ChevronLeftIcon, ChevronRightIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
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
  created_at: Date | null;
  delivery_fee_status: string | null;
  order_products: OrderProduct[];
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  totalRequiringAction?: number;
}

interface OrdersListClientProps {
  initialOrders: Order[];
  initialPagination: Pagination | null;
  initialFilter?: string;
}

export default function OrdersListClient({ 
  initialOrders, 
  initialPagination,
  initialFilter = 'all'
}: Readonly<OrdersListClientProps>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [activeTab, setActiveTab] = useState<string>(initialFilter);
  const { formatCurrency } = useCurrency();

  // Sync activeTab with URL params
  useEffect(() => {
    const filter = searchParams.get('filter') || 'all';
    setActiveTab(filter);
  }, [searchParams]);

  // Update orders when initialOrders or initialFilter changes (after navigation)
  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  // Using formatCurrency from useCurrency hook
  const formatPrice = (price: number) => formatCurrency(price);

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

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'all') {
      params.delete('filter');
    } else {
      params.set('filter', value);
    }
    params.set('page', '1'); // Reset to first page when changing tabs
    router.push(`/orders?${params.toString()}`);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">My Orders</h1>
          <p className="text-muted-foreground mt-2">
            View and track all your orders
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="mb-6">
          <TabsList className="bg-muted/50 border border-border">
            <TabsTrigger 
              value="all"
              className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground/70 hover:text-foreground"
            >
              All Orders
            </TabsTrigger>
            <TabsTrigger 
              value="requiring_action"
              className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground/70 hover:text-foreground relative"
            >
              Requiring Action
              {initialPagination?.totalRequiringAction && initialPagination.totalRequiringAction > 0 && (
                <Badge 
                  variant="destructive" 
                  className="ml-2 h-5 min-w-5 flex items-center justify-center px-1.5 text-xs"
                >
                  {initialPagination.totalRequiringAction > 9 ? '9+' : initialPagination.totalRequiringAction}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            {orders.length === 0 ? (
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
            ) : (
              <div className="space-y-4">
                {orders.map((order: any) => (
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
                            <div className="flex gap-2 flex-wrap">
                              <Badge className={getStatusColor(order.status)}>
                                {order.status?.toUpperCase() || 'PENDING'}
                              </Badge>
                              <Badge className={getPaymentStatusColor(order.payment_status)}>
                                {order.payment_status?.toUpperCase() || 'PENDING'}
                              </Badge>
                              {order.delivery_fee_status === 'quoted' && (
                                <Badge className="bg-yellow-100 text-yellow-800 flex items-center gap-1">
                                  <ExclamationTriangleIcon className="h-3 w-3" />
                                  Action Required
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Order Items Preview */}
                          <div className="flex gap-2 mb-3">
                            {order.order_products.slice(0, 3).map((item: any) => (
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
            )}
          </TabsContent>

          <TabsContent value="requiring_action" className="mt-6">
            {orders.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-12">
                    <h2 className="text-2xl font-bold mb-4">No Orders Requiring Action</h2>
                    <p className="text-muted-foreground mb-6">
                      All your orders are up to date. No action needed at this time.
                    </p>
                    <Button onClick={() => handleTabChange('all')}>
                      View All Orders
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {orders.map((order: any) => (
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
                            <div className="flex gap-2 flex-wrap">
                              <Badge className={getStatusColor(order.status)}>
                                {order.status?.toUpperCase() || 'PENDING'}
                              </Badge>
                              <Badge className={getPaymentStatusColor(order.payment_status)}>
                                {order.payment_status?.toUpperCase() || 'PENDING'}
                              </Badge>
                              {order.delivery_fee_status === 'quoted' && (
                                <Badge className="bg-yellow-100 text-yellow-800 flex items-center gap-1">
                                  <ExclamationTriangleIcon className="h-3 w-3" />
                                  Action Required
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Order Items Preview */}
                          <div className="flex gap-2 mb-3">
                            {order.order_products.slice(0, 3).map((item: any) => (
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
            )}
          </TabsContent>
        </Tabs>

        {/* Pagination */}
        {initialPagination && initialPagination.totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t">
            <div className="text-sm text-muted-foreground">
              Showing {((initialPagination.page - 1) * initialPagination.limit) + 1} to{' '}
              {Math.min(initialPagination.page * initialPagination.limit, initialPagination.total)} of{' '}
              {initialPagination.total} orders
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const params = new URLSearchParams(searchParams.toString());
                  params.set('page', (initialPagination.page - 1).toString());
                  router.push(`/orders?${params.toString()}`);
                }}
                disabled={!initialPagination.hasPrevPage}
                className="flex items-center gap-1"
              >
                <ChevronLeftIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Previous</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const params = new URLSearchParams(searchParams.toString());
                  params.set('page', (initialPagination.page + 1).toString());
                  router.push(`/orders?${params.toString()}`);
                }}
                disabled={!initialPagination.hasNextPage}
                className="flex items-center gap-1"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRightIcon className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

