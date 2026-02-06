/**
 * User Guide Management Page
 * 
 * Main page for managing user guide categories and articles
 */

import { requireAuthOrRedirect, requireRoleOrRedirect } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';
import UserGuideClient from './user-guide-client';

export const dynamic = 'force-dynamic';

export default async function UserGuidePage() {
  const user = await requireAuthOrRedirect('/admin/login');
  await requireRoleOrRedirect(user, 'landlord', '/admin/login');

  // Fetch all categories with articles
  const categories = await prisma.user_guide_categories.findMany({
    include: {
      articles: {
        orderBy: {
          sort_order: 'asc',
        },
      },
    },
    orderBy: {
      sort_order: 'asc',
    },
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">User Guide</h1>
        <p className="text-muted-foreground mt-2">
          Manage user guide categories and articles for the public help page
        </p>
      </div>
      <UserGuideClient categories={categories} />
    </div>
  );
}
