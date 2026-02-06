/**
 * New Category Page
 */

import { requireAuthOrRedirect, requireRoleOrRedirect } from '@/lib/auth/server';
import CreateCategoryForm from './create-category-form';

export const dynamic = 'force-dynamic';

export default async function NewCategoryPage() {
  const user = await requireAuthOrRedirect('/admin/login');
  await requireRoleOrRedirect(user, 'landlord', '/admin/login');

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">New Category</h1>
        <p className="text-muted-foreground mt-2">
          Create a new user guide category
        </p>
      </div>
      <CreateCategoryForm />
    </div>
  );
}
