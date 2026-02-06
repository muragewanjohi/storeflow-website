/**
 * New Article Page
 */

import { requireAuthOrRedirect, requireRoleOrRedirect } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';
import CreateArticleForm from './create-article-form';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ category_id?: string }>;
}

export default async function NewArticlePage({ searchParams }: PageProps) {
  const user = await requireAuthOrRedirect('/admin/login');
  await requireRoleOrRedirect(user, 'landlord', '/admin/login');

  const params = await searchParams;
  const categories = await prisma.user_guide_categories.findMany({
    orderBy: { sort_order: 'asc' },
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">New Article</h1>
        <p className="text-muted-foreground mt-2">
          Create a new user guide article
        </p>
      </div>
      <CreateArticleForm categories={categories} defaultCategoryId={params.category_id} />
    </div>
  );
}
