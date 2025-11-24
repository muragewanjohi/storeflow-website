/**
 * Create Price Plan Page
 * 
 * Page for creating a new price plan
 */

import { redirect } from 'next/navigation';
import { requireAuthOrRedirect, requireRoleOrRedirect } from '@/lib/auth/server';
import CreatePlanForm from './create-plan-form';

export default async function CreatePricePlanPage() {
  const user = await requireAuthOrRedirect('/admin/login');
  await requireRoleOrRedirect(user, 'landlord', '/admin/login');

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Create Price Plan</h1>
        <p className="text-muted-foreground mt-2">
          Create a new subscription plan for tenants
        </p>
      </div>
      <CreatePlanForm />
    </div>
  );
}

