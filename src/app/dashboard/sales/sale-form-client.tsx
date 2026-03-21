/**
 * Sale Form Client Component
 * 
 * Form for creating or editing a sale
 * 
 * Phase 3: Dashboard UI - Sales Implementation
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeftIcon, PlusIcon, TrashIcon, XMarkIcon, EyeIcon, PencilIcon } from '@heroicons/react/24/outline';
import ImageUploadField from '@/components/content/image-upload-field';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
import { useCurrency } from '@/lib/currency/currency-context';
import AdminShareButtons from '@/components/dashboard/admin-share-buttons';
import { generateSaleSlug, sanitizeSaleName } from '@/lib/sales/validation';
import { storefrontSalePath } from '@/lib/sales/slug-url';
import { toast } from 'sonner';

interface Sale {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  banner_image: string | null;
  badge_text: string | null;
  badge_color: string | null;
  start_date: Date | string | null;
  end_date: Date | string | null;
  status: 'draft' | 'active' | 'scheduled' | 'ended';
  is_featured: boolean;
  product_sales?: Array<{
    id: string;
    sale_price: number | null;
    discount_percent: number | null;
    order_index: number | null;
    products: {
      id: string;
      name: string;
      slug: string | null;
      price: number;
      sale_price: number | null;
      image: string | null;
      stock_quantity: number | null;
      status: string;
    };
  }>;
}

interface SaleFormClientProps {
  sale?: Sale;
  baseUrl?: string;
}

export default function SaleFormClient({ sale, baseUrl }: Readonly<SaleFormClientProps>) {
  const router = useRouter();
  const { formatCurrency } = useCurrency();
  const isEditing = !!sale;

  const [formData, setFormData] = useState({
    name: sale?.name || '',
    slug: sale?.slug || '',
    description: sale?.description || '',
    banner_image: sale?.banner_image || '',
    badge_text: sale?.badge_text || 'SALE',
    badge_color: sale?.badge_color || '#EF4444',
    start_date: sale?.start_date
      ? (typeof sale.start_date === 'string' ? sale.start_date.split('T')[0] : new Date(sale.start_date).toISOString().split('T')[0])
      : '',
    start_time: sale?.start_date
      ? (typeof sale.start_date === 'string' ? sale.start_date.split('T')[1]?.split('.')[0]?.substring(0, 5) || '' : new Date(sale.start_date).toTimeString().substring(0, 5))
      : '',
    end_date: sale?.end_date
      ? (typeof sale.end_date === 'string' ? sale.end_date.split('T')[0] : new Date(sale.end_date).toISOString().split('T')[0])
      : '',
    end_time: sale?.end_date
      ? (typeof sale.end_date === 'string' ? sale.end_date.split('T')[1]?.split('.')[0]?.substring(0, 5) || '' : new Date(sale.end_date).toTimeString().substring(0, 5))
      : '',
    status: sale?.status || ('draft' as 'draft' | 'active' | 'scheduled' | 'ended'),
    is_featured: sale?.is_featured || false,
  });

  const [products, setProducts] = useState<Sale['product_sales']>(sale?.product_sales || []);
  
  // Ensure products is always defined - memoize to prevent unnecessary re-renders
  const safeProducts = useMemo(() => products || [], [products]);
  const [availableProducts, setAvailableProducts] = useState<Array<{
    id: string;
    name: string;
    slug: string | null;
    price: number;
    image: string | null;
    stock_quantity: number | null;
  }>>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [showAddProductDialog, setShowAddProductDialog] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('basic');
  const [editingProductSale, setEditingProductSale] = useState<NonNullable<Sale['product_sales']>[number] | null>(null);
  const [editSalePriceValue, setEditSalePriceValue] = useState('');
  const [isUpdatingSalePrice, setIsUpdatingSalePrice] = useState(false);

  // Load available products for assignment
  useEffect(() => {
    const loadProducts = async () => {
      setIsLoadingProducts(true);
      try {
        const response = await fetch('/api/products?status=active&limit=100');
        if (response.ok) {
          const data = await response.json();
          // Filter out products already in sale
          const saleProductIds = safeProducts.map((ps) => ps.products.id);
          setAvailableProducts(
            (data.products || []).filter((p: any) => !saleProductIds.includes(p.id))
          );
        }
      } catch (err) {
        console.error('Error loading products:', err);
      } finally {
        setIsLoadingProducts(false);
      }
    };
    loadProducts();
  }, [safeProducts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Validate required fields
      if (!formData.name || formData.name.trim() === '') {
        setError('Sale name is required');
        setIsSubmitting(false);
        return;
      }

      // Build dates
      let startDate: string | null = null;
      let endDate: string | null = null;

      if (formData.start_date) {
        const startDateTime = formData.start_time
          ? `${formData.start_date}T${formData.start_time}:00`
          : `${formData.start_date}T00:00:00`;
        startDate = new Date(startDateTime).toISOString();
      }

      if (formData.end_date) {
        const endDateTime = formData.end_time
          ? `${formData.end_date}T${formData.end_time}:00`
          : `${formData.end_date}T23:59:59`;
        endDate = new Date(endDateTime).toISOString();
      }

      // Validate date logic
      if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
        setError('End date must be after start date');
        setIsSubmitting(false);
        return;
      }

      const saleData = {
        name: sanitizeSaleName(formData.name.trim()),
        slug: formData.slug.trim() || undefined,
        description: formData.description.trim() || null,
        banner_image: formData.banner_image || null,
        badge_text: formData.badge_text || 'SALE',
        badge_color: formData.badge_color || '#EF4444',
        start_date: startDate,
        end_date: endDate,
        status: formData.status,
        is_featured: formData.is_featured,
      };

      const url = isEditing ? `/api/dashboard/sales/${sale.id}` : '/api/dashboard/sales';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saleData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${isEditing ? 'update' : 'create'} sale`);
      }

      const { sale: savedSale } = await response.json();

      // Redirect to edit page if creating new sale
      if (!isEditing) {
        router.push(`/dashboard/sales/${savedSale.id}`);
      } else {
        toast.success('Sale updated successfully');
        setActiveTab('preview');
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${isEditing ? 'update' : 'create'} sale`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddProduct = async () => {
    if (!selectedProductId) return;

    try {
      const response = await fetch(`/api/dashboard/sales/${sale?.id || 'new'}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: selectedProductId,
          sale_price: salePrice ? parseFloat(salePrice) : null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add product to sale');
      }

      // Reload products
      if (sale?.id) {
        const saleResponse = await fetch(`/api/dashboard/sales/${sale.id}`);
        if (saleResponse.ok) {
          const { sale: updatedSale } = await saleResponse.json();
          setProducts(updatedSale.product_sales || []);
          setAvailableProducts(
            (availableProducts || []).filter((p: any) => p.id !== selectedProductId)
          );
        }
      }

      setShowAddProductDialog(false);
      setSelectedProductId('');
      setSalePrice('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add product to sale');
    }
  };

  const handleUpdateSalePrice = async () => {
    if (!sale?.id || !editingProductSale) return;
    const salePriceNum = editSalePriceValue.trim() === '' ? null : parseFloat(editSalePriceValue);
    if (salePriceNum !== null && (isNaN(salePriceNum) || salePriceNum < 0)) {
      setError('Please enter a valid sale price');
      return;
    }
    setIsUpdatingSalePrice(true);
    setError(null);
    try {
      const response = await fetch(`/api/dashboard/sales/${sale.id}/products`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: editingProductSale.products.id,
          sale_price: salePriceNum,
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update sale price');
      }
      const saleResponse = await fetch(`/api/dashboard/sales/${sale.id}`);
      if (saleResponse.ok) {
        const data = await saleResponse.json();
        setProducts(data.sale?.product_sales || []);
      }
      setEditingProductSale(null);
      setEditSalePriceValue('');
      toast.success('Sale price updated');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update sale price');
    } finally {
      setIsUpdatingSalePrice(false);
    }
  };

  const handleRemoveProduct = async (productSaleId: string) => {
    if (!sale?.id) return;

    try {
      const response = await fetch(`/api/dashboard/sales/${sale.id}/products?product_id=${safeProducts.find((p) => p.id === productSaleId)?.products.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to remove product from sale');
      }

      // Reload products
      const saleResponse = await fetch(`/api/dashboard/sales/${sale.id}`);
      if (saleResponse.ok) {
        const { sale: updatedSale } = await saleResponse.json();
        setProducts(updatedSale.product_sales || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove product from sale');
    }
  };

  const filteredProducts = availableProducts.filter((p) =>
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  const saleUrl =
    sale?.slug && baseUrl ? `${baseUrl.replace(/\/$/, '')}${storefrontSalePath(sale.slug)}` : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/sales">
              <ArrowLeftIcon className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {isEditing ? 'Edit Sale' : 'New Sale'}
            </h1>
            <p className="text-muted-foreground mt-2">
              {isEditing ? 'Update sale details and products' : 'Create a new sale campaign'}
            </p>
          </div>
        </div>
        {saleUrl && (
          <div className="flex items-center gap-2">
            <AdminShareButtons
              title={formData.name || 'Sale'}
              url={sale?.slug ? storefrontSalePath(sale.slug) : storefrontSalePath(formData.slug.trim() || '')}
              image={formData.banner_image}
              description={formData.description}
              type="sale"
              storeUrl={baseUrl}
            />
            <Button variant="outline" asChild>
              <Link href={saleUrl} target="_blank">
                <EyeIcon className="mr-2 h-4 w-4" />
                Preview Sale
              </Link>
            </Button>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-muted/50 border border-border">
            <TabsTrigger 
              value="basic"
              className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground/70 hover:text-foreground"
            >
              Basic Info
            </TabsTrigger>
            <TabsTrigger 
              value="products"
              className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground/70 hover:text-foreground"
            >
              Products ({safeProducts.length})
            </TabsTrigger>
            <TabsTrigger 
              value="preview"
              className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground/70 hover:text-foreground"
            >
              Preview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Sale Information</CardTitle>
                <CardDescription>
                  Basic details about your sale campaign
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Sale Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    onBlur={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        name: sanitizeSaleName(e.target.value),
                      }))
                    }
                    placeholder="Black Friday 2024"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug">Slug</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                    onBlur={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        slug: generateSaleSlug(e.target.value),
                      }))
                    }
                    placeholder="black-friday-2024"
                  />
                  <p className="text-xs text-muted-foreground">
                    Letters, numbers, and hyphens only. Leave empty to auto-generate from name.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe your sale campaign..."
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Banner Image</Label>
                  <ImageUploadField
                    label="Sale Banner"
                    value={formData.banner_image || null}
                    onChange={(url) => setFormData((prev) => ({ ...prev, banner_image: url || '' }))}
                    aspectRatio={16 / 9}
                    allowSkipCrop={true}
                    recommendedDimensions="1920×1080 or larger (16:9). Use “Use full image (no crop)” in the crop dialog to upload without cropping."
                    helpText="Upload a banner image for this sale (max 5MB)"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Dates & Status</CardTitle>
                <CardDescription>
                  Set when your sale starts and ends
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_date">Start Date</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData((prev) => ({ ...prev, start_date: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="start_time">Start Time</Label>
                    <Input
                      id="start_time"
                      type="time"
                      value={formData.start_time}
                      onChange={(e) => setFormData((prev) => ({ ...prev, start_time: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="end_date">End Date</Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData((prev) => ({ ...prev, end_date: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end_time">End Time</Label>
                    <Input
                      id="end_time"
                      type="time"
                      value={formData.end_time}
                      onChange={(e) => setFormData((prev) => ({ ...prev, end_time: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value: 'draft' | 'active' | 'scheduled' | 'ended') =>
                        setFormData((prev) => ({ ...prev, status: value }))
                      }
                    >
                      <SelectTrigger id="status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="ended">Ended</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="is_featured">Featured</Label>
                    <div className="flex items-center space-x-2 pt-2">
                      <Checkbox
                        id="is_featured"
                        checked={formData.is_featured}
                        onCheckedChange={(checked) =>
                          setFormData((prev) => ({ ...prev, is_featured: !!checked }))
                        }
                      />
                      <Label htmlFor="is_featured" className="font-normal cursor-pointer">
                        Mark as featured sale
                      </Label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Featured sales can be displayed prominently in Sales Tab sections on your homepage. 
                      Use this for your most important promotions like Black Friday, Holiday Sales, etc.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Badge Customization</CardTitle>
                <CardDescription>
                  Customize the sale badge displayed on products
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="badge_text">Badge Text</Label>
                    <Input
                      id="badge_text"
                      value={formData.badge_text}
                      onChange={(e) => setFormData((prev) => ({ ...prev, badge_text: e.target.value }))}
                      placeholder="SALE"
                      maxLength={50}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="badge_color">Badge Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="badge_color"
                        type="color"
                        value={formData.badge_color}
                        onChange={(e) => setFormData((prev) => ({ ...prev, badge_color: e.target.value }))}
                        className="w-20 h-10"
                      />
                      <Input
                        value={formData.badge_color}
                        onChange={(e) => setFormData((prev) => ({ ...prev, badge_color: e.target.value }))}
                        placeholder="#EF4444"
                        pattern="^#[0-9A-Fa-f]{6}$"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Preview:</span>
                  <Badge
                    style={{
                      backgroundColor: formData.badge_color,
                      color: '#FFFFFF',
                    }}
                  >
                    {formData.badge_text || 'SALE'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Products in Sale</CardTitle>
                    <CardDescription>
                      Add products to this sale campaign
                    </CardDescription>
                  </div>
                  {isEditing && (
                    <Button
                      type="button"
                      onClick={() => setShowAddProductDialog(true)}
                    >
                      <PlusIcon className="mr-2 h-4 w-4" />
                      Add Product
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {!isEditing ? (
                  <div className="py-8 text-center text-muted-foreground">
                    Save the sale first to add products
                  </div>
                ) : safeProducts.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-muted-foreground mb-4">No products in this sale yet</p>
                    <Button
                      type="button"
                      onClick={() => setShowAddProductDialog(true)}
                    >
                      <PlusIcon className="mr-2 h-4 w-4" />
                      Add First Product
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {safeProducts.map((productSale) => {
                      const product = productSale.products;
                      const regularPrice = Number(product.price);
                      const salePrice = productSale.sale_price ? Number(productSale.sale_price) : regularPrice;
                      const discount = salePrice < regularPrice
                        ? Math.round(((regularPrice - salePrice) / regularPrice) * 100)
                        : 0;

                      return (
                        <div
                          key={productSale.id}
                          className="flex items-center gap-4 rounded-lg border p-4"
                        >
                          {product.image && (
                            <img
                              src={product.image}
                              alt={product.name}
                              className="h-16 w-16 rounded object-cover"
                            />
                          )}
                          <div className="flex-1">
                            <div className="font-semibold">{product.name}</div>
                            <div className="text-sm text-muted-foreground">
                              Regular: {formatCurrency(regularPrice)}
                              {salePrice < regularPrice && (
                                <>
                                  {' '}• Sale: {formatCurrency(salePrice)} ({discount}% off)
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditingProductSale(productSale);
                                setEditSalePriceValue(productSale.sale_price != null ? String(productSale.sale_price) : '');
                              }}
                              title="Edit sale price"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveProduct(productSale.id)}
                              title="Remove from sale"
                            >
                              <TrashIcon className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Sale Preview</CardTitle>
                <CardDescription>
                  Preview how your sale will appear
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {formData.banner_image && (
                    <div className="relative aspect-video w-full overflow-hidden rounded-lg">
                      <img
                        src={formData.banner_image}
                        alt={formData.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                  <div>
                    <h2 className="text-2xl font-bold">{formData.name || 'Sale Name'}</h2>
                    {formData.description && (
                      <p className="mt-2 text-muted-foreground">{formData.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      style={{
                        backgroundColor: formData.badge_color,
                        color: '#FFFFFF',
                      }}
                    >
                      {formData.badge_text || 'SALE'}
                    </Badge>
                    {formData.is_featured && <Badge>Featured</Badge>}
                    {formData.status && <Badge variant="secondary">{formData.status}</Badge>}
                  </div>
                  {formData.start_date && formData.end_date && (
                    <div className="text-sm text-muted-foreground">
                      {new Date(formData.start_date).toLocaleDateString()} -{' '}
                      {new Date(formData.end_date).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <CardFooter className="flex justify-between">
          <Button type="button" variant="outline" asChild>
            <Link href="/dashboard/sales">Cancel</Link>
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : isEditing ? 'Update Sale' : 'Create Sale'}
          </Button>
        </CardFooter>
      </form>

      {/* Add Product Dialog */}
      <AlertDialog open={showAddProductDialog} onOpenChange={setShowAddProductDialog}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Add Product to Sale</AlertDialogTitle>
            <AlertDialogDescription>
              Select one product to add. You can add more products one at a time after this.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Search Products</Label>
              <Input
                placeholder="Search by name..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
              />
            </div>
            <div className="max-h-60 space-y-2 overflow-y-auto">
              {isLoadingProducts ? (
                <div className="py-8 text-center text-muted-foreground">Loading products...</div>
              ) : filteredProducts.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">No products found</div>
              ) : (
                <RadioGroup
                  value={selectedProductId}
                  onValueChange={setSelectedProductId}
                  className="space-y-2"
                >
                  {filteredProducts.map((product) => (
                    <label
                      key={product.id}
                      className={`flex cursor-pointer items-center gap-4 rounded-lg border p-3 transition-colors ${
                        selectedProductId === product.id ? 'border-primary bg-primary/5' : 'hover:bg-muted'
                      }`}
                    >
                      <RadioGroupItem value={product.id} id={`product-${product.id}`} />
                      {product.image && (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="h-12 w-12 rounded object-cover"
                        />
                      )}
                      <div className="flex-1">
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatCurrency(Number(product.price))}
                        </div>
                      </div>
                    </label>
                  ))}
                </RadioGroup>
              )}
            </div>
            {selectedProductId && (
              <div className="space-y-2">
                <Label htmlFor="sale_price">Sale Price (Optional)</Label>
                <Input
                  id="sale_price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                  placeholder="Leave empty to use product sale price"
                />
                <p className="text-xs text-muted-foreground">
                  Override the product&apos;s sale price for this specific sale
                </p>
              </div>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAddProduct}
              disabled={!selectedProductId || !isEditing}
            >
              Add Product
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Sale Price Dialog */}
      <AlertDialog open={!!editingProductSale} onOpenChange={(open) => !open && setEditingProductSale(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Edit Sale Price</AlertDialogTitle>
            <AlertDialogDescription>
              {editingProductSale && (
                <>Set the sale price for {editingProductSale.products.name}. Leave empty to clear.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {editingProductSale && (
            <div className="space-y-4 py-4">
              <div className="text-sm text-muted-foreground">
                Regular price: {formatCurrency(Number(editingProductSale.products.price))}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_sale_price">Sale Price</Label>
                <Input
                  id="edit_sale_price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={editSalePriceValue}
                  onChange={(e) => setEditSalePriceValue(e.target.value)}
                  placeholder="e.g. 999.00"
                />
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setEditingProductSale(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleUpdateSalePrice();
              }}
              disabled={isUpdatingSalePrice}
            >
              {isUpdatingSalePrice ? 'Saving...' : 'Save'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
