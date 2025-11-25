/**
 * Blog Category Form Client Component
 * 
 * Form for creating or editing a blog category
 */

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Category {
  id: string;
  name: string;
  slug: string | null;
}

interface CategoryFormClientProps {
  category?: Category;
}

export default function CategoryFormClient({ category }: Readonly<CategoryFormClientProps>) {
  const router = useRouter();
  const isEditing = !!category;
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: category?.name || '',
    slug: category?.slug ?? '',
  });

  // Auto-generate slug from name
  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      slug: prev.slug || generateSlug(name),
    }));
  };

  // Generate slug helper
  const generateSlug = (text: string): string => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        const url = isEditing ? `/api/blogs/categories/${category.id}` : '/api/blogs/categories';
        const method = isEditing ? 'PUT' : 'POST';

        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });

        const data = await response.json();

        if (!response.ok) {
          const errorData = data as { error?: string; errors?: any[] };
          throw new Error(errorData.error || `Failed to ${isEditing ? 'update' : 'create'} category`);
        }

        // Redirect to categories list
        router.push('/dashboard/blogs/categories');
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : `Failed to ${isEditing ? 'update' : 'create'} category`);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isEditing ? 'Edit Category' : 'New Category'}
          </h1>
          <p className="text-muted-foreground">
            {isEditing ? 'Update category information' : 'Create a new blog category'}
          </p>
        </div>
        <Link href="/dashboard/blogs/categories">
          <Button variant="outline">Back to Categories</Button>
        </Link>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/15 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Category Details</CardTitle>
            <CardDescription>
              Category name and URL slug
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Category Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g., Technology, News, Tutorials"
                required
                disabled={isPending}
              />
              <p className="text-xs text-muted-foreground">
                The display name for this category
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData((prev) => ({ ...prev, slug: generateSlug(e.target.value) }))}
                placeholder="category-slug (auto-generated if empty)"
                disabled={isPending}
              />
              <p className="text-xs text-muted-foreground">
                URL-friendly version of the name (auto-generated from name if left empty)
              </p>
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={isPending || !formData.name.trim()}>
                {isPending
                  ? (isEditing ? 'Updating category...' : 'Creating category...')
                  : (isEditing ? 'Update Category' : 'Create Category')}
              </Button>
              <Link href="/dashboard/blogs/categories">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

