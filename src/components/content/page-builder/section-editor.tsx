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
import RichTextEditor from '@/components/content/rich-text-editor';
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
          {section.features.map((feature, index) => (
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
          {section.testimonials.map((testimonial, index) => (
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

