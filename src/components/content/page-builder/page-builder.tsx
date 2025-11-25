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

interface PageBuilderProps {
  value: string; // JSON string of PageBuilderData
  onChange: (value: string) => void;
}

export default function PageBuilder({ value, onChange }: Readonly<PageBuilderProps>) {
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
      sections: data.sections.map((s) =>
        s.id === sectionId ? { ...s, ...updates } as PageSection : s
      ),
    };
    updateData(newData);
  };

  // Delete section
  const deleteSection = (sectionId: string) => {
    const newData = {
      ...data,
      sections: data.sections.filter((s) => s.id !== sectionId),
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPreviewMode(!previewMode)}
          >
            <EyeIcon className="mr-2 h-4 w-4" />
            {previewMode ? 'Edit' : 'Preview'}
          </Button>
        </div>
      </div>

      {previewMode ? (
        // Preview Mode
        <div className="border rounded-lg p-4 bg-background">
          {data.sections.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <p>No sections added yet. Add sections to build your page.</p>
            </div>
          ) : (
            <div className="space-y-0">
              {data.sections
                .sort((a, b) => a.order - b.order)
                .map((section) => (
                  <SectionRenderer key={section.id} section={section} isPreview={true} />
                ))}
            </div>
          )}
        </div>
      ) : (
        // Edit Mode
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList>
            <TabsTrigger value="sections">Sections</TabsTrigger>
            <TabsTrigger value="editor" disabled={!selectedSection}>
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
                  .sort((a, b) => a.order - b.order)
                  .map((section, index) => (
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
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-base font-semibold">
                      Editing: {getSectionTypeLabel(selectedSection.type)} Section
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Configure the content and settings for this section below
                    </p>
                  </div>
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
  }
}

function getSectionTypeLabel(type: SectionType): string {
  const labels: Record<SectionType, string> = {
    hero: 'Hero',
    features: 'Features',
    products: 'Products',
    testimonials: 'Testimonials',
    text: 'Text',
    image: 'Image',
  };
  return labels[type];
}

