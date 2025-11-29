/**
 * Public Tenant Registration API Route
 * 
 * POST /api/tenants/register
 * 
 * Allows public users to register a new tenant (no auth required)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { createAdminClient } from '@/lib/supabase/admin';
import { validateSubdomain } from '@/lib/subdomain-validation';
import { z } from 'zod';

const registerTenantSchema = z.object({
  name: z.string().min(1, 'Store name is required'),
  subdomain: z.string()
    .min(3, 'Subdomain must be at least 3 characters')
    .max(63, 'Subdomain must be at most 63 characters')
    .regex(/^[a-z0-9-]+$/, 'Subdomain can only contain lowercase letters, numbers, and hyphens'),
  adminEmail: z.string().email('Invalid email address'),
  adminPassword: z.string().min(8, 'Password must be at least 8 characters'),
  adminName: z.string().min(1, 'Admin name is required'),
  contactEmail: z.string().email('Invalid contact email address'),
  planId: z.string().uuid().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = registerTenantSchema.parse(body);

    // Validate subdomain
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
        { message: 'This subdomain is already taken. Please choose another.' },
        { status: 409 }
      );
    }

    // Verify plan exists if provided
    let plan = null;
    if (validatedData.planId) {
      plan = await prisma.price_plans.findUnique({
        where: { id: validatedData.planId },
      });

      if (!plan || plan.status !== 'active') {
        return NextResponse.json(
          { message: 'Selected pricing plan is not available' },
          { status: 400 }
        );
      }
    }

    // Calculate expiration date
    let expireDate: Date | null = null;
    if (plan) {
      expireDate = new Date();
      if (plan.trial_days && plan.trial_days > 0) {
        expireDate.setDate(expireDate.getDate() + plan.trial_days);
      } else {
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

    // Generate login URL with subdomain format
    let loginUrl: string;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const isLocalhost = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1');
    
    if (isLocalhost) {
      // For local development, use subdomain format: http://subdomain.localhost:3000/login
      const url = new URL(baseUrl);
      loginUrl = `${url.protocol}//${updatedTenant.subdomain}.${url.hostname}${url.port ? `:${url.port}` : ''}/login`;
    } else {
      // For production, use subdomain format: https://subdomain.domain.com/login
      const url = new URL(baseUrl);
      loginUrl = `${url.protocol}//${updatedTenant.subdomain}.${url.hostname}${url.port ? `:${url.port}` : ''}/login`;
    }

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Tenant registered successfully',
      tenant: {
        id: updatedTenant.id,
        name: updatedTenant.name,
        subdomain: updatedTenant.subdomain,
      },
      loginUrl,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Tenant registration error:', error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          message: 'Validation failed',
          errors: error.issues.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        message: 'Registration failed',
        error: process.env.NODE_ENV === 'development' 
          ? (error instanceof Error ? error.message : 'Unknown error')
          : 'An error occurred during registration. Please try again.'
      },
      { status: 500 }
    );
  }
}

