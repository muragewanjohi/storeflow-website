/**
 * Orders List Client Component
 * 
 * Displays list of orders with filtering, search, and actions
 */

'use client';

import { useMemo, useState, useTransition, useEffect } from 'react';
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
import { EyeIcon, MagnifyingGlassIcon, FunnelIcon, CubeIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { formatOrderStatus, formatPaymentStatus } from '@/lib/orders/utils';
import { Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useCurrency } from '@/lib/currency/currency-context';
import { useThemeColors } from '@/lib/analytics/use-theme-colors';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from '@/components/analytics/lazy-charts';

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
  tumizi_refund_status: string | null;
  order_details: any | null; // Contains tracking_number and shipping_carrier
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

interface MobileOrderFilters {
  search: string;
  customerEmail: string;
  orderStatus: string;
  paymentStatus: string;
  startDate: string;
  endDate: string;
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
  const { primary } = useThemeColors();
  
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
  const [mobileStatusFilter, setMobileStatusFilter] = useState<'all' | 'pending' | 'paid' | 'shipped' | 'delivered'>('all');
  const [lowStockCount, setLowStockCount] = useState<number>(0);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [mobileFilters, setMobileFilters] = useState<MobileOrderFilters>({
    search: '',
    customerEmail: '',
    orderStatus: 'all',
    paymentStatus: 'all',
    startDate: '',
    endDate: '',
  });
  const [mobileFilterDraft, setMobileFilterDraft] = useState<MobileOrderFilters>({
    search: '',
    customerEmail: '',
    orderStatus: 'all',
    paymentStatus: 'all',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    const fetchLowStock = async () => {
      try {
        const response = await fetch('/api/analytics/inventory');
        if (!response.ok) return;
        const data = await response.json();
        setLowStockCount(data?.data?.summary?.lowStockCount ?? 0);
      } catch {
        // Keep fallback count at 0
      }
    };

    fetchLowStock();
  }, []);

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
        return 'outline'; // use outline so pendingBadgeClass can apply amber without conflict
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
        return 'outline'; // use outline so pendingBadgeClass can apply amber without conflict
      case 'paid':
        return 'default';
      // Basic deposit support (docs/SERVICES_PLAN.md) — genuinely paid,
      // but not fully settled, so distinct from both 'paid' and 'pending'.
      case 'deposit_paid':
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

  // Readable pending badge: light amber background, dark text (avoids dark-on-dark from secondary variant)
  const pendingBadgeClass =
    'bg-amber-100 text-amber-900 border-amber-200 hover:bg-amber-100';

  const formatRelativeTime = (date: string) => {
    const now = Date.now();
    const then = new Date(date).getTime();
    const diffMs = now - then;
    if (diffMs < 60_000) return 'just now';
    const mins = Math.floor(diffMs / 60_000);
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
    const days = Math.floor(hrs / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  const mobileFilteredOrders = useMemo(() => {
    let filtered = initialOrders;

    if (mobileStatusFilter === 'paid') {
      filtered = filtered.filter((order: any) => (order.payment_status || '').toLowerCase() === 'paid');
    } else if (mobileStatusFilter !== 'all') {
      filtered = filtered.filter((order: any) => (order.status || '').toLowerCase() === mobileStatusFilter);
    }

    if (mobileFilters.search.trim()) {
      const q = mobileFilters.search.trim().toLowerCase();
      filtered = filtered.filter((order: any) => {
        const orderNo = (order.order_number || '').toLowerCase();
        const name = (order.name || '').toLowerCase();
        const email = (order.email || '').toLowerCase();
        return orderNo.includes(q) || name.includes(q) || email.includes(q);
      });
    }

    if (mobileFilters.customerEmail.trim()) {
      const emailQuery = mobileFilters.customerEmail.trim().toLowerCase();
      filtered = filtered.filter((order: any) => (order.email || '').toLowerCase().includes(emailQuery));
    }

    if (mobileFilters.orderStatus !== 'all') {
      filtered = filtered.filter((order: any) => (order.status || '').toLowerCase() === mobileFilters.orderStatus);
    }

    if (mobileFilters.paymentStatus !== 'all') {
      filtered = filtered.filter((order: any) => (order.payment_status || '').toLowerCase() === mobileFilters.paymentStatus);
    }

    if (mobileFilters.startDate) {
      const start = new Date(mobileFilters.startDate);
      start.setHours(0, 0, 0, 0);
      filtered = filtered.filter((order: any) => new Date(order.created_at).getTime() >= start.getTime());
    }

    if (mobileFilters.endDate) {
      const end = new Date(mobileFilters.endDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter((order: any) => new Date(order.created_at).getTime() <= end.getTime());
    }

    return filtered;
  }, [initialOrders, mobileStatusFilter, mobileFilters]);

  const mobileSummary = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const today = initialOrders.filter((o: any) => new Date(o.created_at).getTime() >= startOfDay).length;
    const pending = initialOrders.filter((o: any) => ['pending', 'processing'].includes((o.status || '').toLowerCase())).length;
    const paid = initialOrders.filter((o: any) => (o.payment_status || '').toLowerCase() === 'paid').length;
    const completed = initialOrders.filter((o: any) => ['delivered', 'completed'].includes((o.status || '').toLowerCase())).length;
    return { today, pending, paid, completed };
  }, [initialOrders]);

  const mobileOrdersTrend = useMemo(() => {
    const days = Array.from({ length: 7 }).map((_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      date.setHours(0, 0, 0, 0);
      return date;
    });

    return days.map((day) => {
      const start = day.getTime();
      const end = start + 24 * 60 * 60 * 1000;
      const count = initialOrders.filter((o: any) => {
        const created = new Date(o.created_at).getTime();
        return created >= start && created < end;
      }).length;
      return {
        label: day.toLocaleDateString(undefined, { weekday: 'short' }),
        orders: count,
      };
    });
  }, [initialOrders]);

  const openMobileFilter = () => {
    setMobileFilterDraft(mobileFilters);
    setIsMobileFilterOpen(true);
  };

  const applyMobileFilters = () => {
    setMobileFilters(mobileFilterDraft);
    const nextStatus = mobileFilterDraft.orderStatus as 'all' | 'pending' | 'paid' | 'shipped' | 'delivered';
    if (['all', 'pending', 'paid', 'shipped', 'delivered'].includes(nextStatus)) {
      setMobileStatusFilter(nextStatus);
    }
    setIsMobileFilterOpen(false);
  };

  const clearMobileFilters = () => {
    const cleared: MobileOrderFilters = {
      search: '',
      customerEmail: '',
      orderStatus: 'all',
      paymentStatus: 'all',
      startDate: '',
      endDate: '',
    };
    setMobileFilters(cleared);
    setMobileFilterDraft(cleared);
    setMobileStatusFilter('all');
    setIsMobileFilterOpen(false);
  };

  return (
    <div>
      <div className="min-h-screen bg-[#f3f4f6] pb-24 md:hidden">
        <section className="bg-gradient-to-b from-primary to-primary/80 px-4 pb-6 pt-8">
          <div className="flex items-center justify-between">
            <h1 className="text-[34px] font-bold leading-tight text-primary-foreground">Your Orders</h1>
            <div className="flex items-center gap-2">
              <button type="button" className="rounded-full bg-primary-foreground/20 p-2.5 text-primary-foreground">
                <MagnifyingGlassIcon className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={openMobileFilter}
                className="rounded-full bg-primary-foreground/20 p-2.5 text-primary-foreground"
              >
                <FunnelIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </section>

        <section className="space-y-4 px-4 pt-4">
          <div className="grid grid-cols-4 gap-2">
            <Card className="border-[#e5e7eb]">
              <CardContent className="p-3">
                <p className="text-[24px] font-bold leading-none text-[#1f2937]">{mobileSummary.today}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">Today</p>
              </CardContent>
            </Card>
            <Card className="border-[#e5e7eb]">
              <CardContent className="p-3">
                <p className="text-[24px] font-bold leading-none text-[#1f2937]">{mobileSummary.pending}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">Pending</p>
              </CardContent>
            </Card>
            <Card className="border-[#e5e7eb]">
              <CardContent className="p-3">
                <p className="text-[24px] font-bold leading-none text-[#1f2937]">{mobileSummary.paid}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">Paid</p>
              </CardContent>
            </Card>
            <Card className="border-[#e5e7eb]">
              <CardContent className="p-3">
                <p className="text-[24px] font-bold leading-none text-[#1f2937]">{mobileSummary.completed}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">Complete</p>
              </CardContent>
            </Card>
          </div>

          {lowStockCount > 0 && (
            <Card className="border-[#f1d6b8] bg-[#fff8f0]">
              <CardContent className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2">
                  <CubeIcon className="h-4 w-4 text-[#f08c00]" />
                  <p className="text-sm text-[#d9480f]">{lowStockCount} products low in stock</p>
                </div>
                <Link href="/dashboard/inventory" className="text-sm font-medium text-[#f76707]">View</Link>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-2 overflow-x-auto pb-1">
            {(['all', 'pending', 'paid', 'shipped', 'delivered'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setMobileStatusFilter(tab)}
                className={`rounded-full border px-4 py-1.5 text-xs font-medium capitalize ${
                  mobileStatusFilter === tab
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-[#d1d5dc] bg-white text-[#6b7280]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <Card className="border-[#e5e7eb]">
            <CardHeader className="pb-2">
              <CardTitle className="text-[16px]">Orders last 7 days</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-28">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={mobileOrdersTrend}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={22} />
                    <Tooltip />
                    <Line type="monotone" dataKey="orders" stroke={primary} strokeWidth={2.2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {mobileFilteredOrders.length > 0 ? (
              mobileFilteredOrders.map((order: any) => {
                const orderStatus = (order.status || 'pending').toLowerCase();
                const paymentStatus = (order.payment_status || 'pending').toLowerCase();
                const canFulfill = ['pending', 'processing'].includes(orderStatus);

                return (
                  <Card key={order.id} className="border-[#e5e7eb]">
                    <CardContent className="space-y-2 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[26px] font-bold leading-none text-[#1f2937]">#{order.order_number?.replace(/[^0-9]/g, '').slice(-4) || order.order_number}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{order.name || 'Guest Customer'}</p>
                        </div>
                        <p className="text-[26px] font-bold leading-none text-[#1f2937]">{formatCurrency(order.total_amount)}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">{formatPaymentStatus(paymentStatus)}</Badge>
                        {order.payment_gateway === 'tumizi' && order.tumizi_refund_status && (
                          <Badge
                            variant={getRefundStatusBadgeVariant(order.tumizi_refund_status)}
                            className={
                              order.tumizi_refund_status.toLowerCase() === 'pending'
                                ? pendingBadgeClass
                                : undefined
                            }
                          >
                            {order.tumizi_refund_status.toLowerCase() === 'completed'
                              ? 'Refunded'
                              : order.tumizi_refund_status.toLowerCase() === 'failed'
                                ? 'Refund Failed'
                                : 'Refund Pending'}
                          </Badge>
                        )}
                        <Badge
                          className={
                            orderStatus === 'pending'
                              ? 'bg-amber-100 text-amber-900 hover:bg-amber-100'
                              : orderStatus === 'shipped'
                                ? 'bg-primary/10 text-primary hover:bg-primary/10'
                                : orderStatus === 'delivered'
                                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100'
                                  : 'bg-slate-100 text-slate-800 hover:bg-slate-100'
                          }
                        >
                          {formatOrderStatus(orderStatus)}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">{formatRelativeTime(order.created_at)}</p>
                        <div className="flex items-center gap-2">
                          {canFulfill && (
                            <Button variant="outline" size="sm" className="h-8 rounded-lg bg-primary/10 text-primary hover:bg-primary/20">
                              Fulfill
                            </Button>
                          )}
                          <Button size="sm" asChild className="h-8 rounded-lg bg-primary hover:bg-primary/90">
                            <Link href={`/dashboard/orders/${order.id}`}>
                              <EyeIcon className="mr-1 h-3.5 w-3.5" />
                              View
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <Card className="border-[#e5e7eb]">
                <CardContent className="p-6 text-center text-sm text-muted-foreground">No orders found for this filter.</CardContent>
              </Card>
            )}
          </div>
        </section>

        {isMobileFilterOpen && (
          <div className="fixed inset-0 z-50 bg-black/50">
            <div className="absolute inset-x-0 bottom-0 h-[73vh] rounded-t-3xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-[#e5e7eb] px-4 py-4">
                <h2 className="text-[20px] font-semibold tracking-[-0.4492px] text-[#1f2937]">Filter Orders</h2>
                <button
                  type="button"
                  onClick={() => setIsMobileFilterOpen(false)}
                  className="rounded-full bg-[#f3f4f6] p-2 text-[#6b7280]"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="h-[calc(73vh-165px)] space-y-4 overflow-y-auto px-4 py-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-[#1f2937]">Search</Label>
                  <Input
                    value={mobileFilterDraft.search}
                    onChange={(e) => setMobileFilterDraft((prev) => ({ ...prev, search: e.target.value }))}
                    placeholder="Order number or customer name"
                    className="h-12 rounded-[14px] border-[#e5e7eb] bg-[#f9fafb] text-base"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-[#1f2937]">Customer Email</Label>
                  <Input
                    value={mobileFilterDraft.customerEmail}
                    onChange={(e) => setMobileFilterDraft((prev) => ({ ...prev, customerEmail: e.target.value }))}
                    placeholder="customer@example.com"
                    className="h-12 rounded-[14px] border-[#e5e7eb] bg-[#f9fafb] text-base"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-[#1f2937]">Order Status</Label>
                  <Select
                    value={mobileFilterDraft.orderStatus}
                    onValueChange={(value) => setMobileFilterDraft((prev) => ({ ...prev, orderStatus: value }))}
                  >
                    <SelectTrigger className="h-12 rounded-[14px] border-[#e5e7eb] bg-[#f9fafb]">
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="shipped">Shipped</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-[#1f2937]">Payment Status</Label>
                  <Select
                    value={mobileFilterDraft.paymentStatus}
                    onValueChange={(value) => setMobileFilterDraft((prev) => ({ ...prev, paymentStatus: value }))}
                  >
                    <SelectTrigger className="h-12 rounded-[14px] border-[#e5e7eb] bg-[#f9fafb]">
                      <SelectValue placeholder="All payment statuses" />
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

                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-[#1f2937]">Date Range</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      type="date"
                      value={mobileFilterDraft.startDate}
                      onChange={(e) => setMobileFilterDraft((prev) => ({ ...prev, startDate: e.target.value }))}
                      className="h-12 rounded-[14px] border-[#e5e7eb] bg-[#f9fafb]"
                    />
                    <Input
                      type="date"
                      value={mobileFilterDraft.endDate}
                      onChange={(e) => setMobileFilterDraft((prev) => ({ ...prev, endDate: e.target.value }))}
                      className="h-12 rounded-[14px] border-[#e5e7eb] bg-[#f9fafb]"
                    />
                  </div>
                </div>
              </div>

              <div className="absolute inset-x-0 bottom-0 space-y-2 border-t border-[#e5e7eb] bg-white px-4 py-4">
                <Button
                  type="button"
                  onClick={applyMobileFilters}
                  className="h-14 w-full rounded-[14px] bg-primary text-base font-semibold hover:bg-primary/90"
                >
                  Apply Filters
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={clearMobileFilters}
                  className="h-14 w-full rounded-[14px] bg-[#f3f4f6] text-base font-semibold text-[#1f2937] hover:bg-[#eceef1]"
                >
                  Clear
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="hidden md:block">
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
                          <div className="space-y-1">
                            <Badge
                              variant={getStatusBadgeVariant(order.status)}
                              className={
                                order.status?.toLowerCase() === 'pending'
                                  ? pendingBadgeClass
                                  : undefined
                              }
                            >
                              {formatOrderStatus(order.status || 'pending')}
                            </Badge>
                            {order.status?.toLowerCase() === 'shipped' && order.order_details && (
                              <div className="text-xs text-muted-foreground space-y-0.5 mt-1">
                                {order.order_details.tracking_number && (
                                  <div>
                                    <span className="font-medium">Tracking:</span>{' '}
                                    <span className="font-mono">{order.order_details.tracking_number}</span>
                                  </div>
                                )}
                                {order.order_details.shipping_carrier && (
                                  <div>
                                    <span className="font-medium">Carrier:</span>{' '}
                                    {order.order_details.shipping_carrier}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Badge
                              variant={getPaymentStatusBadgeVariant(order.payment_status)}
                              className={
                                order.payment_status?.toLowerCase() === 'pending'
                                  ? pendingBadgeClass
                                  : undefined
                              }
                            >
                              {formatPaymentStatus(order.payment_status || 'pending')}
                            </Badge>
                            {order.payment_gateway === 'tumizi' && order.tumizi_refund_status && (
                              <div>
                                <Badge
                                  variant={getRefundStatusBadgeVariant(order.tumizi_refund_status)}
                                  className={
                                    order.tumizi_refund_status.toLowerCase() === 'pending'
                                      ? pendingBadgeClass
                                      : undefined
                                  }
                                >
                                  {order.tumizi_refund_status.toLowerCase() === 'completed'
                                    ? 'Refunded'
                                    : order.tumizi_refund_status.toLowerCase() === 'failed'
                                      ? 'Refund Failed'
                                      : 'Refund Pending'}
                                </Badge>
                              </div>
                            )}
                          </div>
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
    </div>
  );
}

