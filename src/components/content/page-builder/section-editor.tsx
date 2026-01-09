/**
 * Section Editor Component
 * 
 * Form for editing section properties
 * 
 * Day 28: Content Management - Simple Page Builder
 */

'use client';

import { PageSection } from '@/lib/content/page-builder-types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
// Lazy load rich text editor for better performance
import RichTextEditor from '@/components/content/rich-text-editor-lazy';
import ImageUploadField from '@/components/content/image-upload-field';

interface SectionEditorProps {
  section: PageSection;
  onUpdate: (updates: Partial<PageSection>) => void;
}

export function SectionEditor({ section, onUpdate }: Readonly<SectionEditorProps>) {
  switch (section.type) {
    case 'hero':
      return <HeroSectionEditor section={section} onUpdate={onUpdate} />;
    case 'features':
      return <FeaturesSectionEditor section={section} onUpdate={onUpdate} />;
    case 'products':
      return <ProductsSectionEditor section={section} onUpdate={onUpdate} />;
    case 'testimonials':
      return <TestimonialsSectionEditor section={section} onUpdate={onUpdate} />;
    case 'text':
      return <TextSectionEditor section={section} onUpdate={onUpdate} />;
    case 'image':
      return <ImageSectionEditor section={section} onUpdate={onUpdate} />;
    case 'categories':
      return <CategoriesSectionEditor section={section} onUpdate={onUpdate} />;
    case 'banners':
      return <BannersSectionEditor section={section} onUpdate={onUpdate} />;
    case 'flash_sale':
      return <FlashSaleSectionEditor section={section} onUpdate={onUpdate} />;
    case 'split_layout':
      return <SplitLayoutSectionEditor section={section} onUpdate={onUpdate} />;
    case 'cta':
      return <CTASectionEditor section={section} onUpdate={onUpdate} />;
    case 'product_tabs':
      return <ProductTabsSectionEditor section={section} onUpdate={onUpdate} />;
    default:
      return null;
  }
}

