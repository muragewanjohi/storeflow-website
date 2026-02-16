/**
 * Page Builder Component
 * 
 * Split-panel page builder UI with drag-and-drop section reordering,
 * grouped section picker, section summaries, hide/show, and duplicate.
 */

'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PlusIcon, TrashIcon, ArrowUpIcon, ArrowDownIcon, EyeIcon, XMarkIcon, EyeSlashIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline';
import { GripVertical, Search } from 'lucide-react';
import { PageSection, PageBuilderData, SectionType } from '@/lib/content/page-builder-types';
import { SectionRenderer } from './section-templates';
import { SectionEditor } from './section-editor';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useQuery } from '@tanstack/react-query';
import { Label } from '@/components/ui/label';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ─── Section type metadata ───────────────────────────────────────────────────

const SECTION_TYPE_META: Record<SectionType, { icon: string; label: string }> = {
  hero: { icon: '🎯', label: 'Hero' },
  features: { icon: '✨', label: 'Features' },
  products: { icon: '🛍️', label: 'Products' },
  testimonials: { icon: '💬', label: 'Testimonials' },
  text: { icon: '📝', label: 'Text' },
  image: { icon: '🖼️', label: 'Image' },
  categories: { icon: '📂', label: 'Categories' },
  banners: { icon: '🎨', label: 'Banners' },
  sales_tab: { icon: '⚡', label: 'Sales Tab' },
  split_layout: { icon: '📊', label: 'Split Layout' },
  cta: { icon: '📢', label: 'CTA' },
  product_tabs: { icon: '📑', label: 'Product Tabs' },
  form: { icon: '📋', label: 'Form' },
  blogs: { icon: '📰', label: 'Blogs' },
  location: { icon: '📍', label: 'Location' },
};

