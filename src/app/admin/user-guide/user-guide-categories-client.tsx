/**
 * User Guide Categories Client Component
 * 
 * Client component for managing user guide categories
 */

'use client';

import { useState, useEffect } from 'react';
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
import Link from 'next/link';
import { toast } from 'sonner';

interface Category {
  id: string;
  name: string;
  slug: string | null;
  icon: string | null;
  color: string | null;
  bg_color: string | null;
  sort_order: number | null;
  is_active: boolean | null;
  created_at: Date | null;
  updated_at: Date | null;
  articles: Array<{ id: string }>;
}

interface UserGuideCategoriesClientProps {
  categories: Category[];
}

export default function UserGuideCategoriesClient({ 
  categories: initialCategories 
}: Readonly<UserGuideCategoriesClientProps>) {
  const router = useRouter();
  const [categories, setCategories] = useState(initialCategories);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Update categories when initialCategories prop changes (after router.refresh())
  useEffect(() => {
    setCategories(initialCategories);
  }, [initialCategories]);

  const handleDelete = async (categoryId: string, categoryName: string) => {
    if (!confirm(`Are you sure you want to delete "${categoryName}"? This will also delete all articles in this category.`)) {
      return;
    }

    setIsDeleting(categoryId);
    try {
      const response = await fetch(`/api/admin/user-guide/categories/${categoryId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Update local state immediately
        setCategories(categories.filter(cat => cat.id !== categoryId));
        toast.success('Category deleted successfully');
        router.refresh();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete category');
        setIsDeleting(null);
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('An error occurred while deleting the category');
      setIsDeleting(null);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>User Guide Categories</CardTitle>
            <CardDescription>
              Manage categories for organizing your user guide articles
            </CardDescription>
          </div>
          <Button asChild>
            <Link href="/admin/user-guide/categories/new">
              <PlusIcon className="h-4 w-4 mr-2" />
              New Category
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No categories found. Create your first category to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Articles</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sort Order</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {category.slug ? `/${category.slug}` : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{category.articles.length}</Badge>
                    </TableCell>
                    <TableCell>
                      {category.is_active === false ? (
                        <Badge variant="secondary">Inactive</Badge>
                      ) : (
                        <Badge variant="default">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell>{category.sort_order ?? 0}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                        >
                          <Link href={`/admin/user-guide/categories/${category.id}/edit`}>
                            <PencilIcon className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(category.id, category.name)}
                          disabled={isDeleting === category.id}
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
    </div>
  );
}
