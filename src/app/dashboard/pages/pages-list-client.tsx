/**
 * Pages List Client Component
 * 
 * Displays list of pages with filtering, search, and actions
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
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
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

interface Page {
  id: string;
  title: string;
  slug: string;
  status: 'draft' | 'published' | 'archived';
  created_at: string;
  updated_at: string;
}

interface PagesListClientProps {
  initialPages: Page[];
  initialPagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null;
  dbError?: string | null;
  currentSearchParams: {
    page: number;
    limit: number;
    search: string;
    status: string;
  };
}

export default function PagesListClient({
  initialPages,
  initialPagination,
  dbError,
  currentSearchParams,
}: Readonly<PagesListClientProps>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [pages, setPages] = useState(initialPages);
  
  // Update pages when initialPages changes (after refresh)
  useEffect(() => {
    setPages(initialPages);
  }, [initialPages]);
  
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
          if (currentSearchParams.status) queryParams.set('status', currentSearchParams.status);
          
          const response = await fetch(`/api/pages?${queryParams.toString()}`, {
            cache: 'no-store',
          });
          
          if (response.ok) {
            const data = await response.json();
            setPages(data.pages || []);
          }
        } catch (error) {
          console.error('Error refreshing pages:', error);
        }
      };
      
      fetchFreshData();
      
      // Remove refresh param from URL
      const params = new URLSearchParams(searchParams.toString());
      params.delete('refresh');
      const newUrl = params.toString() ? `/dashboard/pages?${params.toString()}` : '/dashboard/pages';
      router.replace(newUrl);
    }
  }, [searchParams, router, currentSearchParams]);
  
  const [search, setSearch] = useState(currentSearchParams.search);
  const [status, setStatus] = useState(currentSearchParams.status || 'all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [pageToDelete, setPageToDelete] = useState<Page | null>(null);
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
    
    // Reset to page 1 when filtering
    params.set('page', '1');
    
    startTransition(() => {
      router.push(`/dashboard/pages?${params.toString()}`);
    });
  };

  const handleDelete = async (page: Page) => {
    setPageToDelete(page);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!pageToDelete) return;

    setDeletingId(pageToDelete.id);
    setError(null);

    try {
      const response = await fetch(`/api/pages/${pageToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete page');
      }

      // Refresh the page with cache busting
      router.push(`/dashboard/pages?refresh=${Date.now()}`);
      router.refresh();
      setShowDeleteDialog(false);
      setPageToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete page');
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <Badge variant="default">Published</Badge>;
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'archived':
        return <Badge variant="outline">Archived</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const pagination = initialPagination || {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  };
  
  // Use local state for pages to allow immediate updates
  const displayPages = pages;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pages</h1>
          <p className="text-muted-foreground mt-2">
            Manage your website pages
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/pages/new">
            <PlusIcon className="mr-2 h-4 w-4" />
            New Page
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
          <CardTitle>All Pages</CardTitle>
          <CardDescription>
            Search and filter your pages
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
                  placeholder="Search pages..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch();
                    }
                  }}
                />
              </div>
              <div className="w-full sm:w-[200px]">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
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
            {displayPages.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-muted-foreground">No pages found.</p>
                <Button asChild variant="outline" className="mt-4">
                  <Link href="/dashboard/pages/new">
                    <PlusIcon className="mr-2 h-4 w-4" />
                    Create your first page
                  </Link>
                </Button>
              </div>
            ) : (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Slug</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Updated</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayPages.map((page: any) => (
                        <TableRow key={page.id}>
                          <TableCell className="font-medium">
                            {page.title}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            /{page.slug}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(page.status)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(page.updated_at)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                asChild
                              >
                                <Link href={`/dashboard/pages/${page.id}/edit`}>
                                  <PencilIcon className="h-4 w-4" />
                                </Link>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(page)}
                                disabled={deletingId === page.id}
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
                    <p className="text-sm text-muted-foreground">
                      Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                      {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                      {pagination.total} pages
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pagination.page === 1 || isPending}
                        onClick={() => {
                          const params = new URLSearchParams(searchParams.toString());
                          params.set('page', (pagination.page - 1).toString());
                          router.push(`/dashboard/pages?${params.toString()}`);
                        }}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pagination.page >= pagination.totalPages || isPending}
                        onClick={() => {
                          const params = new URLSearchParams(searchParams.toString());
                          params.set('page', (pagination.page + 1).toString());
                          router.push(`/dashboard/pages?${params.toString()}`);
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
            <AlertDialogTitle>Delete Page</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{pageToDelete?.title}&quot;? This action cannot be undone.
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

