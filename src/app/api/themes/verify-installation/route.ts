/**
 * Theme Installation Verification API Route
 * 
 * GET: Verify what was created during theme installation
 * Useful for debugging when demo content doesn't appear
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();

    // Verify user belongs to tenant
    if (user.tenant_id !== tenant.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Count pages
    const pagesCount = await prisma.pages.count({
      where: { tenant_id: tenant.id },
    });

    const publishedPagesCount = await prisma.pages.count({
      where: { 
        tenant_id: tenant.id,
        status: 'published',
      },
    });

    // Count products
    const productsCount = await prisma.products.count({
      where: { tenant_id: tenant.id },
    });

    const activeProductsCount = await prisma.products.count({
      where: { 
        tenant_id: tenant.id,
        status: 'active',
      },
    });

    // Count categories
    const categoriesCount = await prisma.categories.count({
      where: { tenant_id: tenant.id },
    });

    const activeCategoriesCount = await prisma.categories.count({
      where: { 
        tenant_id: tenant.id,
        status: 'active',
      },
    });

    // Get homepage
    const homepage = await prisma.pages.findFirst({
      where: {
        tenant_id: tenant.id,
        slug: 'home',
      },
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        created_at: true,
      },
    });

    // Get sample pages
    const samplePages = await prisma.pages.findMany({
      where: { tenant_id: tenant.id },
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
      },
      take: 10,
      orderBy: { created_at: 'desc' },
    });

    // Get sample products
    const sampleProducts = await prisma.products.findMany({
      where: { tenant_id: tenant.id },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        category_id: true,
      },
      take: 10,
      orderBy: { created_at: 'desc' },
    });

    // Get sample categories
    const sampleCategories = await prisma.categories.findMany({
      where: { tenant_id: tenant.id },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
      },
      take: 10,
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json({
      tenant: {
        id: tenant.id,
        name: tenant.name,
        subdomain: tenant.subdomain,
      },
      pages: {
        total: pagesCount,
        published: publishedPagesCount,
        homepage: homepage,
        sample: samplePages,
      },
      products: {
        total: productsCount,
        active: activeProductsCount,
        sample: sampleProducts,
      },
      categories: {
        total: categoriesCount,
        active: activeCategoriesCount,
        sample: sampleCategories,
      },
    });
  } catch (error: any) {
    console.error('Error verifying installation:', error);
    return NextResponse.json(
      { 
        error: 'Failed to verify installation',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}
