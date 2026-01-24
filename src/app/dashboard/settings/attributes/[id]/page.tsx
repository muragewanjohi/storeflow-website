/**
 * Edit Attribute Page
 */

import { redirect } from 'next/navigation';
import { requireAuthOrRedirect, requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
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

  // Fetch attribute directly from database (more reliable than HTTP fetch)
  const attribute = await prisma.attributes.findFirst({
    where: {
      id,
      tenant_id: tenant.id,
    },
    include: {
      attribute_values: {
        orderBy: {
          value: 'asc',
        },
      },
    },
  });

  if (!attribute) {
    redirect('/dashboard/settings/attributes');
  }

  return <AttributeFormClient attribute={attribute} />;
}

