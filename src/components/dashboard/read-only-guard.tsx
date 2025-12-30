/**
 * Read-Only Guard Component
 * 
 * Wraps content that should be disabled in read-only mode
 * Disables interactive elements and shows visual indication
 */

'use client';

import { ReactNode } from 'react';
import type { TenantAccessRestriction } from '@/lib/tenant-context/access-control';

interface ReadOnlyGuardProps {
  restriction: TenantAccessRestriction;
  children: ReactNode;
  fallback?: ReactNode;
  showMessage?: boolean;
}

export function ReadOnlyGuard({ 
  restriction, 
  children, 
  fallback,
  showMessage = false
}: Readonly<ReadOnlyGuardProps>) {
  // If full access, render children normally
  if (restriction.level === 'full') {
    return <>{children}</>;
  }

  // If read-only or restricted, show disabled version
  if (restriction.level === 'read-only' || restriction.level === 'restricted') {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="relative">
        <div className="pointer-events-none opacity-50">
          {children}
        </div>
        {showMessage && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <p className="text-sm text-muted-foreground">
              {restriction.reason || 'This action is disabled. Please renew your subscription.'}
            </p>
          </div>
        )}
      </div>
    );
  }

  // Blocked - don't render
  return null;
}

