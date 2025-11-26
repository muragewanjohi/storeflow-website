/**
 * Edit Page Page
 * 
 * Form for editing an existing page
 */

import { notFound } from 'next/navigation';
import { requireAuthOrRedirect, requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import PageFormClient from '../../page-form-client';

export default async function EditPagePage({
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

  const page = await prisma.pages.findFirst({
    where: {
      id,
      tenant_id: tenant.id,
    },
  });

  if (!page) {
    notFound();
  }

  // Ensure status has a default value if null
  const pageWithDefaults = {
    ...page,
    status: (page.status || 'draft') as 'draft' | 'published' | 'archived',
  };

  // Get base URL for SEO preview
  const baseUrl = tenant.custom_domain
    ? `https://${tenant.custom_domain}`
    : tenant.subdomain
    ? `https://${tenant.subdomain}.dukanest.com`
    : 'https://example.com';

  return <PageFormClient page={pageWithDefaults} baseUrl={baseUrl} />;
}

