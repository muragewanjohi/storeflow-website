/**
 * Create User Page
 * 
 * Allows tenant admin to create new staff users
 */

import { redirect } from 'next/navigation';
import { requireAuthOrRedirect, requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import CreateUserForm from './create-user-form';

export const dynamic = 'force-dynamic';

export default async function CreateUserPage() {
  // Require authentication and tenant_admin or landlord role
  const user = await requireAuthOrRedirect('/login');
  await requireAnyRoleOrRedirect(user, ['tenant_admin', 'landlord'], '/login');

  // Get tenant context
  const tenant = await requireTenant();

  // Verify user belongs to tenant (unless landlord)
  if (user.role !== 'landlord' && user.tenant_id !== tenant.id) {
    redirect('/login');
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Add New User</h1>
        <p className="mt-2 text-sm text-gray-600">
          Create a new team member and assign their role
        </p>
      </div>

      <CreateUserForm />
    </div>
  );
}

