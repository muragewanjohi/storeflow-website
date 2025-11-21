/**
 * Inventory Dashboard Client Component
 * 
 * Displays inventory overview, low stock alerts, and recent history
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CubeIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';

interface LowStockProduct {
  id: string;
  name: string;
  sku: string | null;
  stock_quantity: number;
  image: string | null;
}

interface LowStockVariant {
  id: string;
  product_id: string;
  product_name: string;
  product_sku: string | null;
  variant_sku: string | null;
  stock_quantity: number;
  attributes: Array<{
    name: string;
    value: string;
    color_code: string | null;
  }>;
}

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
  created_at: Date | string;
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

interface InventoryStats {
  totalProducts: number;
  totalVariants: number;
  totalStock: number;
  lowStockCount: number;
}

interface InventoryDashboardClientProps {
  lowStockProducts: LowStockProduct[];
  lowStockVariants: LowStockVariant[];
  recentHistory: InventoryHistory[];
  stats: InventoryStats;
}

export default function InventoryDashboardClient({
  lowStockProducts,
  lowStockVariants,
  recentHistory,
  stats,
}: Readonly<InventoryDashboardClientProps>) {
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory Management</h1>
          <p className="text-muted-foreground mt-2">
            Monitor stock levels, track adjustments, and manage inventory
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/inventory/adjust">Adjust Stock</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/inventory/history">View History</Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/inventory/bulk">Bulk Update</Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <CubeIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
            <p className="text-xs text-muted-foreground">Active products</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Variants</CardTitle>
            <ClipboardDocumentListIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalVariants}</div>
            <p className="text-xs text-muted-foreground">Product variants</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stock</CardTitle>
            <ArrowTrendingUpIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStock.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Units in stock</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
            <ExclamationTriangleIcon className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.lowStockCount}</div>
            <p className="text-xs text-muted-foreground">Items below threshold</p>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alerts */}
      {(lowStockProducts.length > 0 || lowStockVariants.length > 0) && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ExclamationTriangleIcon className="h-5 w-5 text-amber-600" />
                  Low Stock Alerts
                </CardTitle>
                <CardDescription>
                  Products and variants with stock below threshold (10 units)
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/inventory/alerts">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {lowStockProducts.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold mb-3">Products</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lowStockProducts.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {product.image && (
                              <img
                                src={product.image}
                                alt={product.name}
                                className="h-10 w-10 rounded object-cover"
                              />
                            )}
                            <span className="font-medium">{product.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {product.sku || '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={product.stock_quantity === 0 ? 'destructive' : 'secondary'}>
                            {product.stock_quantity}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/dashboard/inventory/adjust?product_id=${product.id}`}>
                              Adjust
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {lowStockVariants.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-3">Variants</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Variant</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lowStockVariants.map((variant) => (
                      <TableRow key={variant.id}>
                        <TableCell className="font-medium">{variant.product_name}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {variant.attributes.map((attr, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {attr.name}: {attr.value}
                                {attr.color_code && (
                                  <span
                                    className="ml-1 inline-block w-3 h-3 rounded border"
                                    style={{ backgroundColor: attr.color_code }}
                                  />
                                )}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {variant.variant_sku || variant.product_sku || '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={variant.stock_quantity === 0 ? 'destructive' : 'secondary'}>
                            {variant.stock_quantity}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/dashboard/inventory/adjust?variant_id=${variant.id}`}>
                              Adjust
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
      )}

      {/* Recent History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Inventory History</CardTitle>
              <CardDescription>
                Last 20 inventory adjustments
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/inventory/history">View All</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Before</TableHead>
                <TableHead>After</TableHead>
                <TableHead>Change</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentHistory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No inventory adjustments yet
                  </TableCell>
                </TableRow>
              ) : (
                recentHistory.map((history) => {
                  const itemName = history.products
                    ? history.products.name
                    : history.product_variants
                      ? `Variant (${history.product_variants.sku || 'N/A'})`
                      : 'Unknown';
                  const itemSku = history.products
                    ? history.products.sku
                    : history.product_variants?.sku || null;

                  return (
                    <TableRow key={history.id}>
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
                          {getAdjustmentIcon(history.adjustment_type)}
                          {getAdjustmentBadge(history.adjustment_type)}
                        </div>
                      </TableCell>
                      <TableCell>{history.quantity_before}</TableCell>
                      <TableCell>{history.quantity_after}</TableCell>
                      <TableCell>
                        <span
                          className={
                            history.quantity_change > 0
                              ? 'text-green-600 font-medium'
                              : history.quantity_change < 0
                                ? 'text-red-600 font-medium'
                                : 'text-muted-foreground'
                          }
                        >
                          {history.quantity_change > 0 ? '+' : ''}
                          {history.quantity_change}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {history.reason || '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(history.created_at), { addSuffix: true })}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

