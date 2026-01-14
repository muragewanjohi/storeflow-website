/**
 * Product Sales Section Component
 * 
 * Displays and manages sales assignments for a product
 * 
 * Phase 3: Dashboard UI - Sales Implementation
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlusIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCurrency } from '@/lib/currency/currency-context';

interface Sale {
  id: string;
  name: string;
  slug: string;
  status: 'draft' | 'active' | 'scheduled' | 'ended';
  start_date: Date | string | null;
  end_date: Date | string | null;
}

interface ProductSale {
  id: string;
  sale_id: string;
  sale_price: number | null;
  discount_percent: number | null;
  sales: Sale;
}

interface ProductSalesSectionProps {
  productId: string;
}

export default function ProductSalesSection({ productId }: Readonly<ProductSalesSectionProps>) {
  const { formatCurrency } = useCurrency();
  const [sales, setSales] = useState<Sale[]>([]);
  const [productSales, setProductSales] = useState<ProductSale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [saleToRemove, setSaleToRemove] = useState<ProductSale | null>(null);

  // Function to load product sales efficiently - defined with useCallback to avoid dependency issues
  const loadProductSales = useCallback(async () => {
    try {
      // Load all sales first
      const salesResponse = await fetch('/api/dashboard/sales?limit=100');
      if (salesResponse.ok) {
        const salesData = await salesResponse.json();
        setSales(salesData.sales || []);
      }

      // Load product's sales by checking all sales
      const allSalesResponse = await fetch('/api/dashboard/sales?limit=1000');
      if (allSalesResponse.ok) {
        const allSalesData = await allSalesResponse.json();
        const productSalesList: ProductSale[] = [];
        
        // Use Promise.all for parallel fetching
        const saleProductPromises = (allSalesData.sales || []).map(async (sale: Sale) => {
          try {
            const saleProductsResponse = await fetch(`/api/dashboard/sales/${sale.id}/products`);
            if (saleProductsResponse.ok) {
              const saleProductsData = await saleProductsResponse.json();
              const productSale = saleProductsData.products.find(
                (ps: any) => ps.product.id === productId
              );
              if (productSale) {
                return {
                  id: productSale.id,
                  sale_id: sale.id,
                  sale_price: productSale.sale_price,
                  discount_percent: productSale.discount_percent,
                  sales: sale,
                };
              }
            }
          } catch (error) {
            console.error(`Error fetching products for sale ${sale.id}:`, error);
          }
          return null;
        });

        const results = await Promise.all(saleProductPromises);
        const validProductSales = results.filter((ps): ps is ProductSale => ps !== null);
        setProductSales(validProductSales);
      }
    } catch (error) {
      console.error('Error loading sales:', error);
    }
  }, [productId]);

  // Load sales and product sales
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await loadProductSales();
      setIsLoading(false);
    };

    loadData();
  }, [loadProductSales]);

  const handleAddToSale = async () => {
    if (!selectedSaleId) return;

    try {
      const response = await fetch(`/api/dashboard/sales/${selectedSaleId}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: productId,
          sale_price: salePrice ? parseFloat(salePrice) : null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add product to sale');
      }

      // Reload product sales using the same efficient function
      await loadProductSales();

      setShowAddDialog(false);
      setSelectedSaleId('');
      setSalePrice('');
    } catch (error) {
      console.error('Error adding product to sale:', error);
      alert(error instanceof Error ? error.message : 'Failed to add product to sale');
    }
  };

  const handleRemoveFromSale = async () => {
    if (!saleToRemove) return;

    setRemovingId(saleToRemove.id);
    try {
      const response = await fetch(
        `/api/dashboard/sales/${saleToRemove.sale_id}/products?product_id=${productId}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to remove product from sale');
      }

      setProductSales((prev) => prev.filter((ps) => ps.id !== saleToRemove.id));
      setShowRemoveDialog(false);
      setSaleToRemove(null);
    } catch (error) {
      console.error('Error removing product from sale:', error);
    } finally {
      setRemovingId(null);
    }
  };

  const availableSales = sales.filter(
    (sale) => !productSales.some((ps) => ps.sale_id === sale.id)
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500 hover:bg-green-600">Active</Badge>;
      case 'scheduled':
        return <Badge className="bg-blue-500 hover:bg-blue-600">Scheduled</Badge>;
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'ended':
        return <Badge variant="outline">Ended</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return <div className="py-4 text-sm text-muted-foreground">Loading sales...</div>;
  }

  return (
    <div className="space-y-4">
      {productSales.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-muted-foreground mb-4">This product is not in any sales</p>
          <Button type="button" variant="outline" onClick={() => setShowAddDialog(true)}>
            <PlusIcon className="mr-2 h-4 w-4" />
            Add to Sale
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {productSales.map((productSale) => (
            <div
              key={productSale.id}
              className="flex items-center justify-between rounded-lg border p-4"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{productSale.sales.name}</span>
                  {getStatusBadge(productSale.sales.status)}
                </div>
                {productSale.sale_price && (
                  <div className="mt-1 text-sm text-muted-foreground">
                    Sale Price: {formatCurrency(productSale.sale_price)}
                    {productSale.discount_percent && (
                      <span className="ml-2">({productSale.discount_percent}% off)</span>
                    )}
                  </div>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  setSaleToRemove(productSale);
                  setShowRemoveDialog(true);
                }}
              >
                <TrashIcon className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={() => setShowAddDialog(true)}>
            <PlusIcon className="mr-2 h-4 w-4" />
            Add to Another Sale
          </Button>
        </div>
      )}

      {/* Add to Sale Dialog */}
      <AlertDialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add Product to Sale</AlertDialogTitle>
            <AlertDialogDescription>
              Select a sale to add this product to
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="sale-select">Sale</Label>
              <Select value={selectedSaleId} onValueChange={setSelectedSaleId}>
                <SelectTrigger id="sale-select">
                  <SelectValue placeholder="Select a sale" />
                </SelectTrigger>
                <SelectContent>
                  {availableSales.length === 0 ? (
                    <SelectItem value="" disabled>No available sales</SelectItem>
                  ) : (
                    availableSales.map((sale) => (
                      <SelectItem key={sale.id} value={sale.id}>
                        {sale.name} ({sale.status})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            {selectedSaleId && (
              <div className="space-y-2">
                <Label htmlFor="sale-price">Sale Price (Optional)</Label>
                <Input
                  id="sale-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                  placeholder="Override product sale price"
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty to use product&apos;s sale price
                </p>
              </div>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAddToSale}
              disabled={!selectedSaleId}
            >
              Add to Sale
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove from Sale Dialog */}
      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from Sale</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this product from &quot;{saleToRemove?.sales.name}&quot;?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveFromSale}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removingId ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
