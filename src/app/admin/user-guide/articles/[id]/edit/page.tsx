/**
 * Edit Article Page
 */

import { requireAuthOrRedirect, requireRoleOrRedirect } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';
import { notFound } from 'next/navigation';
import EditArticleForm from './edit-article-form';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditArticlePage({ params }: PageProps) {
  const user = await requireAuthOrRedirect('/admin/login');
  await requireRoleOrRedirect(user, 'landlord', '/admin/login');

  const { id } = await params;
  const [article, categories] = await Promise.all([
    prisma.user_guide_articles.findUnique({
      where: { id },
    }),
    prisma.user_guide_categories.findMany({
      orderBy: { sort_order: 'asc' },
    }),
  ]);

  if (!article) {
    notFound();
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Edit Article</h1>
        <p className="text-muted-foreground mt-2">
          Update article details
        </p>
      </div>
      <EditArticleForm article={article} categories={categories} />
    </div>
  );
}
