/**
 * Tenant Suspended Page
 * 
 * Shown when tenant account is suspended (past grace period)
 * Access is restricted - only login and payment/renewal allowed
 */

'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  LockClosedIcon,
  ShieldExclamationIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';

export default function TenantSuspended() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
            <LockClosedIcon className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-3xl">Account Suspended</CardTitle>
          <CardDescription className="text-base">
            Your subscription grace period has ended
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert className="border-red-500 bg-red-50 dark:bg-red-950">
            <ShieldExclamationIcon className="h-5 w-5 text-red-600" />
            <AlertDescription className="text-red-800 dark:text-red-200">
              <p className="font-medium">
                Your account has been suspended due to an expired subscription.
              </p>
              <p className="mt-2 text-sm">
                Access to your dashboard and storefront is currently restricted. 
                Renew your subscription to restore full access immediately.
              </p>
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <h3 className="font-semibold">Your Data is Safe</h3>
            <p className="text-sm text-muted-foreground">
              All your data, including products, orders, customers, and settings, 
              has been preserved and will be available immediately upon renewal.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold">To Restore Access:</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <ArrowRightIcon className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>Click &quot;Restore Access&quot; below to renew your subscription</span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRightIcon className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>Update your payment method if needed</span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRightIcon className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>Complete the payment process</span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRightIcon className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>Access will be restored immediately after successful payment</span>
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:justify-center">
            <Button asChild size="lg" className="bg-primary">
              <Link href="/dashboard/subscription?renew=1">
                Restore Access Now
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/dashboard/login">
                Login to Account
              </Link>
            </Button>
          </div>

          <div className="rounded-lg border border-muted bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">
              <strong>Need Help?</strong> If you have questions or need assistance with renewal, 
              please contact our support team. We&apos;re here to help!
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

