/**
 * Adjust Stock Client Component
 * 
 * Form for adjusting inventory stock
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
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

interface Product {
  id: string;
  name: string;
  sku: string | null;
  stock_quantity: number;
  image: string | null;
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

interface AdjustStockClientProps {
  product: Product | null;
  variant: Variant | null;
  products?: Product[];
  variants?: Variant[];
}

export default function AdjustStockClient({
  product: initialProduct,
  variant: initialVariant,
  products = [],
  variants = [],
}: Readonly<AdjustStockClientProps>) {
  const router = useRouter();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(initialProduct);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(initialVariant);
  const [searchQuery, setSearchQuery] = useState('');
  const [adjustmentType, setAdjustmentType] = useState<'increase' | 'decrease' | 'set'>('increase');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use selected product/variant or initial ones
  const product = selectedProduct || initialProduct;
  const variant = selectedVariant || initialVariant;

  const currentStock = product?.stock_quantity ?? variant?.stock_quantity ?? 0;
  const itemName = product?.name || variant?.product_name || 'Select a product or variant';
  const itemSku = product?.sku || variant?.variant_sku || variant?.product_sku || '—';

  const handleProductSelect = (productId: string) => {
    const selected = products.find((p) => p.id === productId);
    setSelectedProduct(selected || null);
    setSelectedVariant(null); // Clear variant when product is selected
  };

  const handleVariantSelect = (variantId: string) => {
    const selected = variants.find((v) => v.id === variantId);
    setSelectedVariant(selected || null);
    setSelectedProduct(null); // Clear product when variant is selected
  };

  // Filter products and variants based on search query
  const filteredProducts = searchQuery
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : products;

  const filteredVariants = searchQuery
    ? variants.filter(
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
    : variants;

  const calculateNewStock = () => {
    const qty = parseInt(quantity) || 0;
    switch (adjustmentType) {
      case 'increase':
        return currentStock + qty;
      case 'decrease':
        return Math.max(0, currentStock - qty);
      case 'set':
        return qty;
      default:
        return currentStock;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!quantity || parseInt(quantity) < 0) {
      setError('Please enter a valid quantity');
      return;
    }

    if (adjustmentType === 'decrease' && parseInt(quantity) > currentStock) {
      setError('Cannot decrease by more than current stock');
      return;
    }

    if (!product && !variant) {
      setError('Please select a product or variant');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: any = {
        adjustment_type: adjustmentType,
        quantity: parseInt(quantity),
        reason: reason || null,
        notes: notes || null,
      };

      if (product) {
        payload.product_id = product.id;
      } else if (variant) {
        payload.variant_id = variant.id;
      }

      const response = await fetch('/api/inventory/adjust', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to adjust inventory');
      }

      router.push('/dashboard/inventory');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to adjust inventory');
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
          <h1 className="text-3xl font-bold tracking-tight">Adjust Stock</h1>
          <p className="text-muted-foreground mt-2">
            Update inventory levels for products or variants
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Stock Adjustment</CardTitle>
              <CardDescription>Adjust inventory for the selected item</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Product/Variant Selection (if none pre-selected) */}
                {!initialProduct && !initialVariant && (
                  <>
                    {/* Search Bar */}
                    <div className="space-y-2">
                      <Label htmlFor="search">Search Products or Variants</Label>
                      <Input
                        id="search"
                        type="text"
                        placeholder="Search by name, SKU, or attribute..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      {searchQuery && (
                        <p className="text-xs text-muted-foreground">
                          Found {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} and {filteredVariants.length} variant{filteredVariants.length !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>

                    {/* Products Section */}
                    {filteredProducts.length > 0 && (
                      <div className="space-y-2">
                        <Label htmlFor="product_select">Select Product</Label>
                        <Select
                          value={selectedProduct?.id || ''}
                          onValueChange={handleProductSelect}
                        >
                          <SelectTrigger id="product_select">
                            <SelectValue placeholder="Select a product" />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredProducts.map((p: any) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name} ({p.sku || 'No SKU'}) - Stock: {p.stock_quantity}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Variants Section */}
                    {filteredVariants.length > 0 && (
                      <div className="space-y-2">
                        <Label htmlFor="variant_select">Or Select Variant</Label>
                        <Select
                          value={selectedVariant?.id || ''}
                          onValueChange={handleVariantSelect}
                        >
                          <SelectTrigger id="variant_select">
                            <SelectValue placeholder="Select a variant" />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredVariants.map((v: any) => (
                              <SelectItem key={v.id} value={v.id}>
                                {v.product_name} - {v.attributes.map((a: any) => `${a.name}: ${a.value}`).join(', ')} ({v.variant_sku || v.product_sku || 'No SKU'}) - Stock: {v.stock_quantity}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* No Results Message */}
                    {searchQuery && filteredProducts.length === 0 && filteredVariants.length === 0 && (
                      <div className="rounded-lg border p-4 text-center text-muted-foreground">
                        <p>No products or variants found matching &quot;{searchQuery}&quot;</p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="mt-2"
                          onClick={() => setSearchQuery('')}
                        >
                          Clear search
                        </Button>
                      </div>
                    )}

                    {/* Empty State (no search) */}
                    {!searchQuery && products.length === 0 && variants.length === 0 && (
                      <div className="rounded-lg border p-4 text-center text-muted-foreground">
                        <p>No products or variants available</p>
                      </div>
                    )}
                  </>
                )}

                {/* Item Info */}
                {(product || variant) && (
                  <div className="rounded-lg border p-4 bg-muted/50">
                    <div className="flex items-center gap-4">
                      {product?.image && (
                        <img
                          src={product.image}
                          alt={itemName}
                          className="h-16 w-16 rounded object-cover"
                        />
                      )}
                      <div className="flex-1">
                        <div className="font-medium">{itemName}</div>
                        <div className="text-sm text-muted-foreground font-mono">{itemSku}</div>
                        {variant && variant.attributes.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
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
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Current Stock</div>
                        <div className="text-2xl font-bold">{currentStock}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Adjustment Type */}
                <div className="space-y-2">
                  <Label htmlFor="adjustment_type">Adjustment Type</Label>
                  <Select
                    value={adjustmentType}
                    onValueChange={(value: any) => setAdjustmentType(value)}
                  >
                    <SelectTrigger id="adjustment_type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="increase">Increase Stock</SelectItem>
                      <SelectItem value="decrease">Decrease Stock</SelectItem>
                      <SelectItem value="set">Set Stock Level</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Quantity */}
                <div className="space-y-2">
                  <Label htmlFor="quantity">
                    {adjustmentType === 'set' ? 'New Stock Level' : 'Quantity'}
                  </Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="0"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder={adjustmentType === 'set' ? 'Enter new stock level' : 'Enter quantity'}
                    required
                  />
                  {quantity && !isNaN(parseInt(quantity)) && (
                    <p className="text-sm text-muted-foreground">
                      New stock will be: <span className="font-medium">{calculateNewStock()}</span>
                    </p>
                  )}
                </div>

                {/* Reason */}
                <div className="space-y-2">
                  <Label htmlFor="reason">Reason (Optional)</Label>
                  <Select
                    value={reason}
                    onValueChange={setReason}
                  >
                    <SelectTrigger id="reason">
                      <SelectValue placeholder="Select a reason" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual_adjustment">Manual Adjustment</SelectItem>
                      <SelectItem value="restock">Restock</SelectItem>
                      <SelectItem value="damage">Damage/Loss</SelectItem>
                      <SelectItem value="return">Return</SelectItem>
                      <SelectItem value="transfer">Transfer</SelectItem>
                      <SelectItem value="correction">Correction</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any additional notes about this adjustment"
                    rows={3}
                  />
                </div>

                {/* Form Actions */}
                <div className="flex justify-end gap-4 pt-4">
                  <Button type="button" variant="outline" asChild>
                    <Link href="/dashboard/inventory">Cancel</Link>
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Adjusting...' : 'Adjust Stock'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Adjustment Preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground">Current Stock</div>
                <div className="text-2xl font-bold">{currentStock}</div>
              </div>
              {quantity && !isNaN(parseInt(quantity)) && (
                <>
                  <div>
                    <div className="text-sm text-muted-foreground">Adjustment</div>
                    <div className="text-lg font-medium">
                      {adjustmentType === 'increase' && '+'}
                      {adjustmentType === 'decrease' && '-'}
                      {adjustmentType === 'set' && '→'}
                      {parseInt(quantity)}
                    </div>
                  </div>
                  <div className="border-t pt-4">
                    <div className="text-sm text-muted-foreground">New Stock</div>
                    <div className="text-2xl font-bold text-primary">{calculateNewStock()}</div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

