/**
 * Blog Categories List Client Component
 * 
 * Displays list of blog categories with actions
 */

'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import { Badge } from '@/components/ui/badge';
import { PlusIcon, PencilIcon, TrashIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
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

interface Category {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
  _count: {
    blogs: number;
  };
}

interface CategoriesListClientProps {
  initialCategories: Category[];
  dbError?: string | null;
}

export default function CategoriesListClient({
  initialCategories,
  dbError,
}: Readonly<CategoriesListClientProps>) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [categories, setCategories] = useState(initialCategories);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(dbError || null);

  const handleDelete = async (category: Category) => {
    setCategoryToDelete(category);
  };

  const confirmDelete = async () => {
    if (!categoryToDelete) return;

    setDeletingId(categoryToDelete.id);
    setError(null);

    try {
      const response = await fetch(`/api/blogs/categories/${categoryToDelete.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        // Show specific error if category has blog posts
        if (data.error?.includes('existing blog posts')) {
          throw new Error(
            `Cannot delete category "${categoryToDelete.name}" because it has ${categoryToDelete._count.blogs} blog ${categoryToDelete._count.blogs === 1 ? 'post' : 'posts'}. Please reassign or delete those posts first.`
          );
        }
        throw new Error(data.error || 'Failed to delete category');
      }

      // Remove category from list
      setCategories((prev) => prev.filter((cat) => cat.id !== categoryToDelete.id));
      setCategoryToDelete(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete category');
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Link href="/dashboard/blogs">
            <Button variant="ghost" size="sm" className="mb-2">
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              Back to Blogs
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Blog Categories</h1>
            <p className="text-muted-foreground">
              Manage your blog post categories
            </p>
          </div>
        </div>
        <Link href="/dashboard/blogs/categories/new">
          <Button>
            <PlusIcon className="mr-2 h-4 w-4" />
            New Category
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
          <CardTitle>All Categories</CardTitle>
          <CardDescription>
            Categories help organize your blog posts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">No categories found.</p>
              <Link href="/dashboard/blogs/categories/new">
                <Button variant="outline" className="mt-4">
                  Create your first category
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Blog Posts</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {category.slug}
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {category._count.blogs} {category._count.blogs === 1 ? 'post' : 'posts'}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(category.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/dashboard/blogs/categories/${category.id}/edit`}>
                          <Button variant="ghost" size="sm">
                            <PencilIcon className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(category)}
                          disabled={deletingId === category.id}
                        >
                          <TrashIcon className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!categoryToDelete} onOpenChange={(open) => !open && setCategoryToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{categoryToDelete?.name}&quot;?
              {categoryToDelete && categoryToDelete._count.blogs > 0 && (
                <span className="block mt-2 text-destructive">
                  This category has {categoryToDelete._count.blogs} blog{' '}
                  {categoryToDelete._count.blogs === 1 ? 'post' : 'posts'}. 
                  Deleting it will remove the category from those posts.
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

