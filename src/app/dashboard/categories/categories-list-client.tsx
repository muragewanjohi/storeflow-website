/**
 * Categories List Client Component
 * 
 * Displays list of categories with actions
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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

interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id?: string | null;
  image?: string | null;
  status?: string | null;
  other_categories?: Category[];
}

interface CategoriesListClientProps {
  initialCategories: Category[];
}

export default function CategoriesListClient({
  initialCategories,
}: Readonly<CategoriesListClientProps>) {
  const router = useRouter();
  const [categories, setCategories] = useState(initialCategories);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  const handleDelete = async (category: Category) => {
    setCategoryToDelete(category);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!categoryToDelete) return;

    setDeletingId(categoryToDelete.id);

    try {
      const response = await fetch(`/api/categories/${categoryToDelete.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.refresh();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete category');
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('An error occurred while deleting the category');
    } finally {
      setDeletingId(null);
      setShowDeleteDialog(false);
      setCategoryToDelete(null);
    }
  };

  const getStatusBadge = (status: string | null | undefined) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Active</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inactive</Badge>;
      default:
        return <Badge variant="secondary">{status || 'Active'}</Badge>;
    }
  };

  const renderCategoryRow = (category: Category, level: number = 0) => (
    <TableRow key={category.id}>
      <TableCell>
        <div className="flex items-center gap-2" style={{ paddingLeft: `${level * 24}px` }}>
          {level > 0 && <span className="text-muted-foreground">└</span>}
          {category.image && (
            <img
              src={category.image}
              alt={category.name}
              className="h-8 w-8 rounded object-cover"
            />
          )}
          <span className="font-medium">{category.name}</span>
        </div>
      </TableCell>
      <TableCell>
        <code className="text-xs bg-muted px-2 py-1 rounded">{category.slug || '—'}</code>
      </TableCell>
      <TableCell>{getStatusBadge(category.status)}</TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/dashboard/categories/${category.id}/edit`}>
              <PencilIcon className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDelete(category)}
            disabled={deletingId === category.id}
          >
            <TrashIcon className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
          <p className="text-muted-foreground mt-2">
            Organize your products into categories
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/categories/new">
            <PlusIcon className="mr-2 h-4 w-4" />
            Add Category
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Categories</CardTitle>
          <CardDescription>
            {categories.length} categor{categories.length !== 1 ? 'ies' : 'y'} registered
          </CardDescription>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No categories found</p>
              <Button asChild>
                <Link href="/dashboard/categories/new">
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Create Your First Category
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => {
                  const rows = [renderCategoryRow(category, 0)];
                  if (category.other_categories && category.other_categories.length > 0) {
                    category.other_categories.forEach((child) => {
                      rows.push(renderCategoryRow(child, 1));
                    });
                  }
                  return rows;
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{categoryToDelete?.name}"? This action cannot be undone.
              Products in this category will need to be reassigned.
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

