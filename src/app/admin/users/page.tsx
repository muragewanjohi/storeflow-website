/**
 * Admin Users Page
 * 
 * Lists all users across all tenants for landlord admin
 */

import { redirect } from 'next/navigation';
import { requireAuthOrRedirect, requireRoleOrRedirect } from '@/lib/auth/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { prisma } from '@/lib/prisma/client';
import AdminUsersListClient from './admin-users-list-client';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const user = await requireAuthOrRedirect('/admin/login');
  await requireRoleOrRedirect(user, 'landlord', '/admin/login');

  // Fetch all users
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

  // Get all tenants for mapping
  const tenants = await prisma.tenants.findMany({
    select: {
      id: true,
      name: true,
      subdomain: true,
    },
  });
  const tenantMap = new Map(tenants.map(t => [t.id, t]));

  // Map users with tenant information
  const users = (usersData?.users || []).map((u: any) => {
    const tenantId = u.user_metadata?.tenant_id;
    const tenant = tenantId ? tenantMap.get(tenantId) : null;
    
    return {
      id: u.id,
      email: u.email || '',
      name: u.user_metadata?.name || '',
      role: u.user_metadata?.role || 'tenant_staff',
      tenant_id: tenantId,
      tenant_name: tenant?.name || null,
      tenant_subdomain: tenant?.subdomain || null,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
    };
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Users</h1>
        <p className="text-muted-foreground mt-2">
          Manage all users across all tenants
        </p>
      </div>
      <AdminUsersListClient users={users} currentUserId={user.id} />
    </div>
  );
}
