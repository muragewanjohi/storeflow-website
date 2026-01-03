/**
 * Create Blog Form
 * 
 * Client component for creating a new blog post
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import RichTextEditor from '@/components/content/rich-text-editor';
import ImageUploadField from '@/components/content/image-upload-field';
import { MARKETING_TENANT_ID } from '@/lib/content/marketing';
import { generateSlug } from '@/lib/content/validation';

interface Tenant {
  id: string;
  name: string;
  subdomain: string;
}

interface BlogCategory {
  id: string;
  name: string;
  slug: string | null;
}

interface CreateBlogFormProps {
  userTenantId?: string;
  userRole: string;
  tenants: Tenant[];
  blogCategories: BlogCategory[];
}

export default function CreateBlogForm({ 
  userTenantId, 
  userRole, 
  tenants, 
  blogCategories: initialBlogCategories 
}: Readonly<CreateBlogFormProps>) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [blogCategories, setBlogCategories] = useState(initialBlogCategories);

  // Refresh categories when component mounts or when window regains focus
  useEffect(() => {
    async function fetchCategories() {
      try {
        const response = await fetch('/api/admin/blogs/categories');
        if (response.ok) {
          const data = await response.json();
          setBlogCategories(data.categories || []);
        }
      } catch (err) {
        console.error('Error fetching categories:', err);
      }
    }
    
    // Fetch categories on mount
    fetchCategories();
    
    // Refresh when window regains focus (user might have created a category in another tab)
    const handleFocus = () => {
      fetchCategories();
    };
    
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);
  
  // Auto-detect tenant_id: if user has tenant_id, use it; if landlord, automatically use marketing
  const [selectedTenantId] = useState<string | undefined>(
    userRole === 'landlord' ? MARKETING_TENANT_ID : userTenantId
  );
  
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    content: '',
    excerpt: '',
    category_id: undefined as string | undefined,
    image: null as string | null,
    meta_title: '',
    meta_description: '',
    meta_tags: '',
    status: 'draft',
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Determine tenant_id: landlords always use marketing, tenant users use their tenant_id
      const tenantId = userRole === 'landlord' 
        ? MARKETING_TENANT_ID 
        : userTenantId;

      if (!tenantId) {
        setError('Unable to determine tenant. Please try again.');
        setIsSubmitting(false);
        return;
      }

      const response = await fetch('/api/admin/blogs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          tenant_id: tenantId,
          category_id: formData.category_id || undefined,
          image: formData.image || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create blog');
      }

      router.push('/admin/blogs');
      router.refresh();
    } catch (err) {
      console.error('Error creating blog:', err);
      setError(err instanceof Error ? err.message : 'Failed to create blog');
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Blog Details</CardTitle>
          <CardDescription>
            Enter the details for your new blog post
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Show info for landlords - blog type is automatically set to marketing */}
          {userRole === 'landlord' && (
            <div className="space-y-2">
              <Label>Blog Type</Label>
              <div className="p-3 bg-muted rounded-md text-sm">
                <div className="font-medium">Marketing Blog</div>
                <div className="text-muted-foreground mt-1">
                  This blog will appear on the main marketing website
                </div>
              </div>
            </div>
          )}

          {/* Show current tenant for tenant users */}
          {userRole !== 'landlord' && userTenantId && (
            <div className="space-y-2">
              <Label>Tenant</Label>
              <div className="p-3 bg-muted rounded-md text-sm">
                Blog will be created for your tenant
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => {
                const newTitle = e.target.value;
                setFormData({
                  ...formData,
                  title: newTitle,
                  // Only auto-generate slug if it hasn't been manually edited
                  slug: slugManuallyEdited ? formData.slug : generateSlug(newTitle),
                });
              }}
              placeholder="Enter blog title"
              required
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
              placeholder="Auto-generated from title if left empty"
            />
            <p className="text-sm text-muted-foreground">
              URL-friendly version of the title (auto-generated if empty)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="excerpt">Excerpt</Label>
            <Textarea
              id="excerpt"
              value={formData.excerpt}
              onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
              placeholder="Brief description of the blog post"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <RichTextEditor
              content={formData.content}
              onChange={(content) => setFormData({ ...formData, content })}
              placeholder="Start writing your blog post content..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category_id">Category</Label>
            <Select
              value={formData.category_id || undefined}
              onValueChange={(value) => {
                // Ensure we never set empty string - convert to undefined
                const categoryValue = value && value.trim() !== '' ? value : undefined;
                setFormData({ ...formData, category_id: categoryValue });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category (optional)" />
              </SelectTrigger>
              <SelectContent>
                {blogCategories
                  .filter((category) => {
                    return category && 
                           category.id && 
                           typeof category.id === 'string' && 
                           category.id.trim() !== '';
                  })
                  .map((category) => {
                    if (!category.id || category.id.trim() === '') {
                      return null;
                    }
                    return (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name || 'Unnamed Category'}
                      </SelectItem>
                    );
                  })
                  .filter(Boolean)}
              </SelectContent>
            </Select>
          </div>

          <ImageUploadField
            label="Featured Image"
            value={formData.image}
            onChange={(url) => setFormData({ ...formData, image: url })}
            uploadEndpoint="/api/media/upload"
            aspectRatio={16 / 9}
            maxSizeMB={5}
            helpText="Upload a featured image for your blog post (recommended: 1200x675px)"
          />

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status && formData.status.trim() !== '' ? formData.status : 'draft'}
              onValueChange={(value) => {
                // Ensure we never set empty string
                const statusValue = value && value.trim() !== '' ? value : 'draft';
                setFormData({ ...formData, status: statusValue });
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="meta_title">Meta Title</Label>
            <Input
              id="meta_title"
              value={formData.meta_title}
              onChange={(e) => setFormData({ ...formData, meta_title: e.target.value })}
              placeholder="SEO meta title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="meta_description">Meta Description</Label>
            <Textarea
              id="meta_description"
              value={formData.meta_description}
              onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })}
              placeholder="SEO meta description"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="meta_tags">Meta Tags</Label>
            <Input
              id="meta_tags"
              value={formData.meta_tags}
              onChange={(e) => setFormData({ ...formData, meta_tags: e.target.value })}
              placeholder="tag1, tag2, tag3"
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Blog'}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}

