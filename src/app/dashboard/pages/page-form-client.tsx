/**
 * Page Form Client Component
 * 
 * Form for creating or editing a page
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
import RichTextEditor from '@/components/content/rich-text-editor';
import ImageUploadField from '@/components/content/image-upload-field';
import PageBuilder from '@/components/content/page-builder/page-builder';
import SEOPreview from '@/components/content/seo-preview';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Page {
  id: string;
  title: string;
  slug: string | null;
  content?: string | null;
  banner_image?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  meta_tags?: string | null;
  status: 'draft' | 'published' | 'archived' | string | null;
}

interface PageFormClientProps {
  page?: Page;
  baseUrl?: string;
}

export default function PageFormClient({ page, baseUrl }: Readonly<PageFormClientProps>) {
  const router = useRouter();
  const isEditing = !!page;

  const [formData, setFormData] = useState({
    title: page?.title || '',
    slug: page?.slug || '',
    content: page?.content || '',
    banner_image: page?.banner_image || '',
    meta_title: page?.meta_title || '',
    meta_description: page?.meta_description || '',
    meta_tags: page?.meta_tags || '',
    status: page?.status || ('draft' as 'draft' | 'published' | 'archived'),
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Detect content mode: if content is valid JSON with sections, use page builder
  const detectContentMode = (content: string | null | undefined): 'rich-text' | 'page-builder' => {
    if (!content || content.trim() === '') return 'rich-text';
    try {
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === 'object' && Array.isArray(parsed.sections)) {
        return 'page-builder';
      }
    } catch {
      // Not JSON, assume rich text
    }
    return 'rich-text';
  };
  
  const [contentMode, setContentMode] = useState<'rich-text' | 'page-builder'>(() =>
    detectContentMode(page?.content)
  );

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

      const url = isEditing ? `/api/pages/${page.id}` : '/api/pages';
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
      if (formData.banner_image) {
        submitData.banner_image = formData.banner_image;
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
        throw new Error(errorData.error || `Failed to ${isEditing ? 'update' : 'create'} page`);
      }

      // Force a hard refresh by redirecting with cache busting and refreshing router
      const refreshUrl = `/dashboard/pages?refresh=${Date.now()}`;
      router.push(refreshUrl);
      // Use setTimeout to ensure router.push completes before refresh
      setTimeout(() => {
        router.refresh();
      }, 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${isEditing ? 'update' : 'create'} page`);
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
              {isEditing ? 'Updating page...' : 'Creating page...'}
            </p>
          </div>
        </div>
      )}
      
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/pages">
            <ArrowLeftIcon className="mr-2 h-4 w-4" />
            Back to Pages
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isEditing ? 'Edit Page' : 'Create Page'}
          </h1>
          <p className="text-muted-foreground mt-2">
            {isEditing ? 'Update page information' : 'Add a new page to your website'}
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
                Page title and content
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  placeholder="Page title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={formData.slug || ''}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="page-slug (auto-generated if empty)"
                />
                <p className="text-xs text-muted-foreground">
                  URL-friendly version of the title. Leave empty to auto-generate.
                </p>
              </div>

              <ImageUploadField
                label="Banner Image"
                value={formData.banner_image || null}
                onChange={(url) => setFormData((prev) => ({ ...prev, banner_image: url || '' }))}
                aspectRatio={16 / 9}
                helpText="Upload a banner image for this page (max 5MB)"
              />

              <div className="space-y-2">
                <Label htmlFor="content">Content</Label>
                <Tabs value={contentMode} onValueChange={(value) => setContentMode(value as 'rich-text' | 'page-builder')}>
                  <TabsList className="mb-4">
                    <TabsTrigger value="rich-text">Rich Text Editor</TabsTrigger>
                    <TabsTrigger value="page-builder">Page Builder</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="rich-text" className="mt-0">
                    <RichTextEditor
                      content={contentMode === 'rich-text' ? (formData.content || '') : ''}
                      onChange={(content) => setFormData((prev) => ({ ...prev, content }))}
                      placeholder="Start writing your page content..."
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Use the toolbar to format text, add images, links, and more
                    </p>
                  </TabsContent>
                  
                  <TabsContent value="page-builder" className="mt-0">
                    <PageBuilder
                      value={contentMode === 'page-builder' ? (formData.content || '') : ''}
                      onChange={(value) => setFormData((prev) => ({ ...prev, content: value }))}
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Build your page using pre-designed sections. Content is stored as JSON.
                    </p>
                  </TabsContent>
                </Tabs>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: 'draft' | 'published' | 'archived') =>
                    setFormData({ ...formData, status: value })
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

          {/* SEO Settings */}
          <Card>
            <CardHeader>
              <CardTitle>SEO Settings</CardTitle>
              <CardDescription>
                Meta tags for search engine optimization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="meta_title">Meta Title</Label>
                <Input
                  id="meta_title"
                  value={formData.meta_title || ''}
                  onChange={(e) => setFormData({ ...formData, meta_title: e.target.value })}
                  placeholder="SEO title (max 60 characters)"
                  maxLength={60}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="meta_description">Meta Description</Label>
                <Textarea
                  id="meta_description"
                  value={formData.meta_description || ''}
                  onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })}
                  rows={3}
                  placeholder="SEO description (max 160 characters)"
                  maxLength={160}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="meta_tags">Meta Tags</Label>
                <Input
                  id="meta_tags"
                  value={formData.meta_tags || ''}
                  onChange={(e) => setFormData({ ...formData, meta_tags: e.target.value })}
                  placeholder="Comma-separated tags"
                />
              </div>
            </CardContent>
          </Card>

          {/* SEO Preview */}
          <SEOPreview
            title={formData.meta_title || formData.title}
            description={formData.meta_description}
            slug={formData.slug}
            baseUrl={baseUrl || 'https://example.com'}
          />

          {/* Form Actions */}
          <Card>
            <CardFooter className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/dashboard/pages')}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isEditing ? 'Update Page' : 'Create Page'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </form>

    </div>
  );
}

