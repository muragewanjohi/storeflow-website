/**
 * Admin Dashboard (Protected Route)
 * 
 * Landlord admin dashboard - requires landlord role
 */

import { redirect } from 'next/navigation';
import { requireAuthOrRedirect, requireRoleOrRedirect } from '@/lib/auth/server';

export default async function AdminDashboardPage() {
  // Redirect to login if not authenticated or not landlord
  const user = await requireAuthOrRedirect('/admin/login');
  await requireRoleOrRedirect(user, 'landlord', '/admin/login');

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <form action={async () => {
            'use server';
            const supabase = await import('@/lib/supabase/server').then(m => m.createClient());
            await supabase.auth.signOut();
            redirect('/admin/login');
          }}>
            <button
              type="submit"
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Sign Out
            </button>
          </form>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-2">Total Tenants</h2>
            <p className="text-3xl font-bold text-blue-600">-</p>
            <p className="text-sm text-gray-500 mt-2">Active stores</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-2">Total Revenue</h2>
            <p className="text-3xl font-bold text-green-600">-</p>
            <p className="text-sm text-gray-500 mt-2">This month</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-2">Active Subscriptions</h2>
            <p className="text-3xl font-bold text-purple-600">-</p>
            <p className="text-sm text-gray-500 mt-2">Current plans</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Welcome, {user.email}!</h2>
          <p className="text-gray-600">
            This is the landlord admin dashboard. Tenant management features will be added in Day 13-14.
          </p>
        </div>
      </div>
    </div>
  );
}

