/**
 * Tenant Subdomain Change API Route
 * 
 * Handles PUT requests to change a tenant's subdomain
 * - Validates new subdomain
 * - Updates subdomain in database
 * - Updates subdomain in Vercel (remove old, add new)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';
import { validateSubdomain } from '@/lib/subdomain-validation';
import { addTenantDomain, removeTenantDomain } from '@/lib/vercel-domains';
import { z } from 'zod';

// Validation schema for subdomain change
const changeSubdomainSchema = z.object({
  newSubdomain: z.string()
    .min(3, 'Subdomain must be at least 3 characters')
    .max(63, 'Subdomain must be at most 63 characters')
    .regex(/^[a-z0-9-]+$/, 'Subdomain can only contain lowercase letters, numbers, and hyphens'),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/admin/tenants/[id]/subdomain
 * Change tenant subdomain (landlord only)
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await requireAuth();
    requireRole(user, 'landlord');

    const { id } = await params;
    const body = await request.json();

    // Validate request body
    const validatedData = changeSubdomainSchema.parse(body);
    const newSubdomain = validatedData.newSubdomain.toLowerCase().trim();

    // Validate subdomain format and reserved words
    const validation = validateSubdomain(newSubdomain);
    if (!validation.isValid) {
      return NextResponse.json(
        { message: validation.error },
        { status: 400 }
      );
    }

    // Check if tenant exists
    const tenant = await prisma.tenants.findUnique({
      where: { id },
    });

    if (!tenant) {
      return NextResponse.json(
        { message: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Check if new subdomain is the same as current
    if (newSubdomain === tenant.subdomain) {
      return NextResponse.json(
        { message: 'New subdomain must be different from current subdomain' },
        { status: 400 }
      );
    }

    // Check if new subdomain is already taken
    const existingTenant = await prisma.tenants.findFirst({
      where: {
        subdomain: newSubdomain,
        id: { not: id }, // Exclude current tenant
        status: { not: 'deleted' }, // Don't check deleted tenants
      },
    });

    if (existingTenant) {
      return NextResponse.json(
        { message: 'This subdomain is already taken by another tenant' },
        { status: 400 }
      );
    }

    const projectId = process.env.VERCEL_PROJECT_ID;
    const oldSubdomainUrl = `${tenant.subdomain}.dukanest.com`;
    const newSubdomainUrl = `${newSubdomain}.dukanest.com`;

    // Update subdomain in database first
    const updatedTenant = await prisma.tenants.update({
      where: { id },
      data: {
        subdomain: newSubdomain,
      },
    });

    // Update subdomain in Vercel (non-blocking)
    if (projectId) {
      // Remove old subdomain from Vercel
      removeTenantDomain(oldSubdomainUrl, projectId).catch((error) => {
        console.error(`Failed to remove old subdomain ${oldSubdomainUrl} from Vercel:`, error);
        // Continue even if removal fails - new subdomain will still work
      });

      // Add new subdomain to Vercel
      addTenantDomain(newSubdomainUrl, projectId).catch((error) => {
        console.error(`Failed to add new subdomain ${newSubdomainUrl} to Vercel:`, error);
        // Log error but don't fail - subdomain is updated in DB, can be added manually later
      });
    } else {
      console.warn('VERCEL_PROJECT_ID not set. Subdomain updated in database but not in Vercel.');
    }

    return NextResponse.json(
      {
        message: 'Subdomain changed successfully',
        tenant: {
          id: updatedTenant.id,
          subdomain: updatedTenant.subdomain,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error changing subdomain:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Invalid request data', errors: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      if (error.message === 'Authentication required') {
        return NextResponse.json(
          { message: 'Authentication required' },
          { status: 401 }
        );
      }
      if (error.message.includes('Access denied')) {
        return NextResponse.json(
          { message: 'Access denied. Landlord role required.' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      {
        message: process.env.NODE_ENV === 'development'
          ? (error instanceof Error ? error.message : 'Internal server error')
          : 'Failed to change subdomain'
      },
      { status: 500 }
    );
  }
}

