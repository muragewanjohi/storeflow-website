/**
 * Page Builder Component
 * 
 * Section-based page builder UI
 * 
 * Day 28: Content Management - Simple Page Builder
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusIcon, TrashIcon, ArrowUpIcon, ArrowDownIcon, EyeIcon } from '@heroicons/react/24/outline';
import { PageSection, PageBuilderData, SectionType } from '@/lib/content/page-builder-types';
import { SectionRenderer } from './section-templates';
import { SectionEditor } from './section-editor';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { Label } from '@/components/ui/label';

interface PageBuilderProps {
  value: string; // JSON string of PageBuilderData
  onChange: (value: string) => void;
  pageSlug?: string; // Page slug for preview
  pageId?: string; // Page ID for preview
  pageStatus?: string; // Page status (draft, published, archived)
  onSave?: () => void; // Callback to save the page
  isSaving?: boolean; // Whether the page is currently being saved
}

export default function PageBuilder({ value, onChange, pageSlug, pageId, pageStatus, onSave, isSaving }: Readonly<PageBuilderProps>) {
  // Parse initial data
  const parseData = (): PageBuilderData => {
    if (!value || value.trim() === '') {
      return { sections: [] };
    }
    try {
      const parsed = JSON.parse(value);
      return parsed.sections ? parsed : { sections: [] };
    } catch {
      return { sections: [] };
    }
  };

  const [data, setData] = useState<PageBuilderData>(parseData());
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [previewThemeId, setPreviewThemeId] = useState<string | null>(null);

  // Fetch available themes for preview
  const { data: themesData } = useQuery({
    queryKey: ['themes'],
    queryFn: async () => {
      const response = await fetch('/api/themes');
      if (!response.ok) return { themes: [] };
      return await response.json();
    },
  });

  // Fetch current theme
  const { data: currentThemeData } = useQuery({
    queryKey: ['current-theme'],
    queryFn: async () => {
      const response = await fetch('/api/themes/current');
      if (!response.ok) return null;
      return await response.json();
    },
  });

  // Update parent when data changes
  const updateData = (newData: PageBuilderData) => {
    setData(newData);
    onChange(JSON.stringify(newData));
  };

  // Add new section
  const addSection = (type: SectionType) => {
    const newSection = createDefaultSection(type, data.sections.length);
    const newData = {
      ...data,
      sections: [...data.sections, newSection],
    };
    updateData(newData);
    setSelectedSectionId(newSection.id);
    // Auto-switch to editor tab when adding a new section
    setActiveTab('editor');
  };

  // Update section
  const updateSection = (sectionId: string, updates: Partial<PageSection>) => {
    const newData = {
      ...data,
      sections: data.sections.map((s: any) =>
        s.id === sectionId ? { ...s, ...updates } as PageSection : s
      ),
    };
    updateData(newData);
  };

  // Delete section
  const deleteSection = (sectionId: string) => {
    const newData = {
      ...data,
      sections: data.sections.filter((s: any) => s.id !== sectionId),
    };
    updateData(newData);
    if (selectedSectionId === sectionId) {
      setSelectedSectionId(null);
    }
  };

  // Move section
  const moveSection = (sectionId: string, direction: 'up' | 'down') => {
    const index = data.sections.findIndex((s) => s.id === sectionId);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= data.sections.length) return;

    const newSections = [...data.sections];
    [newSections[index], newSections[newIndex]] = [newSections[newIndex], newSections[index]];
    
    // Update order numbers
    newSections.forEach((s, i) => {
      s.order = i;
    });

    const newData = { ...data, sections: newSections };
    updateData(newData);
  };

  const selectedSection = data.sections.find((s) => s.id === selectedSectionId);
  const [activeTab, setActiveTab] = useState('sections');

  // Auto-switch to editor tab when a section is selected
  const handleSectionSelect = (sectionId: string) => {
    setSelectedSectionId(sectionId);
    setActiveTab('editor');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Page Builder</h3>
          <p className="text-sm text-muted-foreground">
            Build your page using sections. Click a section type to add it, then click the section to edit it.
          </p>
        </div>
        <div className="flex gap-2">
          {pageSlug && (
            <Button
              variant="outline"
              size="sm"
              asChild
              disabled={pageStatus !== 'published'}
              title={pageStatus !== 'published' ? 'Publish the page first to preview it on the frontend' : 'Preview this page on the frontend'}
            >
              <a 
                href={pageStatus === 'published' ? `/${pageSlug}` : '#'} 
                target={pageStatus === 'published' ? '_blank' : undefined}
                rel={pageStatus === 'published' ? 'noopener noreferrer' : undefined}
                onClick={(e) => {
                  if (pageStatus !== 'published') {
                    e.preventDefault();
                  }
                }}
              >
                <EyeIcon className="mr-2 h-4 w-4" />
                Preview Page
              </a>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPreviewMode(!previewMode)}
          >
            <EyeIcon className="mr-2 h-4 w-4" />
            {previewMode ? 'Edit Sections' : 'Preview Sections'}
          </Button>
        </div>
      </div>

      {previewMode ? (
        // Preview Mode
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Label htmlFor="preview-theme" className="text-sm font-medium">
                  Preview with Theme:
                </Label>
                <Select
                  value={previewThemeId || currentThemeData?.theme?.id || ''}
                  onValueChange={setPreviewThemeId}
                >
                  <SelectTrigger id="preview-theme" className="w-[250px]">
                    <SelectValue placeholder="Select a theme" />
                  </SelectTrigger>
                  <SelectContent>
                    {themesData?.themes?.map((theme: any) => (
                      <SelectItem key={theme.id} value={theme.id}>
                        {theme.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Preview how sections look with different themes
                </p>
              </div>
            </CardContent>
          </Card>
          <div className="border rounded-lg p-4 bg-background">
            {data.sections.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <p>No sections added yet. Add sections to build your page.</p>
              </div>
            ) : (
              <div className="space-y-0">
                {data.sections
                  .sort((a: any, b: any) => a.order - b.order)
                  .map((section: any) => (
                    <SectionRenderer key={section.id} section={section} isPreview={true} />
                  ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        // Edit Mode
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-muted/50 border border-border">
            <TabsTrigger 
              value="sections"
              className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground/70 hover:text-foreground"
            >
              Sections
            </TabsTrigger>
            <TabsTrigger 
              value="editor" 
              disabled={!selectedSection}
              className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground/70 hover:text-foreground"
            >
              Edit Section {selectedSection && `(${getSectionTypeLabel(selectedSection.type)})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sections" className="space-y-4">
            {/* Add Section Buttons */}
            <Card>
              <CardHeader>
                <CardTitle>Add Section</CardTitle>
                <CardDescription>Choose a section type to add</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addSection('hero')}
                    className="flex flex-col items-center gap-1 h-auto py-3"
                  >
                    <span className="text-2xl">🎯</span>
                    <span className="text-xs">Hero</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addSection('features')}
                    className="flex flex-col items-center gap-1 h-auto py-3"
                  >
                    <span className="text-2xl">✨</span>
                    <span className="text-xs">Features</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addSection('products')}
                    className="flex flex-col items-center gap-1 h-auto py-3"
                  >
                    <span className="text-2xl">🛍️</span>
                    <span className="text-xs">Products</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addSection('testimonials')}
                    className="flex flex-col items-center gap-1 h-auto py-3"
                  >
                    <span className="text-2xl">💬</span>
                    <span className="text-xs">Testimonials</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addSection('text')}
                    className="flex flex-col items-center gap-1 h-auto py-3"
                  >
                    <span className="text-2xl">📝</span>
                    <span className="text-xs">Text</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addSection('image')}
                    className="flex flex-col items-center gap-1 h-auto py-3"
                  >
                    <span className="text-2xl">🖼️</span>
                    <span className="text-xs">Image</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addSection('categories')}
                    className="flex flex-col items-center gap-1 h-auto py-3"
                  >
                    <span className="text-2xl">📂</span>
                    <span className="text-xs">Categories</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addSection('banners')}
                    className="flex flex-col items-center gap-1 h-auto py-3"
                  >
                    <span className="text-2xl">🎨</span>
                    <span className="text-xs">Banners</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addSection('sales_tab')}
                    className="flex flex-col items-center gap-1 h-auto py-3"
                  >
                    <span className="text-2xl">⚡</span>
                    <span className="text-xs">Sales Tab</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addSection('split_layout')}
                    className="flex flex-col items-center gap-1 h-auto py-3"
                  >
                    <span className="text-2xl">📊</span>
                    <span className="text-xs">Split Layout</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addSection('cta')}
                    className="flex flex-col items-center gap-1 h-auto py-3"
                  >
                    <span className="text-2xl">📢</span>
                    <span className="text-xs">CTA</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addSection('product_tabs')}
                    className="flex flex-col items-center gap-1 h-auto py-3"
                  >
                    <span className="text-2xl">📑</span>
                    <span className="text-xs">Product Tabs</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addSection('form')}
                    className="flex flex-col items-center gap-1 h-auto py-3"
                  >
                    <span className="text-2xl">📋</span>
                    <span className="text-xs">Form</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addSection('blogs')}
                    className="flex flex-col items-center gap-1 h-auto py-3"
                  >
                    <span className="text-2xl">📰</span>
                    <span className="text-xs">Blogs</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addSection('location')}
                    className="flex flex-col items-center gap-1 h-auto py-3"
                  >
                    <span className="text-2xl">📍</span>
                    <span className="text-xs">Location</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Sections List */}
            {data.sections.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <p>No sections added yet. Click a section type above to get started.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {data.sections
                  .sort((a: any, b: any) => a.order - b.order)
                  .map((section: any, index: any) => (
                    <Card
                      key={section.id}
                      className={`cursor-pointer transition-colors ${
                        selectedSectionId === section.id
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-accent'
                      }`}
                      onClick={() => handleSectionSelect(section.id)}
                    >
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium">
                              {getSectionTypeLabel(section.type)} #{index + 1}
                            </span>
                            {section.type === 'hero' && 'title' in section && section.title && (
                              <span className="text-xs text-muted-foreground">
                                {section.title}
                              </span>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                moveSection(section.id, 'up');
                              }}
                              disabled={index === 0}
                            >
                              <ArrowUpIcon className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                moveSection(section.id, 'down');
                              }}
                              disabled={index === data.sections.length - 1}
                            >
                              <ArrowDownIcon className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteSection(section.id);
                              }}
                            >
                              <TrashIcon className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="editor">
            {selectedSection ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-base font-semibold">
                      Editing: {getSectionTypeLabel(selectedSection.type)} Section
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Configure the content and settings for this section below
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedSectionId(null);
                        setActiveTab('sections');
                      }}
                    >
                      Back to Sections
                    </Button>
                    {onSave && (
                      <Button
                        size="sm"
                        onClick={onSave}
                        disabled={isSaving}
                      >
                        {isSaving ? 'Saving...' : 'Save Page'}
                      </Button>
                    )}
                  </div>
                </div>
                <SectionEditor
                  section={selectedSection}
                  onUpdate={(updates) => updateSection(selectedSection.id, updates)}
                />
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <p className="mb-2">No section selected</p>
                  <p className="text-xs">Click on a section in the list above to edit it</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

