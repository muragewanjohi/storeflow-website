/**
 * Tenant Expired Page
 * 
 * Shown when tenant subscription has expired (grace period)
 * Users can still access dashboard in read-only mode
 */

'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ExclamationTriangleIcon, 
  ClockIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';

const GRACE_PERIOD_DAYS = parseInt(process.env.SUBSCRIPTION_GRACE_PERIOD_DAYS || '2');

export default function TenantExpired() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900">
            <ExclamationTriangleIcon className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
          </div>
          <CardTitle className="text-3xl">Subscription Expired</CardTitle>
          <CardDescription className="text-base">
            Your subscription has expired, but you&apos;re still in the grace period
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
            <ClockIcon className="h-5 w-5 text-yellow-600" />
            <AlertDescription className="text-yellow-800 dark:text-yellow-200">
              <p className="font-medium">
                Grace Period Active: {GRACE_PERIOD_DAYS} Day{GRACE_PERIOD_DAYS !== 1 ? 's' : ''} Remaining
              </p>
              <p className="mt-2 text-sm">
                You currently have <strong>read-only access</strong> to your dashboard. 
                You can view your data, but editing and order processing are disabled.
              </p>
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <h3 className="font-semibold">What You Can Do:</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <ArrowRightIcon className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>View your dashboard and data (read-only)</span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRightIcon className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>Renew your subscription to restore full access</span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRightIcon className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>Update your payment method if needed</span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRightIcon className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>Contact support for assistance</span>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold">What&apos;s Restricted:</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-destructive">✗</span>
                <span>Creating or editing products, orders, and content</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-destructive">✗</span>
                <span>Processing new customer orders</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-destructive">✗</span>
                <span>Data exports and bulk operations</span>
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:justify-center">
            <Button asChild size="lg" className="bg-primary">
              <Link href="/dashboard/subscription?renew=1">
                Renew Subscription Now
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/dashboard">
                Continue to Dashboard (Read-Only)
              </Link>
            </Button>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            After the grace period ends, your account will be suspended and access will be restricted. 
            All your data is safe and will be preserved.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

