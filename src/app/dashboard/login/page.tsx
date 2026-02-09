/**
 * Tenant Admin Login Page
 * 
 * Login page for tenant store admins and staff
 * Accessible via tenant subdomain at /dashboard/login
 * 
 * This is separate from customer login (/customer-login) to clearly differentiate
 * between store admin access and customer access.
 */

import { Suspense } from 'react';
import StorefrontHeader from '@/components/storefront/header-server';
import StorefrontFooter from '@/components/storefront/footer';
import TenantLoginForm from './tenant-login-form';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default function TenantAdminLoginPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <StorefrontHeader />
      <Suspense fallback={
        <main className="flex-1 flex items-center justify-center bg-gray-50 px-4 py-12">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-2xl text-center">Store Admin Dashboard</CardTitle>
              <CardDescription className="text-center">
                Loading...
              </CardDescription>
            </CardHeader>
          </Card>
        </main>
      }>
        <TenantLoginForm />
      </Suspense>
      <StorefrontFooter />
    </div>
  );
}
