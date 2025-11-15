/**
 * Shared Component Template
 * 
 * Use this template to create reusable shared components
 * 
 * Guidelines:
 * - Components should be tenant-agnostic (tenant context handled by parent)
 * - Use TypeScript with proper typing
 * - Follow React best practices
 * - Use Tailwind CSS for styling
 * - Make components accessible (ARIA labels, keyboard navigation)
 * 
 * Example Usage:
 * 1. Copy this file to src/components/shared/[ComponentName].tsx
 * 2. Implement your component logic
 * 3. Export from src/components/shared/index.ts
 */

import React from 'react';
import { cn } from '@/lib/utils/cn';

export interface TemplateComponentProps {
  /** Component title */
  title: string;
  /** Optional description */
  description?: string;
  /** Additional CSS classes */
  className?: string;
  /** Children elements */
  children?: React.ReactNode;
}

/**
 * TemplateComponent - Example shared component
 * 
 * @example
 * ```tsx
 * <TemplateComponent
 *   title="Hello World"
 *   description="This is a template"
 *   className="custom-class"
 * >
 *   <p>Content here</p>
 * </TemplateComponent>
 * ```
 */
export function TemplateComponent({
  title,
  description,
  className,
  children,
}: Readonly<TemplateComponentProps>) {
  return (
    <div className={cn('rounded-lg border p-4', className)}>
      <h2 className="text-xl font-semibold">{title}</h2>
      {description && (
        <p className="mt-2 text-sm text-gray-600">{description}</p>
      )}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

