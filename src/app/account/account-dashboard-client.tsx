/**
 * Account Dashboard Client Component
 * 
 * Displays customer overview with stats and recent orders
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ShoppingBagIcon, 
  CurrencyDollarIcon,
  ClockIcon,
  ArrowRightIcon,
  ArrowPathIcon 
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { useCurrency } from '@/lib/currency/currency-context';

interface DashboardData {
  customer: {
    name: string;
    email: string;
    joinedDate: Date | null;
  };
  stats: {
    totalOrders: number;
    totalSpent: number;
    pendingOrders: number;
  };
  recentOrders: Array<{
    id: string;
    order_number: string;
    total_amount: number;
    status: string | null;
    payment_status: string | null;
    created_at: Date | null;
  }>;
}

interface AccountDashboardClientProps {
  data: DashboardData;
}

export default function AccountDashboardClient({ data }: Readonly<AccountDashboardClientProps>) {
  const router = useRouter();
  const { formatCurrency } = useCurrency();
  const [isLinking, setIsLinking] = useState(false);
  const [hasCheckedOrders, setHasCheckedOrders] = useState(false);

  // Check if there might be guest orders to link
  useEffect(() => {
    if (data.stats.totalOrders === 0 && !hasCheckedOrders) {
      setHasCheckedOrders(true);
    }
  }, [data.stats.totalOrders, hasCheckedOrders]);

  const handleLinkOrders = async () => {
    setIsLinking(true);
    try {
      const response = await fetch('/api/account/link-orders', {
        method: 'POST',
      });

      const result = await response.json();

      if (response.ok && result.success) {
        if (result.linkedCount > 0) {
          toast.success(`Successfully linked ${result.linkedCount} order(s) to your account!`);
          // Refresh the page to show the linked orders
          router.refresh();
        } else {
          toast.info('No guest orders found to link. All your orders are already linked.');
        }
      } else {
        toast.error(result.error || 'Failed to link orders');
      }
    } catch (error) {
      console.error('Error linking orders:', error);
      toast.error('Failed to link orders. Please try again.');
    } finally {
      setIsLinking(false);
    }
  };

  // Using formatCurrency from useCurrency hook
  const formatPrice = (price: number) => formatCurrency(price);

  const getStatusBadgeColor = (status: string | null) => {
    if (!status) return 'bg-gray-100 text-gray-800';
    switch (status.toLowerCase()) {
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

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold">Welcome back, {data.customer.name}!</h1>
        <p className="text-muted-foreground mt-2">
          Here&apos;s an overview of your account activity
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingBagIcon className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              All time orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <CurrencyDollarIcon className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(data.stats.totalSpent)}</div>
            <p className="text-xs text-muted-foreground">
              Lifetime value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <ClockIcon className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.pendingOrders}</div>
            <p className="text-xs text-muted-foreground">
              In progress
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Orders</CardTitle>
          <Link href="/account/orders">
            <Button variant="outline" size="sm">
              View All
              <ArrowRightIcon className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {data.recentOrders.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingBagIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                {hasCheckedOrders 
                  ? "You haven't placed any orders yet, or your guest orders haven't been linked."
                  : "You haven't placed any orders yet."}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={handleLinkOrders}
                  disabled={isLinking}
                  variant="outline"
                >
                  <ArrowPathIcon className={`h-4 w-4 mr-2 ${isLinking ? 'animate-spin' : ''}`} />
                  {isLinking ? 'Linking Orders...' : 'Link Guest Orders'}
                </Button>
                <Link href="/products">
                  <Button>Start Shopping</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {data.recentOrders.map((order: any) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => router.push(`/orders/${order.id}`)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <p className="font-semibold">Order #{order.order_number}</p>
                      <Badge className={getStatusBadgeColor(order.status)}>
                        {order.status?.replace('_', ' ') || 'Unknown'}
                      </Badge>
                    </div>
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
                  <div className="text-right">
                    <p className="font-semibold">{formatPrice(order.total_amount)}</p>
                    <ArrowRightIcon className="h-5 w-5 text-muted-foreground mt-1" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

