/**
 * Edit User Page
 * 
 * Allows tenant admin to edit user details and roles
 */

import { redirect } from 'next/navigation';
import { requireAuthOrRedirect, requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { createAdminClient } from '@/lib/supabase/admin';
import EditUserForm from './edit-user-form';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditUserPage({ params }: Readonly<PageProps>) {
  // Require authentication and tenant_admin or landlord role
  const user = await requireAuthOrRedirect('/login');
  await requireAnyRoleOrRedirect(user, ['tenant_admin', 'landlord'], '/login');

  // Get tenant context
  const tenant = await requireTenant();

  // Verify user belongs to tenant (unless landlord)
  if (user.role !== 'landlord' && user.tenant_id !== tenant.id) {
    redirect('/login');
  }

  const { id } = await params;

  // Fetch user details
  const adminClient = createAdminClient();
  const { data: userData, error } = await adminClient.auth.admin.getUserById(id);

  if (error || !userData?.user) {
    return (
      <div className="p-6">
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">User not found</p>
        </div>
      </div>
    );
  }

  const userToEdit = userData.user;

  // Verify user belongs to tenant
  const userTenantId = userToEdit.user_metadata?.tenant_id;
  if (userTenantId !== tenant.id && user.role !== 'landlord') {
    redirect('/dashboard/users');
  }

  const userObject = {
    id: userToEdit.id,
    email: userToEdit.email || '',
    name: userToEdit.user_metadata?.name || '',
    role: (userToEdit.user_metadata?.role || 'tenant_staff') as 'tenant_admin' | 'tenant_staff',
  };

  return <EditUserForm user={userObject} currentUserId={user.id} />;
}