const SECTION_GROUPS: { label: string; types: SectionType[] }[] = [
  { label: 'Hero & Headers', types: ['hero', 'banners'] },
  { label: 'Products', types: ['products', 'product_tabs', 'categories', 'sales_tab'] },
  { label: 'Content', types: ['text', 'image', 'split_layout', 'features'] },
  { label: 'Social Proof', types: ['testimonials', 'blogs'] },
  { label: 'Conversion', types: ['cta', 'form'] },
  { label: 'Other', types: ['location'] },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getSectionTypeLabel(type: SectionType): string {
  return SECTION_TYPE_META[type]?.label ?? type;
}

function getSectionSummary(section: any): string {
  switch (section.type) {
    case 'hero':
      return section.title ? truncate(section.title, 40) : 'No title';
    case 'products':
      return `${section.limit ?? 0} products`;
    case 'banners':
      return `${section.banners?.length ?? 0} banners`;
    case 'categories':
      return `${section.limit ?? 0} categories`;
    case 'features':
      return `${section.features?.length ?? 0} features`;
    case 'cta':
      return section.cta_text ? truncate(section.cta_text, 40) : 'Call to action';
    case 'text':
      return section.content ? truncate(stripHtml(section.content), 40) : 'Empty text';
    case 'blogs':
      return `${section.limit ?? 0} posts`;
    case 'testimonials':
      return `${section.testimonials?.length ?? 0} testimonials`;
    case 'product_tabs':
      return `${section.tabs?.length ?? 0} tabs`;
    case 'sales_tab':
      return section.title ? truncate(section.title, 40) : 'Sales section';
    case 'split_layout':
      return section.layout_ratio ?? '50-50';
    case 'image':
      return section.alt_text ? truncate(section.alt_text, 40) : 'Image';
    case 'form':
      return section.title ? truncate(section.title, 40) : 'Form';
    case 'location':
      return section.address ? truncate(section.address, 40) : 'Location';
    default:
      return '';
  }
}

function truncate(str: string, max: number): string {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) + '...' : str;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

// ─── Sortable Section Item ──────────────────────────────────────────────────

interface SortableSectionItemProps {
  section: any;
  index: number;
  totalCount: number;
  isSelected: boolean;
  onSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onToggleHidden: () => void;
}

function SortableSectionItem({
  section,
  index,
  totalCount,
  isSelected,
  onSelect,
  onMoveUp,
  onMoveDown,
  onDelete,
  onDuplicate,
  onToggleHidden,
}: Readonly<SortableSectionItemProps>) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.5 : undefined,
  };

  const meta = SECTION_TYPE_META[section.type as SectionType];
  const isHidden = !!section.hidden;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group rounded-lg border bg-card text-card-foreground transition-colors cursor-pointer ${
        isSelected
          ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
          : 'hover:bg-accent/50'
      } ${isHidden ? 'opacity-60' : ''}`}
      onClick={onSelect}
    >
      <div className="flex items-center gap-2 px-3 py-2.5">
        {/* Drag handle */}
        <button
          type="button"
          className="cursor-grab touch-none text-muted-foreground hover:text-foreground shrink-0"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {/* Icon + label + summary */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-base shrink-0">{meta?.icon}</span>
            <span className="text-sm font-medium truncate">
              {meta?.label ?? section.type} #{index + 1}
            </span>
            {isHidden && (
              <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                Hidden
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {getSectionSummary(section)}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title={isHidden ? 'Show section' : 'Hide section'}
            onClick={(e) => { e.stopPropagation(); onToggleHidden(); }}
          >
            {isHidden ? (
              <EyeSlashIcon className="h-3.5 w-3.5" />
            ) : (
              <EyeIcon className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Duplicate section"
            onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
          >
            <DocumentDuplicateIcon className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Move up"
            disabled={index === 0}
            onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
          >
            <ArrowUpIcon className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Move down"
            disabled={index === totalCount - 1}
            onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
          >
            <ArrowDownIcon className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            title="Delete section"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
          >
            <TrashIcon className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Quick-Add Between Sections ─────────────────────────────────────────────

interface QuickAddButtonProps {
  onAddSection: (type: SectionType) => void;
}

function QuickAddButton({ onAddSection }: Readonly<QuickAddButtonProps>) {
  return (
    <div className="flex justify-center py-0.5 opacity-0 hover:opacity-100 transition-opacity">
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex items-center justify-center w-6 h-6 rounded-full border border-dashed border-muted-foreground/40 text-muted-foreground/60 hover:border-primary hover:text-primary transition-colors"
          >
            <PlusIcon className="h-3.5 w-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2" align="center">
          <p className="text-xs font-medium text-muted-foreground mb-2 px-1">Add section</p>
          <div className="grid grid-cols-3 gap-1">
            {Object.entries(SECTION_TYPE_META).map(([type, meta]) => (
              <button
                key={type}
                type="button"
                onClick={() => onAddSection(type as SectionType)}
                className="flex flex-col items-center gap-0.5 p-2 rounded-md hover:bg-accent text-xs transition-colors"
              >
                <span className="text-lg">{meta.icon}</span>
                <span className="truncate w-full text-center">{meta.label}</span>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// ─── Grouped Section Picker ─────────────────────────────────────────────────

interface SectionPickerProps {
  onAddSection: (type: SectionType) => void;
}

function SectionPicker({ onAddSection }: Readonly<SectionPickerProps>) {
  const [search, setSearch] = useState('');

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return SECTION_GROUPS;
    const q = search.toLowerCase();
    return SECTION_GROUPS
      .map((group) => ({
        ...group,
        types: group.types.filter((t) => {
          const meta = SECTION_TYPE_META[t];
          return meta?.label.toLowerCase().includes(q);
        }),
      }))
      .filter((group) => group.types.length > 0);
  }, [search]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Add Section</CardTitle>
        <div className="relative mt-2">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search sections..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {filteredGroups.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-3">No sections found</p>
        ) : (
          <Accordion type="multiple" defaultValue={['Hero & Headers']} className="w-full">
            {filteredGroups.map((group) => (
              <AccordionItem key={group.label} value={group.label} className="border-b-0">
                <AccordionTrigger className="py-2 text-xs font-medium hover:no-underline">
                  {group.label}
                </AccordionTrigger>
                <AccordionContent className="pb-2">
                  <div className="grid grid-cols-2 gap-1">
                    {group.types.map((type) => {
                      const meta = SECTION_TYPE_META[type];
                      return (
                        <Button
                          key={type}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => onAddSection(type)}
                          className="flex items-center gap-1.5 h-auto py-1.5 px-2 justify-start text-xs"
                        >
                          <span className="text-base">{meta.icon}</span>
                          <span>{meta.label}</span>
                        </Button>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main PageBuilder ───────────────────────────────────────────────────────

interface PageBuilderProps {
  value: string;
  onChange: (value: string) => void;
  pageSlug?: string;
  pageId?: string;
  pageStatus?: string;
  onSave?: () => void;
  isSaving?: boolean;
  previewOpen?: boolean;
  onPreviewOpenChange?: (open: boolean) => void;
}

export default function PageBuilder({ value, onChange, pageSlug, pageId, pageStatus, onSave, isSaving, previewOpen: controlledPreviewOpen, onPreviewOpenChange }: Readonly<PageBuilderProps>) {
  const parseData = (): PageBuilderData => {
    if (!value || value.trim() === '') return { sections: [] };
    try {
      const parsed = JSON.parse(value);
      return parsed.sections ? parsed : { sections: [] };
    } catch {
      return { sections: [] };
    }
  };

  const [data, setData] = useState<PageBuilderData>(parseData());
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [internalPreviewOpen, setInternalPreviewOpen] = useState(false);
  const [previewThemeId, setPreviewThemeId] = useState<string | null>(null);

  const isControlledPreview = controlledPreviewOpen !== undefined && onPreviewOpenChange !== undefined;
  const previewMode = isControlledPreview ? controlledPreviewOpen : internalPreviewOpen;
  const setPreviewMode = isControlledPreview ? onPreviewOpenChange! : setInternalPreviewOpen;

  const { data: themesData } = useQuery({
    queryKey: ['themes'],
    queryFn: async () => {
      const response = await fetch('/api/themes');
      if (!response.ok) return { themes: [] };
      return await response.json();
    },
  });

  const { data: currentThemeData } = useQuery({
    queryKey: ['current-theme'],
    queryFn: async () => {
      const response = await fetch('/api/themes/current');
      if (!response.ok) return null;
      return await response.json();
    },
  });

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const updateData = (newData: PageBuilderData) => {
    setData(newData);
    onChange(JSON.stringify(newData));
  };

  const sortedSections = useMemo(
    () => [...data.sections].sort((a, b) => a.order - b.order),
    [data.sections],
  );

  const selectedSection = data.sections.find((s) => s.id === selectedSectionId);

  // ─── Section CRUD ────────────────────────────────────────────────────────

  const addSection = (type: SectionType, insertAtIndex?: number) => {
    const order = insertAtIndex ?? data.sections.length;
    const newSection = createDefaultSection(type, order);
    const newSections = [...data.sections];
    newSections.splice(order, 0, newSection);
    newSections.forEach((s, i) => { s.order = i; });
    updateData({ ...data, sections: newSections });
    setSelectedSectionId(newSection.id);
  };

  const updateSection = (sectionId: string, updates: Partial<PageSection>) => {
    const newData = {
      ...data,
      sections: data.sections.map((s: any) =>
        s.id === sectionId ? { ...s, ...updates } as PageSection : s
      ),
    };
    updateData(newData);
  };

  const deleteSection = (sectionId: string) => {
    const newSections = data.sections.filter((s) => s.id !== sectionId);
    newSections.forEach((s, i) => { s.order = i; });
    updateData({ ...data, sections: newSections });
    if (selectedSectionId === sectionId) setSelectedSectionId(null);
  };

  const duplicateSection = (sectionId: string) => {
    const section = sortedSections.find((s) => s.id === sectionId);
    if (!section) return;
    const idx = sortedSections.indexOf(section);
    const newSection = {
      ...structuredClone(section),
      id: `section-${Date.now()}-${Math.random().toString(36).substring(2)}`,
      order: idx + 1,
    } as PageSection;
    const newSections = [...sortedSections];
    newSections.splice(idx + 1, 0, newSection);
    newSections.forEach((s, i) => { s.order = i; });
    updateData({ ...data, sections: newSections });
    setSelectedSectionId(newSection.id);
  };

  const toggleSectionHidden = (sectionId: string) => {
    updateSection(sectionId, { hidden: !data.sections.find((s) => s.id === sectionId)?.hidden } as any);
  };

  const moveSection = (sectionId: string, direction: 'up' | 'down') => {
    const index = sortedSections.findIndex((s) => s.id === sectionId);
    if (index === -1) return;
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= sortedSections.length) return;
    const newSections = arrayMove([...sortedSections], index, newIndex);
    newSections.forEach((s, i) => { s.order = i; });
    updateData({ ...data, sections: newSections });
  };

  // ─── DnD handler ─────────────────────────────────────────────────────────

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sortedSections.findIndex((s) => s.id === active.id);
    const newIndex = sortedSections.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const newSections = arrayMove([...sortedSections], oldIndex, newIndex);
    newSections.forEach((s, i) => { s.order = i; });
    updateData({ ...data, sections: newSections });
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Page Builder</h3>
          <p className="text-sm text-muted-foreground">
            Click a section to edit it. Drag to reorder.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPreviewMode(true)}
          >
            <EyeIcon className="mr-2 h-4 w-4" />
            Preview
          </Button>
        </div>
      </div>

      {previewMode ? (
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewMode(false)}
                  aria-label="Close preview"
                >
                  <XMarkIcon className="mr-2 h-4 w-4" />
                  Close
                </Button>
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
                {sortedSections
                  .filter((s: any) => !s.hidden)
                  .map((section: any) => (
                    <SectionRenderer key={section.id} section={section} isPreview={true} />
                  ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ── Split-Panel Edit Mode ─────────────────────────────────────── */
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Left panel: section picker + section list */}
          <div className="w-full lg:w-[340px] shrink-0 space-y-3">
            <SectionPicker onAddSection={(type) => addSection(type)} />

            {sortedSections.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <p className="text-sm mb-1">No sections yet</p>
                  <p className="text-xs">
                    Your page is built from sections. Choose a section type above to get started.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={sortedSections.map((s) => s.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-1">
                    {sortedSections.map((section, index) => (
                      <div key={section.id}>
                        {/* Quick add between sections */}
                        {index === 0 && (
                          <QuickAddButton onAddSection={(type) => addSection(type, 0)} />
                        )}
                        <SortableSectionItem
                          section={section}
                          index={index}
                          totalCount={sortedSections.length}
                          isSelected={selectedSectionId === section.id}
                          onSelect={() => setSelectedSectionId(section.id)}
                          onMoveUp={() => moveSection(section.id, 'up')}
                          onMoveDown={() => moveSection(section.id, 'down')}
                          onDelete={() => deleteSection(section.id)}
                          onDuplicate={() => duplicateSection(section.id)}
                          onToggleHidden={() => toggleSectionHidden(section.id)}
                        />
                        <QuickAddButton onAddSection={(type) => addSection(type, index + 1)} />
                      </div>
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>

          {/* Right panel: section editor */}
          <div className="flex-1 min-w-0">
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
                <SectionEditor
                  section={selectedSection}
                  onUpdate={(updates) => updateSection(selectedSection.id, updates)}
                />
              </div>
            ) : (
              <Card>
                <CardContent className="py-16 text-center text-muted-foreground">
                  <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                    <EyeIcon className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-medium mb-1">No section selected</p>
                  <p className="text-xs">
                    Click a section on the left to edit it, or drag sections to reorder.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Default Section Factory ────────────────────────────────────────────────

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
        category_ids: [],
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
          image: '',
          cta_link: '/products',
          image_position: 'cover',
          border_radius: 8,
          background_color: 'transparent',
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