function HeroSectionEditor({
  section,
  onUpdate,
}: {
  section: Extract<PageSection, { type: 'hero' }>;
  onUpdate: (updates: Partial<PageSection>) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Hero Section</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Title *</Label>
          <Input
            value={section.title || ''}
            onChange={(e) => onUpdate({ title: e.target.value })}
            placeholder="Hero title"
          />
        </div>
        <div className="space-y-2">
          <Label>Subtitle</Label>
          <Input
            value={section.subtitle || ''}
            onChange={(e) => onUpdate({ subtitle: e.target.value })}
            placeholder="Hero subtitle"
          />
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea
            value={section.description || ''}
            onChange={(e) => onUpdate({ description: e.target.value })}
            placeholder="Hero description"
            rows={3}
          />
        </div>
        <div className="space-y-2">
          <Label>Hero Image</Label>
          <ImageUploadField
            label="hero image"
            value={section.image || ''}
            onChange={(url) => onUpdate({ image: url || undefined })}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>CTA Text</Label>
            <Input
              value={section.cta_text || ''}
              onChange={(e) => onUpdate({ cta_text: e.target.value })}
              placeholder="Button text"
            />
          </div>
          <div className="space-y-2">
            <Label>CTA Link</Label>
            <Input
              value={section.cta_link || ''}
              onChange={(e) => onUpdate({ cta_link: e.target.value })}
              placeholder="/products"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Background Color</Label>
          <Input
            type="color"
            value={section.background_color || '#ffffff'}
            onChange={(e) => onUpdate({ background_color: e.target.value })}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function FeaturesSectionEditor({
  section,
  onUpdate,
}: {
  section: Extract<PageSection, { type: 'features' }>;
  onUpdate: (updates: Partial<PageSection>) => void;
}) {
  const updateFeature = (featureId: string, updates: Partial<typeof section.features[0]>) => {
    const newFeatures = section.features.map((f: any) =>
      f.id === featureId ? { ...f, ...updates } : f
    );
    onUpdate({ features: newFeatures });
  };

  const addFeature = () => {
    const newFeature = {
      id: `feature-${Date.now()}-${Math.random().toString(36).substring(2)}`,
      title: 'New Feature',
      description: '',
    };
    onUpdate({ features: [...section.features, newFeature] });
  };

  const removeFeature = (featureId: string) => {
    onUpdate({ features: section.features.filter((f: any) => f.id !== featureId) });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Features Section</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Title</Label>
          <Input
            value={section.title || ''}
            onChange={(e) => onUpdate({ title: e.target.value })}
            placeholder="Section title"
          />
        </div>
        <div className="space-y-2">
          <Label>Subtitle</Label>
          <Input
            value={section.subtitle || ''}
            onChange={(e) => onUpdate({ subtitle: e.target.value })}
            placeholder="Section subtitle"
          />
        </div>
        <div className="space-y-2">
          <Label>Columns</Label>
          <Select
            value={String(section.columns || 3)}
            onValueChange={(value) => onUpdate({ columns: Number(value) as 2 | 3 | 4 })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2">2 Columns</SelectItem>
              <SelectItem value="3">3 Columns</SelectItem>
              <SelectItem value="4">4 Columns</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Features</Label>
            <Button type="button" variant="outline" size="sm" onClick={addFeature}>
              <PlusIcon className="mr-2 h-4 w-4" />
              Add Feature
            </Button>
          </div>
          {section.features.map((feature: any, index: any) => (
            <Card key={feature.id}>
              <CardHeader>
                <CardTitle className="text-sm">Feature {index + 1}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input
                    value={feature.title}
                    onChange={(e) => updateFeature(feature.id, { title: e.target.value })}
                    placeholder="Feature title"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={feature.description || ''}
                    onChange={(e) => updateFeature(feature.id, { description: e.target.value })}
                    placeholder="Feature description"
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Icon (Emoji)</Label>
                  <Input
                    value={feature.icon || ''}
                    onChange={(e) => updateFeature(feature.id, { icon: e.target.value })}
                    placeholder="✨"
                    maxLength={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Image</Label>
                  <ImageUploadField
                    label="feature image"
                    value={feature.image || ''}
                    onChange={(url) => updateFeature(feature.id, { image: url || undefined })}
                  />
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => removeFeature(feature.id)}
                >
                  <TrashIcon className="mr-2 h-4 w-4" />
                  Remove Feature
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ProductsSectionEditor({
  section,
  onUpdate,
}: {
  section: Extract<PageSection, { type: 'products' }>;
  onUpdate: (updates: Partial<PageSection>) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Products Section</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Title</Label>
          <Input
            value={section.title || ''}
            onChange={(e) => onUpdate({ title: e.target.value })}
            placeholder="Section title"
          />
        </div>
        <div className="space-y-2">
          <Label>Subtitle</Label>
          <Input
            value={section.subtitle || ''}
            onChange={(e) => onUpdate({ subtitle: e.target.value })}
            placeholder="Section subtitle"
          />
        </div>
        <div className="space-y-2">
          <Label>Columns</Label>
          <Select
            value={String(section.columns || 4)}
            onValueChange={(value) => onUpdate({ columns: Number(value) as 2 | 3 | 4 })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2">2 Columns</SelectItem>
              <SelectItem value="3">3 Columns</SelectItem>
              <SelectItem value="4">4 Columns</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Limit</Label>
          <Input
            type="number"
            value={section.limit || 8}
            onChange={(e) => onUpdate({ limit: parseInt(e.target.value) || 8 })}
            min={1}
            max={20}
          />
          <p className="text-xs text-muted-foreground">
            Number of products to display
          </p>
        </div>
        <div className="space-y-2">
          <Label>Category ID (Optional)</Label>
          <Input
            value={section.category_id || ''}
            onChange={(e) => onUpdate({ category_id: e.target.value || undefined })}
            placeholder="Filter by category"
          />
          <p className="text-xs text-muted-foreground">
            Leave empty to show all products
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function TestimonialsSectionEditor({
  section,
  onUpdate,
}: {
  section: Extract<PageSection, { type: 'testimonials' }>;
  onUpdate: (updates: Partial<PageSection>) => void;
}) {
  const updateTestimonial = (
    testimonialId: string,
    updates: Partial<typeof section.testimonials[0]>
  ) => {
    const newTestimonials = section.testimonials.map((t: any) =>
      t.id === testimonialId ? { ...t, ...updates } : t
    );
    onUpdate({ testimonials: newTestimonials });
  };

  const addTestimonial = () => {
    const newTestimonial = {
      id: `testimonial-${Date.now()}-${Math.random().toString(36).substring(2)}`,
      name: 'Customer Name',
      content: 'Great product!',
      rating: 5,
    };
    onUpdate({ testimonials: [...section.testimonials, newTestimonial] });
  };

  const removeTestimonial = (testimonialId: string) => {
    onUpdate({ testimonials: section.testimonials.filter((t: any) => t.id !== testimonialId) });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Testimonials Section</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Title</Label>
          <Input
            value={section.title || ''}
            onChange={(e) => onUpdate({ title: e.target.value })}
            placeholder="Section title"
          />
        </div>
        <div className="space-y-2">
          <Label>Subtitle</Label>
          <Input
            value={section.subtitle || ''}
            onChange={(e) => onUpdate({ subtitle: e.target.value })}
            placeholder="Section subtitle"
          />
        </div>
        <div className="space-y-2">
          <Label>Columns</Label>
          <Select
            value={String(section.columns || 3)}
            onValueChange={(value) => onUpdate({ columns: Number(value) as 1 | 2 | 3 })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 Column</SelectItem>
              <SelectItem value="2">2 Columns</SelectItem>
              <SelectItem value="3">3 Columns</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Testimonials</Label>
            <Button type="button" variant="outline" size="sm" onClick={addTestimonial}>
              <PlusIcon className="mr-2 h-4 w-4" />
              Add Testimonial
            </Button>
          </div>
          {section.testimonials.map((testimonial: any, index: any) => (
            <Card key={testimonial.id}>
              <CardHeader>
                <CardTitle className="text-sm">Testimonial {index + 1}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input
                    value={testimonial.name}
                    onChange={(e) => updateTestimonial(testimonial.id, { name: e.target.value })}
                    placeholder="Customer name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Content *</Label>
                  <Textarea
                    value={testimonial.content}
                    onChange={(e) => updateTestimonial(testimonial.id, { content: e.target.value })}
                    placeholder="Testimonial content"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Input
                      value={testimonial.role || ''}
                      onChange={(e) => updateTestimonial(testimonial.id, { role: e.target.value })}
                      placeholder="CEO"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Company</Label>
                    <Input
                      value={testimonial.company || ''}
                      onChange={(e) => updateTestimonial(testimonial.id, { company: e.target.value })}
                      placeholder="Company Name"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Rating (1-5)</Label>
                  <Input
                    type="number"
                    value={testimonial.rating || 5}
                    onChange={(e) =>
                      updateTestimonial(testimonial.id, {
                        rating: Math.min(5, Math.max(1, parseInt(e.target.value) || 5)),
                      })
                    }
                    min={1}
                    max={5}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Image</Label>
                  <ImageUploadField
                    label="testimonial image"
                    value={testimonial.image || ''}
                    onChange={(url) => updateTestimonial(testimonial.id, { image: url || undefined })}
                  />
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => removeTestimonial(testimonial.id)}
                >
                  <TrashIcon className="mr-2 h-4 w-4" />
                  Remove Testimonial
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function TextSectionEditor({
  section,
  onUpdate,
}: {
  section: Extract<PageSection, { type: 'text' }>;
  onUpdate: (updates: Partial<PageSection>) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Text Section</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Content</Label>
          <RichTextEditor
            content={section.content || ''}
            onChange={(html) => onUpdate({ content: html })}
          />
        </div>
        <div className="space-y-2">
          <Label>Background Color</Label>
          <Input
            type="color"
            value={section.background_color || '#ffffff'}
            onChange={(e) => onUpdate({ background_color: e.target.value })}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function ImageSectionEditor({
  section,
  onUpdate,
}: {
  section: Extract<PageSection, { type: 'image' }>;
  onUpdate: (updates: Partial<PageSection>) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Image Section</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Image *</Label>
          <ImageUploadField
            label="image"
            value={section.image}
            onChange={(url) => onUpdate({ image: url || '' })}
          />
        </div>
        <div className="space-y-2">
          <Label>Alt Text</Label>
          <Input
            value={section.alt_text || ''}
            onChange={(e) => onUpdate({ alt_text: e.target.value })}
            placeholder="Image alt text"
          />
        </div>
        <div className="space-y-2">
          <Label>Caption</Label>
          <Input
            value={section.caption || ''}
            onChange={(e) => onUpdate({ caption: e.target.value })}
            placeholder="Image caption"
          />
        </div>
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="full-width"
            checked={section.full_width || false}
            onChange={(e) => onUpdate({ full_width: e.target.checked })}
            className="rounded border-gray-300"
          />
          <Label htmlFor="full-width" className="cursor-pointer">
            Full Width
          </Label>
        </div>
      </CardContent>
    </Card>
  );
}

function CategoriesSectionEditor({
  section,
  onUpdate,
}: {
  section: Extract<PageSection, { type: 'categories' }>;
  onUpdate: (updates: Partial<PageSection>) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Categories Section</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Title</Label>
          <Input
            value={section.title || ''}
            onChange={(e) => onUpdate({ title: e.target.value })}
            placeholder="Browse By Categories"
          />
        </div>
        <div className="space-y-2">
          <Label>Subtitle</Label>
          <Input
            value={section.subtitle || ''}
            onChange={(e) => onUpdate({ subtitle: e.target.value })}
            placeholder="Section subtitle"
          />
        </div>
        <div className="space-y-2">
          <Label>Limit</Label>
          <Input
            type="number"
            value={section.limit || 8}
            onChange={(e) => onUpdate({ limit: parseInt(e.target.value) || 8 })}
            min={1}
            max={20}
          />
        </div>
        <div className="space-y-2">
          <Label>Columns</Label>
          <Select
            value={String(section.columns || 8)}
            onValueChange={(value) => onUpdate({ columns: Number(value) as 2 | 4 | 6 | 8 })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2">2 Columns</SelectItem>
              <SelectItem value="4">4 Columns</SelectItem>
              <SelectItem value="6">6 Columns</SelectItem>
              <SelectItem value="8">8 Columns</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="show-count"
            checked={section.show_count || false}
            onChange={(e) => onUpdate({ show_count: e.target.checked })}
            className="rounded border-gray-300"
          />
          <Label htmlFor="show-count" className="cursor-pointer">
            Show Item Count
          </Label>
        </div>
      </CardContent>
    </Card>
  );
}

function BannersSectionEditor({
  section,
  onUpdate,
}: {
  section: Extract<PageSection, { type: 'banners' }>;
  onUpdate: (updates: Partial<PageSection>) => void;
}) {
  const updateBanner = (bannerId: string, updates: Partial<typeof section.banners[0]>) => {
    const newBanners = section.banners.map((b: any) =>
      b.id === bannerId ? { ...b, ...updates } : b
    );
    onUpdate({ banners: newBanners });
  };

  const addBanner = () => {
    const newBanner = {
      id: `banner-${Date.now()}-${Math.random().toString(36).substring(2)}`,
      title: 'Banner Title',
      image: '',
      cta_text: 'Buy Now',
      cta_link: '/products',
    };
    onUpdate({ banners: [...section.banners, newBanner] });
  };

  const removeBanner = (bannerId: string) => {
    onUpdate({ banners: section.banners.filter((b: any) => b.id !== bannerId) });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Banners Section</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Columns</Label>
          <Select
            value={String(section.columns || 3)}
            onValueChange={(value) => onUpdate({ columns: Number(value) as 1 | 2 | 3 })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 Column</SelectItem>
              <SelectItem value="2">2 Columns</SelectItem>
              <SelectItem value="3">3 Columns</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Banners</Label>
            <Button type="button" variant="outline" size="sm" onClick={addBanner}>
              <PlusIcon className="mr-2 h-4 w-4" />
              Add Banner
            </Button>
          </div>
          {section.banners.map((banner: any, index: any) => (
            <Card key={banner.id}>
              <CardHeader>
                <CardTitle className="text-sm">Banner {index + 1}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input
                    value={banner.title}
                    onChange={(e) => updateBanner(banner.id, { title: e.target.value })}
                    placeholder="Banner title"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Subtitle</Label>
                  <Input
                    value={banner.subtitle || ''}
                    onChange={(e) => updateBanner(banner.id, { subtitle: e.target.value })}
                    placeholder="Banner subtitle"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Image *</Label>
                  <ImageUploadField
                    label="banner image"
                    value={banner.image || ''}
                    onChange={(url) => updateBanner(banner.id, { image: url || '' })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>CTA Text</Label>
                    <Input
                      value={banner.cta_text || ''}
                      onChange={(e) => updateBanner(banner.id, { cta_text: e.target.value })}
                      placeholder="Buy Now"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>CTA Link</Label>
                    <Input
                      value={banner.cta_link || ''}
                      onChange={(e) => updateBanner(banner.id, { cta_link: e.target.value })}
                      placeholder="/products"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Background Color</Label>
                  <Input
                    type="color"
                    value={banner.background_color || '#f3f4f6'}
                    onChange={(e) => updateBanner(banner.id, { background_color: e.target.value })}
                  />
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => removeBanner(banner.id)}
                >
                  <TrashIcon className="mr-2 h-4 w-4" />
                  Remove Banner
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function FlashSaleSectionEditor({
  section,
  onUpdate,
}: {
  section: Extract<PageSection, { type: 'flash_sale' }>;
  onUpdate: (updates: Partial<PageSection>) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Flash Sale Section</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Title</Label>
          <Input
            value={section.title || ''}
            onChange={(e) => onUpdate({ title: e.target.value })}
            placeholder="Super Flash Sale"
          />
        </div>
        <div className="space-y-2">
          <Label>Badge Text</Label>
          <Input
            value={section.badge_text || ''}
            onChange={(e) => onUpdate({ badge_text: e.target.value })}
            placeholder="20% OFF"
          />
        </div>
        <div className="space-y-2">
          <Label>Columns</Label>
          <Select
            value={String(section.columns || 4)}
            onValueChange={(value) => onUpdate({ columns: Number(value) as 2 | 3 | 4 })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2">2 Columns</SelectItem>
              <SelectItem value="3">3 Columns</SelectItem>
              <SelectItem value="4">4 Columns</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Limit</Label>
          <Input
            type="number"
            value={section.limit || 4}
            onChange={(e) => onUpdate({ limit: parseInt(e.target.value) || 4 })}
            min={1}
            max={20}
          />
        </div>
        <div className="space-y-2">
          <Label>Category ID (Optional)</Label>
          <Input
            value={section.category_id || ''}
            onChange={(e) => onUpdate({ category_id: e.target.value || undefined })}
            placeholder="Filter by category"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>CTA Text</Label>
            <Input
              value={section.cta_text || ''}
              onChange={(e) => onUpdate({ cta_text: e.target.value })}
              placeholder="Shop More"
            />
          </div>
          <div className="space-y-2">
            <Label>CTA Link</Label>
            <Input
              value={section.cta_link || ''}
              onChange={(e) => onUpdate({ cta_link: e.target.value })}
              placeholder="/products"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SplitLayoutSectionEditor({
  section,
  onUpdate,
}: {
  section: Extract<PageSection, { type: 'split_layout' }>;
  onUpdate: (updates: Partial<PageSection>) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Split Layout Section</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4 border-b pb-4">
          <h3 className="font-semibold">Left Side (Banner)</h3>
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={section.left_side.title || ''}
              onChange={(e) => onUpdate({
                left_side: { ...section.left_side, title: e.target.value }
              })}
              placeholder="Banner title"
            />
          </div>
          <div className="space-y-2">
            <Label>Image *</Label>
            <ImageUploadField
              label="banner image"
              value={section.left_side.image || ''}
              onChange={(url) => onUpdate({
                left_side: { ...section.left_side, image: url || '' }
              })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>CTA Text</Label>
              <Input
                value={section.left_side.cta_text || ''}
                onChange={(e) => onUpdate({
                  left_side: { ...section.left_side, cta_text: e.target.value }
                })}
                placeholder="Order Now"
              />
            </div>
            <div className="space-y-2">
              <Label>CTA Link</Label>
              <Input
                value={section.left_side.cta_link || ''}
                onChange={(e) => onUpdate({
                  left_side: { ...section.left_side, cta_link: e.target.value }
                })}
                placeholder="/products"
              />
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <h3 className="font-semibold">Right Side (Products)</h3>
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={section.right_side.title || ''}
              onChange={(e) => onUpdate({
                right_side: { ...section.right_side, title: e.target.value }
              })}
              placeholder="Top Rated"
            />
          </div>
          <div className="space-y-2">
            <Label>Limit</Label>
            <Input
              type="number"
              value={section.right_side.limit || 4}
              onChange={(e) => onUpdate({
                right_side: { ...section.right_side, limit: parseInt(e.target.value) || 4 }
              })}
              min={1}
              max={8}
            />
          </div>
          <div className="space-y-2">
            <Label>Category ID (Optional)</Label>
            <Input
              value={section.right_side.category_id || ''}
              onChange={(e) => onUpdate({
                right_side: { ...section.right_side, category_id: e.target.value || undefined }
              })}
              placeholder="Filter by category"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CTASectionEditor({
  section,
  onUpdate,
}: {
  section: Extract<PageSection, { type: 'cta' }>;
  onUpdate: (updates: Partial<PageSection>) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit CTA Section</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Title *</Label>
          <Input
            value={section.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            placeholder="We Make Your Daily Life More Easy"
          />
        </div>
        <div className="space-y-2">
          <Label>Subtitle</Label>
          <Input
            value={section.subtitle || ''}
            onChange={(e) => onUpdate({ subtitle: e.target.value })}
            placeholder="Fresh, Affordable, and Delivered to Your Door!"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>CTA Text *</Label>
            <Input
              value={section.cta_text}
              onChange={(e) => onUpdate({ cta_text: e.target.value })}
              placeholder="Continue Your Shopping"
            />
          </div>
          <div className="space-y-2">
            <Label>CTA Link *</Label>
            <Input
              value={section.cta_link}
              onChange={(e) => onUpdate({ cta_link: e.target.value })}
              placeholder="/products"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Background Color</Label>
          <Input
            type="color"
            value={section.background_color || '#16a34a'}
            onChange={(e) => onUpdate({ background_color: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Background Gradient (CSS gradient)</Label>
          <Input
            value={section.background_gradient || ''}
            onChange={(e) => onUpdate({ background_gradient: e.target.value })}
            placeholder="linear-gradient(to right, #16a34a, #059669)"
          />
          <p className="text-xs text-muted-foreground">
            If provided, gradient will override background color
          </p>
        </div>
        <div className="space-y-2">
          <Label>Text Color</Label>
          <Input
            type="color"
            value={section.text_color || '#ffffff'}
            onChange={(e) => onUpdate({ text_color: e.target.value })}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function ProductTabsSectionEditor({
  section,
  onUpdate,
}: {
  section: Extract<PageSection, { type: 'product_tabs' }>;
  onUpdate: (updates: Partial<PageSection>) => void;
}) {
  const updateTab = (tabId: string, updates: Partial<typeof section.tabs[0]>) => {
    const newTabs = section.tabs.map((t: any) =>
      t.id === tabId ? { ...t, ...updates } : t
    );
    onUpdate({ tabs: newTabs });
  };

  const addTab = () => {
    const newTab = {
      id: `tab-${Date.now()}-${Math.random().toString(36).substring(2)}`,
      label: 'New Tab',
      filter: 'popular' as const,
    };
    onUpdate({ tabs: [...section.tabs, newTab] });
  };

  const removeTab = (tabId: string) => {
    onUpdate({ tabs: section.tabs.filter((t: any) => t.id !== tabId) });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Product Tabs Section</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Title</Label>
          <Input
            value={section.title || ''}
            onChange={(e) => onUpdate({ title: e.target.value })}
            placeholder="Weekly Best Selling Organic Items"
          />
        </div>
        <div className="space-y-2">
          <Label>Columns</Label>
          <Select
            value={String(section.columns || 4)}
            onValueChange={(value) => onUpdate({ columns: Number(value) as 2 | 3 | 4 })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2">2 Columns</SelectItem>
              <SelectItem value="3">3 Columns</SelectItem>
              <SelectItem value="4">4 Columns</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Limit</Label>
          <Input
            type="number"
            value={section.limit || 8}
            onChange={(e) => onUpdate({ limit: parseInt(e.target.value) || 8 })}
            min={1}
            max={20}
          />
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Tabs</Label>
            <Button type="button" variant="outline" size="sm" onClick={addTab}>
              <PlusIcon className="mr-2 h-4 w-4" />
              Add Tab
            </Button>
          </div>
          {section.tabs.map((tab: any, index: any) => (
            <Card key={tab.id}>
              <CardHeader>
                <CardTitle className="text-sm">Tab {index + 1}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label>Label *</Label>
                  <Input
                    value={tab.label}
                    onChange={(e) => updateTab(tab.id, { label: e.target.value })}
                    placeholder="Popular"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Filter Type</Label>
                  <Select
                    value={tab.filter}
                    onValueChange={(value: any) => updateTab(tab.id, { filter: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="popular">Popular</SelectItem>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="low_price">Low Price</SelectItem>
                      <SelectItem value="category">Category</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {tab.filter === 'category' && (
                  <div className="space-y-2">
                    <Label>Category ID</Label>
                    <Input
                      value={tab.category_id || ''}
                      onChange={(e) => updateTab(tab.id, { category_id: e.target.value })}
                      placeholder="Category ID"
                    />
                  </div>
                )}
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => removeTab(tab.id)}
                >
                  <TrashIcon className="mr-2 h-4 w-4" />
                  Remove Tab
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

