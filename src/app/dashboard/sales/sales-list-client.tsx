/**
 * Sales List Client Component
 * 
 * Displays list of sales with filtering, search, and actions
 * 
 * Phase 3: Dashboard UI - Sales Implementation
 */

'use client';

import { useState, useTransition, useEffect } from 'react';
import Link from 'next/link';
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
import { PlusIcon, PencilIcon, TrashIcon, EyeIcon, DocumentDuplicateIcon, ShareIcon } from '@heroicons/react/24/outline';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  created_at: Date | string;
  updated_at: Date | string;
  _count: {
    product_sales: number;
  };
}

interface SalesListClientProps {
  initialSales: Sale[];
  initialPagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage?: boolean;
    hasPrevPage?: boolean;
  } | null;
  dbError?: string | null;
  currentSearchParams: {
    page: number;
    limit: number;
    search: string;
    status: string;
    is_featured: string;
  };
}

export default function SalesListClient({
  initialSales,
  initialPagination,
  dbError,
  currentSearchParams,
}: Readonly<SalesListClientProps>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [sales, setSales] = useState(initialSales);
  
  // Update sales when initialSales changes (after refresh)
  useEffect(() => {
    setSales(initialSales);
  }, [initialSales]);
  
  // Check for refresh parameter and reload data directly
  useEffect(() => {
    const refresh = searchParams.get('refresh');
    if (refresh) {
      // Fetch fresh data directly from API (bypassing server component cache)
      const fetchFreshData = async () => {
        try {
          const queryParams = new URLSearchParams();
          if (currentSearchParams.page > 1) queryParams.set('page', currentSearchParams.page.toString());
          if (currentSearchParams.limit !== 20) queryParams.set('limit', currentSearchParams.limit.toString());
          if (currentSearchParams.search) queryParams.set('search', currentSearchParams.search);
          if (currentSearchParams.status && currentSearchParams.status !== 'all') queryParams.set('status', currentSearchParams.status);
          if (currentSearchParams.is_featured) queryParams.set('is_featured', currentSearchParams.is_featured);
          
          const response = await fetch(`/api/dashboard/sales?${queryParams.toString()}`, {
            cache: 'no-store',
          });
          
          if (response.ok) {
            const data = await response.json();
            setSales(data.sales || []);
          }
        } catch (error) {
          console.error('Error refreshing sales:', error);
        }
      };
      
      fetchFreshData();
      
      // Remove refresh param from URL
      const params = new URLSearchParams(searchParams.toString());
      params.delete('refresh');
      const newUrl = params.toString() ? `/dashboard/sales?${params.toString()}` : '/dashboard/sales';
      router.replace(newUrl);
    }
  }, [searchParams, router, currentSearchParams]);
  
  const [search, setSearch] = useState(currentSearchParams.search);
  const [status, setStatus] = useState(currentSearchParams.status || 'all');
  const [is_featured, setIsFeatured] = useState(currentSearchParams.is_featured || 'all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);
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
    
    if (is_featured && is_featured !== 'all') {
      params.set('is_featured', is_featured);
    } else {
      params.delete('is_featured');
    }
    
    // Reset to page 1 when filtering
    params.set('page', '1');
    
    startTransition(() => {
      router.push(`/dashboard/sales?${params.toString()}`);
    });
  };

  const handleDelete = async (sale: Sale) => {
    setSaleToDelete(sale);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!saleToDelete) return;

    setDeletingId(saleToDelete.id);
    setError(null);

    try {
      const response = await fetch(`/api/dashboard/sales/${saleToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete sale');
      }

      // Refresh the page with cache busting
      router.push(`/dashboard/sales?refresh=${Date.now()}`);
      router.refresh();
      setShowDeleteDialog(false);
      setSaleToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete sale');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDuplicate = async (sale: Sale) => {
    try {
      // Fetch full sale data
      const response = await fetch(`/api/dashboard/sales/${sale.id}`);
      if (!response.ok) throw new Error('Failed to fetch sale');
      
      const { sale: fullSale } = await response.json();
      
      // Create new sale with same data but new name
      const duplicateData = {
        name: `${fullSale.name} (Copy)`,
        description: fullSale.description,
        banner_image: fullSale.banner_image,
        badge_text: fullSale.badge_text,
        badge_color: fullSale.badge_color,
        start_date: fullSale.start_date,
        end_date: fullSale.end_date,
        status: 'draft', // Always duplicate as draft
        is_featured: fullSale.is_featured,
      };

      const createResponse = await fetch('/api/dashboard/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(duplicateData),
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        throw new Error(errorData.error || 'Failed to duplicate sale');
      }

      // Redirect to edit page of new sale
      const { sale: newSale } = await createResponse.json();
      router.push(`/dashboard/sales/${newSale.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to duplicate sale');
    }
  };

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

  const formatDate = (dateString: string | Date | null) => {
    if (!dateString) return '—';
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const isSaleActive = (sale: Sale) => {
    const now = new Date();
    const startDate = sale.start_date ? (typeof sale.start_date === 'string' ? new Date(sale.start_date) : sale.start_date) : null;
    const endDate = sale.end_date ? (typeof sale.end_date === 'string' ? new Date(sale.end_date) : sale.end_date) : null;
    
    if (sale.status !== 'active') return false;
    if (!startDate && !endDate) return true;
    if (startDate && endDate) return now >= startDate && now <= endDate;
    if (startDate) return now >= startDate;
    if (endDate) return now <= endDate;
    return false;
  };

  // Quick share function for social media
  const handleQuickShare = async (sale: Sale, platform: string) => {
    const saleUrl = `/sales/${sale.slug}`;
    const baseUrl = typeof window !== 'undefined' ? window.location.origin.replace('/dashboard', '') : '';
    const fullUrl = `${baseUrl}${saleUrl}?utm_source=${platform}&utm_medium=social&utm_campaign=sale_promotion`;
    const encodedUrl = encodeURIComponent(fullUrl);
    const shareText = `🎉 ${sale.name}${sale.description ? ` - ${sale.description.substring(0, 80)}...` : ''}`;
    const encodedText = encodeURIComponent(shareText);

    let shareUrlTarget = '';

    switch (platform) {
      case 'facebook':
        shareUrlTarget = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        break;
      case 'twitter':
        shareUrlTarget = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`;
        break;
      case 'whatsapp':
        shareUrlTarget = `https://wa.me/?text=${encodedText}%20${encodedUrl}`;
        break;
      case 'copy':
        try {
          await navigator.clipboard.writeText(fullUrl);
          toast.success('Sale link copied to clipboard!');
        } catch {
          toast.error('Failed to copy link');
        }
        return;
      default:
        return;
    }

    window.open(shareUrlTarget, 'share', 'width=600,height=400,menubar=no,toolbar=no');
  };

  const pagination = initialPagination || {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  };
  
  const displaySales = sales;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sales</h1>
          <p className="text-muted-foreground mt-2">
            Manage your sales campaigns and promotions
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/sales/new">
            <PlusIcon className="mr-2 h-4 w-4" />
            New Sale
          </Link>
        </Button>
      </div>

      {dbError && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{dbError}</p>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Sales</CardTitle>
          <CardDescription>
            Search and filter your sales campaigns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="flex-1">
                <Label htmlFor="search">Search</Label>
                <Input
                  id="search"
                  placeholder="Search sales..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch();
                    }
                  }}
                />
              </div>
              <div className="w-full sm:w-[180px]">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="ended">Ended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full sm:w-[180px]">
                <Label htmlFor="featured">Featured</Label>
                <Select value={is_featured || 'all'} onValueChange={setIsFeatured}>
                  <SelectTrigger id="featured">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="true">Featured Only</SelectItem>
                    <SelectItem value="false">Not Featured</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={handleSearch} disabled={isPending}>
                  {isPending ? 'Searching...' : 'Search'}
                </Button>
              </div>
            </div>

            {/* Table */}
            {displaySales.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-muted-foreground">No sales found.</p>
                <Button asChild variant="outline" className="mt-4">
                  <Link href="/dashboard/sales/new">
                    <PlusIcon className="mr-2 h-4 w-4" />
                    Create your first sale
                  </Link>
                </Button>
              </div>
            ) : (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Dates</TableHead>
                        <TableHead>Products</TableHead>
                        <TableHead>Featured</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displaySales.map((sale) => (
                        <TableRow key={sale.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {sale.banner_image && (
                                <img
                                  src={sale.banner_image}
                                  alt={sale.name}
                                  className="h-10 w-10 rounded object-cover"
                                />
                              )}
                              <div>
                                <div className="font-semibold">{sale.name}</div>
                                {sale.slug && (
                                  <div className="text-xs text-muted-foreground" title={`Storefront URL: /sales/${sale.slug} (path is /sales/, slug is ${sale.slug})`}>
                                    <span className="font-medium">Storefront:</span> /sales/{sale.slug}
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(sale.status)}
                            {isSaleActive(sale) && (
                              <Badge variant="outline" className="ml-2 text-xs">
                                Live
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>Start: {formatDate(sale.start_date)}</div>
                              <div>End: {formatDate(sale.end_date)}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {sale._count.product_sales} products
                            </span>
                          </TableCell>
                          <TableCell>
                            {sale.is_featured ? (
                              <Badge variant="default">Featured</Badge>
                            ) : (
                              <span className="text-sm text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                asChild
                                title="View sale page"
                              >
                                <Link href={`/sales/${sale.slug}`} target="_blank">
                                  <EyeIcon className="h-4 w-4" />
                                </Link>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                asChild
                                title="Edit sale"
                              >
                                <Link href={`/dashboard/sales/${sale.id}`}>
                                  <PencilIcon className="h-4 w-4" />
                                </Link>
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    title="Share sale"
                                  >
                                    <ShareIcon className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleQuickShare(sale, 'facebook')}>
                                    <svg className="mr-2 h-4 w-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                                      <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                                    </svg>
                                    Facebook
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleQuickShare(sale, 'twitter')}>
                                    <svg className="mr-2 h-4 w-4 text-sky-500" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                    </svg>
                                    X (Twitter)
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleQuickShare(sale, 'whatsapp')}>
                                    <svg className="mr-2 h-4 w-4 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                    </svg>
                                    WhatsApp
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleQuickShare(sale, 'copy')}>
                                    <ShareIcon className="mr-2 h-4 w-4" />
                                    Copy Link
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDuplicate(sale)}
                                title="Duplicate sale"
                              >
                                <DocumentDuplicateIcon className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(sale)}
                                disabled={deletingId === sale.id}
                                title="Delete sale"
                              >
                                <TrashIcon className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                      {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                      {pagination.total} sales
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!pagination.hasPrevPage || isPending}
                        onClick={() => {
                          const params = new URLSearchParams(searchParams.toString());
                          params.set('page', String(pagination.page - 1));
                          router.push(`/dashboard/sales?${params.toString()}`);
                        }}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!pagination.hasNextPage || isPending}
                        onClick={() => {
                          const params = new URLSearchParams(searchParams.toString());
                          params.set('page', String(pagination.page + 1));
                          router.push(`/dashboard/sales?${params.toString()}`);
                        }}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Sale</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{saleToDelete?.name}&quot;? This will also
              remove all product assignments to this sale. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingId ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
