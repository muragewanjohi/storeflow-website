/**
 * Forms List Client Component
 * 
 * Displays list of form builders with actions
 */

'use client';

import { useState, useEffect, useTransition } from 'react';
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
import { PlusIcon, PencilIcon, TrashIcon, EyeIcon } from '@heroicons/react/24/outline';
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

interface Form {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  _count: {
    form_submissions: number;
  };
}

export default function FormsListClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [forms, setForms] = useState<Form[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formToDelete, setFormToDelete] = useState<Form | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Search and filter state
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');

  // Fetch forms
  useEffect(() => {
    const fetchForms = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (statusFilter) params.set('status', statusFilter);
        params.set('page', searchParams.get('page') || '1');
        params.set('limit', searchParams.get('limit') || '20');

        const response = await fetch(`/api/forms?${params.toString()}`);
        const data = await response.json();

        if (response.ok) {
          setForms(data.forms || []);
          setPagination(data.pagination || null);
        } else {
          setError(data.error || 'Failed to load forms');
        }
      } catch (err) {
        setError('Failed to load forms. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchForms();
  }, [search, statusFilter, searchParams]);

  const handleDelete = async (form: Form) => {
    setFormToDelete(form);
  };

  const confirmDelete = async () => {
    if (!formToDelete) return;

    setDeletingId(formToDelete.id);
    setError(null);

    try {
      const response = await fetch(`/api/forms/${formToDelete.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete form');
      }

      // Remove form from list
      setForms((prev) => prev.filter((f: any) => f.id !== formToDelete.id));
      setFormToDelete(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete form');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'Invalid date';
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'active') {
      return <Badge className="bg-green-500">Active</Badge>;
    }
    return <Badge variant="secondary">Inactive</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Forms</h1>
          <p className="text-muted-foreground">
            Manage your custom forms
          </p>
        </div>
        <Link href="/dashboard/forms/new">
          <Button>
            <PlusIcon className="mr-2 h-4 w-4" />
            New Form
          </Button>
        </Link>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/15 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Forms</CardTitle>
          <CardDescription>
            Create and manage custom forms for your store
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filter */}
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Search forms..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="w-48">
              <Label htmlFor="status">Status</Label>
              <Select 
                value={statusFilter || undefined} 
                onValueChange={(value) => setStatusFilter(value || '')}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">Loading forms...</p>
            </div>
          ) : forms.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">No forms found.</p>
              <Link href="/dashboard/forms/new">
                <Button variant="outline" className="mt-4">
                  Create your first form
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Submissions</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {forms.map((form: any) => (
                    <TableRow key={form.id}>
                      <TableCell className="font-medium">
                        <div>{form.title}</div>
                        {form.description && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {form.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {form.slug}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {form._count.form_submissions} {form._count.form_submissions === 1 ? 'submission' : 'submissions'}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(form.status)}</TableCell>
                      <TableCell>{formatDate(form.updated_at)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Link href={`/dashboard/forms/${form.id}/submissions`}>
                            <Button variant="ghost" size="sm">
                              <EyeIcon className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Link href={`/dashboard/forms/${form.id}/edit`}>
                            <Button variant="ghost" size="sm">
                              <PencilIcon className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(form)}
                            disabled={deletingId === form.id}
                          >
                            <TrashIcon className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                    {pagination.total} forms
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page === 1}
                      onClick={() => {
                        const params = new URLSearchParams(searchParams.toString());
                        params.set('page', (pagination.page - 1).toString());
                        router.push(`/dashboard/forms?${params.toString()}`);
                      }}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page >= pagination.totalPages}
                      onClick={() => {
                        const params = new URLSearchParams(searchParams.toString());
                        params.set('page', (pagination.page + 1).toString());
                        router.push(`/dashboard/forms?${params.toString()}`);
                      }}
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
      <AlertDialog open={!!formToDelete} onOpenChange={(open) => !open && setFormToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Form</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{formToDelete?.title}&quot;?
              {formToDelete && formToDelete._count.form_submissions > 0 && (
                <span className="block mt-2 text-destructive">
                  This form has {formToDelete._count.form_submissions} submission{' '}
                  {formToDelete._count.form_submissions === 1 ? '' : 's'}. 
                  Deleting it will also delete all submissions.
                </span>
              )}
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

