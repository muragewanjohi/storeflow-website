/**
 * Edit Blog Category Page
 * 
 * Form for editing an existing blog category
 */

import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma/client';
import { requireTenant } from '@/lib/tenant-context/server';
import CategoryFormClient from '../../category-form-client';

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const tenant = await requireTenant();
  const { id } = await params;

  const category = await prisma.blog_categories.findFirst({
    where: {
      id,
      tenant_id: tenant.id,
    },
  });

  if (!category) {
    notFound();
  }

  return <CategoryFormClient category={category} />;
}

