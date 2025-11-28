/**
 * Orders List Client Component
 * 
 * Displays list of orders with filtering, search, and actions
 */

'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { EyeIcon, MagnifyingGlassIcon, CheckIcon } from '@heroicons/react/24/outline';
import { formatOrderStatus, formatPaymentStatus } from '@/lib/orders/utils';
import { Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useCurrency } from '@/lib/currency/currency-context';

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
  item_count: number;
  created_at: string;
  updated_at: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

interface OrdersListClientProps {
  initialOrders: Order[];
  initialPagination: Pagination | null;
  dbError: string | null;
  currentSearchParams: {
    page: number;
    limit: number;
    search: string;
    status: string;
    payment_status: string;
    order_number: string;
    customer_email: string;
    start_date: string;
    end_date: string;
  };
}

export default function OrdersListClient({
  initialOrders,
  initialPagination,
  dbError,
  currentSearchParams,
}: Readonly<OrdersListClientProps>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const { formatCurrency } = useCurrency();
  
  const [search, setSearch] = useState(currentSearchParams.search);
  const [status, setStatus] = useState(currentSearchParams.status || 'all');
  const [paymentStatus, setPaymentStatus] = useState(currentSearchParams.payment_status || 'all');
  const [orderNumber, setOrderNumber] = useState(currentSearchParams.order_number);
  const [customerEmail, setCustomerEmail] = useState(currentSearchParams.customer_email);
  const [startDate, setStartDate] = useState(currentSearchParams.start_date);
  const [endDate, setEndDate] = useState(currentSearchParams.end_date);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<string>('');
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  const handleSearch = () => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (search) {
      params.set('search', search);
    } else {
      params.delete('search');
    }
    
    if (status && status !== 'all') {
      params.set('status', status);
    } else {
      params.delete('status');
    }
    
    if (paymentStatus && paymentStatus !== 'all') {
      params.set('payment_status', paymentStatus);
    } else {
      params.delete('payment_status');
    }
    
    if (orderNumber) {
      params.set('order_number', orderNumber);
    } else {
      params.delete('order_number');
    }
    
    if (customerEmail) {
      params.set('customer_email', customerEmail);
    } else {
      params.delete('customer_email');
    }
    
    if (startDate) {
      params.set('start_date', startDate);
    } else {
      params.delete('start_date');
    }
    
    if (endDate) {
      params.set('end_date', endDate);
    } else {
      params.delete('end_date');
    }
    
    // Reset to page 1 when filtering
    params.set('page', '1');
    
    startTransition(() => {
      router.push(`/dashboard/orders?${params.toString()}`);
    });
  };

  const handleClearFilters = () => {
    setSearch('');
    setStatus('all');
    setPaymentStatus('all');
    setOrderNumber('');
    setCustomerEmail('');
    setStartDate('');
    setEndDate('');
    
    startTransition(() => {
      router.push('/dashboard/orders');
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrders(new Set(initialOrders.map((order: any) => order.id)));
    } else {
      setSelectedOrders(new Set());
    }
  };

  const handleSelectOrder = (orderId: string, checked: boolean) => {
    const newSelected = new Set(selectedOrders);
    if (checked) {
      newSelected.add(orderId);
    } else {
      newSelected.delete(orderId);
    }
    setSelectedOrders(newSelected);
  };

  const handleBulkAction = async () => {
    if (selectedOrders.size === 0 || !bulkAction) return;

    setIsBulkUpdating(true);
    try {
      const orderIds = Array.from(selectedOrders);
      
      if (bulkAction === 'export') {
        // Export selected orders as CSV
        const selectedOrdersData = initialOrders.filter((order: any) => orderIds.includes(order.id));
        const csvContent = [
          ['Order Number', 'Customer', 'Email', 'Total', 'Status', 'Payment Status', 'Date'].join(','),
          ...selectedOrdersData.map((order: any) =>
            [
              order.order_number,
              order.name || '',
              order.email || '',
              order.total_amount.toFixed(2),
              order.status || '',
              order.payment_status || '',
              new Date(order.created_at).toLocaleDateString(),
            ].join(',')
          ),
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `orders-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        setSelectedOrders(new Set());
        setBulkAction('');
      } else if (['pending', 'processing', 'shipped', 'delivered'].includes(bulkAction)) {
        // Bulk status update
        const promises = orderIds.map((orderId) =>
          fetch(`/api/orders/${orderId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status: bulkAction }),
          })
        );

        await Promise.all(promises);
        setSelectedOrders(new Set());
        setBulkAction('');
        router.refresh();
      }
    } catch (error) {
      console.error('Error performing bulk action:', error);
    } finally {
      setIsBulkUpdating(false);
    }
  };

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

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
        <p className="text-muted-foreground mt-2">
          Manage and track customer orders
        </p>
      </div>

      {dbError && (
        <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{dbError}</p>
        </div>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Search and filter orders</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Search orders..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="order_number">Order Number</Label>
              <Input
                id="order_number"
                placeholder="ORD-20241218-123456"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Order Status</Label>
              <Select value={status} onValueChange={(value) => setStatus(value)}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment_status">Payment Status</Label>
              <Select value={paymentStatus} onValueChange={(value) => setPaymentStatus(value)}>
                <SelectTrigger id="payment_status">
                  <SelectValue placeholder="All Payment Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Payment Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer_email">Customer Email</Label>
              <Input
                id="customer_email"
                type="email"
                placeholder="customer@example.com"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">End Date</Label>
              <Input
                id="end_date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="space-y-2 flex items-end">
              <div className="flex gap-2 w-full">
                <Button onClick={handleSearch} disabled={isPending} className="flex-1">
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <MagnifyingGlassIcon className="mr-2 h-4 w-4" />
                      Search
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={handleClearFilters} disabled={isPending}>
                  Clear
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedOrders.size > 0 && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">
                  {selectedOrders.size} order{selectedOrders.size !== 1 ? 's' : ''} selected
                </span>
                <Select value={bulkAction} onValueChange={setBulkAction}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Bulk Actions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="export">Export to CSV</SelectItem>
                    <SelectItem value="pending">Mark as Pending</SelectItem>
                    <SelectItem value="processing">Mark as Processing</SelectItem>
                    <SelectItem value="shipped">Mark as Shipped</SelectItem>
                    <SelectItem value="delivered">Mark as Delivered</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleBulkAction}
                  disabled={!bulkAction || isBulkUpdating}
                  size="sm"
                >
                  {isBulkUpdating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Apply'
                  )}
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedOrders(new Set())}
              >
                Clear Selection
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Orders</CardTitle>
          <CardDescription>
            {initialPagination
              ? `Showing ${(initialPagination.page - 1) * initialPagination.limit + 1} to ${Math.min(initialPagination.page * initialPagination.limit, initialPagination.total)} of ${initialPagination.total} orders`
              : 'No orders found'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {initialOrders.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No orders found.</p>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedOrders.size === initialOrders.length && initialOrders.length > 0}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Order Number</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {initialOrders.map((order: any) => (
                      <TableRow key={order.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedOrders.has(order.id)}
                            onCheckedChange={(checked) => handleSelectOrder(order.id, checked as boolean)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{order.order_number}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{order.name || 'N/A'}</div>
                            <div className="text-sm text-muted-foreground">{order.email || 'N/A'}</div>
                          </div>
                        </TableCell>
                        <TableCell>{order.item_count}</TableCell>
                        <TableCell>{formatCurrency(order.total_amount)}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(order.status)}>
                            {formatOrderStatus(order.status || 'pending')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getPaymentStatusBadgeVariant(order.payment_status)}>
                            {formatPaymentStatus(order.payment_status || 'pending')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(order.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/dashboard/orders/${order.id}`}>
                              <EyeIcon className="h-4 w-4 mr-2" />
                              View
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {initialPagination && initialPagination.total_pages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Page {initialPagination.page} of {initialPagination.total_pages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={initialPagination.page === 1 || isPending}
                      onClick={() => {
                        const params = new URLSearchParams(searchParams.toString());
                        params.set('page', (initialPagination.page - 1).toString());
                        startTransition(() => {
                          router.push(`/dashboard/orders?${params.toString()}`);
                        });
                      }}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={initialPagination.page === initialPagination.total_pages || isPending}
                      onClick={() => {
                        const params = new URLSearchParams(searchParams.toString());
                        params.set('page', (initialPagination.page + 1).toString());
                        startTransition(() => {
                          router.push(`/dashboard/orders?${params.toString()}`);
                        });
                      }}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

