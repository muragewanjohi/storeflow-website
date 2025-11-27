/**
 * Attributes Management Page
 * 
 * Lists all attributes for the tenant
 */

import { redirect } from 'next/navigation';
import { requireAuthOrRedirect, requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import AttributesListClient from './attributes-list-client';

export const dynamic = 'force-dynamic';

export default async function AttributesPage() {
  const user = await requireAuthOrRedirect('/login');
  await requireAnyRoleOrRedirect(user, ['tenant_admin', 'tenant_staff'], '/login');

  const tenant = await requireTenant();

  if (user.role !== 'landlord' && user.tenant_id !== tenant.id) {
    redirect('/login');
  }

  // Fetch attributes
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  let attributes: any[] = [];

  try {
    const response = await fetch(`${baseUrl}/api/attributes`, {
      headers: {
        'Cookie': `tenant-subdomain=${tenant.subdomain}`,
      },
      cache: 'no-store',
    });

    if (response.ok) {
      const data = await response.json();
      attributes = data.attributes || [];
    }
  } catch (error) {
    console.error('Error fetching attributes:', error);
  }

  return <AttributesListClient initialAttributes={attributes} />;
}

