/**
 * Tenants API Route
 * 
 * Handles GET (list tenants) and POST (create tenant) requests
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';
import { createAdminClient } from '@/lib/supabase/admin';
import { validateSubdomain } from '@/lib/subdomain-validation';
import { sendWelcomeEmail } from '@/lib/email/sendgrid';
import { addTenantDomain } from '@/lib/vercel-domains';
import { z } from 'zod';

// Validation schema for tenant creation
const createTenantSchema = z.object({
  name: z.string().min(1, 'Store name is required'),
  subdomain: z.string()
    .min(3, 'Subdomain must be at least 3 characters')
    .max(63, 'Subdomain must be at most 63 characters')
    .regex(/^[a-z0-9-]+$/, 'Subdomain can only contain lowercase letters, numbers, and hyphens'),
  adminEmail: z.string().email('Invalid email address'),
  adminPassword: z.string().min(8, 'Password must be at least 8 characters'),
  adminName: z.string().min(1, 'Admin name is required'),
  planId: z.string().uuid().optional(), // Optional plan selection
});

/**
 * GET /api/admin/tenants
 * List all tenants (landlord only)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    requireRole(user, 'landlord');

    const tenants = await prisma.tenants.findMany({
      orderBy: {
        created_at: 'desc',
      },
      select: {
        id: true,
        name: true,
        subdomain: true,
        custom_domain: true,
        status: true,
        created_at: true,
        expire_date: true,
      },
    });

    return NextResponse.json({ tenants }, { status: 200 });
  } catch (error) {
    console.error('Error fetching tenants:', error);
    
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
          : 'Failed to fetch tenants'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/tenants
 * Create a new tenant (landlord only)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    requireRole(user, 'landlord');

    const body = await request.json();
    const validatedData = createTenantSchema.parse(body);

    // Validate subdomain (reserved words, naming rules, etc.)
    const subdomainValidation = validateSubdomain(validatedData.subdomain);
    if (!subdomainValidation.isValid) {
      return NextResponse.json(
        { message: subdomainValidation.error },
        { status: 400 }
      );
    }

    // Check if subdomain already exists
    const existingTenant = await prisma.tenants.findUnique({
      where: { subdomain: validatedData.subdomain },
    });

    if (existingTenant) {
      return NextResponse.json(
        { message: 'Subdomain already exists' },
        { status: 409 }
      );
    }

    // Validate plan and calculate expire_date if provided
    let expireDate: Date | null = null;
    if (validatedData.planId) {
      const plan = await prisma.price_plans.findUnique({
        where: { id: validatedData.planId },
      });
      if (!plan || plan.status !== 'active') {
        return NextResponse.json(
          { message: 'Invalid or inactive price plan' },
          { status: 400 }
        );
      }
      // Calculate expire_date based on plan duration
      expireDate = new Date();
      expireDate.setMonth(expireDate.getMonth() + plan.duration_months);
    }

    // Create tenant in database first
    const tenant = await prisma.tenants.create({
      data: {
        name: validatedData.name,
        subdomain: validatedData.subdomain,
        status: 'active',
        start_date: new Date(),
        plan_id: validatedData.planId || null,
        expire_date: expireDate,
      },
    });

    // Create tenant admin user in Supabase Auth
    const adminClient = createAdminClient();
    const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
      email: validatedData.adminEmail,
      password: validatedData.adminPassword,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        role: 'tenant_admin',
        tenant_id: tenant.id,
        name: validatedData.adminName,
      },
    });

    if (authError || !authUser) {
      // Rollback: delete tenant if user creation fails
      await prisma.tenants.delete({
        where: { id: tenant.id },
      });

      // Check if error is due to duplicate email
      if (authError?.message?.includes('already registered') || 
          authError?.message?.includes('already exists') ||
          authError?.status === 422) {
        return NextResponse.json(
          { message: 'Email already registered' },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { message: `Failed to create admin user: ${authError?.message || 'Unknown error'}` },
        { status: 500 }
      );
    }

    // Update tenant with user_id
    const updatedTenant = await prisma.tenants.update({
      where: { id: tenant.id },
      data: {
        user_id: authUser.user.id,
      },
    });

    // Send welcome email to tenant admin (non-blocking)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
    const loginUrl = `${baseUrl}/${validatedData.subdomain}/dashboard`;

    sendWelcomeEmail({
      to: validatedData.adminEmail,
      tenantName: validatedData.name,
      subdomain: validatedData.subdomain,
      adminName: validatedData.adminName,
      loginUrl,
    }).catch((error) => {
      // Log error but don't fail tenant creation
      console.error('Failed to send welcome email:', error);
    });

    // Automatically add subdomain to Vercel (non-blocking)
    const projectId = process.env.VERCEL_PROJECT_ID;
    if (projectId) {
      const subdomainUrl = `${validatedData.subdomain}.dukanest.com`;
      addTenantDomain(subdomainUrl, projectId).catch((error) => {
        // Log error but don't fail tenant creation
        // Subdomain can be added manually later if needed
        console.error(`Failed to add subdomain ${subdomainUrl} to Vercel:`, error);
      });
    } else {
      console.warn('VERCEL_PROJECT_ID not set. Subdomain will not be added to Vercel automatically.');
    }

    return NextResponse.json(
      {
        message: 'Tenant created successfully',
        tenant: {
          id: updatedTenant.id,
          name: updatedTenant.name,
          subdomain: updatedTenant.subdomain,
          status: updatedTenant.status,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating tenant:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Validation error', errors: error.issues },
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
          : 'Failed to create tenant'
      },
      { status: 500 }
    );
  }
}