// Helper function to create default sections
function createDefaultSection(type: SectionType, order: number): PageSection {
  const id = `section-${Date.now()}-${Math.random().toString(36).substring(2)}`;

  switch (type) {
    case 'hero':
      return {
        id,
        type: 'hero',
        order,
        title: 'Welcome to Our Store',
        subtitle: 'Discover amazing products',
        description: 'Add your hero section description here',
      };
    case 'features':
      return {
        id,
        type: 'features',
        order,
        title: 'Our Features',
        features: [
          {
            id: `feature-${Date.now()}-1`,
            title: 'Feature 1',
            description: 'Feature description',
          },
        ],
        columns: 3,
      };
    case 'products':
      return {
        id,
        type: 'products',
        order,
        title: 'Featured Products',
        limit: 8,
        columns: 4,
      };
    case 'testimonials':
      return {
        id,
        type: 'testimonials',
        order,
        title: 'What Our Customers Say',
        testimonials: [
          {
            id: `testimonial-${Date.now()}-1`,
            name: 'Customer Name',
            content: 'Great product!',
            rating: 5,
          },
        ],
        columns: 3,
      };
    case 'text':
      return {
        id,
        type: 'text',
        order,
        content: '<p>Add your text content here</p>',
      };
    case 'image':
      return {
        id,
        type: 'image',
        order,
        image: '',
        alt_text: '',
      };
    case 'categories':
      return {
        id,
        type: 'categories',
        order,
        title: 'Browse By Categories',
        category_ids: [], // Empty array means show all (up to limit)
        limit: 8,
        columns: 8,
        show_count: false,
      };
    case 'banners':
      return {
        id,
        type: 'banners',
        order,
        banners: [
          {
            id: `banner-${Date.now()}-1`,
            title: 'Banner Title',
            image: '',
            cta_text: 'Buy Now',
            cta_link: '/products',
          },
        ],
        columns: 3,
      };
    case 'sales_tab':
      return {
        id,
        type: 'sales_tab',
        order,
        display_mode: 'single_sale',
        layout: 'grid',
        columns: 4,
        title: 'Super Flash Sale',
        limit: 8,
        show_countdown: true,
        show_badge: true,
        show_sale_name: true,
        banner_style: 'contained',
        product_card_style: 'default',
        cta_text: 'Shop More',
        cta_position: 'top_right',
      };
    case 'split_layout':
      return {
        id,
        type: 'split_layout',
        order,
        layout_ratio: '50-50',
        mobile_behavior: 'stack',
        reverse_desktop: false,
        full_width: false,
        left_side: {
          type: 'banner',
          title: 'Special Offer',
          subtitle: 'Limited Time Only',
          image: '',
          cta_text: 'Shop Now',
          cta_link: '/products',
          text_alignment: 'center',
          vertical_alignment: 'middle',
          image_position: 'cover',
          overlay_opacity: 30,
          border_radius: 8,
        },
        right_side: {
          type: 'products',
          title: 'Featured Products',
          limit: 4,
          columns: 2,
          text_alignment: 'left',
          border_radius: 8,
        },
        spacing: {
          section_padding_top: 64,
          section_padding_bottom: 64,
          column_gap: 48,
          content_padding: 32,
        },
      };
    case 'cta':
      return {
        id,
        type: 'cta',
        order,
        title: 'We Make Your Daily Life More Easy',
        subtitle: 'Fresh, Affordable, and Delivered to Your Door!',
        cta_text: 'Continue Your Shopping',
        cta_link: '/products',
        background_gradient: 'linear-gradient(to right, #16a34a, #059669)',
        text_color: '#ffffff',
      };
    case 'product_tabs':
      return {
        id,
        type: 'product_tabs',
        order,
        title: 'Weekly Best Selling Organic Items',
        tabs: [
          {
            id: `tab-${Date.now()}-1`,
            label: 'Popular',
            filter: 'popular',
          },
          {
            id: `tab-${Date.now()}-2`,
            label: 'Newly Added',
            filter: 'new',
          },
          {
            id: `tab-${Date.now()}-3`,
            label: 'Low Price',
            filter: 'low_price',
          },
        ],
        limit: 8,
        columns: 4,
        default_tab: `tab-${Date.now()}-1`,
      };
    case 'form':
      return {
        id,
        type: 'form',
        order,
        form_id: '',
        title: '',
        subtitle: '',
        show_form_title: true,
        max_width: 'md',
      };
    case 'blogs':
      return {
        id,
        type: 'blogs',
        order,
        title: 'Latest Blog Posts',
        subtitle: 'Stay updated with our latest news and articles',
        layout: 'grid',
        columns: 3,
        limit: 6,
        show_excerpt: true,
        show_date: true,
        show_author: false,
        show_category: true,
        show_read_more: true,
        order_by: 'created_at',
        order_direction: 'desc',
        cta_text: 'View All Blogs',
        cta_link: '/blog',
      };
    case 'location':
      return {
        id,
        type: 'location',
        order,
        title: 'Find Us',
        subtitle: 'Visit our store location',
        address: '',
        map_type: 'roadmap',
        zoom: 15,
        height: 400,
        show_info_window: true,
        full_width: false,
      };
  }
}

function getSectionTypeLabel(type: SectionType): string {
  const labels: Record<SectionType, string> = {
    hero: 'Hero',
    categories: 'Categories',
    banners: 'Banners',
    sales_tab: 'Sales Tab',
    split_layout: 'Split Layout',
    cta: 'CTA',
    product_tabs: 'Product Tabs',
    features: 'Features',
    products: 'Products',
    testimonials: 'Testimonials',
    text: 'Text',
    image: 'Image',
    form: 'Form',
    blogs: 'Blogs',
    location: 'Location',
  };
  return labels[type];
}

