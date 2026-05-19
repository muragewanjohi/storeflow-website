/**
 * Collection Page (Shopify-style)
 *
 * Public-facing product listing filtered by category slug: /collections/:slug
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTenant, requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import { generateStorefrontMetadata } from '@/lib/seo/storefront-metadata';
import { getCollectionPath } from '@/lib/storefront/collection-urls';
import ProductsListingClient from '../../products/products-listing-client';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const tenant = await getTenant();
  if (!tenant) {
    return { title: 'Collection' };
  }

  const { slug } = await params;
  const category = await prisma.categories.findFirst({
    where: {
      tenant_id: tenant.id,
      slug,
      status: 'active',
    },
    select: { name: true },
  });

  if (!category) {
    return { title: 'Collection Not Found' };
  }

  return generateStorefrontMetadata({
    tenant,
    title: category.name,
    description: `Browse ${category.name} at ${tenant.name || tenant.subdomain}.`,
    url: getCollectionPath(slug),
  });
}

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const tenant = await requireTenant();
  const { slug } = await params;

  const category = await prisma.categories.findFirst({
    where: {
      tenant_id: tenant.id,
      slug,
      status: 'active',
    },
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });

  if (!category?.slug) {
    notFound();
  }

  return (
    <ProductsListingClient
      themeSlug={tenant.theme_slug || 'default'}
      collection={{
        id: category.id,
        name: category.name,
        slug: category.slug,
      }}
    />
  );
}
