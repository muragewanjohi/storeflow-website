/**
 * Inventory Alerts Client Component
 * 
 * Displays low stock alerts with filtering
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import {
  ExclamationTriangleIcon,
  ArrowLeftIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';

interface LowStockProduct {
  id: string;
  name: string;
  sku: string | null;
  stock_quantity: number;
  image: string | null;
  status: string;
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

interface InventoryAlertsClientProps {
  lowStockProducts: LowStockProduct[];
  lowStockVariants: LowStockVariant[];
  threshold: number;
}

export default function InventoryAlertsClient({
  lowStockProducts,
  lowStockVariants,
  threshold: initialThreshold,
}: Readonly<InventoryAlertsClientProps>) {
  const router = useRouter();
  const [threshold, setThreshold] = useState(initialThreshold);

  const handleExportCSV = () => {
    const headers = ['Type', 'Product', 'Variant', 'SKU', 'Stock', 'Status'];
    const rows: string[][] = [];

    // Add products
    lowStockProducts.forEach((product: any) => {
      rows.push([
        'Product',
        product.name,
        '',
        product.sku || '',
        product.stock_quantity.toString(),
        product.status,
      ]);
    });

    // Add variants
    lowStockVariants.forEach((variant: any) => {
      const variantName = variant.attributes
        .map((a: any) => `${a.name}: ${a.value}`)
        .join(', ');
      rows.push([
        'Variant',
        variant.product_name,
        variantName,
        variant.variant_sku || variant.product_sku || '',
        variant.stock_quantity.toString(),
        'active',
      ]);
    });

    const csvContent = [
      headers.join(','),
      ...rows.map((row: any) => row.map((cell: any) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `low-stock-alerts-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleThresholdChange = () => {
    router.push(`/dashboard/inventory/alerts?threshold=${threshold}`);
  };

  const totalAlerts = lowStockProducts.length + lowStockVariants.length;

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
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <ExclamationTriangleIcon className="h-8 w-8 text-amber-600" />
              Low Stock Alerts
            </h1>
            <p className="text-muted-foreground mt-2">
              Products and variants with stock below threshold
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={handleExportCSV} disabled={totalAlerts === 0}>
          <ArrowDownTrayIcon className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Threshold Setting */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-end gap-4">
            <div className="space-y-2 flex-1">
              <Label htmlFor="threshold">Stock Threshold</Label>
              <Input
                id="threshold"
                type="number"
                min="0"
                value={threshold}
                onChange={(e) => setThreshold(parseInt(e.target.value) || 10)}
                placeholder="10"
              />
              <p className="text-xs text-muted-foreground">
                Items with stock at or below this level will be shown
              </p>
            </div>
            <Button onClick={handleThresholdChange}>Update Threshold</Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{totalAlerts}</div>
            <p className="text-xs text-muted-foreground">Items below threshold</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lowStockProducts.length}</div>
            <p className="text-xs text-muted-foreground">Products with low stock</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Variants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lowStockVariants.length}</div>
            <p className="text-xs text-muted-foreground">Variants with low stock</p>
          </CardContent>
        </Card>
      </div>

      {/* Products Table */}
      {lowStockProducts.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Products with Low Stock</CardTitle>
            <CardDescription>
              {lowStockProducts.length} product{lowStockProducts.length !== 1 ? 's' : ''} below threshold
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStockProducts.map((product: any) => (
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
                      <Badge variant={product.status === 'active' ? 'default' : 'secondary'}>
                        {product.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/dashboard/inventory/adjust?product_id=${product.id}`}>
                          Adjust Stock
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Variants Table */}
      {lowStockVariants.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Variants with Low Stock</CardTitle>
            <CardDescription>
              {lowStockVariants.length} variant{lowStockVariants.length !== 1 ? 's' : ''} below threshold
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                {lowStockVariants.map((variant: any) => (
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
                          Adjust Stock
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {totalAlerts === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Low Stock Alerts</h3>
            <p className="text-muted-foreground">
              All products and variants are above the threshold of {threshold} units.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

