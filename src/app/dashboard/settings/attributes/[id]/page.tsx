/**
 * Edit Attribute Page
 */

import { redirect } from 'next/navigation';
import { requireAuthOrRedirect, requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import AttributeFormClient from '../attribute-form-client';

export default async function EditAttributePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAuthOrRedirect('/login');
  await requireAnyRoleOrRedirect(user, ['tenant_admin', 'tenant_staff'], '/login');

  const tenant = await requireTenant();

  if (user.role !== 'landlord' && user.tenant_id !== tenant.id) {
    redirect('/login');
  }

  const { id } = await params;

  // Fetch attribute
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  let attribute: any = null;

  try {
    const response = await fetch(`${baseUrl}/api/attributes/${id}`, {
      headers: {
        'Cookie': `tenant-subdomain=${tenant.subdomain}`,
      },
      cache: 'no-store',
    });

    if (response.ok) {
      const data = await response.json();
      attribute = data.attribute;
    } else if (response.status === 404) {
      redirect('/dashboard/settings/attributes');
    }
  } catch (error) {
    console.error('Error fetching attribute:', error);
  }

  if (!attribute) {
    redirect('/dashboard/settings/attributes');
  }

  return <AttributeFormClient attribute={attribute} />;
}

