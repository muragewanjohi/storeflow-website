/**
 * Attributes Management Page
 * 
 * Lists all attributes for the tenant
 */

import { redirect } from 'next/navigation';
import { requireAuthOrRedirect, requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import AttributesListClient from './attributes-list-client';

export const dynamic = 'force-dynamic';

export default async function AttributesPage() {
  const user = await requireAuthOrRedirect('/login');
  await requireAnyRoleOrRedirect(user, ['tenant_admin', 'tenant_staff'], '/login');

  const tenant = await requireTenant();

  if (user.role !== 'landlord' && user.tenant_id !== tenant.id) {
    redirect('/login');
  }

  // Fetch attributes directly from database (matching categories pattern)
  let attributes: any[] = [];
  let dbError: string | null = null;

  try {
    attributes = await prisma.attributes.findMany({
      where: {
        tenant_id: tenant.id,
      },
      include: {
        attribute_values: {
          orderBy: {
            value: 'asc',
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  } catch (error) {
    console.error('Error fetching attributes:', error);
    dbError = 'Failed to load attributes. Please try again later.';
  }

  return <AttributesListClient initialAttributes={attributes} dbError={dbError} />;
}

