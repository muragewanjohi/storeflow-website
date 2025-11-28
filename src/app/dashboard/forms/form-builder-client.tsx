/**
 * Form Builder Client Component
 * 
 * Drag-and-drop form builder interface
 */

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { PlusIcon, TrashIcon, Bars3Icon } from '@heroicons/react/24/outline';
import { formFieldTypeSchema } from '@/lib/forms/validation';
import type { z } from 'zod';

type FormFieldType = z.infer<typeof formFieldTypeSchema>;

interface FormField {
  id: string;
  type: FormFieldType;
  label: string;
  name: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    minLength?: number;
    maxLength?: number;
  };
  order: number;
}

interface Form {
  id: string;
  title: string;
  slug: string | null;
  description: string | null;
  email: string | null;
  button_text: string | null;
  fields: FormField[];
  success_message: string | null;
  status: string;
}

interface FormBuilderClientProps {
  form?: Form;
}

const FIELD_TYPES: { value: FormFieldType; label: string; icon: string }[] = [
  { value: 'text', label: 'Text Input', icon: '📝' },
  { value: 'email', label: 'Email', icon: '📧' },
  { value: 'tel', label: 'Phone', icon: '📞' },
  { value: 'number', label: 'Number', icon: '🔢' },
  { value: 'textarea', label: 'Textarea', icon: '📄' },
  { value: 'select', label: 'Dropdown', icon: '📋' },
  { value: 'checkbox', label: 'Checkbox', icon: '☑️' },
  { value: 'radio', label: 'Radio', icon: '🔘' },
  { value: 'date', label: 'Date', icon: '📅' },
  { value: 'file', label: 'File Upload', icon: '📎' },
  { value: 'url', label: 'URL', icon: '🔗' },
];

