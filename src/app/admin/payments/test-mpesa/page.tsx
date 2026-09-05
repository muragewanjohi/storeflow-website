/**
 * Test Mpesa Payment Page
 * 
 * Allows testing Mpesa payments by entering phone number and amount
 */

import { requireAuthOrRedirect, requireRoleOrRedirect } from '@/lib/auth/server';
import TestMpesaClient from './test-mpesa-client';

export const dynamic = 'force-dynamic';

export default async function TestMpesaPage() {
  const user = await requireAuthOrRedirect('/admin/login');
  await requireRoleOrRedirect(user, 'landlord', '/admin/login');

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Test Mpesa Payment</h1>
        <p className="text-muted-foreground mt-2">
          Test Mpesa STK Push payment by entering phone number and amount
        </p>
      </div>
      <TestMpesaClient />
    </div>
  );
}
