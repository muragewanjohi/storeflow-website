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
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';
import { Input } from '@/components/ui/input';

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
  threshold: number;
}

interface SearchProduct {
  id: string;
  name: string;
  sku: string | null;
  stock_quantity: number;
}

interface SearchVariant {
  id: string;
  product_id: string;
  product_name: string;
  product_sku: string | null;
  variant_sku: string | null;
  stock_quantity: number;
  attributes: Array<{
    name: string;
    value: string;
  }>;
}

interface InventoryDashboardClientProps {
  lowStockProducts: LowStockProduct[];
  lowStockVariants: LowStockVariant[];
  recentHistory: InventoryHistory[];
  allProducts: SearchProduct[];
  allVariants: SearchVariant[];
  stats: InventoryStats;
}

export default function InventoryDashboardClient({
  lowStockProducts,
  lowStockVariants,
  recentHistory,
  allProducts,
  allVariants,
  stats,
}: Readonly<InventoryDashboardClientProps>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
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

  // Filter products and variants based on search query
  const filteredSearchProducts = searchQuery
    ? allProducts.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : [];

  const filteredSearchVariants = searchQuery
    ? allVariants.filter(
        (v) =>
          v.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (v.variant_sku && v.variant_sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (v.product_sku && v.product_sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
          v.attributes.some(
            (attr) =>
              attr.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              attr.value.toLowerCase().includes(searchQuery.toLowerCase())
          )
      )
    : [];

  const hasSearchResults = filteredSearchProducts.length > 0 || filteredSearchVariants.length > 0;
  const totalSearchResults = filteredSearchProducts.length + filteredSearchVariants.length;

  // Filter low stock alerts based on search
  const filteredLowStockProducts = searchQuery
    ? lowStockProducts.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : lowStockProducts;

  const filteredLowStockVariants = searchQuery
    ? lowStockVariants.filter(
        (v) =>
          v.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (v.variant_sku && v.variant_sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (v.product_sku && v.product_sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
          v.attributes.some(
            (attr) =>
              attr.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              attr.value.toLowerCase().includes(searchQuery.toLowerCase())
          )
      )
    : lowStockVariants;

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

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search products or variants by name, SKU, or attribute..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchResults(e.target.value.length > 0);
              }}
              onFocus={() => {
                if (searchQuery.length > 0) {
                  setShowSearchResults(true);
                }
              }}
              className="pl-10"
            />
            {searchQuery && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-7 px-2"
                onClick={() => {
                  setSearchQuery('');
                  setShowSearchResults(false);
                }}
              >
                Clear
              </Button>
            )}
          </div>

          {/* Search Results Dropdown */}
          {showSearchResults && searchQuery && (
            <div className="mt-2 rounded-lg border bg-card shadow-lg">
              {hasSearchResults ? (
                <div className="max-h-96 overflow-y-auto">
                  {filteredSearchProducts.length > 0 && (
                    <div className="p-2">
                      <div className="mb-2 px-2 text-xs font-semibold text-muted-foreground uppercase">
                        Products ({filteredSearchProducts.length})
                      </div>
                      {filteredSearchProducts.map((product: any) => (
                        <Link
                          key={product.id}
                          href={`/dashboard/inventory/adjust?product_id=${product.id}`}
                          className="block rounded-md px-3 py-2 text-sm hover:bg-accent"
                          onClick={() => {
                            setSearchQuery('');
                            setShowSearchResults(false);
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">{product.name}</div>
                              {product.sku && (
                                <div className="text-xs text-muted-foreground font-mono">
                                  {product.sku}
                                </div>
                              )}
                            </div>
                            <Badge variant="secondary">Stock: {product.stock_quantity}</Badge>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}

                  {filteredSearchVariants.length > 0 && (
                    <div className="p-2 border-t">
                      <div className="mb-2 px-2 text-xs font-semibold text-muted-foreground uppercase">
                        Variants ({filteredSearchVariants.length})
                      </div>
                      {filteredSearchVariants.map((variant: any) => (
                        <Link
                          key={variant.id}
                          href={`/dashboard/inventory/adjust?variant_id=${variant.id}`}
                          className="block rounded-md px-3 py-2 text-sm hover:bg-accent"
                          onClick={() => {
                            setSearchQuery('');
                            setShowSearchResults(false);
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">{variant.product_name}</div>
                              <div className="text-xs text-muted-foreground">
                                {variant.attributes.map((a: any) => `${a.name}: ${a.value}`).join(', ')}
                              </div>
                              {(variant.variant_sku || variant.product_sku) && (
                                <div className="text-xs text-muted-foreground font-mono">
                                  {variant.variant_sku || variant.product_sku}
                                </div>
                              )}
                            </div>
                            <Badge variant="secondary">Stock: {variant.stock_quantity}</Badge>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No products or variants found matching &quot;{searchQuery}&quot;
                </div>
              )}
            </div>
          )}

          {searchQuery && totalSearchResults > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              Found {totalSearchResults} result{totalSearchResults !== 1 ? 's' : ''} - Click to adjust stock
            </p>
          )}
        </CardContent>
      </Card>

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
      {(filteredLowStockProducts.length > 0 || filteredLowStockVariants.length > 0) && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ExclamationTriangleIcon className="h-5 w-5 text-amber-600" />
                  Low Stock Alerts
                </CardTitle>
                <CardDescription>
                  Products and variants with stock below threshold ({stats.threshold} units)
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/inventory/alerts">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {filteredLowStockProducts.length > 0 && (
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
                    {filteredLowStockProducts.map((product: any) => (
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

            {filteredLowStockVariants.length > 0 && (
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
                    {filteredLowStockVariants.map((variant: any) => (
                      <TableRow key={variant.id}>
                        <TableCell className="font-medium">{variant.product_name}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {variant.attributes.map((attr: any, idx: any) => (
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
                recentHistory.map((history: any) => {
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

