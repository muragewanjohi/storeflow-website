/**
 * Customer Detail Client Component
 * 
 * Displays detailed customer information with tabs
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeftIcon, PencilIcon } from '@heroicons/react/24/outline';
import { formatOrderStatus, formatPaymentStatus } from '@/lib/orders/utils';
import { useCurrency } from '@/lib/currency/currency-context';

interface Customer {
  id: string;
  name: string;
  email: string;
  username: string | null;
  mobile: string | null;
  company: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postal_code: string | null;
  image: string | null;
  email_verified: boolean | null;
  stats: {
    orders: number;
    total_spent: number;
    cart_items: number;
    reviews: number;
    wishlist_items: number;
    support_tickets: number;
    saved_addresses: number;
  };
  recent_orders: Array<{
    id: string;
    order_number: string;
    total_amount: number;
    status: string | null;
    payment_status: string | null;
    item_count: number;
    created_at: string;
  }>;
  addresses: Array<{
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    postal_code: string | null;
    is_default: boolean | null;
  }>;
  reviews: Array<{
    id: string;
    product: {
      id: string;
      name: string;
      image: string | null;
      slug: string | null;
    };
    rating: number | null;
    comment: string | null;
    status: string | null;
    created_at: string;
  }>;
  created_at: string;
  updated_at: string;
}

interface CustomerDetailClientProps {
  customer: Customer | null;
  error: string | null;
}

export default function CustomerDetailClient({
  customer,
  error,
}: Readonly<CustomerDetailClientProps>) {
  const router = useRouter();
  const { formatCurrency } = useCurrency();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n: any) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (error) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeftIcon className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Card>
          <CardContent className="py-8 text-center text-destructive">{error}</CardContent>
        </Card>
      </div>
    );
  }

  if (!customer) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeftIcon className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-lg">
                {customer.image ? (
                  <img
                    src={customer.image}
                    alt={customer.name}
                    className="h-full w-full object-cover rounded-full"
                  />
                ) : (
                  getInitials(customer.name)
                )}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{customer.name}</h1>
              <p className="text-muted-foreground">{customer.email}</p>
            </div>
          </div>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/dashboard/customers/${customer.id}/edit`}>
            <PencilIcon className="mr-2 h-4 w-4" />
            Edit Customer
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Orders</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customer.stats.orders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Spent</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(customer.stats.total_spent)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Wishlist Items</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customer.stats.wishlist_items}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Support Tickets</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customer.stats.support_tickets}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="orders">Orders ({customer.stats.orders})</TabsTrigger>
          <TabsTrigger value="addresses">
            Addresses ({customer.stats.saved_addresses})
          </TabsTrigger>
          <TabsTrigger value="reviews">Reviews ({customer.stats.reviews})</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Email</div>
                  <div className="flex items-center gap-2">
                    {customer.email}
                    {customer.email_verified ? (
                      <Badge variant="default" className="text-xs">
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        Unverified
                      </Badge>
                    )}
                  </div>
                </div>
                {customer.mobile && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Phone</div>
                    <div>{customer.mobile}</div>
                  </div>
                )}
                {customer.username && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Username</div>
                    <div>@{customer.username}</div>
                  </div>
                )}
                {customer.company && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Company</div>
                    <div>{customer.company}</div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Address</CardTitle>
              </CardHeader>
              <CardContent>
                {customer.address ? (
                  <div className="space-y-1">
                    <div>{customer.address}</div>
                    {customer.city && <div>{customer.city}</div>}
                    {(customer.state || customer.country) && (
                      <div>
                        {customer.state && `${customer.state}, `}
                        {customer.country}
                      </div>
                    )}
                    {customer.postal_code && <div>{customer.postal_code}</div>}
                  </div>
                ) : (
                  <div className="text-muted-foreground">No address on file</div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Account Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">
                    Cart Items
                  </div>
                  <div className="text-2xl font-bold">{customer.stats.cart_items}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Reviews</div>
                  <div className="text-2xl font-bold">{customer.stats.reviews}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">
                    Member Since
                  </div>
                  <div className="text-sm">
                    {new Date(customer.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">
                    Last Updated
                  </div>
                  <div className="text-sm">
                    {new Date(customer.updated_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Orders</CardTitle>
              <CardDescription>
                {customer.stats.orders} total order{customer.stats.orders !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {customer.recent_orders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No orders found
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order Number</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customer.recent_orders.map((order: any) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">
                            {order.order_number}
                          </TableCell>
                          <TableCell>
                            {new Date(order.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>{order.item_count} item(s)</TableCell>
                          <TableCell>{formatCurrency(order.total_amount)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {formatOrderStatus(order.status || 'pending')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {formatPaymentStatus(order.payment_status || 'pending')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/dashboard/orders/${order.id}`}>
                                View
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Addresses Tab */}
        <TabsContent value="addresses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Saved Addresses</CardTitle>
              <CardDescription>
                {customer.stats.saved_addresses} saved address
                {customer.stats.saved_addresses !== 1 ? 'es' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {customer.addresses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No saved addresses
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {customer.addresses.map((address: any) => (
                    <Card key={address.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{address.name}</CardTitle>
                          {address.is_default && (
                            <Badge variant="default">Default</Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {address.address && <div>{address.address}</div>}
                        {address.city && (
                          <div>
                            {address.city}
                            {address.postal_code && `, ${address.postal_code}`}
                          </div>
                        )}
                        {address.phone && (
                          <div className="text-sm text-muted-foreground">
                            {address.phone}
                          </div>
                        )}
                        {address.email && (
                          <div className="text-sm text-muted-foreground">
                            {address.email}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reviews Tab */}
        <TabsContent value="reviews" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Product Reviews</CardTitle>
              <CardDescription>
                {customer.stats.reviews} review{customer.stats.reviews !== 1 ? 's' : ''} submitted
              </CardDescription>
            </CardHeader>
            <CardContent>
              {customer.reviews.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No reviews submitted yet
                </div>
              ) : (
                <div className="space-y-4">
                  {customer.reviews.map((review: any) => (
                    <Card key={review.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Link
                                href={`/dashboard/products/${review.product.id}`}
                                className="font-medium hover:underline"
                              >
                                {review.product.name}
                              </Link>
                              {review.status && (
                                <Badge variant={review.status === 'approved' ? 'default' : 'secondary'}>
                                  {review.status}
                                </Badge>
                              )}
                            </div>
                            {review.rating && (
                              <div className="flex items-center gap-1 mb-2">
                                {[...Array(5)].map((_: any, i: any) => (
                                  <span
                                    key={i}
                                    className={i < (review.rating || 0) ? 'text-yellow-400' : 'text-gray-300'}
                                  >
                                    ★
                                  </span>
                                ))}
                                <span className="ml-2 text-sm text-muted-foreground">
                                  {review.rating}/5
                                </span>
                              </div>
                            )}
                            {review.comment && (
                              <p className="text-sm text-muted-foreground">{review.comment}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-2">
                              {new Date(review.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

