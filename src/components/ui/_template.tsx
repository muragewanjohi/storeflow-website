/**
 * UI Component Template (shadcn/ui style)
 * 
 * Use this template to create base UI components
 * These are low-level, reusable UI primitives
 * 
 * Guidelines:
 * - Keep components simple and focused
 * - Use Radix UI primitives when possible
 * - Follow shadcn/ui patterns
 * - Make components fully accessible
 * - Support dark mode
 * - Use Tailwind CSS with CSS variables for theming
 * 
 * Example Usage:
 * 1. Copy this file to src/components/ui/[ComponentName].tsx
 * 2. Implement your component using Radix UI if needed
 * 3. Style with Tailwind CSS
 * 4. Export from src/components/ui/index.ts
 */

import * as React from 'react';
import { cn } from '@/lib/utils/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button variant */
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Button - Base button component
 * 
 * @example
 * ```tsx
 * <Button variant="default" size="md" onClick={handleClick}>
 *   Click me
 * </Button>
 * ```
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => {
    return (
      <button
        className={cn(
          'inline-flex items-center justify-center rounded-md font-medium transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          {
            'bg-primary text-primary-foreground hover:bg-primary/90': variant === 'default',
            'border border-input bg-background hover:bg-accent': variant === 'outline',
            'hover:bg-accent hover:text-accent-foreground': variant === 'ghost',
            'bg-destructive text-destructive-foreground hover:bg-destructive/90': variant === 'destructive',
          },
          {
            'h-9 px-4 py-2': size === 'md',
            'h-8 px-3 text-sm': size === 'sm',
            'h-10 px-6': size === 'lg',
          },
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';

