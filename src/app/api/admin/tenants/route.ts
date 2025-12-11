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
import { handleApiError, handleValidationError, handleConflictError, createErrorResponse, ErrorCode } from '@/lib/errors/api-error-handler';

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
  contactEmail: z.string().email('Invalid contact email address'),
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
    return handleApiError(error);
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
      // Return validation error using standard format
      return createErrorResponse(
        'Validation failed',
        subdomainValidation.error || 'Invalid subdomain',
        400,
        { field: 'subdomain' },
        ErrorCode.VALIDATION_ERROR
      );
    }

    // Check if subdomain already exists
    const existingTenant = await prisma.tenants.findUnique({
      where: { subdomain: validatedData.subdomain },
    });

    if (existingTenant) {
      return handleConflictError('Subdomain already exists');
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
      // If plan has trial_days, use trial period; otherwise use plan duration
      expireDate = new Date();
      if (plan.trial_days && plan.trial_days > 0) {
        // Trial period: add trial days
        expireDate.setDate(expireDate.getDate() + plan.trial_days);
      } else {
        // Regular subscription: add plan duration months
        expireDate.setMonth(expireDate.getMonth() + plan.duration_months);
      }
    }

    // Create tenant in database first
    // Set default theme to light mode in tenant data
    const tenant = await prisma.tenants.create({
      data: {
        name: validatedData.name,
        subdomain: validatedData.subdomain,
        contact_email: validatedData.contactEmail,
        status: 'active',
        start_date: new Date(),
        plan_id: validatedData.planId || null,
        expire_date: expireDate,
        data: {
          theme: 'light', // Default to light mode for new stores
        },
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
        return handleConflictError('Email already registered');
      }

      return handleApiError(
        new Error(`Failed to create admin user: ${authError?.message || 'Unknown error'}`)
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
    return handleApiError(error);
  }
}

