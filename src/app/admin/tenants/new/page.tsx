/**
 * Create Tenant Page
 * 
 * Form for creating a new tenant
 */

import { redirect } from 'next/navigation';
import { requireAuthOrRedirect, requireRoleOrRedirect } from '@/lib/auth/server';
import CreateTenantForm from './create-tenant-form';

export default async function CreateTenantPage() {
  const user = await requireAuthOrRedirect('/admin/login');
  await requireRoleOrRedirect(user, 'landlord', '/admin/login');

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Create New Tenant</h1>
        <p className="text-muted-foreground mt-2">
          Register a new tenant store on the platform
        </p>
      </div>
      <CreateTenantForm />
    </div>
  );
}