export default function FormBuilderClient({ form }: Readonly<FormBuilderClientProps>) {
  const router = useRouter();
  const isEditing = !!form;
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: form?.title || '',
    slug: form?.slug || '',
    description: form?.description || '',
    email: form?.email || '',
    button_text: form?.button_text || 'Submit',
    success_message: form?.success_message || 'Thank you! Your form has been submitted successfully.',
    status: form?.status || 'active',
  });

  const [fields, setFields] = useState<FormField[]>(
    form?.fields && Array.isArray(form.fields) ? (form.fields as FormField[]) : []
  );

  // Generate slug from title
  const generateSlug = (text: string): string => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleTitleChange = (title: string) => {
    setFormData((prev) => ({
      ...prev,
      title,
      slug: prev.slug || generateSlug(title),
    }));
  };

  const addField = (type: FormFieldType) => {
    const newField: FormField = {
      id: `field-${Date.now()}`,
      type,
      label: '',
      name: '',
      placeholder: '',
      required: false,
      order: fields.length,
    };

    // Add options for select, radio, checkbox
    if (type === 'select' || type === 'radio' || type === 'checkbox') {
      newField.options = ['Option 1', 'Option 2'];
    }

    setFields([...fields, newField]);
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    setFields(fields.map((field: any) => (field.id === id ? { ...field, ...updates } : field)));
  };

  const deleteField = (id: string) => {
    setFields(fields.filter((field: any) => field.id !== id));
  };

  const moveField = (index: number, direction: 'up' | 'down') => {
    const newFields = [...fields];
    const newIndex = direction === 'up' ? index - 1 : index + 1;

    if (newIndex < 0 || newIndex >= newFields.length) return;

    [newFields[index], newFields[newIndex]] = [newFields[newIndex], newFields[index]];
    newFields.forEach((field, i) => {
      field.order = i;
    });

    setFields(newFields);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate form
    if (!formData.title.trim()) {
      setError('Form title is required');
      return;
    }

    // Validate fields
    for (const field of fields) {
      if (!field.label.trim()) {
        setError(`Field "${field.type}" is missing a label`);
        return;
      }
      if (!field.name.trim()) {
        setError(`Field "${field.label}" is missing a name`);
        return;
      }
      // Generate name from label if not provided
      if (!field.name.trim()) {
        field.name = generateSlug(field.label);
      }
    }

    startTransition(async () => {
      try {
        const url = isEditing ? `/api/forms/${form.id}` : '/api/forms';
        const method = isEditing ? 'PUT' : 'POST';

        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...formData,
            fields: fields.map((f: any) => ({
              ...f,
              name: f.name || generateSlug(f.label),
            })),
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          const errorData = data as { error?: string; errors?: any[] };
          throw new Error(errorData.error || `Failed to ${isEditing ? 'update' : 'create'} form`);
        }

        // Redirect to forms list
        router.push('/dashboard/forms');
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : `Failed to ${isEditing ? 'update' : 'create'} form`);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isEditing ? 'Edit Form' : 'New Form'}
          </h1>
          <p className="text-muted-foreground">
            {isEditing ? 'Update form configuration' : 'Create a new custom form'}
          </p>
        </div>
        <Link href="/dashboard/forms">
          <Button variant="outline">Back to Forms</Button>
        </Link>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/15 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Form Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Form Settings</CardTitle>
            <CardDescription>
              Basic form information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Form Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="e.g., Contact Form, Newsletter Signup"
                required
                disabled={isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData((prev) => ({ ...prev, slug: generateSlug(e.target.value) }))}
                placeholder="form-slug (auto-generated if empty)"
                disabled={isPending}
              />
              <p className="text-xs text-muted-foreground">
                URL-friendly version (auto-generated from title if left empty)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Optional form description"
                rows={2}
                disabled={isPending}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Notification Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="admin@example.com"
                  disabled={isPending}
                />
                <p className="text-xs text-muted-foreground">
                  Email to receive form submissions (optional)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="button_text">Submit Button Text</Label>
                <Input
                  id="button_text"
                  value={formData.button_text}
                  onChange={(e) => setFormData((prev) => ({ ...prev, button_text: e.target.value }))}
                  placeholder="Submit"
                  disabled={isPending}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="success_message">Success Message</Label>
              <Textarea
                id="success_message"
                value={formData.success_message}
                onChange={(e) => setFormData((prev) => ({ ...prev, success_message: e.target.value }))}
                placeholder="Thank you! Your form has been submitted successfully."
                rows={2}
                disabled={isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, status: value }))}
                disabled={isPending}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Form Fields Builder */}
        <Card>
          <CardHeader>
            <CardTitle>Form Fields</CardTitle>
            <CardDescription>
              Add and configure form fields
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Field Types Palette */}
            <div className="border rounded-lg p-4">
              <Label className="text-sm font-medium mb-2 block">Add Field</Label>
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {FIELD_TYPES.map((fieldType) => (
                  <Button
                    key={fieldType.value}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addField(fieldType.value)}
                    disabled={isPending}
                    className="flex flex-col items-center gap-1 h-auto py-2"
                  >
                    <span className="text-lg">{fieldType.icon}</span>
                    <span className="text-xs">{fieldType.label}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Fields List */}
            {fields.length === 0 ? (
              <div className="py-8 text-center border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">No fields added yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Click a field type above to add your first field
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <Card key={field.id} className="relative">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Bars3Icon className="h-5 w-5 text-muted-foreground" />
                          <Badge variant="outline">{field.type}</Badge>
                          {field.required && (
                            <Badge variant="secondary">Required</Badge>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => moveField(index, 'up')}
                            disabled={index === 0}
                          >
                            ↑
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => moveField(index, 'down')}
                            disabled={index === fields.length - 1}
                          >
                            ↓
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteField(field.id)}
                            disabled={isPending}
                          >
                            <TrashIcon className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Label *</Label>
                          <Input
                            value={field.label}
                            onChange={(e) => updateField(field.id, { label: e.target.value })}
                            placeholder="Field label"
                            required
                            disabled={isPending}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Field Name *</Label>
                          <Input
                            value={field.name}
                            onChange={(e) => updateField(field.id, { name: generateSlug(e.target.value) })}
                            placeholder="field-name"
                            required
                            disabled={isPending}
                          />
                        </div>
                      </div>

                      <div className="mt-4 space-y-2">
                        <Label>Placeholder</Label>
                        <Input
                          value={field.placeholder || ''}
                          onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                          placeholder="Placeholder text"
                          disabled={isPending}
                        />
                      </div>

                      {/* Options for select, radio, checkbox */}
                      {(field.type === 'select' || field.type === 'radio' || field.type === 'checkbox') && (
                        <div className="mt-4 space-y-2">
                          <Label>Options</Label>
                          {field.options?.map((option, optIndex) => (
                            <div key={optIndex} className="flex gap-2">
                              <Input
                                value={option}
                                onChange={(e) => {
                                  const newOptions = [...(field.options || [])];
                                  newOptions[optIndex] = e.target.value;
                                  updateField(field.id, { options: newOptions });
                                }}
                                placeholder={`Option ${optIndex + 1}`}
                                disabled={isPending}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const newOptions = field.options?.filter((_, i) => i !== optIndex) || [];
                                  updateField(field.id, { options: newOptions });
                                }}
                                disabled={isPending}
                              >
                                <TrashIcon className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newOptions = [...(field.options || []), `Option ${(field.options?.length || 0) + 1}`];
                              updateField(field.id, { options: newOptions });
                            }}
                            disabled={isPending}
                          >
                            <PlusIcon className="mr-2 h-4 w-4" />
                            Add Option
                          </Button>
                        </div>
                      )}

                      <div className="mt-4 flex items-center space-x-2">
                        <Checkbox
                          id={`required-${field.id}`}
                          checked={field.required}
                          onCheckedChange={(checked) => updateField(field.id, { required: !!checked })}
                          disabled={isPending}
                        />
                        <Label htmlFor={`required-${field.id}`} className="cursor-pointer">
                          Required field
                        </Label>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-4">
          <Button type="submit" disabled={isPending || !formData.title.trim()}>
            {isPending
              ? (isEditing ? 'Updating form...' : 'Creating form...')
              : (isEditing ? 'Update Form' : 'Create Form')}
          </Button>
          <Link href="/dashboard/forms">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}

