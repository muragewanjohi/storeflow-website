/**
 * Category Form Client Component
 * 
 * Form for creating or editing a category
 */

'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeftIcon, PhotoIcon } from '@heroicons/react/24/outline';

interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id?: string | null;
  image?: string | null;
  status?: string | null;
}

interface CategoryFormClientProps {
  category?: Category;
  parentCategories: Category[];
}

export default function CategoryFormClient({
  category,
  parentCategories,
}: Readonly<CategoryFormClientProps>) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEditing = !!category;

  const [formData, setFormData] = useState({
    name: category?.name || '',
    parent_id: category?.parent_id || 'none',
    status: category?.status || ('active' as 'active' | 'inactive'),
    image: category?.image || '',
  });

  const [imagePreview, setImagePreview] = useState<string | null>(category?.image || null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);

      const response = await fetch('/api/products/upload', {
        method: 'POST',
        body: uploadFormData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to upload image');
      }

      const data = await response.json();
      setFormData((prev) => ({ ...prev, image: data.url }));
      setImagePreview(data.url);
    } catch (err: any) {
      setError(err.message || 'Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const payload: any = {
        name: formData.name.trim(),
        parent_id: formData.parent_id === 'none' || !formData.parent_id ? null : formData.parent_id,
        status: formData.status,
      };

      if (formData.image) {
        payload.image = formData.image;
      }

      const url = isEditing ? `/api/categories/${category.id}` : '/api/categories';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Failed to ${isEditing ? 'update' : 'create'} category`);
      }

      router.push('/dashboard/categories');
    } catch (err: any) {
      setError(err.message || `Failed to ${isEditing ? 'update' : 'create'} category`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/categories">
            <ArrowLeftIcon className="mr-2 h-4 w-4" />
            Back to Categories
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isEditing ? 'Edit Category' : 'Create Category'}
          </h1>
          <p className="text-muted-foreground mt-2">
            {isEditing ? 'Update category information' : 'Add a new product category'}
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Category Information</CardTitle>
                <CardDescription>Basic category details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Category Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter category name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="parent_id">Parent Category</Label>
                  <Select
                    value={formData.parent_id || 'none'}
                    onValueChange={(value) =>
                      setFormData({ ...formData, parent_id: value === 'none' ? 'none' : value })
                    }
                  >
                    <SelectTrigger id="parent_id">
                      <SelectValue placeholder="No parent (top-level)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No parent (top-level)</SelectItem>
                      {parentCategories
                        .filter((cat) => cat.id !== category?.id)
                        .map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <div className="mt-2 rounded-md border border-muted bg-muted/50 p-3 text-sm">
                    <p className="font-medium mb-2">Example Structure:</p>
                    <pre className="text-xs font-mono text-muted-foreground">
{`Electronics (top-level)
  └── Laptops (subcategory)
  └── Phones (subcategory)
      └── Smartphones (sub-subcategory)`}
                    </pre>
                    <p className="text-xs text-muted-foreground mt-2">
                      Select a parent category to create a subcategory. Leave as &quot;No parent&quot; for top-level categories.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: 'active' | 'inactive') =>
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Category Image</CardTitle>
                <CardDescription>Upload a category image</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {imagePreview ? (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Category preview"
                      className="h-64 w-full rounded-lg object-cover"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute right-2 top-2"
                      onClick={() => {
                        setImagePreview(null);
                        setFormData({ ...formData, image: '' });
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div
                    className="flex h-64 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <PhotoIcon className="h-12 w-12 text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      Click to upload image
                    </p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  disabled={isUploading}
                />
                {isUploading && (
                  <p className="text-sm text-muted-foreground">Uploading...</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-4">
          <Button type="button" variant="outline" asChild>
            <Link href="/dashboard/categories">Cancel</Link>
          </Button>
          <Button type="submit" disabled={isSubmitting || isUploading}>
            {isSubmitting
              ? isEditing
                ? 'Updating...'
                : 'Creating...'
              : isEditing
                ? 'Update Category'
                : 'Create Category'}
          </Button>
        </div>
      </form>
    </div>
  );
}

