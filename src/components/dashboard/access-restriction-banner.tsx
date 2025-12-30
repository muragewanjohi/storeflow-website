/**
 * Access Restriction Banner Component
 * 
 * Displays warnings and restrictions based on tenant subscription status
 */

'use client';

import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { 
  ExclamationTriangleIcon, 
  LockClosedIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import type { TenantAccessRestriction } from '@/lib/tenant-context/access-control';

interface AccessRestrictionBannerProps {
  restriction: TenantAccessRestriction;
}

export function AccessRestrictionBanner({ restriction }: Readonly<AccessRestrictionBannerProps>) {
  // Don't show banner for full access
  if (restriction.level === 'full') {
    return null;
  }

  // Read-only access (grace period)
  if (restriction.level === 'read-only') {
    return (
      <Alert className="mb-6 border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
        <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />
        <AlertTitle className="text-yellow-800 dark:text-yellow-200">
          Subscription Expired - Grace Period Active
        </AlertTitle>
        <AlertDescription className="text-yellow-700 dark:text-yellow-300">
          <div className="mt-2 space-y-2">
            <p>{restriction.reason}</p>
            {restriction.daysRemaining !== undefined && (
              <p className="font-medium">
                {restriction.daysRemaining > 0 
                  ? `${restriction.daysRemaining} day${restriction.daysRemaining !== 1 ? 's' : ''} remaining in grace period`
                  : 'Grace period ends today'}
              </p>
            )}
            <div className="flex items-center gap-4 pt-2">
              <Button asChild size="sm" className="bg-yellow-600 hover:bg-yellow-700">
                <Link href="/dashboard/subscription">
                  Renew Subscription Now
                </Link>
              </Button>
              <p className="text-sm">
                You have read-only access. Editing and order processing are disabled.
              </p>
            </div>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Restricted access (suspended)
  if (restriction.level === 'restricted') {
    return (
      <Alert className="mb-6 border-red-500 bg-red-50 dark:bg-red-950">
        <LockClosedIcon className="h-5 w-5 text-red-600" />
        <AlertTitle className="text-red-800 dark:text-red-200">
          Account Suspended
        </AlertTitle>
        <AlertDescription className="text-red-700 dark:text-red-300">
          <div className="mt-2 space-y-2">
            <p>{restriction.reason}</p>
            <div className="flex items-center gap-4 pt-2">
              <Button asChild size="sm" className="bg-red-600 hover:bg-red-700">
                <Link href="/dashboard/subscription">
                  Restore Access
                </Link>
              </Button>
              <p className="text-sm">
                All data is preserved. Renew your subscription to restore full access.
              </p>
            </div>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Blocked access (deleted)
  if (restriction.level === 'blocked') {
    return (
      <Alert className="mb-6 border-gray-500 bg-gray-50 dark:bg-gray-950">
        <LockClosedIcon className="h-5 w-5 text-gray-600" />
        <AlertTitle className="text-gray-800 dark:text-gray-200">
          Account Deleted
        </AlertTitle>
        <AlertDescription className="text-gray-700 dark:text-gray-300">
          <p>{restriction.reason}</p>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}

