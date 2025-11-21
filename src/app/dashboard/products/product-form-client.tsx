/**
 * Product Form Client Component
 * 
 * Form for creating or editing a product
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeftIcon, PlusIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { PhotoIcon } from '@heroicons/react/24/solid';
import { generateVariantName } from '@/lib/products/variant-helpers';

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
  category_id?: string | null;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Attribute {
  id: string;
  name: string;
  type: string | null;
  attribute_values: AttributeValue[];
}

interface AttributeValue {
  id: string;
  value: string;
  color_code: string | null;
}

interface Variant {
  id: string;
  sku: string | null;
  price: number | null;
  stock_quantity: number;
  image: string | null;
  variant_attributes?: Array<{
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
  }>;
}

interface ProductFormClientProps {
  product?: Product;
  variants?: Variant[];
  categories: Category[];
}

export default function ProductFormClient({
  product,
  variants: initialVariants = [],
  categories,
}: Readonly<ProductFormClientProps>) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEditing = !!product;

  const [formData, setFormData] = useState({
    name: product?.name || '',
    sku: product?.sku || '',
    short_description: product?.short_description || '',
    description: product?.description || '',
    price: product?.price?.toString() || '',
    sale_price: product?.sale_price?.toString() || '',
    stock_quantity: product?.stock_quantity?.toString() || '0',
    status: product?.status || ('draft' as 'active' | 'inactive' | 'draft' | 'archived'),
    category_id: product?.category_id || 'none',
    image: product?.image || '',
  });

  // Initialize variants from props if editing, or empty array if creating
  const [variants, setVariants] = useState<Array<{
    id?: string;
    sku: string;
    price: string;
    stock_quantity: string;
    image: string;
    attributes: Array<{ attribute_id: string; attribute_value_id: string }>;
    isNew?: boolean;
  }>>(() => {
    if (isEditing && initialVariants.length > 0) {
      return initialVariants.map((variant) => ({
        id: variant.id,
        sku: variant.sku || '',
        price: variant.price?.toString() || '',
        stock_quantity: variant.stock_quantity.toString(),
        image: variant.image || '',
        attributes: variant.variant_attributes?.map((attr) => ({
          attribute_id: attr.attribute_id,
          attribute_value_id: attr.attribute_value_id,
        })) || [],
        isNew: false,
      }));
    }
    return [];
  });

  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [loadingAttributes, setLoadingAttributes] = useState(true);

  const [imagePreview, setImagePreview] = useState<string | null>(product?.image || null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Fetch attributes on component mount
  useEffect(() => {
    const fetchAttributes = async () => {
      try {
        const response = await fetch('/api/attributes');
        if (response.ok) {
          const data = await response.json();
          setAttributes(data.attributes || []);
        }
      } catch (error) {
        console.error('Error fetching attributes:', error);
      } finally {
        setLoadingAttributes(false);
      }
    };

    fetchAttributes();
  }, []);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Only images (JPEG, PNG, WebP, GIF) are allowed.');
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('File size exceeds 5MB limit');
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload image
    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/products/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to upload image');
      }

      const data = await response.json();
      setFormData((prev) => ({ ...prev, image: data.url }));
    } catch (err: any) {
      setError(err.message || 'Failed to upload image');
      setImagePreview(null);
    } finally {
      setIsUploading(false);
    }
  };

  const validate = () => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Product name is required';
    }

    if (!formData.price) {
      errors.price = 'Price is required';
    } else {
      const price = parseFloat(formData.price);
      if (isNaN(price) || price <= 0) {
        errors.price = 'Price must be a positive number';
      }
    }

    if (formData.sale_price) {
      const salePrice = parseFloat(formData.sale_price);
      const regularPrice = parseFloat(formData.price);
      if (isNaN(salePrice) || salePrice <= 0) {
        errors.sale_price = 'Sale price must be a positive number';
      } else if (salePrice >= regularPrice) {
        errors.sale_price = 'Sale price must be less than regular price';
      }
    }

    const stockQuantity = parseInt(formData.stock_quantity, 10);
    if (isNaN(stockQuantity) || stockQuantity < 0) {
      errors.stock_quantity = 'Stock quantity must be a non-negative number';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setValidationErrors({});

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: any = {
        name: formData.name.trim(),
        sku: formData.sku.trim() || null,
        short_description: formData.short_description.trim() || null,
        description: formData.description.trim() || null,
        price: parseFloat(formData.price),
        stock_quantity: parseInt(formData.stock_quantity, 10),
        status: formData.status,
        category_id: formData.category_id === 'none' || !formData.category_id ? null : formData.category_id,
      };

      if (formData.sale_price) {
        payload.sale_price = parseFloat(formData.sale_price);
      }

      if (formData.image) {
        payload.image = formData.image;
      }

      const url = isEditing ? `/api/products/${product.id}` : '/api/products';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Failed to ${isEditing ? 'update' : 'create'} product`);
      }

      const data = await response.json();
      const productId = isEditing ? product.id : data.product.id;

      // Track which existing variants should be deleted (if editing)
      if (isEditing && initialVariants.length > 0) {
        const currentVariantIds = new Set(variants.filter(v => v.id && !v.isNew).map(v => v.id));
        const deletedVariants = initialVariants.filter(v => !currentVariantIds.has(v.id));
        
        // Delete removed variants
        for (const deletedVariant of deletedVariants) {
          try {
            await fetch(`/api/products/${productId}/variants/${deletedVariant.id}`, {
              method: 'DELETE',
            });
          } catch (err) {
            console.error('Error deleting variant:', err);
            // Continue even if deletion fails
          }
        }
      }

      // Handle variants: create new ones or update existing ones
      if (variants.length > 0) {
        for (const variant of variants) {
          try {
            const variantPayload: any = {
              sku: variant.sku || null,
              price: variant.price ? parseFloat(variant.price) : null,
              stock_quantity: parseInt(variant.stock_quantity, 10) || 0,
              image: variant.image || null,
            };

            // Add attributes if any
            if (variant.attributes && variant.attributes.length > 0) {
              variantPayload.attributes = variant.attributes;
            }

            if (variant.id && !variant.isNew) {
              // Update existing variant
              await fetch(`/api/products/${productId}/variants/${variant.id}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(variantPayload),
              });
            } else {
              // Create new variant
              await fetch(`/api/products/${productId}/variants`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(variantPayload),
              });
            }
          } catch (err) {
            console.error('Error saving variant:', err);
            // Continue with other variants even if one fails
          }
        }
      }

      router.push(`/dashboard/products/${productId}`);
    } catch (err: any) {
      setError(err.message || `Failed to ${isEditing ? 'update' : 'create'} product`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate total variant stock
  const totalVariantStock = variants.reduce((sum, v) => sum + (parseInt(v.stock_quantity) || 0), 0);

  return (
    <div className="relative">
      {/* Loader Overlay */}
      {isSubmitting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <p className="text-sm font-medium text-muted-foreground">
              {isEditing ? 'Updating product...' : 'Creating product...'}
            </p>
          </div>
        </div>
      )}
      
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/products">
            <ArrowLeftIcon className="mr-2 h-4 w-4" />
            Back to Products
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isEditing ? 'Edit Product' : 'Create Product'}
          </h1>
          <p className="text-muted-foreground mt-2">
            {isEditing ? 'Update product information' : 'Add a new product to your catalog'}
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className={isSubmitting ? 'pointer-events-none opacity-50' : ''}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>Product name, description, and details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Product Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter product name"
                    required
                  />
                  {validationErrors.name && (
                    <p className="text-sm text-destructive">{validationErrors.name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sku">SKU</Label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="Auto-generated if left empty"
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Stock Keeping Unit. Leave empty to auto-generate.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="short_description">Short Description</Label>
                  <Input
                    id="short_description"
                    value={formData.short_description}
                    onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
                    placeholder="Brief description (max 500 characters)"
                    maxLength={500}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Full Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Detailed product description"
                    rows={8}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Pricing & Inventory */}
            <Card>
              <CardHeader>
                <CardTitle>Pricing & Inventory</CardTitle>
                <CardDescription>Set product price and stock levels</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">
                      Regular Price <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder="0.00"
                      required
                    />
                    {validationErrors.price && (
                      <p className="text-sm text-destructive">{validationErrors.price}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sale_price">Sale Price</Label>
                    <Input
                      id="sale_price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.sale_price}
                      onChange={(e) => setFormData({ ...formData, sale_price: e.target.value })}
                      placeholder="0.00"
                    />
                    {validationErrors.sale_price && (
                      <p className="text-sm text-destructive">{validationErrors.sale_price}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stock_quantity">Stock Quantity</Label>
                  <Input
                    id="stock_quantity"
                    type="number"
                    min="0"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                    placeholder="0"
                  />
                  {validationErrors.stock_quantity && (
                    <p className="text-sm text-destructive">{validationErrors.stock_quantity}</p>
                  )}
                  {variants.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Product-level stock: {formData.stock_quantity || 0}. 
                      Variant stock total: {variants.reduce((sum, v) => sum + (parseInt(v.stock_quantity) || 0), 0)}.
                      {parseInt(formData.stock_quantity) > 0 && (
                        <span className="block mt-1 text-amber-600">
                          Note: When variants exist, variant stock quantities are used for inventory tracking.
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Product Variants */}
            <Card>
              <CardHeader>
                <CardTitle>Product Variants</CardTitle>
                <CardDescription>
                  Add variants with different prices, stock levels, or SKUs
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {variants.map((variant, index) => (
                  <div
                    key={index}
                    className="rounded-lg border p-4 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Variant {index + 1}</h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setVariants(variants.filter((_, i) => i !== index));
                        }}
                      >
                        <TrashIcon className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    {/* Variant Attributes */}
                    <div className="space-y-3">
                      <Label>Attributes (e.g., Size, Color, Weight)</Label>
                      {variant.attributes.map((attr, attrIndex) => {
                        const selectedAttribute = attributes.find((a) => a.id === attr.attribute_id);
                        return (
                          <div key={attrIndex} className="flex gap-2 items-end">
                            <div className="flex-1 space-y-2">
                              <Label htmlFor={`variant-attr-${index}-${attrIndex}`}>Attribute</Label>
                              <Select
                                value={attr.attribute_id}
                                onValueChange={(value) => {
                                  const newVariants = [...variants];
                                  newVariants[index].attributes[attrIndex] = {
                                    attribute_id: value,
                                    attribute_value_id: '', // Reset value when attribute changes
                                  };
                                  setVariants(newVariants);
                                }}
                              >
                                <SelectTrigger id={`variant-attr-${index}-${attrIndex}`}>
                                  <SelectValue placeholder="Select attribute" />
                                </SelectTrigger>
                                <SelectContent>
                                  {attributes.map((attribute) => (
                                    <SelectItem key={attribute.id} value={attribute.id}>
                                      {attribute.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex-1 space-y-2">
                              <Label htmlFor={`variant-value-${index}-${attrIndex}`}>Value</Label>
                              <Select
                                value={attr.attribute_value_id}
                                onValueChange={(value) => {
                                  const newVariants = [...variants];
                                  newVariants[index].attributes[attrIndex].attribute_value_id = value;
                                  setVariants(newVariants);
                                }}
                                disabled={!selectedAttribute}
                              >
                                <SelectTrigger id={`variant-value-${index}-${attrIndex}`}>
                                  <SelectValue placeholder="Select value" />
                                </SelectTrigger>
                                <SelectContent>
                                  {selectedAttribute?.attribute_values.map((val) => (
                                    <SelectItem key={val.id} value={val.id}>
                                      <div className="flex items-center gap-2">
                                        {/* Show color code for color attributes, but variant image is separate */}
                                        {val.color_code && (
                                          <span
                                            className="w-4 h-4 rounded border"
                                            style={{ backgroundColor: val.color_code }}
                                          />
                                        )}
                                        <span>{val.value}</span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                const newVariants = [...variants];
                                newVariants[index].attributes = newVariants[index].attributes.filter(
                                  (_, i) => i !== attrIndex
                                );
                                setVariants(newVariants);
                              }}
                            >
                              <XMarkIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newVariants = [...variants];
                          newVariants[index].attributes.push({
                            attribute_id: '',
                            attribute_value_id: '',
                          });
                          setVariants(newVariants);
                        }}
                        disabled={loadingAttributes || attributes.length === 0}
                      >
                        <PlusIcon className="mr-2 h-3 w-3" />
                        Add Attribute
                      </Button>
                      {variant.attributes.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Variant name: {generateVariantName(
                            variant.attributes.map((attr) => {
                              const selectedAttribute = attributes.find((a) => a.id === attr.attribute_id);
                              const selectedValue = selectedAttribute?.attribute_values.find(
                                (v) => v.id === attr.attribute_value_id
                              );
                              return {
                                attribute_id: attr.attribute_id,
                                attribute_value_id: attr.attribute_value_id,
                                attribute_name: selectedAttribute?.name,
                                attribute_value: selectedValue?.value,
                              };
                            })
                          )}
                        </p>
                      )}
                    </div>

                    {/* Variant Image */}
                    <div className="space-y-2">
                      <Label>Variant Image</Label>
                      <p className="text-xs text-muted-foreground">
                        Upload a product image for this specific variant (e.g., T-shirt in Red color)
                      </p>
                      {variant.image ? (
                        <div className="relative">
                          <img
                            src={variant.image}
                            alt="Variant preview"
                            className="h-32 w-32 rounded-lg object-cover border"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute right-2 top-2"
                            onClick={async () => {
                              const newVariants = [...variants];
                              newVariants[index].image = '';
                              setVariants(newVariants);
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      ) : (
                        <div
                          className="flex h-32 w-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50"
                          onClick={async () => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = 'image/*';
                            input.onchange = async (e) => {
                              const file = (e.target as HTMLInputElement).files?.[0];
                              if (!file) return;

                              setIsUploading(true);
                              try {
                                const formData = new FormData();
                                formData.append('file', file);

                                const response = await fetch('/api/products/upload', {
                                  method: 'POST',
                                  body: formData,
                                });

                                if (!response.ok) {
                                  const data = await response.json();
                                  throw new Error(data.error || 'Failed to upload image');
                                }

                                const data = await response.json();
                                const newVariants = [...variants];
                                newVariants[index].image = data.url;
                                setVariants(newVariants);
                              } catch (err: any) {
                                setError(err.message || 'Failed to upload image');
                              } finally {
                                setIsUploading(false);
                              }
                            };
                            input.click();
                          }}
                        >
                          <PhotoIcon className="h-8 w-8 text-muted-foreground" />
                          <p className="mt-2 text-xs text-muted-foreground">Upload</p>
                        </div>
                      )}
                    </div>

                    {/* Variant Details */}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor={`variant-sku-${index}`}>SKU</Label>
                        <Input
                          id={`variant-sku-${index}`}
                          value={variant.sku}
                          onChange={(e) => {
                            const newVariants = [...variants];
                            newVariants[index].sku = e.target.value;
                            setVariants(newVariants);
                          }}
                          placeholder="Auto-generated"
                          className="font-mono"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`variant-price-${index}`}>Price</Label>
                        <Input
                          id={`variant-price-${index}`}
                          type="number"
                          step="0.01"
                          min="0"
                          value={variant.price}
                          onChange={(e) => {
                            const newVariants = [...variants];
                            newVariants[index].price = e.target.value;
                            setVariants(newVariants);
                          }}
                          placeholder="Override product price"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`variant-stock-${index}`}>Stock</Label>
                        <Input
                          id={`variant-stock-${index}`}
                          type="number"
                          min="0"
                          value={variant.stock_quantity}
                          onChange={(e) => {
                            const newVariants = [...variants];
                            newVariants[index].stock_quantity = e.target.value;
                            setVariants(newVariants);
                          }}
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setVariants([
                      ...variants,
                      {
                        sku: '',
                        price: '',
                        stock_quantity: '0',
                        image: '',
                        attributes: [],
                        isNew: true,
                      },
                    ]);
                  }}
                  className="w-full"
                  disabled={loadingAttributes}
                >
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Add Variant
                </Button>
                {loadingAttributes && (
                  <p className="text-sm text-muted-foreground text-center">
                    Loading attributes...
                  </p>
                )}
                {!loadingAttributes && attributes.length === 0 && (
                  <div className="text-sm text-muted-foreground text-center space-y-2">
                    <p>No attributes available. Create attributes first to add variant options.</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <Link href="/dashboard/settings/attributes">
                        Go to Attributes Settings
                      </Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Product Image */}
            <Card>
              <CardHeader>
                <CardTitle>Product Image</CardTitle>
                <CardDescription>Upload a main product image</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {imagePreview ? (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Product preview"
                      className="h-64 w-full rounded-lg object-cover"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute right-2 top-2"
                      onClick={() => {
                        setImagePreview(null);
                        setFormData({ ...formData, image: '' });
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div
                    className="flex h-64 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50 transition-colors hover:bg-muted"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <PhotoIcon className="mb-2 h-12 w-12 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {isUploading ? 'Uploading...' : 'Click to upload image'}
                    </p>
                    <p className="text-xs text-muted-foreground">PNG, JPG, WebP up to 5MB</p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                  onChange={handleImageChange}
                  className="hidden"
                  disabled={isUploading}
                />
                {!imagePreview && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? 'Uploading...' : 'Choose Image'}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Settings</CardTitle>
                <CardDescription>Product status and category</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: any) =>
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category_id">Category</Label>
                  <Select
                    value={formData.category_id || 'none'}
                    onValueChange={(value) =>
                      setFormData({ ...formData, category_id: value === 'none' ? 'none' : value })
                    }
                  >
                    <SelectTrigger id="category_id">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Category</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Form Actions */}
        <div className="mt-6 flex justify-end gap-4">
          <Button type="button" variant="outline" asChild>
            <Link href="/dashboard/products">Cancel</Link>
          </Button>
          <Button type="submit" disabled={isSubmitting || isUploading}>
            {isSubmitting
              ? isEditing
                ? 'Updating...'
                : 'Creating...'
              : isEditing
                ? 'Update Product'
                : 'Create Product'}
          </Button>
        </div>
      </form>
    </div>
  );
}

