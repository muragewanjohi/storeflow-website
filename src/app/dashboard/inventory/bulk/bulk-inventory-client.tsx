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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeftIcon,
  PlusIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
} from '@heroicons/react/24/outline';

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
  const [activeTab, setActiveTab] = useState<'manual' | 'csv'>('manual');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvParsing, setCsvParsing] = useState(false);
  const [csvErrors, setCsvErrors] = useState<any[]>([]);
  const [batchReason, setBatchReason] = useState('');
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [applyingPreset, setApplyingPreset] = useState(false);

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

  const downloadTemplate = async () => {
    setDownloadingTemplate(true);
    setError(null);
    try {
      const response = await fetch('/api/inventory/bulk/template');
      if (!response.ok) throw new Error('Failed to download template');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bulk-inventory-template-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err.message || 'Failed to download template');
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFile(file);
    setCsvParsing(true);
    setCsvErrors([]);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/inventory/bulk/import', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to parse CSV file');
      }

      if (data.errors && data.errors.length > 0) {
        setCsvErrors(data.errors);
      }

      // Convert parsed updates to items
      const newItems: BulkUpdateItem[] = [];

      for (const update of data.updates) {
        let item: Product | Variant | undefined;
        let type: 'product' | 'variant' | undefined;

        if (update.product_id) {
          item = products.find((p) => p.id === update.product_id);
          type = 'product';
        } else if (update.variant_id) {
          item = variants.find((v) => v.id === update.variant_id);
          type = 'variant';
        }

        if (item && type) {
          newItems.push({
            id: item.id,
            type,
            name: type === 'product' ? (item as Product).name : (item as Variant).product_name,
            sku: type === 'product' ? (item as Product).sku : (item as Variant).variant_sku,
            currentStock: item.stock_quantity,
            adjustmentType: update.adjustment_type,
            quantity: String(update.quantity),
            reason: update.reason || batchReason || '',
          });
        }
      }

      setItems(newItems);
      setActiveTab('manual'); // Switch to manual tab to show imported items
      setSuccess(`Successfully imported ${newItems.length} items from CSV${data.errors?.length > 0 ? ` (${data.errors.length} errors)` : ''}`);
    } catch (err: any) {
      setError(err.message || 'Failed to parse CSV file');
    } finally {
      setCsvParsing(false);
    }
  };

  const applyPresetAdjustment = async (preset: 'zero' | 'increase' | 'decrease', value?: number) => {
    setApplyingPreset(true);
    try {
      // Small delay to show loading state
      await new Promise((resolve) => setTimeout(resolve, 300));

      const updatedItems = items.map((item) => {
        let newQuantity = '';
        let newAdjustmentType: 'increase' | 'decrease' | 'set' = 'set';

        switch (preset) {
          case 'zero':
            newQuantity = '0';
            newAdjustmentType = 'set';
            break;
          case 'increase':
            if (value !== undefined) {
              newQuantity = String(value);
              newAdjustmentType = 'increase';
            }
            break;
          case 'decrease':
            if (value !== undefined) {
              newQuantity = String(value);
              newAdjustmentType = 'decrease';
            }
            break;
        }

        return {
          ...item,
          adjustmentType: newAdjustmentType,
          quantity: newQuantity,
          reason: item.reason || batchReason || '',
        };
      });

      setItems(updatedItems);
    } finally {
      setApplyingPreset(false);
    }
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
            {/* Import Method Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'manual' | 'csv')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                <TabsTrigger value="csv">CSV Import</TabsTrigger>
              </TabsList>

              <TabsContent value="manual" className="space-y-4">
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
              </TabsContent>

              <TabsContent value="csv" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Import from CSV</CardTitle>
                    <CardDescription>
                      Upload a CSV file to bulk update inventory. Download the template to see the required format.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={downloadTemplate}
                        className="flex-1"
                      >
                        <ArrowDownTrayIcon className="mr-2 h-4 w-4" />
                        Download Template
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="csv-upload">Upload CSV File</Label>
                      <div className="relative">
                        <Input
                          id="csv-upload"
                          type="file"
                          accept=".csv"
                          onChange={handleCsvUpload}
                          disabled={csvParsing}
                          className={csvParsing ? 'opacity-50 cursor-not-allowed' : ''}
                        />
                        {csvParsing && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <svg
                              className="h-4 w-4 animate-spin text-muted-foreground"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                          </div>
                        )}
                      </div>
                      {csvParsing && (
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <svg
                            className="h-4 w-4 animate-spin"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          Parsing CSV file...
                        </p>
                      )}
                    </div>

                    {csvErrors.length > 0 && (
                      <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-4">
                        <p className="text-sm font-semibold text-amber-800 mb-2">
                          CSV Import Warnings ({csvErrors.length})
                        </p>
                        <div className="space-y-1 max-h-40 overflow-y-auto">
                          {csvErrors.map((err, idx) => (
                            <p key={idx} className="text-xs text-amber-700">
                              Row {err.row}: {err.error} {err.sku ? `(SKU: ${err.sku})` : ''}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="rounded-md border p-4 bg-muted/50">
                      <p className="text-sm font-semibold mb-2">CSV Format:</p>
                      <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                        <li><strong>Type:</strong> &quot;product&quot; or &quot;variant&quot;</li>
                        <li><strong>SKU:</strong> Product/Variant SKU or ID</li>
                        <li><strong>Adjustment Type:</strong> &quot;increase&quot;, &quot;decrease&quot;, or &quot;set&quot;</li>
                        <li><strong>Quantity:</strong> Number (required for increase/decrease, new stock for set)</li>
                        <li><strong>Reason:</strong> Optional (manual_adjustment, restock, damage, return, transfer, correction)</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Batch Settings */}
            {items.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Batch Settings</CardTitle>
                  <CardDescription>Apply settings to all items</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Batch Reason (applies to all items)</Label>
                    <Select value={batchReason || 'none'} onValueChange={(v) => setBatchReason(v === 'none' ? '' : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select reason for all items" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No reason</SelectItem>
                        <SelectItem value="manual_adjustment">Manual Adjustment</SelectItem>
                        <SelectItem value="restock">Restock</SelectItem>
                        <SelectItem value="damage">Damage/Loss</SelectItem>
                        <SelectItem value="return">Return</SelectItem>
                        <SelectItem value="transfer">Transfer</SelectItem>
                        <SelectItem value="correction">Correction</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Preset Adjustments</Label>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => applyPresetAdjustment('zero')}
                        disabled={applyingPreset || items.length === 0}
                      >
                        {applyingPreset ? (
                          <>
                            <svg
                              className="mr-2 h-3 w-3 animate-spin"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                            Applying...
                          </>
                        ) : (
                          'Set All to 0'
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          const value = prompt('Enter quantity to increase by:');
                          if (value) {
                            const num = parseInt(value);
                            if (!isNaN(num) && num > 0) {
                              await applyPresetAdjustment('increase', num);
                            }
                          }
                        }}
                        disabled={applyingPreset || items.length === 0}
                      >
                        {applyingPreset ? (
                          <>
                            <svg
                              className="mr-2 h-3 w-3 animate-spin"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                            Applying...
                          </>
                        ) : (
                          'Increase All by X'
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          const value = prompt('Enter quantity to decrease by:');
                          if (value) {
                            const num = parseInt(value);
                            if (!isNaN(num) && num > 0) {
                              await applyPresetAdjustment('decrease', num);
                            }
                          }
                        }}
                        disabled={applyingPreset || items.length === 0}
                      >
                        {applyingPreset ? (
                          <>
                            <svg
                              className="mr-2 h-3 w-3 animate-spin"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                            Applying...
                          </>
                        ) : (
                          'Decrease All by X'
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

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
                            value={item.reason || 'none'}
                            onValueChange={(value) => updateItem(index, 'reason', value === 'none' ? '' : value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select reason" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No reason</SelectItem>
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
              {isSubmitting ? (
                <>
                  <svg
                    className="mr-2 h-4 w-4 animate-spin"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Updating...
                </>
              ) : (
                `Update ${items.length} Item${items.length > 1 ? 's' : ''}`
              )}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}

