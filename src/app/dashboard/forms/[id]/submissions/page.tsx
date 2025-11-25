/**
 * Form Submissions Page
 * 
 * Lists all submissions for a form
 */

import { notFound } from 'next/navigation';
import { requireAuthOrRedirect, requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import FormSubmissionsClient from './form-submissions-client';

export default async function FormSubmissionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAuthOrRedirect('/login');
  await requireAnyRoleOrRedirect(user, ['tenant_admin', 'tenant_staff'], '/login');

  const tenant = await requireTenant();

  if (user.role !== 'landlord' && user.tenant_id !== tenant.id) {
    return null;
  }

  const { id } = await params;

  const form = await prisma.form_builders.findFirst({
    where: {
      id,
      tenant_id: tenant.id,
    },
    select: {
      id: true,
      title: true,
      slug: true,
    },
  });

  if (!form) {
    notFound();
  }

  return <FormSubmissionsClient formId={id} formTitle={form.title} />;
}

