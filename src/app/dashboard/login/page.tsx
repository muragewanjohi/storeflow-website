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
import TenantLoginForm from './tenant-login-form';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default function TenantAdminLoginPage() {
  return (
    <div className="min-h-screen">
      <Suspense fallback={
        <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#eff6ff] via-[#fcfeff] to-white px-4 py-12">
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
    </div>
  );
}
