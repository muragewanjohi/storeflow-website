/**
 * Users Management Page
 * 
 * Lists all tenant users (admin and staff)
 * Only accessible to tenant_admin and landlord
 */

import { redirect } from 'next/navigation';
import { requireAuthOrRedirect, requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { createAdminClient } from '@/lib/supabase/admin';
import UsersListClient from './users-list-client';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  // Require authentication and tenant_admin or landlord role
  const user = await requireAuthOrRedirect('/login');
  await requireAnyRoleOrRedirect(user, ['tenant_admin', 'landlord'], '/login');

  // Get tenant context
  const tenant = await requireTenant();

  // Verify user belongs to tenant (unless landlord)
  if (user.role !== 'landlord' && user.tenant_id !== tenant.id) {
    redirect('/login');
  }

  // Fetch users for this tenant
  const adminClient = createAdminClient();
  const { data: usersData, error } = await adminClient.auth.admin.listUsers();

  if (error) {
    console.error('Error fetching users:', error);
    return (
      <div className="p-6">
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">
            Failed to load users. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  // Filter users by tenant_id
  const tenantUsers = (usersData?.users || []).filter((u: any) => {
    const userTenantId = u.user_metadata?.tenant_id;
    return userTenantId === tenant.id;
  });

  // Map to user objects with role
  const users = tenantUsers.map((u: any) => ({
    id: u.id,
    email: u.email || '',
    name: u.user_metadata?.name || '',
    role: u.user_metadata?.role || 'tenant_staff',
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at,
  }));

  return <UsersListClient users={users} currentUserId={user.id} />;
}

