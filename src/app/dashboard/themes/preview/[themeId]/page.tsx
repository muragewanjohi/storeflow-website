/**
 * Theme Preview Page
 * 
 * Shows a preview of the storefront with a specific theme applied
 */

import { requireAuthOrRedirect, requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import { notFound } from 'next/navigation';
import ThemePreviewClient from './theme-preview-client';

export const dynamic = 'force-dynamic';

export default async function ThemePreviewPage({
  params,
}: {
  params: Promise<{ themeId: string }>;
}) {
  const user = await requireAuthOrRedirect('/login');
  await requireAnyRoleOrRedirect(user, ['tenant_admin', 'tenant_staff'], '/login');

  const tenant = await requireTenant();
  const { themeId } = await params;

  // Fetch theme
  const theme = await prisma.themes.findUnique({
    where: { id: themeId },
  });

  if (!theme) {
    notFound();
  }

  // Get tenant's current customizations (if any)
  const tenantTheme = await prisma.tenant_themes.findFirst({
    where: {
      tenant_id: tenant.id,
      theme_id: themeId,
    },
  });

  return (
    <ThemePreviewClient
      theme={{
        ...theme,
        colors: theme.colors as Record<string, unknown> | null,
        typography: theme.typography as Record<string, unknown> | null,
      } as any}
      customizations={tenantTheme ? {
        custom_colors: tenantTheme.custom_colors as Record<string, unknown> | null,
        custom_fonts: tenantTheme.custom_fonts as Record<string, unknown> | null,
        custom_layouts: tenantTheme.custom_layouts as Record<string, unknown> | null,
      } : null}
    />
  );
}

