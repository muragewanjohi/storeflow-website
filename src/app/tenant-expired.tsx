/**
 * Tenant Expired Page
 * 
 * Shown when tenant subscription has expired
 */

import Link from 'next/link';

export default function TenantExpired() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900">Subscription Expired</h1>
        <p className="mt-4 text-gray-600">
          This store&apos;s subscription has expired. Please renew your subscription to continue.
        </p>
        <div className="mt-8">
          <Link
            href="/admin/billing"
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Renew Subscription
          </Link>
        </div>
      </div>
    </div>
  );
}

