/**
 * Customer Registration Page
 * 
 * Registration page for new customers
 */

import { Suspense } from 'react';
import StorefrontHeader from '@/components/storefront/header-server';
import StorefrontFooter from '@/components/storefront/footer';
import CustomerRegisterForm from './customer-register-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function CustomerRegisterPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <StorefrontHeader />
      <Suspense fallback={
        <main className="flex-1 flex items-center justify-center bg-gray-50 px-4 py-12">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-2xl text-center">Create Account</CardTitle>
              <CardDescription className="text-center">
                Loading...
              </CardDescription>
            </CardHeader>
          </Card>
        </main>
      }>
        <CustomerRegisterForm />
      </Suspense>
      <StorefrontFooter />
    </div>
  );
}
