/**
 * Product Detail Client Component
 * 
 * Displays detailed product information
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeftIcon, PencilIcon } from '@heroicons/react/24/outline';
import { generateVariantName } from '@/lib/products/variant-helpers';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useCurrency } from '@/lib/currency/currency-context';

interface Product {
  id: string;
  name: string;
  slug: string;
  sku: string;
  description?: string | null;
  short_description?: string | null;
  price: number;
  sale_price?: number | null;
  stock_quantity: number;
  status: 'active' | 'inactive' | 'draft' | 'archived';
  image?: string | null;
  gallery?: string[] | null;
  category_id?: string | null;
  created_at: string;
  updated_at: string;
}

interface VariantAttribute {
  id: string;
  attribute_id: string;
  attribute_value_id: string;
  attributes: {
    id: string;
    name: string;
    type: string | null;
  };
  attribute_values: {
    id: string;
    value: string;
    color_code: string | null;
  };
}

interface Variant {
  id: string;
  product_id: string;
  sku: string;
  price?: number | null;
  stock_quantity: number;
  image?: string | null;
  variant_attributes?: VariantAttribute[];
  created_at: string;
  updated_at: string;
}

interface ProductDetailClientProps {
  product: Product;
  variants: Variant[];
}

export default function ProductDetailClient({
  product,
  variants,
}: Readonly<ProductDetailClientProps>) {
  const router = useRouter();
  const { formatCurrency } = useCurrency();

  // Using formatCurrency from useCurrency hook
  const formatPrice = (price: number) => formatCurrency(price);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'inactive':
        return <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>;
      case 'draft':
        return <Badge className="bg-yellow-100 text-yellow-800">Draft</Badge>;
      case 'archived':
        return <Badge className="bg-red-100 text-red-800">Archived</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/products">
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              Back to Products
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{product.name}</h1>
            <p className="text-muted-foreground mt-2">Product Details</p>
          </div>
        </div>
        <Button asChild>
          <Link href={`/dashboard/products/${product.id}/edit`}>
            <PencilIcon className="mr-2 h-4 w-4" />
            Edit Product
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Product Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Product Image */}
          <Card>
            <CardHeader>
              <CardTitle>Product Image</CardTitle>
            </CardHeader>
            <CardContent>
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                  className="h-96 w-full rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-96 w-full items-center justify-center rounded-lg bg-muted">
                  <span className="text-muted-foreground">No Image</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Description */}
          {product.description && (
            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: product.description }}
                />
              </CardContent>
            </Card>
          )}

          {/* Variants */}
          {variants.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Product Variants</CardTitle>
                <CardDescription>Available variants for this product</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Variant</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Stock</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {variants.map((variant: any) => {
                      const variantName = variant.variant_attributes && variant.variant_attributes.length > 0
                        ? generateVariantName(
                            variant.variant_attributes.map((attr: any) => ({
                              attribute_id: attr.attribute_id,
                              attribute_value_id: attr.attribute_value_id,
                              attribute_name: attr.attributes.name,
                              attribute_value: attr.attribute_values.value,
                            }))
                          )
                        : 'Default';

                      return (
                        <TableRow key={variant.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {variant.image && (
                                <img
                                  src={variant.image}
                                  alt={variantName}
                                  className="h-12 w-12 rounded object-cover border"
                                />
                              )}
                              <div className="space-y-1">
                                <span className="font-medium">{variantName}</span>
                                {variant.variant_attributes && variant.variant_attributes.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {variant.variant_attributes.map((attr: any) => (
                                      <Badge key={attr.id} variant="outline" className="text-xs">
                                        {attr.attributes.name}: {attr.attribute_values.value}
                                        {attr.attribute_values.color_code && (
                                          <span
                                            className="ml-1 inline-block w-3 h-3 rounded border"
                                            style={{ backgroundColor: attr.attribute_values.color_code }}
                                          />
                                        )}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{variant.sku || '—'}</TableCell>
                          <TableCell>
                            {variant.price
                              ? formatPrice(variant.price)
                              : formatPrice(product.price)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={variant.stock_quantity > 0 ? 'default' : 'destructive'}
                            >
                              {variant.stock_quantity}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          {/* Product Info */}
          <Card>
            <CardHeader>
              <CardTitle>Product Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <div className="mt-1">{getStatusBadge(product.status)}</div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">SKU</p>
                <p className="mt-1 font-mono text-sm">{product.sku}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Price</p>
                <div className="mt-1">
                  {product.sale_price ? (
                    <div className="flex flex-col">
                      <span className="text-sm text-muted-foreground line-through">
                        {formatPrice(product.price)}
                      </span>
                      <span className="text-lg font-semibold text-red-600">
                        {formatPrice(product.sale_price)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-lg font-semibold">{formatPrice(product.price)}</span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Stock Quantity</p>
                <div className="mt-1">
                  <Badge variant={product.stock_quantity > 0 ? 'default' : 'destructive'}>
                    {product.stock_quantity} units
                  </Badge>
                </div>
              </div>
              {product.short_description && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Short Description</p>
                  <p className="mt-1 text-sm">{product.short_description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle>Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{new Date(product.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Updated</span>
                <span>{new Date(product.updated_at).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Slug</span>
                <span className="font-mono text-xs">{product.slug}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

