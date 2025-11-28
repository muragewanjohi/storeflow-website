/**
 * Inventory History Client Component
 * 
 * Displays inventory adjustment history with filtering
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CubeIcon,
  ArrowLeftIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';

interface InventoryHistory {
  id: string;
  product_id: string | null;
  variant_id: string | null;
  adjustment_type: string;
  quantity_before: number;
  quantity_after: number;
  quantity_change: number;
  reason: string | null;
  notes: string | null;
  created_at: string;
  products: {
    id: string;
    name: string;
    sku: string | null;
  } | null;
  product_variants: {
    id: string;
    sku: string | null;
  } | null;
}

interface InventoryHistoryClientProps {
  initialPage: number;
  initialLimit: number;
  productId?: string;
  variantId?: string;
  adjustmentType?: string;
}

export default function InventoryHistoryClient({
  initialPage,
  initialLimit,
  productId: initialProductId,
  variantId: initialVariantId,
  adjustmentType: initialAdjustmentType,
}: Readonly<InventoryHistoryClientProps>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(initialLimit);
  const [adjustmentType, setAdjustmentType] = useState(initialAdjustmentType || 'all');
  const [history, setHistory] = useState<InventoryHistory[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory();
  }, [page, limit, adjustmentType, initialProductId, initialVariantId]);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', limit.toString());
      if (initialProductId) params.set('product_id', initialProductId);
      if (initialVariantId) params.set('variant_id', initialVariantId);
      if (adjustmentType && adjustmentType !== 'all') params.set('adjustment_type', adjustmentType);

      const response = await fetch(`/api/inventory/history?${params.toString()}`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch history');
      }

      const data = await response.json();
      setHistory(data.history || []);
      setPagination(data.pagination || null);
    } catch (err: any) {
      setError(err.message || 'Failed to load inventory history');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Date', 'Item', 'SKU', 'Type', 'Before', 'After', 'Change', 'Reason', 'Notes'];
    const rows = history.map((h: any) => {
      const itemName = h.products
        ? h.products.name
        : h.product_variants
          ? `Variant (${h.product_variants.sku || 'N/A'})`
          : 'Unknown';
      const itemSku = h.products?.sku || h.product_variants?.sku || '';

      return [
        new Date(h.created_at).toLocaleString(),
        itemName,
        itemSku,
        h.adjustment_type,
        h.quantity_before.toString(),
        h.quantity_after.toString(),
        h.quantity_change.toString(),
        h.reason || '',
        h.notes || '',
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map((row: any) => row.map((cell: any) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getAdjustmentIcon = (type: string) => {
    switch (type) {
      case 'increase':
        return <ArrowTrendingUpIcon className="h-4 w-4 text-green-600" />;
      case 'decrease':
      case 'sale':
        return <ArrowTrendingDownIcon className="h-4 w-4 text-red-600" />;
      default:
        return <CubeIcon className="h-4 w-4 text-gray-600" />;
    }
  };

  const getAdjustmentBadge = (type: string) => {
    const variants: Record<string, { label: string; variant: 'default' | 'destructive' | 'secondary' }> = {
      increase: { label: 'Increase', variant: 'default' },
      decrease: { label: 'Decrease', variant: 'destructive' },
      set: { label: 'Set', variant: 'secondary' },
      sale: { label: 'Sale', variant: 'destructive' },
      return: { label: 'Return', variant: 'default' },
      damage: { label: 'Damage', variant: 'destructive' },
      transfer: { label: 'Transfer', variant: 'secondary' },
    };

    const config = variants[type] || { label: type, variant: 'secondary' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/inventory">
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              Back to Inventory
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Inventory History</h1>
            <p className="text-muted-foreground mt-2">
              View all inventory adjustments and stock changes
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={handleExportCSV} disabled={history.length === 0}>
          <ArrowDownTrayIcon className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="adjustment_type">Adjustment Type</Label>
              <Select
                value={adjustmentType}
                onValueChange={(value) => {
                  setAdjustmentType(value);
                  setPage(1);
                }}
              >
                <SelectTrigger id="adjustment_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="increase">Increase</SelectItem>
                  <SelectItem value="decrease">Decrease</SelectItem>
                  <SelectItem value="set">Set</SelectItem>
                  <SelectItem value="sale">Sale</SelectItem>
                  <SelectItem value="return">Return</SelectItem>
                  <SelectItem value="damage">Damage</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="limit">Items per Page</Label>
              <Select
                value={limit.toString()}
                onValueChange={(value) => {
                  setLimit(parseInt(value));
                  setPage(1);
                }}
              >
                <SelectTrigger id="limit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Adjustment History</CardTitle>
          <CardDescription>
            {pagination && `Showing ${(page - 1) * limit + 1}-${Math.min(page * limit, pagination.total)} of ${pagination.total} adjustments`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 p-4">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading history...</div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No inventory adjustments found</div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Before</TableHead>
                    <TableHead>After</TableHead>
                    <TableHead>Change</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((h: any) => {
                    const itemName = h.products
                      ? h.products.name
                      : h.product_variants
                        ? `Variant (${h.product_variants.sku || 'N/A'})`
                        : 'Unknown';
                    const itemSku = h.products?.sku || h.product_variants?.sku || null;

                    return (
                      <TableRow key={h.id}>
                        <TableCell className="text-sm">
                          {formatDistanceToNow(new Date(h.created_at), { addSuffix: true })}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{itemName}</div>
                            {itemSku && (
                              <div className="text-xs text-muted-foreground font-mono">
                                {itemSku}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getAdjustmentIcon(h.adjustment_type)}
                            {getAdjustmentBadge(h.adjustment_type)}
                          </div>
                        </TableCell>
                        <TableCell>{h.quantity_before}</TableCell>
                        <TableCell>{h.quantity_after}</TableCell>
                        <TableCell>
                          <span
                            className={
                              h.quantity_change > 0
                                ? 'text-green-600 font-medium'
                                : h.quantity_change < 0
                                  ? 'text-red-600 font-medium'
                                  : 'text-muted-foreground'
                            }
                          >
                            {h.quantity_change > 0 ? '+' : ''}
                            {h.quantity_change}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {h.reason || '—'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                          {h.notes || '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Page {pagination.page} of {pagination.totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={!pagination.hasPrevPage || loading}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={!pagination.hasNextPage || loading}
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

