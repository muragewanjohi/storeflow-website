/**
 * Customer Login Page
 * 
 * Login page for customers (not tenant admins)
 */

import { Suspense } from 'react';
import CustomerLoginForm from './customer-login-form';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default function CustomerLoginPage() {
  return (
    <div className="min-h-screen">
      <Suspense fallback={
        <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#eff6ff] via-[#fcfeff] to-white px-4 py-12">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-2xl text-center">Customer Login</CardTitle>
              <CardDescription className="text-center">
                Loading...
              </CardDescription>
            </CardHeader>
          </Card>
        </main>
      }>
        <CustomerLoginForm />
      </Suspense>
    </div>
  );
}
