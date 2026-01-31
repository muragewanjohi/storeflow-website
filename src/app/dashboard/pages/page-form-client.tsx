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
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
// Lazy load rich text editor for better performance
import RichTextEditor from '@/components/content/rich-text-editor-lazy';
import ImageUploadField from '@/components/content/image-upload-field';
import PageBuilder from '@/components/content/page-builder/page-builder';
import SEOPreview from '@/components/content/seo-preview';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import { ChevronDown, ChevronUp } from 'lucide-react';

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
  
  // Detect if first section is hero to determine default use_banner value
  const detectUseBanner = (content: string | null | undefined, currentBanner: string | null | undefined): boolean => {
    if (!content || content.trim() === '') {
      // If no content, use banner if it exists
      return !!currentBanner;
    }
    try {
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === 'object' && Array.isArray(parsed.sections) && parsed.sections.length > 0) {
        const firstSection = parsed.sections.sort((a: any, b: any) => a.order - b.order)[0];
        // If first section is hero, don't use banner
        return firstSection?.type !== 'hero';
      }
    } catch {
      // Not JSON, assume rich text - use banner if it exists
      return !!currentBanner;
    }
    return !!currentBanner;
  };

  const [formData, setFormData] = useState({
    title: page?.title || '',
    slug: page?.slug || '',
    content: page?.content || '',
    banner_image: page?.banner_image || '',
    meta_title: page?.meta_title || '',
    meta_description: page?.meta_description || '',
    meta_tags: page?.meta_tags || '',
    status: page?.status || ('draft' as 'draft' | 'published' | 'archived'),
    use_banner: detectUseBanner(page?.content || '', page?.banner_image || ''),
  });

  // SEO sections collapsible state (initially closed)
  const [seoSettingsOpen, setSeoSettingsOpen] = useState(false);
  const [seoPreviewOpen, setSeoPreviewOpen] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [contentMode, setContentMode] = useState<'rich-text' | 'page-builder'>(() =>
    detectContentMode(page?.content)
  );
  
  // Update use_banner when content changes
  const handleContentChange = (newContent: string) => {
    setFormData((prev) => {
      const newUseBanner = detectUseBanner(newContent, prev.banner_image);
      return { ...prev, content: newContent, use_banner: newUseBanner };
    });
  };

  // Extracted save logic so it can be called from PageBuilder save button too.
  // saveAsDraft: if true, saves with status 'draft'; if false, saves with status 'published'.
  const performSave = async (saveAsDraft: boolean) => {
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
      const statusToSave = saveAsDraft ? 'draft' : 'published';

      // Helper function to check if URL is a blob URL
      const isBlobUrl = (url: string | null | undefined): boolean => {
        return !!url && url.startsWith('blob:');
      };

      // Helper function to extract blob URLs from page builder content
      const extractBlobUrlsFromContent = (content: string): string[] => {
        const blobUrls: string[] = [];
        try {
          const parsed = JSON.parse(content);
          if (parsed && parsed.sections && Array.isArray(parsed.sections)) {
            parsed.sections.forEach((section: any) => {
              // Check hero section image
              if (section.type === 'hero' && section.image && isBlobUrl(section.image)) {
                blobUrls.push(section.image);
              }
              // Check image section
              if (section.type === 'image' && section.image && isBlobUrl(section.image)) {
                blobUrls.push(section.image);
              }
              // Check features section images
              if (section.type === 'features' && section.features) {
                section.features.forEach((feature: any) => {
                  if (feature.image && isBlobUrl(feature.image)) {
                    blobUrls.push(feature.image);
                  }
                });
              }
              // Check testimonials section images
              if (section.type === 'testimonials' && section.testimonials) {
                section.testimonials.forEach((testimonial: any) => {
                  if (testimonial.image && isBlobUrl(testimonial.image)) {
                    blobUrls.push(testimonial.image);
                  }
                });
              }
            });
          }
        } catch {
          // Not JSON, ignore
        }
        return blobUrls;
      };

      // Check for blob URLs in content and warn user
      if (formData.content) {
        const blobUrls = extractBlobUrlsFromContent(formData.content);
        if (blobUrls.length > 0) {
          console.warn('Found blob URLs in page content. These will not work on the homepage:', blobUrls);
          setError('Please re-upload images in the page builder. Some images are using temporary URLs that will not work on the homepage.');
          setIsSubmitting(false);
          return;
        }
      }

      // Check banner_image for blob URL
      if (formData.banner_image && isBlobUrl(formData.banner_image)) {
        setError('Please re-upload the banner image. The current image is using a temporary URL that will not work.');
        setIsSubmitting(false);
        return;
      }

      // Prepare data, ensuring all fields are properly formatted
      const submitData: any = {
        title: formData.title.trim(),
        status: statusToSave,
      };

      // Only include optional fields if they have values
      if (formData.slug && formData.slug.trim()) {
        submitData.slug = formData.slug.trim();
      }
      if (formData.content) {
        submitData.content = formData.content;
      }
      // Only include banner_image if use_banner is true
      if (formData.use_banner && formData.banner_image) {
        submitData.banner_image = formData.banner_image;
      } else if (!formData.use_banner) {
        // Clear banner_image if not using banner
        submitData.banner_image = null;
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

  const handleSubmitDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    await performSave(true);
  };

  const handleSubmitPublish = async (e: React.FormEvent) => {
    e.preventDefault();
    await performSave(false);
  };

  // Handler for PageBuilder save button (saves as draft by default so edits don't go live accidentally)
  const handlePageBuilderSave = () => {
    performSave(true);
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

      <form className={isSubmitting ? 'pointer-events-none opacity-50' : ''}>
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

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Header Image Type</Label>
                  <RadioGroup
                    value={formData.use_banner ? 'banner' : 'hero'}
                    onValueChange={(value) => {
                      setFormData((prev) => ({ 
                        ...prev, 
                        use_banner: value === 'banner',
                        // Clear banner_image if switching to hero, or clear hero section if switching to banner
                        banner_image: value === 'banner' ? prev.banner_image : '',
                      }));
                    }}
                    className="flex gap-6"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="banner" id="banner" />
                      <Label htmlFor="banner" className="font-normal cursor-pointer">
                        Use Banner Image
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="hero" id="hero" />
                      <Label htmlFor="hero" className="font-normal cursor-pointer">
                        Use Hero Section (in Page Builder)
                      </Label>
                    </div>
                  </RadioGroup>
                  <p className="text-xs text-muted-foreground">
                    Choose whether to use a simple banner image or a Hero Section from the Page Builder
                  </p>
                </div>

                {formData.use_banner && (
                  <>
                    <ImageUploadField
                      label="Banner Image"
                      value={formData.banner_image || null}
                      onChange={(url) => setFormData((prev) => ({ ...prev, banner_image: url || '' }))}
                      aspectRatio={16 / 9}
                      helpText="Upload a banner image for this page (max 5MB)"
                    />
                    
                    {/* Guidance on when to use Banner Image */}
                    <Alert className="mt-2">
                      <InformationCircleIcon className="h-4 w-4" />
                      <AlertTitle className="text-sm font-semibold">When to Use Banner Image</AlertTitle>
                      <AlertDescription className="text-xs mt-1">
                        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                          <li>Simple pages (About, Contact, Terms) - Just need a header image</li>
                          <li>Rich Text pages - When using the rich text editor (not page builder)</li>
                          <li>Quick setup - Fast way to add a header image without building sections</li>
                        </ul>
                      </AlertDescription>
                    </Alert>
                  </>
                )}

                {!formData.use_banner && (
                  <Alert className="mt-2">
                    <InformationCircleIcon className="h-4 w-4" />
                    <AlertTitle className="text-sm font-semibold">Using Hero Section</AlertTitle>
                    <AlertDescription className="text-xs mt-1">
                      <p className="text-muted-foreground">
                        When using Page Builder, add a Hero Section as the first section to display a header image with title, subtitle, and CTA buttons. The banner image will be hidden when a Hero Section is used.
                      </p>
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Content</Label>
                <Tabs value={contentMode} onValueChange={(value) => setContentMode(value as 'rich-text' | 'page-builder')}>
                  <TabsList className="mb-4 bg-muted/50 border border-border">
                    <TabsTrigger 
                      value="rich-text"
                      className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground/70 hover:text-foreground"
                    >
                      Rich Text Editor
                    </TabsTrigger>
                    <TabsTrigger 
                      value="page-builder"
                      className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground/70 hover:text-foreground"
                    >
                      Page Builder
                    </TabsTrigger>
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
                      onChange={handleContentChange}
                      pageSlug={(formData.slug || page?.slug) || undefined}
                      pageId={page?.id}
                      pageStatus={formData.status}
                      onSave={handlePageBuilderSave}
                      isSaving={isSubmitting}
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Build your page using pre-designed sections. Content is stored as JSON.
                    </p>
                  </TabsContent>
                </Tabs>
              </div>

              <div className="rounded-lg border border-muted bg-muted/30 p-3 text-sm text-muted-foreground">
                <strong className="text-foreground">Status:</strong>{' '}
                {formData.status === 'published'
                  ? 'Published — visible on your storefront'
                  : formData.status === 'archived'
                    ? 'Archived — hidden from storefront'
                    : 'Draft — not visible to customers. Use Preview to see how it will look.'}
              </div>
            </CardContent>
          </Card>

          {/* SEO Settings */}
          <Card>
            <CardHeader>
              <button
                type="button"
                onClick={() => setSeoSettingsOpen(!seoSettingsOpen)}
                className="flex items-center justify-between w-full text-left"
              >
                <div>
                  <CardTitle>SEO Settings</CardTitle>
                  <CardDescription>
                    Meta tags for search engine optimization
                  </CardDescription>
                </div>
                {seoSettingsOpen ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </button>
            </CardHeader>
            {seoSettingsOpen && (
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
            )}
          </Card>

          {/* SEO Preview */}
          <Card>
            <CardHeader>
              <button
                type="button"
                onClick={() => setSeoPreviewOpen(!seoPreviewOpen)}
                className="flex items-center justify-between w-full text-left"
              >
                <div>
                  <CardTitle>SEO Preview</CardTitle>
                  <CardDescription>
                    How your page will appear in search engine results
                  </CardDescription>
                </div>
                {seoPreviewOpen ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </button>
            </CardHeader>
            {seoPreviewOpen && (
              <CardContent>
                <SEOPreview
                  title={formData.meta_title || formData.title}
                  description={formData.meta_description}
                  slug={formData.slug}
                  baseUrl={baseUrl || 'https://example.com'}
                />
              </CardContent>
            )}
          </Card>

          {/* Form Actions - Draft/Publish (best practice: explicit actions, preview before publish) */}
          <Card>
            <CardFooter className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                {isEditing && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <a
                      href={`/dashboard/pages/${page.id}/preview`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Preview
                    </a>
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/dashboard/pages')}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={handleSubmitDraft}
                >
                  {isSubmitting ? 'Saving...' : isEditing ? 'Save as draft' : 'Save draft'}
                </Button>
                <Button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSubmitPublish}
                >
                  {isSubmitting ? 'Saving...' : isEditing ? 'Publish' : 'Create & Publish'}
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      </form>

    </div>
  );
}

