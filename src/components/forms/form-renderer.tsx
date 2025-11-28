/**
 * Form Renderer Component
 * 
 * Renders a form builder form for public-facing pages
 */

'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { z } from 'zod';
import { formFieldTypeSchema } from '@/lib/forms/validation';

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
  button_text: string | null;
  fields: FormField[];
  success_message: string | null;
}

interface FormRendererProps {
  form: Form;
  formId: string;
}

export default function FormRenderer({ form, formId }: Readonly<FormRendererProps>) {
  const [isPending, startTransition] = useTransition();
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleFieldChange = (name: string, value: any) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    for (const field of form.fields) {
      const value = formData[field.name];

      if (field.required && (!value || (Array.isArray(value) && value.length === 0))) {
        newErrors[field.name] = `${field.label} is required`;
      }

      if (value) {
        // Email validation
        if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          newErrors[field.name] = 'Please enter a valid email address';
        }

        // URL validation
        if (field.type === 'url' && !/^https?:\/\/.+/.test(value)) {
          newErrors[field.name] = 'Please enter a valid URL';
        }

        // Number validation
        if (field.type === 'number') {
          const numValue = Number(value);
          if (isNaN(numValue)) {
            newErrors[field.name] = 'Please enter a valid number';
          } else {
            if (field.validation?.min !== undefined && numValue < field.validation.min) {
              newErrors[field.name] = `Value must be at least ${field.validation.min}`;
            }
            if (field.validation?.max !== undefined && numValue > field.validation.max) {
              newErrors[field.name] = `Value must be at most ${field.validation.max}`;
            }
          }
        }

        // Length validation
        if (field.validation?.minLength && String(value).length < field.validation.minLength) {
          newErrors[field.name] = `Must be at least ${field.validation.minLength} characters`;
        }
        if (field.validation?.maxLength && String(value).length > field.validation.maxLength) {
          newErrors[field.name] = `Must be at most ${field.validation.maxLength} characters`;
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validateForm()) {
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch(`/api/forms/${formId}/submit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            data: formData,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to submit form');
        }

        setSubmitted(true);
        setFormData({});
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : 'Failed to submit form');
      }
    });
  };

  if (submitted) {
    return (
      <Alert className="bg-green-50 border-green-200">
        <AlertDescription className="text-green-800">
          {form.success_message || 'Thank you! Your form has been submitted successfully.'}
        </AlertDescription>
      </Alert>
    );
  }

  // Sort fields by order
  const sortedFields = [...form.fields].sort((a: any, b: any) => a.order - b.order);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {form.description && (
        <p className="text-muted-foreground">{form.description}</p>
      )}

      {submitError && (
        <Alert variant="destructive">
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        {sortedFields.map((field: any) => (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>

            {field.type === 'textarea' ? (
              <Textarea
                id={field.name}
                name={field.name}
                value={formData[field.name] || ''}
                onChange={(e) => handleFieldChange(field.name, e.target.value)}
                placeholder={field.placeholder}
                required={field.required}
                disabled={isPending}
                rows={4}
              />
            ) : field.type === 'select' ? (
              <Select
                value={formData[field.name] || ''}
                onValueChange={(value) => handleFieldChange(field.name, value)}
                required={field.required}
                disabled={isPending}
              >
                <SelectTrigger id={field.name}>
                  <SelectValue placeholder={field.placeholder || 'Select an option'} />
                </SelectTrigger>
                <SelectContent>
                  {field.options?.map((option: any, index: any) => (
                    <SelectItem key={index} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : field.type === 'radio' ? (
              <RadioGroup
                value={formData[field.name] || ''}
                onValueChange={(value) => handleFieldChange(field.name, value)}
                required={field.required}
                disabled={isPending}
              >
                {field.options?.map((option: any, index: any) => (
                  <div key={index} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`${field.name}-${index}`} />
                    <Label htmlFor={`${field.name}-${index}`} className="cursor-pointer font-normal">
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            ) : field.type === 'checkbox' ? (
              <div className="space-y-2">
                {field.options?.map((option: any, index: any) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Checkbox
                      id={`${field.name}-${index}`}
                      checked={(formData[field.name] as string[])?.includes(option) || false}
                      onCheckedChange={(checked) => {
                        const current = (formData[field.name] as string[]) || [];
                        const updated = checked
                          ? [...current, option]
                          : current.filter((v: any) => v !== option);
                        handleFieldChange(field.name, updated);
                      }}
                      disabled={isPending}
                    />
                    <Label htmlFor={`${field.name}-${index}`} className="cursor-pointer font-normal">
                      {option}
                    </Label>
                  </div>
                ))}
              </div>
            ) : field.type === 'file' ? (
              <Input
                id={field.name}
                name={field.name}
                type="file"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  handleFieldChange(field.name, file?.name || '');
                }}
                required={field.required}
                disabled={isPending}
              />
            ) : (
              <Input
                id={field.name}
                name={field.name}
                type={field.type}
                value={formData[field.name] || ''}
                onChange={(e) => handleFieldChange(field.name, e.target.value)}
                placeholder={field.placeholder}
                required={field.required}
                disabled={isPending}
                min={field.validation?.min}
                max={field.validation?.max}
                minLength={field.validation?.minLength}
                maxLength={field.validation?.maxLength}
                pattern={field.validation?.pattern}
              />
            )}

            {errors[field.name] && (
              <p className="text-sm text-destructive">{errors[field.name]}</p>
            )}
          </div>
        ))}
      </div>

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? 'Submitting...' : (form.button_text || 'Submit')}
      </Button>
    </form>
  );
}

