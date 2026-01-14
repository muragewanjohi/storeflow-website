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
import { PlusIcon, PencilIcon, TrashIcon, EyeIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline';
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
                <p className="text-xs text-muted-foreground mt-1">
                  Featured sales can be displayed prominently in Sales Tab sections on your homepage
                </p>
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
                                  <div className="text-xs text-muted-foreground">
                                    /{sale.slug}
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
