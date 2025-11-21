/**
 * Bulk Inventory Update Client Component
 * 
 * Form for updating multiple products/variants at once
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeftIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

interface Product {
  id: string;
  name: string;
  sku: string | null;
  stock_quantity: number;
}

interface Variant {
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

interface BulkInventoryClientProps {
  products: Product[];
  variants: Variant[];
}

interface BulkUpdateItem {
  id: string;
  type: 'product' | 'variant';
  name: string;
  sku: string | null;
  currentStock: number;
  adjustmentType: 'increase' | 'decrease' | 'set';
  quantity: string;
  reason: string;
}

export default function BulkInventoryClient({
  products,
  variants,
}: Readonly<BulkInventoryClientProps>) {
  const router = useRouter();
  const [items, setItems] = useState<BulkUpdateItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const addItem = (type: 'product' | 'variant', item: Product | Variant) => {
    // Check if item already added
    if (items.find((i) => i.id === item.id && i.type === type)) {
      return;
    }

    const newItem: BulkUpdateItem = {
      id: item.id,
      type,
      name: type === 'product' ? (item as Product).name : (item as Variant).product_name,
      sku: type === 'product' ? (item as Product).sku : (item as Variant).variant_sku,
      currentStock: item.stock_quantity,
      adjustmentType: 'set',
      quantity: '',
      reason: '',
    };

    setItems([...items, newItem]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof BulkUpdateItem, value: any) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (items.length === 0) {
      setError('Please add at least one item to update');
      return;
    }

    // Validate all items
    for (const item of items) {
      if (!item.quantity || parseInt(item.quantity) < 0) {
        setError(`Please enter a valid quantity for ${item.name}`);
        return;
      }

      if (item.adjustmentType === 'decrease' && parseInt(item.quantity) > item.currentStock) {
        setError(`Cannot decrease ${item.name} by more than current stock (${item.currentStock})`);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const updates = items.map((item) => ({
        [item.type === 'product' ? 'product_id' : 'variant_id']: item.id,
        adjustment_type: item.adjustmentType,
        quantity: parseInt(item.quantity),
        reason: item.reason || null,
      }));

      const response = await fetch('/api/inventory/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ updates }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update inventory');
      }

      const data = await response.json();
      setSuccess(`Successfully updated ${data.results.length} items${data.errors?.length > 0 ? `, ${data.errors.length} errors` : ''}`);
      
      // Clear form after 2 seconds and redirect
      setTimeout(() => {
        router.push('/dashboard/inventory');
        router.refresh();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to update inventory');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/inventory">
            <ArrowLeftIcon className="mr-2 h-4 w-4" />
            Back to Inventory
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bulk Inventory Update</h1>
          <p className="text-muted-foreground mt-2">
            Update stock levels for multiple products or variants at once
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-md border border-green-500/50 bg-green-500/10 p-4">
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Add Items */}
            <Card>
              <CardHeader>
                <CardTitle>Add Items</CardTitle>
                <CardDescription>Select products or variants to update</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Products */}
                <div className="space-y-2">
                  <Label>Products</Label>
                  <Select
                    onValueChange={(value) => {
                      const product = products.find((p) => p.id === value);
                      if (product) addItem('product', product);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} ({product.sku || 'No SKU'}) - Stock: {product.stock_quantity}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Variants */}
                <div className="space-y-2">
                  <Label>Variants</Label>
                  <Select
                    onValueChange={(value) => {
                      const variant = variants.find((v) => v.id === value);
                      if (variant) addItem('variant', variant);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a variant" />
                    </SelectTrigger>
                    <SelectContent>
                      {variants.map((variant) => (
                        <SelectItem key={variant.id} value={variant.id}>
                          {variant.product_name} - {variant.attributes.map((a) => `${a.name}: ${a.value}`).join(', ')} ({variant.variant_sku || variant.product_sku || 'No SKU'}) - Stock: {variant.stock_quantity}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Update Items */}
            {items.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Items to Update ({items.length})</CardTitle>
                  <CardDescription>Configure adjustments for each item</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {items.map((item, index) => (
                    <div key={`${item.type}-${item.id}`} className="rounded-lg border p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium">{item.name}</div>
                          <div className="text-sm text-muted-foreground font-mono">
                            {item.sku || 'No SKU'}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            Current Stock: <span className="font-medium">{item.currentStock}</span>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(index)}
                        >
                          <TrashIcon className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                          <Label>Adjustment Type</Label>
                          <Select
                            value={item.adjustmentType}
                            onValueChange={(value: any) => updateItem(index, 'adjustmentType', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="increase">Increase</SelectItem>
                              <SelectItem value="decrease">Decrease</SelectItem>
                              <SelectItem value="set">Set</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>
                            {item.adjustmentType === 'set' ? 'New Stock' : 'Quantity'}
                          </Label>
                          <Input
                            type="number"
                            min="0"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                            placeholder={item.adjustmentType === 'set' ? 'New stock level' : 'Quantity'}
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Reason (Optional)</Label>
                          <Select
                            value={item.reason}
                            onValueChange={(value) => updateItem(index, 'reason', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select reason" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">No reason</SelectItem>
                              <SelectItem value="manual_adjustment">Manual Adjustment</SelectItem>
                              <SelectItem value="restock">Restock</SelectItem>
                              <SelectItem value="damage">Damage/Loss</SelectItem>
                              <SelectItem value="return">Return</SelectItem>
                              <SelectItem value="transfer">Transfer</SelectItem>
                              <SelectItem value="correction">Correction</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {item.quantity && !isNaN(parseInt(item.quantity)) && (
                        <div className="text-sm text-muted-foreground">
                          New stock will be:{' '}
                          <span className="font-medium">
                            {item.adjustmentType === 'increase'
                              ? item.currentStock + parseInt(item.quantity)
                              : item.adjustmentType === 'decrease'
                                ? Math.max(0, item.currentStock - parseInt(item.quantity))
                                : parseInt(item.quantity)}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Bulk Update Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm text-muted-foreground">Items Selected</div>
                  <div className="text-2xl font-bold">{items.length}</div>
                </div>
                <div className="text-sm text-muted-foreground">
                  <p>• Select products or variants from the dropdown</p>
                  <p>• Configure adjustment type and quantity for each</p>
                  <p>• All updates will be processed in a single operation</p>
                  <p>• Each adjustment will be logged in inventory history</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Form Actions */}
        {items.length > 0 && (
          <div className="mt-6 flex justify-end gap-4">
            <Button type="button" variant="outline" asChild>
              <Link href="/dashboard/inventory">Cancel</Link>
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : `Update ${items.length} Item${items.length > 1 ? 's' : ''}`}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}

