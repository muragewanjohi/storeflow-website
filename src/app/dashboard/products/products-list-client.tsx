/**
 * Products List Client Component
 * 
 * Displays list of products with filtering, search, and actions
 */

'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { PlusIcon, PencilIcon, TrashIcon, EyeIcon, ShareIcon } from '@heroicons/react/24/outline';
import { EllipsisVerticalIcon } from '@heroicons/react/24/solid';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCurrency } from '@/lib/currency/currency-context';
import { toast } from 'sonner';
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

interface Product {
  id: string;
  name: string;
  slug: string;
  sku: string;
  price: number;
  sale_price?: number | null;
  stock_quantity: number;
  status: 'active' | 'inactive' | 'draft' | 'archived';
  image?: string | null;
  category_id?: string | null;
  created_at: string;
  updated_at: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface ProductsListClientProps {
  initialProducts: Product[];
  initialPagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  } | null;
  categories: Category[];
  dbError?: string | null;
  currentSearchParams: {
    page: number;
    limit: number;
    search: string;
    status: string;
    category_id: string;
  };
}

export default function ProductsListClient({
  initialProducts,
  initialPagination,
  categories,
  dbError,
  currentSearchParams,
}: Readonly<ProductsListClientProps>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const { formatCurrency } = useCurrency();
  
  const [search, setSearch] = useState(currentSearchParams.search);
  const [status, setStatus] = useState(currentSearchParams.status || 'all');
  const [categoryId, setCategoryId] = useState(currentSearchParams.category_id || 'all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = () => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (search) {
      params.set('search', search);
    } else {
      params.delete('search');
    }
    
    if (status && status !== 'all') {
      params.set('status', status);
    } else {
      params.delete('status');
    }
    
    if (categoryId && categoryId !== 'all') {
      params.set('category_id', categoryId);
    } else {
      params.delete('category_id');
    }
    
    // Reset to page 1 when filtering
    params.set('page', '1');
    
    startTransition(() => {
      router.push(`/dashboard/products?${params.toString()}`);
    });
  };

  const handleDelete = async (product: Product) => {
    setProductToDelete(product);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!productToDelete) return;

    setDeletingId(productToDelete.id);
    setError(null);

    try {
      const response = await fetch(`/api/products/${productToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete product');
      }

      // Refresh the page to show updated list
      router.refresh();
      setShowDeleteDialog(false);
      setProductToDelete(null);
    } catch (err: any) {
      setError(err.message || 'Failed to delete product');
    } finally {
      setDeletingId(null);
    }
  };

  const handleStatusToggle = async (productId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    
    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update product status');
      }

      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to update product status');
    }
  };

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

  // Using formatCurrency from useCurrency hook
  const formatPrice = (price: number) => formatCurrency(price);

  // Quick share function for social media
  const handleQuickShare = async (product: Product, platform: string) => {
    const productUrl = `/products/${product.slug}`;
    const baseUrl = typeof window !== 'undefined' ? window.location.origin.replace('/dashboard', '') : '';
    const fullUrl = `${baseUrl}${productUrl}?utm_source=${platform}&utm_medium=social&utm_campaign=product_promotion`;
    const encodedUrl = encodeURIComponent(fullUrl);
    const shareText = product.sale_price 
      ? `${product.name} - ${formatPrice(product.sale_price)} (was ${formatPrice(product.price)})`
      : `${product.name} - ${formatPrice(product.price)}`;
    const encodedText = encodeURIComponent(shareText);

    let shareUrl = '';

    switch (platform) {
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        break;
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`;
        break;
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${encodedText}%20${encodedUrl}`;
        break;
      case 'copy':
        try {
          await navigator.clipboard.writeText(fullUrl);
          toast.success('Product link copied to clipboard!');
        } catch {
          toast.error('Failed to copy link');
        }
        return;
      default:
        return;
    }

    window.open(shareUrl, 'share', 'width=600,height=400,menubar=no,toolbar=no');
  };

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    startTransition(() => {
      router.push(`/dashboard/products?${params.toString()}`);
    });
  };

  const mobileFilteredProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return initialProducts.filter((product: any) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        product.name?.toLowerCase().includes(normalizedSearch) ||
        product.sku?.toLowerCase().includes(normalizedSearch);
      const matchesStatus = status === 'all' || product.status === status;
      const matchesCategory = categoryId === 'all' || product.category_id === categoryId;
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [initialProducts, search, status, categoryId]);

  const mobileSummary = useMemo(() => {
    const total = mobileFilteredProducts.length;
    const active = mobileFilteredProducts.filter((p: any) => p.status === 'active').length;
    const lowStock = mobileFilteredProducts.filter((p: any) => (p.stock_quantity ?? 0) > 0 && (p.stock_quantity ?? 0) <= 10).length;
    const outOfStock = mobileFilteredProducts.filter((p: any) => (p.stock_quantity ?? 0) <= 0).length;
    return { total, active, lowStock, outOfStock };
  }, [mobileFilteredProducts]);

  return (
    <div>
      <div className="min-h-screen bg-[#f3f4f6] pb-24 md:hidden">
        <section className="bg-gradient-to-b from-primary to-primary/80 px-4 pb-6 pt-8">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-[30px] font-bold leading-tight text-primary-foreground">Your Products</h1>
              <p className="mt-1 text-xs text-primary-foreground/80">Manage your product catalog</p>
            </div>
            <Button asChild className="h-9 bg-primary-foreground text-primary hover:bg-primary-foreground/90">
              <Link href="/dashboard/products/new">
                <PlusIcon className="mr-1.5 h-4 w-4" />
                Add
              </Link>
            </Button>
          </div>
        </section>

        <section className="space-y-4 px-4 pt-4">
          {(error || dbError) && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4">
              <p className="text-sm text-destructive">{error || dbError}</p>
            </div>
          )}

          <div className="grid grid-cols-4 gap-2">
            <Card className="border-[#e5e7eb]">
              <CardContent className="p-3">
                <p className="text-[22px] font-bold leading-none text-[#1f2937]">{mobileSummary.total}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">Total</p>
              </CardContent>
            </Card>
            <Card className="border-[#e5e7eb]">
              <CardContent className="p-3">
                <p className="text-[22px] font-bold leading-none text-[#1f2937]">{mobileSummary.active}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">Active</p>
              </CardContent>
            </Card>
            <Card className="border-[#e5e7eb]">
              <CardContent className="p-3">
                <p className="text-[22px] font-bold leading-none text-[#1f2937]">{mobileSummary.lowStock}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">Low</p>
              </CardContent>
            </Card>
            <Card className="border-[#e5e7eb]">
              <CardContent className="p-3">
                <p className="text-[22px] font-bold leading-none text-[#1f2937]">{mobileSummary.outOfStock}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">Out</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-[#e5e7eb]">
            <CardContent className="space-y-3 p-3">
              <Input
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
              />
              <div className="grid grid-cols-2 gap-2">
                <Select value={status} onValueChange={(value) => setStatus(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={categoryId} onValueChange={(value) => setCategoryId(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category: any) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSearch} className="w-full" disabled={isPending}>
                Apply filters
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {mobileFilteredProducts.length === 0 ? (
              <Card className="border-[#e5e7eb]">
                <CardContent className="py-10 text-center">
                  <p className="text-sm text-muted-foreground">No products found.</p>
                  <Button asChild className="mt-4">
                    <Link href="/dashboard/products/new">Create product</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              mobileFilteredProducts.map((product: any) => (
                <Card key={product.id} className="border-[#e5e7eb]">
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      {product.image ? (
                        <div className="relative h-14 w-14 overflow-hidden rounded-md border border-[#e5e7eb] bg-white">
                          <Image src={product.image} alt={product.name} fill className="object-cover" sizes="56px" />
                        </div>
                      ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded-md border border-[#e5e7eb] bg-white text-[10px] text-muted-foreground">
                          No Image
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[#111827]">{product.name}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">SKU: {product.sku || 'N/A'}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {getStatusBadge(product.status)}
                          <Badge variant={product.stock_quantity > 0 ? 'default' : 'destructive'}>
                            Stock {product.stock_quantity ?? 0}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-[#f3f4f6] pt-3">
                      <div>
                        {product.sale_price ? (
                          <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground line-through">{formatPrice(product.price)}</span>
                            <span className="text-base font-bold text-red-600">{formatPrice(product.sale_price)}</span>
                          </div>
                        ) : (
                          <span className="text-base font-bold text-[#111827]">{formatPrice(product.price)}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/dashboard/products/${product.id}`}>
                            <EyeIcon className="mr-1.5 h-4 w-4" />
                            View
                          </Link>
                        </Button>
                        <Button asChild size="sm">
                          <Link href={`/dashboard/products/${product.id}/edit`}>
                            <PencilIcon className="mr-1.5 h-4 w-4" />
                            Edit
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </section>
      </div>

      <div className="hidden md:block">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground mt-2">
            Manage your product catalog
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/products/new">
            <PlusIcon className="mr-2 h-4 w-4" />
            Add Product
          </Link>
        </Button>
      </div>

      {(error || dbError) && (
        <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{error || dbError}</p>
          {dbError && (
            <p className="mt-2 text-xs text-muted-foreground">
              This may be a temporary issue. Please check your database connection or try refreshing the page.
            </p>
          )}
        </div>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Search and filter products</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(value) => setStatus(value)}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={categoryId} onValueChange={(value) => setCategoryId(value)}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category: any) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={handleSearch} className="w-full" disabled={isPending}>
                Search
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>Product List</CardTitle>
          <CardDescription>
            {initialPagination
              ? `Showing ${initialProducts.length} of ${initialPagination.total} products`
              : 'Loading products...'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {initialProducts.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">No products found.</p>
              <Button asChild className="mt-4">
                <Link href="/dashboard/products/new">Create your first product</Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Image</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {initialProducts.map((product: any) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          {product.image ? (
                            <div className="relative h-12 w-12 overflow-hidden rounded">
                              <Image
                                src={product.image}
                                alt={product.name}
                                fill
                                className="object-cover"
                                sizes="48px"
                                priority={false}
                              />
                            </div>
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded bg-muted">
                              <span className="text-xs text-muted-foreground">No Image</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            {product.sale_price ? (
                              <>
                                <span className="text-sm text-muted-foreground line-through">
                                  {formatPrice(product.price)}
                                </span>
                                <span className="font-semibold text-red-600">
                                  {formatPrice(product.sale_price)}
                                </span>
                              </>
                            ) : (
                              <span>{formatPrice(product.price)}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={product.stock_quantity > 0 ? 'default' : 'destructive'}
                          >
                            {product.stock_quantity}
                          </Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(product.status)}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={deletingId === product.id}
                              >
                                {deletingId === product.id ? (
                                  <span className="flex items-center gap-1 text-muted-foreground">
                                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground/50 border-t-transparent" />
                                    <span className="text-xs">Working...</span>
                                  </span>
                                ) : (
                                  <EllipsisVerticalIcon className="h-4 w-4" />
                                )}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/dashboard/products/${product.id}`}>
                                  <EyeIcon className="mr-2 h-4 w-4" />
                                  View
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/dashboard/products/${product.id}/edit`}>
                                  <PencilIcon className="mr-2 h-4 w-4" />
                                  Edit
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleStatusToggle(product.id, product.status)}
                              >
                                {product.status === 'active' ? 'Deactivate' : 'Activate'}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleQuickShare(product, 'facebook')}>
                                <svg className="mr-2 h-4 w-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                                  <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                                </svg>
                                Share on Facebook
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleQuickShare(product, 'twitter')}>
                                <svg className="mr-2 h-4 w-4 text-sky-500" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                </svg>
                                Share on X
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleQuickShare(product, 'whatsapp')}>
                                <svg className="mr-2 h-4 w-4 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                </svg>
                                Share on WhatsApp
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleQuickShare(product, 'copy')}>
                                <ShareIcon className="mr-2 h-4 w-4" />
                                Copy Link
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDelete(product)}
                                className="text-destructive"
                                disabled={deletingId === product.id}
                              >
                                <TrashIcon className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {initialPagination && initialPagination.totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Page {initialPagination.page} of {initialPagination.totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(initialPagination.page - 1)}
                      disabled={!initialPagination.hasPrevPage || isPending}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(initialPagination.page + 1)}
                      disabled={!initialPagination.hasNextPage || isPending}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{productToDelete?.name}&quot;? This action
              cannot be undone and will permanently delete the product and all its variants.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deletingId !== null}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingId ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </div>
  );
}

