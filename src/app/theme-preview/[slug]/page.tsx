/**
 * Public Theme Preview (Theme Track A3, docs/THEME_SYSTEM_PLAN.md)
 *
 * A public, no-login render of a theme's real Homepage with real demo
 * content — built specifically so a real screenshot of each theme could be
 * taken (replacing the Unsplash stock-photo placeholders in the `themes`
 * table) when no live tenant exists on most themes to screenshot instead
 * (confirmed live: all 363 real tenant_themes rows on the platform use
 * `grocery` — zero real installs of any other theme to screenshot).
 *
 * Deliberately public and read-only: no install/activate actions, no
 * tenant-specific data, no auth — a trimmed-down sibling of the
 * authenticated /dashboard/themes/preview/[themeId] page (which this
 * reuses the same theme-loader/demo-content plumbing as), stripped of
 * every install-flow concern that page has and this one has no business
 * exposing publicly.
 */

import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma/client';
import ThemePublicPreviewClient from './theme-public-preview-client';

export const dynamic = 'force-dynamic';

export default async function ThemePublicPreviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const theme = await prisma.themes.findFirst({
    where: { slug, status: true },
    select: { id: true, slug: true, title: true, colors: true, typography: true },
  });

  if (!theme) {
    notFound();
  }

  return (
    <ThemePublicPreviewClient
      theme={{
        id: theme.id,
        slug: theme.slug,
        title: theme.title,
        colors: theme.colors as Record<string, unknown> | null,
        typography: theme.typography as Record<string, unknown> | null,
      }}
    />
  );
}
