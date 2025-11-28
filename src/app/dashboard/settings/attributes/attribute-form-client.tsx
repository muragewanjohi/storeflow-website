/**
 * Attribute Form Client Component
 * 
 * Form for creating or editing an attribute with values
 */

'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeftIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface AttributeValue {
  id: string;
  value: string;
  color_code: string | null;
  image: string | null;
}

interface Attribute {
  id: string;
  name: string;
  type: string | null;
  attribute_values: AttributeValue[];
}

interface AttributeFormClientProps {
  attribute?: Attribute;
}

export default function AttributeFormClient({
  attribute,
}: Readonly<AttributeFormClientProps>) {
  const router = useRouter();
  const isEditing = !!attribute;

  const [formData, setFormData] = useState({
    name: attribute?.name || '',
    type: attribute?.type || ('text' as 'color' | 'size' | 'text' | 'number'),
  });

  const [values, setValues] = useState<Array<{
    id?: string;
    value: string;
    color_code: string;
  }>>(
    attribute?.attribute_values.map((v: any) => ({
      id: v.id,
      value: v.value,
      color_code: v.color_code || '',
    })) || []
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // Create or update attribute
      const attributePayload: any = {
        name: formData.name.trim(),
        type: formData.type,
      };

      const attributeUrl = isEditing ? `/api/attributes/${attribute.id}` : '/api/attributes';
      const attributeMethod = isEditing ? 'PUT' : 'POST';

      const attributeResponse = await fetch(attributeUrl, {
        method: attributeMethod,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(attributePayload),
      });

      if (!attributeResponse.ok) {
        const data = await attributeResponse.json();
        throw new Error(data.error || `Failed to ${isEditing ? 'update' : 'create'} attribute`);
      }

      const attributeData = await attributeResponse.json();
      const attributeId = isEditing ? attribute.id : attributeData.attribute.id;

      // Create or update attribute values
      for (let i = 0; i < values.length; i++) {
        const value = values[i];
        if (!value.value.trim()) continue;

        const valuePayload: any = {
          value: value.value.trim(),
        };

        if (formData.type === 'color' && value.color_code) {
          valuePayload.color_code = value.color_code;
        }

        if (value.id) {
          // Update existing value
          await fetch(`/api/attributes/${attributeId}/values/${value.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(valuePayload),
          });
        } else {
          // Create new value
          await fetch(`/api/attributes/${attributeId}/values`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(valuePayload),
          });
        }
      }

      router.push('/dashboard/settings/attributes');
    } catch (err: any) {
      setError(err.message || `Failed to ${isEditing ? 'update' : 'create'} attribute`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/settings/attributes">
            <ArrowLeftIcon className="mr-2 h-4 w-4" />
            Back to Attributes
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isEditing ? 'Edit Attribute' : 'Create Attribute'}
          </h1>
          <p className="text-muted-foreground mt-2">
            {isEditing ? 'Update attribute information' : 'Add a new product attribute'}
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Attribute Information</CardTitle>
              <CardDescription>Basic attribute details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Attribute Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Size, Color, Weight"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Attribute Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: 'color' | 'size' | 'text' | 'number') =>
                    setFormData({ ...formData, type: value })
                  }
                >
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="color">Color</SelectItem>
                    <SelectItem value="size">Size</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="mt-4 rounded-md border border-muted bg-muted/50 p-3 text-sm">
                <p className="font-medium mb-2">Examples:</p>
                <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
                  <li><strong>Size:</strong> Small, Medium, Large, XL</li>
                  <li><strong>Color:</strong> Red (#FF0000), Blue (#0000FF), Green (#00FF00)</li>
                  <li><strong>Weight:</strong> 200g, 500g, 1kg</li>
                  <li><strong>Material:</strong> Cotton, Polyester, Silk</li>
                </ul>
                <p className="text-xs text-muted-foreground mt-2">
                  Attributes are reusable across products. Once created, you can use them when creating product variants.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Attribute Values</CardTitle>
              <CardDescription>
                Add possible values for this attribute (e.g., Small, Medium, Large for Size)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Value</TableHead>
                    {formData.type === 'color' && (
                      <TableHead>Color Code</TableHead>
                    )}
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {values.map((val, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Input
                          value={val.value}
                          onChange={(e) => {
                            const newValues = [...values];
                            newValues[index].value = e.target.value;
                            setValues(newValues);
                          }}
                          placeholder="Enter value"
                          required
                        />
                      </TableCell>
                      {formData.type === 'color' && (
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Input
                              type="color"
                              value={val.color_code || '#000000'}
                              onChange={(e) => {
                                const newValues = [...values];
                                newValues[index].color_code = e.target.value;
                                setValues(newValues);
                              }}
                              className="w-16 h-10"
                            />
                            <Input
                              value={val.color_code || ''}
                              onChange={(e) => {
                                const newValues = [...values];
                                newValues[index].color_code = e.target.value;
                                setValues(newValues);
                              }}
                              placeholder="#000000"
                              className="font-mono"
                              maxLength={7}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Note: Variant images are uploaded per product variant, not here
                          </p>
                        </TableCell>
                      )}
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setValues(values.filter((_, i) => i !== index));
                          }}
                        >
                          <TrashIcon className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setValues([
                    ...values,
                    {
                      value: '',
                      color_code: formData.type === 'color' ? '#000000' : '',
                    },
                  ]);
                }}
              >
                <PlusIcon className="mr-2 h-4 w-4" />
                Add Value
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 flex justify-end gap-4">
          <Button type="button" variant="outline" asChild>
            <Link href="/dashboard/settings/attributes">Cancel</Link>
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? isEditing
                ? 'Updating...'
                : 'Creating...'
              : isEditing
                ? 'Update Attribute'
                : 'Create Attribute'}
          </Button>
        </div>
      </form>
    </div>
  );
}

