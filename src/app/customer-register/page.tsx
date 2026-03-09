/**
 * Customer Registration Page
 * 
 * Registration page for new customers
 */

import { Suspense } from 'react';
import CustomerRegisterForm from './customer-register-form';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default function CustomerRegisterPage() {
  return (
    <div className="min-h-screen">
      <Suspense fallback={
        <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#eff6ff] via-[#fcfeff] to-white px-4 py-12">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-2xl text-center">Customer Registration</CardTitle>
              <CardDescription className="text-center">
                Loading...
              </CardDescription>
            </CardHeader>
          </Card>
        </main>
      }>
        <CustomerRegisterForm />
      </Suspense>
    </div>
  );
}
