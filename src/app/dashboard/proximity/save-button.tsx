'use client';

import type { ComponentProps, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type SaveButtonProps = ComponentProps<typeof Button> & {
  pending?: boolean;
  pendingLabel?: string;
  children: ReactNode;
};

export function SaveButton({
  pending = false,
  pendingLabel = 'Saving',
  children,
  className,
  disabled,
  ...props
}: SaveButtonProps) {
  return (
    <Button
      {...props}
      disabled={pending || disabled}
      aria-busy={pending}
      className={cn('relative overflow-hidden', pending && 'disabled:opacity-100', className)}
    >
      {pending && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 animate-pulse bg-white/25"
        />
      )}
      <span className="relative inline-flex items-center">
        {pending ? (
          <>
            <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            {pendingLabel}
          </>
        ) : (
          children
        )}
      </span>
    </Button>
  );
}
