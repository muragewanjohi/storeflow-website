/**
 * Admin Layout
 * 
 * Provides consistent navigation and layout for all admin (landlord) pages
 * 
 * Note: This layout does NOT apply to /admin/login and /admin/register
 * Those routes are handled separately without authentication requirements
 */

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { requireAuthOrRedirect, requireRoleOrRedirect } from '@/lib/auth/server';
import AdminLayoutClient from '@/components/admin/layout-client';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get the current pathname to check if we're on a public route
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || '';
  
  // Skip auth check for public admin routes (login, register)
  // These routes should not use this layout, but we check just in case
  const isPublicRoute = pathname === '/admin/login' || pathname === '/admin/register';
  
  if (isPublicRoute) {
    // For public routes, just render children without layout
    return <>{children}</>;
  }

  // Require authentication and landlord role for all other admin routes
  const user = await requireAuthOrRedirect('/admin/login');
  await requireRoleOrRedirect(user, 'landlord', '/admin/login');

  return <AdminLayoutClient user={user}>{children}</AdminLayoutClient>;
}

