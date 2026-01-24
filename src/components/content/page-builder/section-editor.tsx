/**
 * Section Editor Component
 * 
 * Form for editing section properties
 * 
 * Day 28: Content Management - Simple Page Builder
 */

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { PageSection } from '@/lib/content/page-builder-types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
// Lazy load rich text editor for better performance
import RichTextEditor from '@/components/content/rich-text-editor-lazy';
import ImageUploadField from '@/components/content/image-upload-field';
import { IconEmojiPicker } from '@/components/content/icon-emoji-picker';
import { useQuery } from '@tanstack/react-query';

interface SectionEditorProps {
  section: PageSection;
  onUpdate: (updates: Partial<PageSection>) => void;
}

// Shared ColorPicker component (similar to theme customization)
interface ColorPickerProps {
  label: string;
  colorKey: string;
  defaultValue?: string;
  description?: string;
  section: any;
  onColorChange: (colorKey: string, value: string) => void;
  onColorReset: (colorKey: string) => void;
}

function ColorPicker({ 
  label, 
  colorKey, 
  defaultValue = '#000000',
  description,
  section,
  onColorChange,
  onColorReset,
}: ColorPickerProps) {
  const currentValue = section[colorKey] || defaultValue;
  
  return (
    <div className="space-y-2">
      <div>
        <Label htmlFor={`color-${colorKey}`}>{label}</Label>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <Input
          id={`color-${colorKey}`}
          type="color"
          value={currentValue}
          onChange={(e) => onColorChange(colorKey, e.target.value)}
          className="w-20 h-10 cursor-pointer"
        />
        <Input
          type="text"
          value={currentValue}
          onChange={(e) => onColorChange(colorKey, e.target.value)}
          placeholder={defaultValue}
          className="flex-1"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => onColorReset(colorKey)}
        >
          Reset
        </Button>
      </div>
    </div>
  );
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
    case 'sales_tab':
      return <SalesTabSectionEditor section={section} onUpdate={onUpdate} />;
    case 'split_layout':
      return <SplitLayoutSectionEditor section={section} onUpdate={onUpdate} />;
    case 'cta':
      return <CTASectionEditor section={section} onUpdate={onUpdate} />;
    case 'product_tabs':
      return <ProductTabsSectionEditor section={section} onUpdate={onUpdate} />;
    case 'form':
      return <FormSectionEditor section={section} onUpdate={onUpdate} />;
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
  // Helper function to handle color changes
  const handleColorChange = (colorKey: string, value: string) => {
    onUpdate({ [colorKey]: value });
  };

  // Helper function to reset color
  const handleColorReset = (colorKey: string) => {
    onUpdate({ [colorKey]: undefined });
  };

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
        <ColorPicker
          label="Title Color"
          colorKey="title_color"
          defaultValue="#000000"
          description="Color for the hero title text"
          section={section}
          onColorChange={handleColorChange}
          onColorReset={handleColorReset}
        />
        
        <div className="space-y-2">
          <Label>Subtitle</Label>
          <Input
            value={section.subtitle || ''}
            onChange={(e) => onUpdate({ subtitle: e.target.value })}
            placeholder="Hero subtitle"
          />
        </div>
        <ColorPicker
          label="Subtitle Color"
          colorKey="subtitle_color"
          defaultValue="#666666"
          description="Color for the hero subtitle text"
          section={section}
          onColorChange={handleColorChange}
          onColorReset={handleColorReset}
        />
        
        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea
            value={section.description || ''}
            onChange={(e) => onUpdate({ description: e.target.value })}
            placeholder="Hero description"
            rows={3}
          />
        </div>
        <ColorPicker
          label="Description Color"
          colorKey="description_color"
          defaultValue="#666666"
          description="Color for the hero description text"
          section={section}
          onColorChange={handleColorChange}
          onColorReset={handleColorReset}
        />
        
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
        <ColorPicker
          label="CTA Text Color"
          colorKey="cta_text_color"
          defaultValue="#FFFFFF"
          description="Color for the CTA button text"
          section={section}
          onColorChange={handleColorChange}
          onColorReset={handleColorReset}
        />
        <ColorPicker
          label="CTA Button Color"
          colorKey="cta_button_color"
          defaultValue="#4CAF50"
          description="Background color for the CTA button"
          section={section}
          onColorChange={handleColorChange}
          onColorReset={handleColorReset}
        />
        
        <ColorPicker
          label="Background Color"
          colorKey="background_color"
          defaultValue="#FFFFFF"
          description="Background color for the hero section"
          section={section}
          onColorChange={handleColorChange}
          onColorReset={handleColorReset}
        />
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
  const handleColorChange = (colorKey: string, value: string) => {
    onUpdate({ [colorKey]: value });
  };

  const handleColorReset = (colorKey: string) => {
    onUpdate({ [colorKey]: undefined });
  };

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
        <ColorPicker
          label="Title Color"
          colorKey="title_color"
          defaultValue="#000000"
          description="Color for the section title"
          section={section}
          onColorChange={handleColorChange}
          onColorReset={handleColorReset}
        />
        <div className="space-y-2">
          <Label>Subtitle</Label>
          <Input
            value={section.subtitle || ''}
            onChange={(e) => onUpdate({ subtitle: e.target.value })}
            placeholder="Section subtitle"
          />
        </div>
        <ColorPicker
          label="Subtitle Color"
          colorKey="subtitle_color"
          defaultValue="#666666"
          description="Color for the section subtitle"
          section={section}
          onColorChange={handleColorChange}
          onColorReset={handleColorReset}
        />
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
        <ColorPicker
          label="Background Color"
          colorKey="background_color"
          defaultValue="#FFFFFF"
          description="Background color for the features section"
          section={section}
          onColorChange={handleColorChange}
          onColorReset={handleColorReset}
        />
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
                <IconEmojiPicker
                  value={feature.icon || ''}
                  onChange={(value) => updateFeature(feature.id, { icon: value })}
                  label="Icon/Emoji"
                  description="Select an emoji or icon for this feature"
                />
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
  const handleColorChange = (colorKey: string, value: string) => {
    onUpdate({ [colorKey]: value });
  };

  const handleColorReset = (colorKey: string) => {
    onUpdate({ [colorKey]: undefined });
  };

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
        <ColorPicker
          label="Title Color"
          colorKey="title_color"
          defaultValue="#000000"
          description="Color for the section title"
          section={section}
          onColorChange={handleColorChange}
          onColorReset={handleColorReset}
        />
        <div className="space-y-2">
          <Label>Subtitle</Label>
          <Input
            value={section.subtitle || ''}
            onChange={(e) => onUpdate({ subtitle: e.target.value })}
            placeholder="Section subtitle"
          />
        </div>
        <ColorPicker
          label="Subtitle Color"
          colorKey="subtitle_color"
          defaultValue="#666666"
          description="Color for the section subtitle"
          section={section}
          onColorChange={handleColorChange}
          onColorReset={handleColorReset}
        />
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
        <ColorPicker
          label="Background Color"
          colorKey="background_color"
          defaultValue="#FFFFFF"
          description="Background color for the products section"
          section={section}
          onColorChange={handleColorChange}
          onColorReset={handleColorReset}
        />
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
  const handleColorChange = (colorKey: string, value: string) => {
    onUpdate({ [colorKey]: value });
  };

  const handleColorReset = (colorKey: string) => {
    onUpdate({ [colorKey]: undefined });
  };

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
        <ColorPicker
          label="Title Color"
          colorKey="title_color"
          defaultValue="#000000"
          description="Color for the section title"
          section={section}
          onColorChange={handleColorChange}
          onColorReset={handleColorReset}
        />
        <div className="space-y-2">
          <Label>Subtitle</Label>
          <Input
            value={section.subtitle || ''}
            onChange={(e) => onUpdate({ subtitle: e.target.value })}
            placeholder="Section subtitle"
          />
        </div>
        <ColorPicker
          label="Subtitle Color"
          colorKey="subtitle_color"
          defaultValue="#666666"
          description="Color for the section subtitle"
          section={section}
          onColorChange={handleColorChange}
          onColorReset={handleColorReset}
        />
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
        <ColorPicker
          label="Background Color"
          colorKey="background_color"
          defaultValue="#FFFFFF"
          description="Background color for the testimonials section"
          section={section}
          onColorChange={handleColorChange}
          onColorReset={handleColorReset}
        />
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
  const handleColorChange = (colorKey: string, value: string) => {
    onUpdate({ [colorKey]: value });
  };

  const handleColorReset = (colorKey: string) => {
    onUpdate({ [colorKey]: undefined });
  };

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
        <ColorPicker
          label="Text Color"
          colorKey="text_color"
          defaultValue="#000000"
          description="Color for the text content"
          section={section}
          onColorChange={handleColorChange}
          onColorReset={handleColorReset}
        />
        <ColorPicker
          label="Background Color"
          colorKey="background_color"
          defaultValue="#FFFFFF"
          description="Background color for the text section"
          section={section}
          onColorChange={handleColorChange}
          onColorReset={handleColorReset}
        />
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
  const handleColorChange = (colorKey: string, value: string) => {
    onUpdate({ [colorKey]: value });
  };

  const handleColorReset = (colorKey: string) => {
    onUpdate({ [colorKey]: undefined });
  };

  // Fetch categories
  const { data: categoriesData, isLoading: isLoadingCategories } = useQuery({
    queryKey: ['categories', 'active'],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('status', 'active');
      params.append('include_children', 'false');
      
      const response = await fetch(`/api/categories?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      return await response.json();
    },
  });

  const categories = categoriesData?.categories || [];
  const selectedCategoryIds = section.category_ids || [];

  const handleCategoryToggle = (categoryId: string) => {
    const currentIds = selectedCategoryIds;
    if (currentIds.includes(categoryId)) {
      onUpdate({ category_ids: currentIds.filter((id) => id !== categoryId) });
    } else {
      onUpdate({ category_ids: [...currentIds, categoryId] });
    }
  };

  const handleSelectAll = () => {
    if (selectedCategoryIds.length === categories.length) {
      // Deselect all
      onUpdate({ category_ids: [] });
    } else {
      // Select all
      onUpdate({ category_ids: categories.map((c: any) => c.id) });
    }
  };

  const allSelected = categories.length > 0 && selectedCategoryIds.length === categories.length;
  const someSelected = selectedCategoryIds.length > 0 && selectedCategoryIds.length < categories.length;

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
        <ColorPicker
          label="Title Color"
          colorKey="title_color"
          defaultValue="#000000"
          description="Color for the section title"
          section={section}
          onColorChange={handleColorChange}
          onColorReset={handleColorReset}
        />
        <div className="space-y-2">
          <Label>Subtitle</Label>
          <Input
            value={section.subtitle || ''}
            onChange={(e) => onUpdate({ subtitle: e.target.value })}
            placeholder="Section subtitle"
          />
        </div>
        <ColorPicker
          label="Subtitle Color"
          colorKey="subtitle_color"
          defaultValue="#666666"
          description="Color for the section subtitle"
          section={section}
          onColorChange={handleColorChange}
          onColorReset={handleColorReset}
        />

        {/* Category Selection */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Select Categories</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              disabled={isLoadingCategories || categories.length === 0}
            >
              {allSelected ? 'Deselect All' : 'Select All'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {selectedCategoryIds.length === 0
              ? 'No categories selected. All categories will be displayed (up to limit).'
              : `${selectedCategoryIds.length} categor${selectedCategoryIds.length === 1 ? 'y' : 'ies'} selected.`}
          </p>
          
          {isLoadingCategories ? (
            <div className="text-sm text-muted-foreground py-4">Loading categories...</div>
          ) : categories.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4">No categories available. Create categories first.</div>
          ) : (
            <div className="border rounded-lg p-4 max-h-64 overflow-y-auto space-y-2">
              {categories.map((category: any) => (
                <div key={category.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`category-${category.id}`}
                    checked={selectedCategoryIds.includes(category.id)}
                    onCheckedChange={() => handleCategoryToggle(category.id)}
                  />
                  <Label
                    htmlFor={`category-${category.id}`}
                    className="cursor-pointer flex-1 text-sm font-normal"
                  >
                    {category.name}
                  </Label>
                </div>
              ))}
            </div>
          )}
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
            Maximum number of categories to display. Only applies if no specific categories are selected above.
          </p>
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
          <Checkbox
            id="show-count"
            checked={section.show_count || false}
            onCheckedChange={(checked) => onUpdate({ show_count: checked as boolean })}
          />
          <Label htmlFor="show-count" className="cursor-pointer">
            Show Item Count
          </Label>
        </div>
        <ColorPicker
          label="Background Color"
          colorKey="background_color"
          defaultValue="#FFFFFF"
          description="Background color for the categories section"
          section={section}
          onColorChange={handleColorChange}
          onColorReset={handleColorReset}
        />
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
  const handleColorChange = (colorKey: string, value: string) => {
    onUpdate({ [colorKey]: value });
  };

  const handleColorReset = (colorKey: string) => {
    onUpdate({ [colorKey]: undefined });
  };

  const handleBannerColorChange = (bannerId: string, colorKey: string, value: string) => {
    const newBanners = section.banners.map((b: any) =>
      b.id === bannerId ? { ...b, [colorKey]: value } : b
    );
    onUpdate({ banners: newBanners });
  };

  const handleBannerColorReset = (bannerId: string, colorKey: string) => {
    const newBanners = section.banners.map((b: any) => {
      const updated = { ...b };
      delete updated[colorKey];
      return b.id === bannerId ? updated : b;
    });
    onUpdate({ banners: newBanners });
  };

  // Track which banners are using custom URLs
  const [customUrlBanners, setCustomUrlBanners] = useState<Set<string>>(new Set());

  // Fetch published pages for CTA link selection
  const { data: pagesData, isLoading: isLoadingPages } = useQuery({
    queryKey: ['pages', 'published'],
    queryFn: async () => {
      const response = await fetch('/api/pages?status=published&limit=100');
      if (!response.ok) {
        throw new Error('Failed to fetch pages');
      }
      return await response.json();
    },
  });

  const pages = pagesData?.pages || [];

  // Check if a banner's CTA link matches any page
  const getPageSlugForLink = (link: string | undefined): string | null => {
    if (!link) return null;
    const page = pages.find((p: any) => {
      const pageSlug = p.slug ? `/${p.slug}` : `#${p.id}`;
      return pageSlug === link;
    });
    return page ? (page.slug ? `/${page.slug}` : `#${page.id}`) : null;
  };

  const isCustomUrl = (bannerId: string, link: string | undefined): boolean => {
    if (customUrlBanners.has(bannerId)) return true;
    if (!link) return false;
    return !getPageSlugForLink(link);
  };

  const updateBanner = (bannerId: string, updates: Partial<typeof section.banners[0]>) => {
    const newBanners = section.banners.map((b: any) =>
      b.id === bannerId ? { ...b, ...updates } : b
    );
    onUpdate({ banners: newBanners });
  };

  const handleCtaLinkChange = (bannerId: string, value: string) => {
    if (value === '__custom__') {
      setCustomUrlBanners((prev) => new Set(prev).add(bannerId));
      updateBanner(bannerId, { cta_link: '' });
    } else {
      setCustomUrlBanners((prev) => {
        const next = new Set(prev);
        next.delete(bannerId);
        return next;
      });
      updateBanner(bannerId, { cta_link: value });
    }
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
        <div className="space-y-2">
          <Label>Section Title</Label>
          <Input
            value={section.title || ''}
            onChange={(e) => onUpdate({ title: e.target.value })}
            placeholder="Banners section title (optional)"
          />
        </div>
        <ColorPicker
          label="Section Title Color"
          colorKey="title_color"
          defaultValue="#000000"
          description="Color for section-level title"
          section={section}
          onColorChange={handleColorChange}
          onColorReset={handleColorReset}
        />
        <div className="space-y-2">
          <Label>Section Subtitle</Label>
          <Input
            value={section.subtitle || ''}
            onChange={(e) => onUpdate({ subtitle: e.target.value })}
            placeholder="Banners section subtitle (optional)"
          />
        </div>
        <ColorPicker
          label="Section Subtitle Color"
          colorKey="subtitle_color"
          defaultValue="#666666"
          description="Color for section-level subtitle"
          section={section}
          onColorChange={handleColorChange}
          onColorReset={handleColorReset}
        />
        <ColorPicker
          label="Section Background Color"
          colorKey="background_color"
          defaultValue="#FFFFFF"
          description="Background color for the banners section"
          section={section}
          onColorChange={handleColorChange}
          onColorReset={handleColorReset}
        />
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
                <ColorPicker
                  label="Title Color"
                  colorKey="title_color"
                  defaultValue="#000000"
                  description="Color for this banner's title"
                  section={banner}
                  onColorChange={(key, value) => handleBannerColorChange(banner.id, key, value)}
                  onColorReset={(key) => handleBannerColorReset(banner.id, key)}
                />
                <div className="space-y-2">
                  <Label>Subtitle</Label>
                  <Input
                    value={banner.subtitle || ''}
                    onChange={(e) => updateBanner(banner.id, { subtitle: e.target.value })}
                    placeholder="Banner subtitle"
                  />
                </div>
                <ColorPicker
                  label="Subtitle Color"
                  colorKey="subtitle_color"
                  defaultValue="#666666"
                  description="Color for this banner's subtitle"
                  section={banner}
                  onColorChange={(key, value) => handleBannerColorChange(banner.id, key, value)}
                  onColorReset={(key) => handleBannerColorReset(banner.id, key)}
                />
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
                    {isLoadingPages ? (
                      <div className="text-sm text-muted-foreground py-2">Loading pages...</div>
                    ) : isCustomUrl(banner.id, banner.cta_link) ? (
                      <div className="space-y-2">
                        <Input
                          value={banner.cta_link || ''}
                          onChange={(e) => updateBanner(banner.id, { cta_link: e.target.value })}
                          placeholder="/products or https://example.com"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setCustomUrlBanners((prev) => {
                              const next = new Set(prev);
                              next.delete(banner.id);
                              return next;
                            });
                            updateBanner(banner.id, { cta_link: '' });
                          }}
                        >
                          Select a page instead
                        </Button>
                        <p className="text-xs text-muted-foreground">
                          Custom URL (e.g., /products, /about, or external URL)
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Select
                          value={banner.cta_link || ''}
                          onValueChange={(value) => handleCtaLinkChange(banner.id, value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a page" />
                          </SelectTrigger>
                          <SelectContent>
                            {pages.map((page: any) => {
                              const pageSlug = page.slug ? `/${page.slug}` : `#${page.id}`;
                              return (
                                <SelectItem key={page.id} value={pageSlug}>
                                  {page.title}
                                </SelectItem>
                              );
                            })}
                            <SelectItem value="__custom__">Custom URL...</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Select a page or choose &quot;Custom URL...&quot; for external links
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <ColorPicker
                  label="CTA Text Color"
                  colorKey="cta_text_color"
                  defaultValue="#FFFFFF"
                  description="Color for this banner's CTA button text"
                  section={banner}
                  onColorChange={(key, value) => handleBannerColorChange(banner.id, key, value)}
                  onColorReset={(key) => handleBannerColorReset(banner.id, key)}
                />
                <ColorPicker
                  label="CTA Button Color"
                  colorKey="cta_button_color"
                  defaultValue="#4CAF50"
                  description="Background color for this banner's CTA button"
                  section={banner}
                  onColorChange={(key, value) => handleBannerColorChange(banner.id, key, value)}
                  onColorReset={(key) => handleBannerColorReset(banner.id, key)}
                />
                <ColorPicker
                  label="Background Color"
                  colorKey="background_color"
                  defaultValue="#F3F4F6"
                  description="Background color for this banner"
                  section={banner}
                  onColorChange={(key, value) => handleBannerColorChange(banner.id, key, value)}
                  onColorReset={(key) => handleBannerColorReset(banner.id, key)}
                />
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

function SalesTabSectionEditor({
  section,
  onUpdate,
}: {
  section: Extract<PageSection, { type: 'sales_tab' }>;
  onUpdate: (updates: Partial<PageSection>) => void;
}) {
  // Fetch sales for dropdown
  const { data: salesData, isLoading: isLoadingSales } = useQuery({
    queryKey: ['sales', 'all'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/sales?limit=100');
      if (!response.ok) {
        throw new Error('Failed to fetch sales');
      }
      return await response.json();
    },
  });

  const sales = useMemo(() => salesData?.sales || [], [salesData?.sales]);
  const displayMode = section.display_mode || 'single_sale';
  const layout = section.layout || 'grid';
  const bannerStyle = section.banner_style || 'contained';
  const productCardStyle = section.product_card_style || 'default';
  const ctaPosition = section.cta_position || 'top_right';

  // Auto-update CTA link based on display mode and selected sale
  useEffect(() => {
    if (displayMode === 'single_sale' && section.sale_id) {
      const selectedSale = sales.find((s: any) => s.id === section.sale_id);
      if (selectedSale && !section.cta_link) {
        onUpdate({ cta_link: `/sales/${selectedSale.slug}` });
      }
    } else if (displayMode === 'all_active' && !section.cta_link) {
      onUpdate({ cta_link: '/sales' });
    }
  }, [displayMode, section.sale_id, section.cta_link, sales, onUpdate]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Sales Tab Section</CardTitle>
        <CardDescription>
          Configure how sales are displayed in this section
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Display Mode */}
        <div className="space-y-2">
          <Label>Display Mode *</Label>
          <Select
            value={displayMode}
            onValueChange={(value: 'single_sale' | 'featured_sales' | 'all_active') =>
              onUpdate({ display_mode: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="single_sale">Single Sale</SelectItem>
              <SelectItem value="featured_sales">Featured Sales</SelectItem>
              <SelectItem value="all_active">All Active Sales</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {displayMode === 'single_sale' && 'Single Sale: Display products from one specific sale. Select a sale below to show its products on your homepage.'}
            {displayMode === 'featured_sales' && 'Featured Sales: Display multiple featured sales as tabs. Users can switch between different sales to see products from each.'}
            {displayMode === 'all_active' && 'All Active Sales: Automatically show all currently active sales. Products from all active sales will be displayed together.'}
          </p>
        </div>

        {/* Single Sale Mode - Sale Selection */}
        {displayMode === 'single_sale' && (
          <div className="space-y-2">
            <Label>Select Sale *</Label>
            {isLoadingSales ? (
              <div className="text-sm text-muted-foreground">Loading sales...</div>
            ) : (
              <Select
                value={section.sale_id || ''}
                onValueChange={(value) => {
                  const selectedSale = sales.find((s: any) => s.id === value);
                  onUpdate({
                    sale_id: value,
                    sale_slug: selectedSale?.slug || undefined,
                    cta_link: selectedSale ? `/sales/${selectedSale.slug}` : section.cta_link,
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a sale" />
                </SelectTrigger>
                <SelectContent>
                  {sales.length === 0 ? (
                    <SelectItem value="" disabled>No sales available</SelectItem>
                  ) : (
                    sales.map((sale: any) => (
                      <SelectItem key={sale.id} value={sale.id}>
                        {sale.name} ({sale.status})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}
          </div>
        )}

        {/* Featured Sales Mode - Multi-select */}
        {displayMode === 'featured_sales' && (
          <div className="space-y-2">
            <Label>Featured Sales</Label>
            <div className="space-y-2 max-h-40 overflow-y-auto rounded-md border p-3">
              {isLoadingSales ? (
                <div className="text-sm text-muted-foreground">Loading sales...</div>
              ) : sales.filter((s: any) => s.is_featured || s.status === 'active').length === 0 ? (
                <div className="text-sm text-muted-foreground">No featured sales available</div>
              ) : (
                sales
                  .filter((s: any) => s.is_featured || s.status === 'active')
                  .map((sale: any) => {
                    const isSelected = section.featured_sale_ids?.includes(sale.id) || false;
                    return (
                      <div key={sale.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`sale-${sale.id}`}
                          checked={isSelected}
                          onCheckedChange={(checked) => {
                            const currentIds = section.featured_sale_ids || [];
                            const maxSales = section.max_featured_sales || 5;
                            if (checked) {
                              if (currentIds.length < maxSales) {
                                onUpdate({ featured_sale_ids: [...currentIds, sale.id] });
                              }
                            } else {
                              onUpdate({ featured_sale_ids: currentIds.filter((id) => id !== sale.id) });
                            }
                          }}
                          disabled={!isSelected && (section.featured_sale_ids?.length || 0) >= (section.max_featured_sales || 5)}
                        />
                        <Label
                          htmlFor={`sale-${sale.id}`}
                          className="flex-1 cursor-pointer text-sm font-normal"
                        >
                          {sale.name} ({sale.status})
                        </Label>
                      </div>
                    );
                  })
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {section.featured_sale_ids?.length || 0} of {section.max_featured_sales || 5} selected
            </p>
          </div>
        )}

        {/* Layout Options */}
        <div className="space-y-4 border-t pt-4">
          <h3 className="font-semibold">Layout</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Layout Type</Label>
              <Select
                value={layout}
                onValueChange={(value: 'grid' | 'carousel' | 'tabs') =>
                  onUpdate({ layout: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="grid">Grid</SelectItem>
                  <SelectItem value="carousel">Carousel</SelectItem>
                  {displayMode === 'featured_sales' && (
                    <SelectItem value="tabs">Tabs</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            {layout === 'grid' && (
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
            )}
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4 border-t pt-4">
          <h3 className="font-semibold">Content</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={section.title || ''}
                onChange={(e) => onUpdate({ title: e.target.value })}
                placeholder="Super Flash Sale"
              />
            </div>
            <div className="space-y-2">
              <Label>Subtitle</Label>
              <Input
                value={section.subtitle || ''}
                onChange={(e) => onUpdate({ subtitle: e.target.value })}
                placeholder="Optional subtitle"
              />
            </div>
            <div className="space-y-2">
              <Label>Product Limit</Label>
              <Input
                type="number"
                value={section.limit || 8}
                onChange={(e) => onUpdate({ limit: parseInt(e.target.value) || 8 })}
                min={1}
                max={20}
              />
              <p className="text-xs text-muted-foreground">Number of products to show per sale</p>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="space-y-4 border-t pt-4">
          <h3 className="font-semibold">Features</h3>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="show_countdown"
                checked={section.show_countdown !== false}
                onCheckedChange={(checked) => onUpdate({ show_countdown: !!checked })}
              />
              <Label htmlFor="show_countdown" className="font-normal cursor-pointer">
                Show countdown timer
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="show_badge"
                checked={section.show_badge !== false}
                onCheckedChange={(checked) => onUpdate({ show_badge: !!checked })}
              />
              <Label htmlFor="show_badge" className="font-normal cursor-pointer">
                Show sale badges on products
              </Label>
            </div>
            {section.show_badge && (
              <div className="grid grid-cols-2 gap-4 pl-6">
                <div className="space-y-2">
                  <Label htmlFor="badge_text">Badge Text (Override)</Label>
                  <Input
                    id="badge_text"
                    value={section.badge_text || ''}
                    onChange={(e) => onUpdate({ badge_text: e.target.value })}
                    placeholder="Leave empty to use sale badge"
                    maxLength={50}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="badge_color">Badge Color (Override)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="badge_color"
                      type="color"
                      value={section.badge_color || '#EF4444'}
                      onChange={(e) => onUpdate({ badge_color: e.target.value })}
                      className="w-20 h-10"
                    />
                    <Input
                      value={section.badge_color || '#EF4444'}
                      onChange={(e) => onUpdate({ badge_color: e.target.value })}
                      placeholder="#EF4444"
                      pattern="^#[0-9A-Fa-f]{6}$"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Styling */}
        <div className="space-y-4 border-t pt-4">
          <h3 className="font-semibold">Styling</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Banner Style</Label>
              <Select
                value={bannerStyle}
                onValueChange={(value: 'full_width' | 'contained' | 'none') =>
                  onUpdate({ banner_style: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_width">Full Width</SelectItem>
                  <SelectItem value="contained">Contained</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Product Card Style</Label>
              <Select
                value={productCardStyle}
                onValueChange={(value: 'default' | 'compact' | 'detailed') =>
                  onUpdate({ product_card_style: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="compact">Compact</SelectItem>
                  <SelectItem value="detailed">Detailed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="space-y-4 border-t pt-4">
          <h3 className="font-semibold">Call-to-Action</h3>
          <div className="space-y-4">
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
                  placeholder={displayMode === 'single_sale' ? '/sales/[slug]' : '/sales'}
                />
                <p className="text-xs text-muted-foreground">
                  {displayMode === 'single_sale' && 'Auto-filled based on selected sale'}
                  {displayMode === 'all_active' && 'Defaults to /sales'}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>CTA Position</Label>
              <Select
                value={ctaPosition}
                onValueChange={(value: 'top_right' | 'bottom_center' | 'none') =>
                  onUpdate({ cta_position: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="top_right">Top Right</SelectItem>
                  <SelectItem value="bottom_center">Bottom Center</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Enhanced Split Layout Section Editor
 * Based on Shopify/BigCommerce best practices
 */
function SplitLayoutSectionEditor({
  section,
  onUpdate,
}: {
  section: Extract<PageSection, { type: 'split_layout' }>;
  onUpdate: (updates: Partial<PageSection>) => void;
}) {
  const handleLeftSideColorChange = (colorKey: string, value: string) => {
    onUpdate({
      left_side: { ...section.left_side, [colorKey]: value }
    });
  };

  const handleLeftSideColorReset = (colorKey: string) => {
    const updated = { ...section.left_side };
    delete (updated as any)[colorKey];
    onUpdate({ left_side: updated });
  };

  const handleRightSideColorChange = (colorKey: string, value: string) => {
    onUpdate({
      right_side: { ...section.right_side, [colorKey]: value }
    });
  };

  const handleRightSideColorReset = (colorKey: string) => {
    const updated = { ...section.right_side };
    delete (updated as any)[colorKey];
    onUpdate({ right_side: updated });
  };

  const handleSectionColorChange = (colorKey: string, value: string) => {
    onUpdate({ [colorKey]: value });
  };

  const handleSectionColorReset = (colorKey: string) => {
    onUpdate({ [colorKey]: undefined });
  };

  // Fetch available forms for form type selection
  const { data: formsData } = useQuery({
    queryKey: ['forms-list-split'],
    queryFn: async () => {
      const response = await fetch('/api/forms');
      if (!response.ok) return { forms: [] };
      return await response.json();
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Split Layout Section</CardTitle>
        <p className="text-sm text-muted-foreground">Enhanced with Shopify/BigCommerce best practices</p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Layout Configuration */}
        <div className="space-y-4 border-b pb-4">
          <h3 className="font-semibold text-lg">Layout Configuration</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Layout Ratio</Label>
              <Select
                value={section.layout_ratio || '50-50'}
                onValueChange={(value) => onUpdate({ layout_ratio: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50-50">50 / 50 (Equal)</SelectItem>
                  <SelectItem value="60-40">60 / 40</SelectItem>
                  <SelectItem value="40-60">40 / 60</SelectItem>
                  <SelectItem value="70-30">70 / 30</SelectItem>
                  <SelectItem value="30-70">30 / 70</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Control the width ratio of left and right columns</p>
            </div>
            <div className="space-y-2">
              <Label>Mobile Behavior</Label>
              <Select
                value={section.mobile_behavior || 'stack'}
                onValueChange={(value) => onUpdate({ mobile_behavior: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stack">Stack Vertically</SelectItem>
                  <SelectItem value="reverse_stack">Reverse Stack</SelectItem>
                  <SelectItem value="scroll">Horizontal Scroll</SelectItem>
                  <SelectItem value="hide_left">Hide Left on Mobile</SelectItem>
                  <SelectItem value="hide_right">Hide Right on Mobile</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">How sections behave on mobile devices</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="reverse_desktop"
              checked={section.reverse_desktop || false}
              onChange={(e) => onUpdate({ reverse_desktop: e.target.checked })}
              className="rounded"
            />
            <Label htmlFor="reverse_desktop" className="cursor-pointer">Reverse order on desktop (Right | Left)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="full_width"
              checked={section.full_width || false}
              onChange={(e) => onUpdate({ full_width: e.target.checked })}
              className="rounded"
            />
            <Label htmlFor="full_width" className="cursor-pointer">Full width (extends to viewport edges)</Label>
          </div>
        </div>

        {/* Section-Level Styling */}
        <div className="space-y-4 border-b pb-4">
          <h3 className="font-semibold text-lg">Section Styling</h3>
          <div className="space-y-2">
            <Label>Background Type</Label>
            <Select
              value={section.background_gradient ? 'gradient' : 'color'}
              onValueChange={(value) => {
                if (value === 'gradient') {
                  onUpdate({ 
                    background_gradient: 'linear-gradient(to right, #f3f4f6, #e5e7eb)',
                    background_color: undefined 
                  });
                } else {
                  onUpdate({ background_gradient: undefined });
                }
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="color">Solid Color</SelectItem>
                <SelectItem value="gradient">Gradient</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {section.background_gradient ? (
            <div className="space-y-2">
              <Label>Background Gradient</Label>
              <Input
                value={section.background_gradient || ''}
                onChange={(e) => onUpdate({ background_gradient: e.target.value })}
                placeholder="linear-gradient(to right, #f3f4f6, #e5e7eb)"
              />
              <p className="text-xs text-muted-foreground">CSS gradient value</p>
            </div>
          ) : (
            <ColorPicker
              label="Background Color"
              colorKey="background_color"
              defaultValue="transparent"
              description="Background color for the entire section"
              section={section}
              onColorChange={handleSectionColorChange}
              onColorReset={handleSectionColorReset}
            />
          )}
          <div className="space-y-2">
            <Label>Minimum Height (px)</Label>
            <Input
              type="number"
              value={section.min_height || ''}
              onChange={(e) => onUpdate({ min_height: parseInt(e.target.value) || undefined })}
              placeholder="500"
            />
          </div>
        </div>

        {/* Spacing Configuration */}
        <div className="space-y-4 border-b pb-4">
          <h3 className="font-semibold text-lg">Spacing & Padding</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Section Padding Top (px)</Label>
              <Input
                type="number"
                value={section.spacing?.section_padding_top ?? 64}
                onChange={(e) => onUpdate({ 
                  spacing: { 
                    ...section.spacing, 
                    section_padding_top: parseInt(e.target.value) || 64 
                  }
                })}
              />
            </div>
            <div className="space-y-2">
              <Label>Section Padding Bottom (px)</Label>
              <Input
                type="number"
                value={section.spacing?.section_padding_bottom ?? 64}
                onChange={(e) => onUpdate({ 
                  spacing: { 
                    ...section.spacing, 
                    section_padding_bottom: parseInt(e.target.value) || 64 
                  }
                })}
              />
            </div>
            <div className="space-y-2">
              <Label>Column Gap (px)</Label>
              <Input
                type="number"
                value={section.spacing?.column_gap ?? 48}
                onChange={(e) => onUpdate({ 
                  spacing: { 
                    ...section.spacing, 
                    column_gap: parseInt(e.target.value) || 48 
                  }
                })}
              />
            </div>
            <div className="space-y-2">
              <Label>Content Padding (px)</Label>
              <Input
                type="number"
                value={section.spacing?.content_padding ?? 32}
                onChange={(e) => onUpdate({ 
                  spacing: { 
                    ...section.spacing, 
                    content_padding: parseInt(e.target.value) || 32 
                  }
                })}
              />
            </div>
          </div>
        </div>

        {/* Left Side Configuration */}
        <div className="space-y-4 border-b pb-4">
          <h3 className="font-semibold text-lg">Left Side Configuration</h3>
          <div className="space-y-2">
            <Label>Content Type</Label>
            <Select
              value={section.left_side.type || 'banner'}
              onValueChange={(value) => onUpdate({
                left_side: { ...section.left_side, type: value as any }
              })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="banner">Banner (with overlay)</SelectItem>
                <SelectItem value="image">Image Only</SelectItem>
                <SelectItem value="text">Text Content</SelectItem>
                <SelectItem value="form">Form</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Form selector for left side */}
          {section.left_side.type === 'form' && (
            <div className="space-y-2">
              <Label>Select Form *</Label>
              {formsData?.forms?.length > 0 ? (
                <Select
                  value={section.left_side.form_id || ''}
                  onValueChange={(value) => onUpdate({
                    left_side: { ...section.left_side, form_id: value }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a form" />
                  </SelectTrigger>
                  <SelectContent>
                    {formsData.forms.map((form: any) => (
                      <SelectItem key={form.id} value={form.id}>
                        {form.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="text-sm text-muted-foreground">
                  No forms found. <a href="/dashboard/forms/new" className="text-primary hover:underline">Create a form</a> first.
                </div>
              )}
            </div>
          )}
          
          {section.left_side.type !== 'form' && (
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
          )}
          <ColorPicker
            label="Title Color"
            colorKey="title_color"
            defaultValue="#000000"
            description="Color for the left side title"
            section={section.left_side}
            onColorChange={handleLeftSideColorChange}
            onColorReset={handleLeftSideColorReset}
          />
          
          <div className="space-y-2">
            <Label>Subtitle</Label>
            <Input
              value={section.left_side.subtitle || ''}
              onChange={(e) => onUpdate({
                left_side: { ...section.left_side, subtitle: e.target.value }
              })}
              placeholder="Banner subtitle"
            />
          </div>
          <ColorPicker
            label="Subtitle Color"
            colorKey="subtitle_color"
            defaultValue="#666666"
            description="Color for the left side subtitle"
            section={section.left_side}
            onColorChange={handleLeftSideColorChange}
            onColorReset={handleLeftSideColorReset}
          />
          
          {section.left_side.type !== 'image' && (
            <>
              <div className="space-y-2">
                <Label>Image {section.left_side.type === 'banner' ? '(Background)' : ''}</Label>
                <ImageUploadField
                  label="left side image"
                  value={section.left_side.image || ''}
                  onChange={(url) => onUpdate({
                    left_side: { ...section.left_side, image: url || '' }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>Image Position</Label>
                <Select
                  value={section.left_side.image_position || 'cover'}
                  onValueChange={(value) => onUpdate({
                    left_side: { ...section.left_side, image_position: value as any }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cover">Cover</SelectItem>
                    <SelectItem value="contain">Contain</SelectItem>
                    <SelectItem value="top">Top</SelectItem>
                    <SelectItem value="center">Center</SelectItem>
                    <SelectItem value="bottom">Bottom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Overlay Opacity ({section.left_side.overlay_opacity || 0}%)</Label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={section.left_side.overlay_opacity || 0}
                  onChange={(e) => onUpdate({
                    left_side: { ...section.left_side, overlay_opacity: parseInt(e.target.value) }
                  })}
                  className="w-full"
                />
              </div>
            </>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Text Alignment</Label>
              <Select
                value={section.left_side.text_alignment || 'center'}
                onValueChange={(value) => onUpdate({
                  left_side: { ...section.left_side, text_alignment: value as any }
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Vertical Alignment</Label>
              <Select
                value={section.left_side.vertical_alignment || 'middle'}
                onValueChange={(value) => onUpdate({
                  left_side: { ...section.left_side, vertical_alignment: value as any }
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="top">Top</SelectItem>
                  <SelectItem value="middle">Middle</SelectItem>
                  <SelectItem value="bottom">Bottom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Background Type</Label>
            <Select
              value={section.left_side.background_gradient ? 'gradient' : 'color'}
              onValueChange={(value) => {
                if (value === 'gradient') {
                  onUpdate({ 
                    left_side: {
                      ...section.left_side,
                      background_gradient: 'linear-gradient(to right, #f3f4f6, #e5e7eb)',
                      background_color: undefined 
                    }
                  });
                } else {
                  onUpdate({ 
                    left_side: {
                      ...section.left_side,
                      background_gradient: undefined
                    }
                  });
                }
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="color">Solid Color</SelectItem>
                <SelectItem value="gradient">Gradient</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {section.left_side.background_gradient ? (
            <div className="space-y-2">
              <Label>Background Gradient</Label>
              <Input
                value={section.left_side.background_gradient || ''}
                onChange={(e) => onUpdate({
                  left_side: { ...section.left_side, background_gradient: e.target.value }
                })}
                placeholder="linear-gradient(to right, #f3f4f6, #e5e7eb)"
              />
            </div>
          ) : (
            <ColorPicker
              label="Background Color"
              colorKey="background_color"
              defaultValue="#f3f4f6"
              description="Background color for the left side"
              section={section.left_side}
              onColorChange={handleLeftSideColorChange}
              onColorReset={handleLeftSideColorReset}
            />
          )}
          
          <div className="space-y-2">
            <Label>Border Radius (px)</Label>
            <Input
              type="number"
              value={section.left_side.border_radius ?? 8}
              onChange={(e) => onUpdate({
                left_side: { ...section.left_side, border_radius: parseInt(e.target.value) || 0 }
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
          <ColorPicker
            label="CTA Text Color"
            colorKey="cta_text_color"
            defaultValue="#FFFFFF"
            description="Color for the CTA button text"
            section={section.left_side}
            onColorChange={handleLeftSideColorChange}
            onColorReset={handleLeftSideColorReset}
          />
          <ColorPicker
            label="CTA Button Color"
            colorKey="cta_button_color"
            defaultValue="#4CAF50"
            description="Background color for the CTA button"
            section={section.left_side}
            onColorChange={handleLeftSideColorChange}
            onColorReset={handleLeftSideColorReset}
          />
        </div>

        {/* Right Side Configuration */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Right Side Configuration</h3>
          <div className="space-y-2">
            <Label>Content Type</Label>
            <Select
              value={section.right_side.type || 'products'}
              onValueChange={(value) => onUpdate({
                right_side: { ...section.right_side, type: value as any }
              })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="products">Products</SelectItem>
                <SelectItem value="features">Features</SelectItem>
                <SelectItem value="text">Text Content</SelectItem>
                <SelectItem value="image">Image</SelectItem>
                <SelectItem value="form">Form</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Form selector for right side */}
          {section.right_side.type === 'form' && (
            <div className="space-y-2">
              <Label>Select Form *</Label>
              {formsData?.forms?.length > 0 ? (
                <Select
                  value={section.right_side.form_id || ''}
                  onValueChange={(value) => onUpdate({
                    right_side: { ...section.right_side, form_id: value }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a form" />
                  </SelectTrigger>
                  <SelectContent>
                    {formsData.forms.map((form: any) => (
                      <SelectItem key={form.id} value={form.id}>
                        {form.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="text-sm text-muted-foreground">
                  No forms found. <a href="/dashboard/forms/new" className="text-primary hover:underline">Create a form</a> first.
                </div>
              )}
            </div>
          )}
          
          {section.right_side.type !== 'form' && (
          <>
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={section.right_side.title || ''}
              onChange={(e) => onUpdate({
                right_side: { ...section.right_side, title: e.target.value }
              })}
              placeholder="Section title"
            />
          </div>
          <ColorPicker
            label="Title Color"
            colorKey="title_color"
            defaultValue="#000000"
            description="Color for the right side title"
            section={section.right_side}
            onColorChange={handleRightSideColorChange}
            onColorReset={handleRightSideColorReset}
          />
          </>
          )}
          
          {section.right_side.type === 'products' && (
            <>
              <div className="space-y-2">
                <Label>Product Limit</Label>
                <Input
                  type="number"
                  value={section.right_side.limit || 4}
                  onChange={(e) => onUpdate({
                    right_side: { ...section.right_side, limit: parseInt(e.target.value) || 4 }
                  })}
                  min={1}
                  max={12}
                />
              </div>
              <div className="space-y-2">
                <Label>Columns</Label>
                <Select
                  value={String(section.right_side.columns || 2)}
                  onValueChange={(value) => onUpdate({
                    right_side: { ...section.right_side, columns: parseInt(value) as any }
                  })}
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
            </>
          )}
          
          <div className="space-y-2">
            <Label>Text Alignment</Label>
            <Select
              value={section.right_side.text_alignment || 'left'}
              onValueChange={(value) => onUpdate({
                right_side: { ...section.right_side, text_alignment: value as any }
              })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Left</SelectItem>
                <SelectItem value="center">Center</SelectItem>
                <SelectItem value="right">Right</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <ColorPicker
            label="Background Color"
            colorKey="background_color"
            defaultValue="transparent"
            description="Background color for the right side"
            section={section.right_side}
            onColorChange={handleRightSideColorChange}
            onColorReset={handleRightSideColorReset}
          />
          
          <div className="space-y-2">
            <Label>Border Radius (px)</Label>
            <Input
              type="number"
              value={section.right_side.border_radius ?? 8}
              onChange={(e) => onUpdate({
                right_side: { ...section.right_side, border_radius: parseInt(e.target.value) || 0 }
              })}
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
  const handleColorChange = (colorKey: string, value: string) => {
    onUpdate({ [colorKey]: value });
  };

  const handleColorReset = (colorKey: string) => {
    onUpdate({ [colorKey]: undefined });
  };

  // Track if using custom URL
  const [useCustomUrl, setUseCustomUrl] = useState(false);

  // Fetch published pages for CTA link selection
  const { data: pagesData, isLoading: isLoadingPages } = useQuery({
    queryKey: ['pages', 'published'],
    queryFn: async () => {
      const response = await fetch('/api/pages?status=published&limit=100');
      if (!response.ok) {
        throw new Error('Failed to fetch pages');
      }
      return await response.json();
    },
  });

  const pages = useMemo(() => pagesData?.pages || [], [pagesData?.pages]);

  // Check if CTA link matches any page
  const getPageSlugForLink = useCallback((link: string | undefined): string | null => {
    if (!link) return null;
    const page = pages.find((p: any) => {
      const pageSlug = p.slug ? `/${p.slug}` : `#${p.id}`;
      return pageSlug === link;
    });
    return page ? (page.slug ? `/${page.slug}` : `#${page.id}`) : null;
  }, [pages]);

  // Check if current link is a custom URL
  const isCustomUrl = useCustomUrl || (section.cta_link && !getPageSlugForLink(section.cta_link));

  const handleCtaLinkChange = (value: string) => {
    if (value === '__custom__') {
      setUseCustomUrl(true);
      onUpdate({ cta_link: '' });
    } else {
      setUseCustomUrl(false);
      onUpdate({ cta_link: value });
    }
  };

  // Initialize custom URL state on mount
  useEffect(() => {
    if (section.cta_link && !getPageSlugForLink(section.cta_link)) {
      setUseCustomUrl(true);
    }
  }, [section.cta_link, getPageSlugForLink]);

  // Determine background type: 'color' or 'gradient'
  const backgroundType = section.background_gradient ? 'gradient' : 'color';

  const handleBackgroundTypeChange = (value: string) => {
    if (value === 'gradient') {
      // Switch to gradient - clear color if no gradient exists
      if (!section.background_gradient) {
        onUpdate({ background_gradient: 'linear-gradient(to right, #16a34a, #059669)' });
      }
    } else {
      // Switch to color - clear gradient
      onUpdate({ background_gradient: undefined });
    }
  };

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
        <ColorPicker
          label="Title Color"
          colorKey="title_color"
          defaultValue="#000000"
          description="Color for the CTA section title"
          section={section}
          onColorChange={handleColorChange}
          onColorReset={handleColorReset}
        />
        <div className="space-y-2">
          <Label>Subtitle</Label>
          <Input
            value={section.subtitle || ''}
            onChange={(e) => onUpdate({ subtitle: e.target.value })}
            placeholder="Fresh, Affordable, and Delivered to Your Door!"
          />
        </div>
        <ColorPicker
          label="Subtitle Color"
          colorKey="subtitle_color"
          defaultValue="#666666"
          description="Color for the CTA section subtitle"
          section={section}
          onColorChange={handleColorChange}
          onColorReset={handleColorReset}
        />
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
            {isLoadingPages ? (
              <div className="text-sm text-muted-foreground py-2">Loading pages...</div>
            ) : isCustomUrl ? (
              <div className="space-y-2">
                <Input
                  value={section.cta_link || ''}
                  onChange={(e) => onUpdate({ cta_link: e.target.value })}
                  placeholder="/products or https://example.com"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setUseCustomUrl(false);
                    onUpdate({ cta_link: '' });
                  }}
                >
                  Select a page instead
                </Button>
                <p className="text-xs text-muted-foreground">
                  Custom URL (e.g., /products, /about, or external URL)
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Select
                  value={section.cta_link || ''}
                  onValueChange={handleCtaLinkChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a page" />
                  </SelectTrigger>
                  <SelectContent>
                    {pages.map((page: any) => {
                      const pageSlug = page.slug ? `/${page.slug}` : `#${page.id}`;
                      return (
                        <SelectItem key={page.id} value={pageSlug}>
                          {page.title}
                        </SelectItem>
                      );
                    })}
                    <SelectItem value="__custom__">Custom URL...</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Select a page or choose &quot;Custom URL...&quot; for external links
                </p>
              </div>
            )}
          </div>
        </div>
        <ColorPicker
          label="CTA Text Color"
          colorKey="cta_text_color"
          defaultValue="#FFFFFF"
          description="Color for the CTA button text"
          section={section}
          onColorChange={handleColorChange}
          onColorReset={handleColorReset}
        />
        <ColorPicker
          label="CTA Button Color"
          colorKey="cta_button_color"
          defaultValue="#4CAF50"
          description="Background color for the CTA button"
          section={section}
          onColorChange={handleColorChange}
          onColorReset={handleColorReset}
        />
        
        {/* Background Style Selection */}
        <div className="space-y-3 border-t pt-4">
          <div className="space-y-2">
            <Label>Background Style</Label>
            <RadioGroup
              value={backgroundType}
              onValueChange={handleBackgroundTypeChange}
              className="flex gap-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="color" id="bg-color" />
                <Label htmlFor="bg-color" className="font-normal cursor-pointer">
                  Solid Color
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="gradient" id="bg-gradient" />
                <Label htmlFor="bg-gradient" className="font-normal cursor-pointer">
                  Gradient
                </Label>
              </div>
            </RadioGroup>
          </div>

          {backgroundType === 'color' ? (
            <ColorPicker
              label="Background Color"
              colorKey="background_color"
              defaultValue="#16A34A"
              description="Solid background color for the CTA section"
              section={section}
              onColorChange={handleColorChange}
              onColorReset={handleColorReset}
            />
          ) : (
            <div className="space-y-2">
              <Label htmlFor="background-gradient">Background Gradient</Label>
              <Input
                id="background-gradient"
                value={section.background_gradient || ''}
                onChange={(e) => onUpdate({ background_gradient: e.target.value })}
                placeholder="linear-gradient(to right, #16a34a, #059669)"
              />
              <p className="text-xs text-muted-foreground">
                Enter a CSS gradient string. Example: <code className="text-xs bg-muted px-1 py-0.5 rounded">linear-gradient(to right, #16a34a, #059669)</code>
              </p>
            </div>
          )}
        </div>
        <ColorPicker
          label="Text Color"
          colorKey="text_color"
          defaultValue="#FFFFFF"
          description="General text color for the CTA section (fallback)"
          section={section}
          onColorChange={handleColorChange}
          onColorReset={handleColorReset}
        />
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
  const handleColorChange = (colorKey: string, value: string) => {
    onUpdate({ [colorKey]: value });
  };

  const handleColorReset = (colorKey: string) => {
    onUpdate({ [colorKey]: undefined });
  };

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
        <ColorPicker
          label="Title Color"
          colorKey="title_color"
          defaultValue="#000000"
          description="Color for the section title"
          section={section}
          onColorChange={handleColorChange}
          onColorReset={handleColorReset}
        />
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
        <ColorPicker
          label="Background Color"
          colorKey="background_color"
          defaultValue="#FFFFFF"
          description="Background color for the product tabs section"
          section={section}
          onColorChange={handleColorChange}
          onColorReset={handleColorReset}
        />
      </CardContent>
    </Card>
  );
}

function FormSectionEditor({
  section,
  onUpdate,
}: {
  section: Extract<PageSection, { type: 'form' }>;
  onUpdate: (updates: Partial<PageSection>) => void;
}) {
  // Fetch available forms
  const { data: formsData, isLoading: formsLoading } = useQuery({
    queryKey: ['forms-list'],
    queryFn: async () => {
      const response = await fetch('/api/forms');
      if (!response.ok) return { forms: [] };
      return await response.json();
    },
  });

  // Helper function to handle color changes
  const handleColorChange = (colorKey: string, value: string) => {
    onUpdate({ [colorKey]: value });
  };

  // Helper function to reset color
  const handleColorReset = (colorKey: string) => {
    onUpdate({ [colorKey]: undefined });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Form Section</CardTitle>
        <CardDescription>
          Embed one of your created forms into the page
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="form-select">Select Form *</Label>
          {formsLoading ? (
            <div className="text-sm text-muted-foreground">Loading forms...</div>
          ) : formsData?.forms?.length > 0 ? (
            <Select
              value={section.form_id || ''}
              onValueChange={(value) => onUpdate({ form_id: value })}
            >
              <SelectTrigger id="form-select">
                <SelectValue placeholder="Select a form" />
              </SelectTrigger>
              <SelectContent>
                {formsData.forms.map((form: any) => (
                  <SelectItem key={form.id} value={form.id}>
                    {form.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="text-sm text-muted-foreground">
              No forms found. <a href="/dashboard/forms/new" className="text-primary hover:underline">Create a form</a> first.
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Choose a form to embed in this section
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="form-title">Section Title (Optional)</Label>
          <Input
            id="form-title"
            value={section.title || ''}
            onChange={(e) => onUpdate({ title: e.target.value })}
            placeholder="Contact Us"
          />
          <p className="text-xs text-muted-foreground">
            Add a title above the form
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="form-subtitle">Section Subtitle (Optional)</Label>
          <Input
            id="form-subtitle"
            value={section.subtitle || ''}
            onChange={(e) => onUpdate({ subtitle: e.target.value })}
            placeholder="We'd love to hear from you"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="show-form-title"
            checked={section.show_form_title !== false}
            onCheckedChange={(checked) => onUpdate({ show_form_title: checked === true })}
          />
          <Label htmlFor="show-form-title" className="cursor-pointer">
            Show form's own title
          </Label>
        </div>

        <div className="space-y-2">
          <Label htmlFor="max-width">Container Width</Label>
          <Select
            value={section.max_width || 'md'}
            onValueChange={(value: any) => onUpdate({ max_width: value })}
          >
            <SelectTrigger id="max-width">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sm">Small (max-w-sm)</SelectItem>
              <SelectItem value="md">Medium (max-w-md)</SelectItem>
              <SelectItem value="lg">Large (max-w-lg)</SelectItem>
              <SelectItem value="xl">Extra Large (max-w-xl)</SelectItem>
              <SelectItem value="full">Full Width</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <ColorPicker
          label="Background Color"
          colorKey="background_color"
          defaultValue="#FFFFFF"
          description="Background color for the form section"
          section={section}
          onColorChange={handleColorChange}
          onColorReset={handleColorReset}
        />

        <ColorPicker
          label="Title Color"
          colorKey="title_color"
          defaultValue="#000000"
          description="Color for the section title"
          section={section}
          onColorChange={handleColorChange}
          onColorReset={handleColorReset}
        />

        <ColorPicker
          label="Subtitle Color"
          colorKey="subtitle_color"
          defaultValue="#666666"
          description="Color for the section subtitle"
          section={section}
          onColorChange={handleColorChange}
          onColorReset={handleColorReset}
        />
      </CardContent>
    </Card>
  );
}

