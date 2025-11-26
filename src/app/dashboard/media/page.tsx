/**
 * Media Library Page
 * 
 * Server component for the media library page
 * 
 * Day 28: Content Management - Media Library
 */

import { requireAuthOrRedirect, requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import MediaLibraryClient from './media-library-client';

export const dynamic = 'force-dynamic';

export default async function MediaLibraryPage() {
  const user = await requireAuthOrRedirect('/login');
  await requireAnyRoleOrRedirect(user, ['tenant_admin', 'tenant_staff'], '/login');

  const tenant = await requireTenant();

  if (user.role !== 'landlord' && user.tenant_id !== tenant.id) {
    return null;
  }

  return <MediaLibraryClient />;
}

