/**
 * Blog Form Client Component
 * 
 * Form for creating or editing a blog post
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
// Lazy load rich text editor for better performance
import RichTextEditor from '@/components/content/rich-text-editor-lazy';
import ImageUploadField from '@/components/content/image-upload-field';

interface Blog {
  id: string;
  title: string;
  slug: string | null;
  content?: string | null;
  excerpt?: string | null;
  category_id?: string | null;
  image?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  meta_tags?: string | null;
  status: 'draft' | 'published' | 'archived';
}

interface Category {
  id: string;
  name: string;
  slug: string | null;
}

interface BlogFormClientProps {
  blog?: Blog;
  categories: Category[];
}

export default function BlogFormClient({ blog, categories }: Readonly<BlogFormClientProps>) {
  const router = useRouter();
  const isEditing = !!blog;

  const [formData, setFormData] = useState({
    title: blog?.title || '',
    slug: blog?.slug || '',
    content: blog?.content || '',
    excerpt: blog?.excerpt || '',
    category_id: blog?.category_id || '',
    image: blog?.image || '',
    meta_title: blog?.meta_title || '',
    meta_description: blog?.meta_description || '',
    meta_tags: blog?.meta_tags || '',
    status: blog?.status || ('draft' as 'draft' | 'published' | 'archived'),
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Validate required fields
      if (!formData.title || formData.title.trim() === '') {
        setError('Title is required');
        setIsSubmitting(false);
        return;
      }

      const url = isEditing ? `/api/blogs/${blog.id}` : '/api/blogs';
      const method = isEditing ? 'PUT' : 'POST';

      // Prepare data, ensuring all fields are properly formatted
      const submitData: any = {
        title: formData.title.trim(),
        status: formData.status,
      };

      // Only include optional fields if they have values
      if (formData.slug && formData.slug.trim()) {
        submitData.slug = formData.slug.trim();
      }
      if (formData.content) {
        submitData.content = formData.content;
      }
      if (formData.excerpt && formData.excerpt.trim()) {
        submitData.excerpt = formData.excerpt.trim();
      }
      // Only include category_id if it has a value (not empty string)
      if (formData.category_id && formData.category_id.trim() !== '') {
        submitData.category_id = formData.category_id;
      } else {
        // Explicitly set to null if empty to clear category
        submitData.category_id = null;
      }
      if (formData.image) {
        submitData.image = formData.image;
      }
      if (formData.meta_title && formData.meta_title.trim()) {
        submitData.meta_title = formData.meta_title.trim();
      }
      if (formData.meta_description && formData.meta_description.trim()) {
        submitData.meta_description = formData.meta_description.trim();
      }
      if (formData.meta_tags && formData.meta_tags.trim()) {
        submitData.meta_tags = formData.meta_tags.trim();
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${isEditing ? 'update' : 'create'} blog post`);
      }

      // Force a hard refresh by redirecting with cache busting and refreshing router
      const refreshUrl = `/dashboard/blogs?refresh=${Date.now()}`;
      router.push(refreshUrl);
      // Use setTimeout to ensure router.push completes before refresh
      setTimeout(() => {
        router.refresh();
      }, 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${isEditing ? 'update' : 'create'} blog post`);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative">
      {/* Loader Overlay */}
      {isSubmitting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <p className="text-sm font-medium text-muted-foreground">
              {isEditing ? 'Updating blog post...' : 'Creating blog post...'}
            </p>
          </div>
        </div>
      )}
      
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/blogs">
            <ArrowLeftIcon className="mr-2 h-4 w-4" />
            Back to Blogs
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isEditing ? 'Edit Blog Post' : 'Create Blog Post'}
          </h1>
          <p className="text-muted-foreground mt-2">
            {isEditing ? 'Update blog post information' : 'Add a new blog post'}
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive mb-2">{error}</p>
          {error.includes('No active subscription plan') && (
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/subscription">
                Activate Subscription Plan
              </Link>
            </Button>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className={isSubmitting ? 'pointer-events-none opacity-50' : ''}>
        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Blog post title, content, and category
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  required
                  placeholder="Blog post title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={formData.slug || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                  placeholder="blog-post-slug (auto-generated if empty)"
                />
                <p className="text-xs text-muted-foreground">
                  URL-friendly version of the title. Leave empty to auto-generate.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category_id || undefined}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, category_id: value || '' }))}
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Uncategorized" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.length > 0 ? (
                      categories.map((category: any) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        No categories available
                      </div>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Leave unselected for uncategorized
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="excerpt">Excerpt</Label>
                <Textarea
                  id="excerpt"
                  value={formData.excerpt || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, excerpt: e.target.value }))}
                  placeholder="Short description of the blog post"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  A brief summary of the blog post (optional)
                </p>
              </div>

              <ImageUploadField
                label="Featured Image"
                value={formData.image || null}
                onChange={(url) => setFormData((prev) => ({ ...prev, image: url || '' }))}
                aspectRatio={16 / 9}
                helpText="Upload a featured image for this blog post (max 5MB)"
              />

              <div className="space-y-2">
                <Label htmlFor="content">Content</Label>
                <RichTextEditor
                  content={formData.content || ''}
                  onChange={(content) => setFormData((prev) => ({ ...prev, content }))}
                  placeholder="Write your blog post content here..."
                />
              </div>
            </CardContent>
          </Card>

          {/* SEO Settings */}
          <Card>
            <CardHeader>
              <CardTitle>SEO Settings</CardTitle>
              <CardDescription>
                Meta information for search engines
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="meta_title">Meta Title</Label>
                <Input
                  id="meta_title"
                  value={formData.meta_title || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, meta_title: e.target.value }))}
                  placeholder="SEO title (defaults to blog title if empty)"
                  maxLength={255}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="meta_description">Meta Description</Label>
                <Textarea
                  id="meta_description"
                  value={formData.meta_description || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, meta_description: e.target.value }))}
                  placeholder="SEO description"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="meta_tags">Meta Tags</Label>
                <Input
                  id="meta_tags"
                  value={formData.meta_tags || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, meta_tags: e.target.value }))}
                  placeholder="Comma-separated tags"
                />
                <p className="text-xs text-muted-foreground">
                  Separate tags with commas (e.g., &quot;tag1, tag2, tag3&quot;)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Status */}
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
              <CardDescription>
                Set the publication status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: 'draft' | 'published' | 'archived') =>
                    setFormData((prev) => ({ ...prev, status: value }))
                  }
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardFooter className="flex justify-end gap-4">
              <Button variant="outline" type="button" asChild>
                <Link href="/dashboard/blogs">Cancel</Link>
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isEditing ? 'Update Blog Post' : 'Create Blog Post'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </form>

    </div>
  );
}

