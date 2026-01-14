/**
 * Blog Categories Client Component
 * 
 * Client component for managing blog categories
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

// Generate slug for blog categories - keep full name with hyphens for spaces
const generateCategorySlug = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')  // Replace spaces with hyphens
    .replace(/^-+|-+$/g, '');  // Remove leading/trailing hyphens
};

interface BlogCategory {
  id: string;
  name: string;
  slug: string | null;
}

interface BlogCategoriesClientProps {
  categories: BlogCategory[];
  userRole: string;
}

export default function BlogCategoriesClient({ 
  categories: initialCategories, 
  userRole 
}: Readonly<BlogCategoriesClientProps>) {
  const router = useRouter();
  const [categories, setCategories] = useState(initialCategories);

  // Update categories when initialCategories prop changes (after router.refresh())
  useEffect(() => {
    setCategories(initialCategories);
  }, [initialCategories]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<BlogCategory | null>(null);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
  });

  const handleOpenDialog = (category?: BlogCategory) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        slug: category.slug || '',
      });
      setSlugManuallyEdited(!!category.slug);
    } else {
      setEditingCategory(null);
      setFormData({
        name: '',
        slug: '',
      });
      setSlugManuallyEdited(false);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingCategory(null);
    setSlugManuallyEdited(false);
    setFormData({
      name: '',
      slug: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    try {
      const url = editingCategory 
        ? `/api/admin/blogs/categories/${editingCategory.id}`
        : '/api/admin/blogs/categories';
      
      const method = editingCategory ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          slug: formData.slug || generateCategorySlug(formData.name),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save category');
      }

      // Update local state immediately
      if (editingCategory) {
        // Update existing category
        setCategories(categories.map(cat => 
          cat.id === editingCategory.id 
            ? { ...cat, name: formData.name, slug: data.category.slug || formData.slug }
            : cat
        ));
      } else {
        // Add new category
        if (data.category) {
          setCategories([...categories, data.category].sort((a, b) => 
            a.name.localeCompare(b.name)
          ));
        }
      }

      toast.success(editingCategory 
        ? 'Category updated successfully.' 
        : 'Category created successfully.');
      
      handleCloseDialog();
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || 'An unexpected error occurred.');
    }
  };

  const handleDelete = async (categoryId: string) => {
    if (!confirm('Are you sure you want to delete this category? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(categoryId);
    try {
      const response = await fetch(`/api/admin/blogs/categories/${categoryId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Update local state immediately
        setCategories(categories.filter(cat => cat.id !== categoryId));
        toast.success('Category deleted successfully.');
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
            <CardTitle>Blog Categories</CardTitle>
            <CardDescription>
              Manage categories for organizing your blog posts
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <PlusIcon className="h-4 w-4 mr-2" />
                New Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>
                    {editingCategory ? 'Edit Category' : 'Create New Category'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingCategory 
                      ? 'Update the category details below.'
                      : 'Enter the details for your new blog category.'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => {
                        const newName = e.target.value;
                        setFormData({
                          ...formData,
                          name: newName,
                          // Only auto-generate slug if it hasn't been manually edited
                          slug: slugManuallyEdited ? formData.slug : generateCategorySlug(newName),
                        });
                      }}
                      placeholder="Category name"
                      required
                      maxLength={255}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="slug">Slug</Label>
                    <Input
                      id="slug"
                      value={formData.slug}
                      onChange={(e) => {
                        setSlugManuallyEdited(true);
                        setFormData({ ...formData, slug: e.target.value });
                      }}
                      placeholder="auto-generated-from-name"
                      maxLength={255}
                    />
                    <p className="text-sm text-muted-foreground">
                      URL-friendly version (auto-generated if empty)
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleCloseDialog}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingCategory ? 'Update' : 'Create'} Category
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
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
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {category.slug || 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(category)}
                        >
                          <PencilIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(category.id)}
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

