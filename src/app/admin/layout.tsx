/**
 * Admin Layout
 * 
 * Provides consistent navigation and layout for all admin (landlord) pages
 */

import { redirect } from 'next/navigation';
import { requireAuthOrRedirect, requireRoleOrRedirect } from '@/lib/auth/server';
import AdminLayoutClient from '@/components/admin/layout-client';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Require authentication and landlord role
  const user = await requireAuthOrRedirect('/admin/login');
  await requireRoleOrRedirect(user, 'landlord', '/admin/login');

  return <AdminLayoutClient user={user}>{children}</AdminLayoutClient>;
}

