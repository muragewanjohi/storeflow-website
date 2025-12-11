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
import { sendEmail } from '@/lib/email/sendgrid';
import { detectUserLocation, getLocalizedPrice } from '@/lib/pricing/location';
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

    // Detect user location for pricing - check client-provided headers first, then server headers
    let locationInfo = detectUserLocation(request.headers);
    
    // Check if client provided location info (from client-side detection)
    const clientCountry = request.headers.get('x-user-country');
    const clientCurrency = request.headers.get('x-user-currency');
    
    if (clientCountry === 'KE' || clientCurrency === 'KES') {
      locationInfo = {
        currency: 'KES',
        currencySymbol: 'Ksh',
        isKenya: true,
      };
    } else if (clientCountry && clientCountry !== 'KE') {
      locationInfo = {
        currency: 'USD',
        currencySymbol: '$',
        isKenya: false,
      };
    }

    // Validate subdomain
    const subdomainValidation = validateSubdomain(validatedData.subdomain);
    if (!subdomainValidation.isValid) {
      return NextResponse.json(
        { message: subdomainValidation.error },
        { status: 400 }
      );
    }

    // Check if subdomain already exists - SIMPLIFIED: Only check subdomain
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

    // Check if user with this email already exists in Supabase Auth
    // If user exists, use existing user_id; if not, create new user
    const adminClient = createAdminClient();
    let existingUser = null;
    const maxPagesToSearch = 5;
    const perPage = 1000;
    
    for (let page = 1; page <= maxPagesToSearch; page++) {
      const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers({
        page,
        perPage,
      });
      
      if (listError) {
        console.error('Error listing users:', listError);
        // Continue with user creation if listing fails
        break;
      }
      
      // Find user by email (case-insensitive)
      existingUser = users.find(user => 
        user.email?.toLowerCase() === validatedData.adminEmail.toLowerCase()
      );
      
      if (existingUser) {
        break;
      }
      
      // If no more users, user doesn't exist
      if (users.length === 0 || users.length < perPage) {
        break;
      }
    }

    // Get plan details if plan is selected
    let subscriptionPrice: number | null = null;
    let subscriptionCurrency: 'KES' | 'USD' = 'USD';
    let subscriptionCurrencySymbol: 'Ksh' | '$' = '$';
    
    if (validatedData.planId && plan) {
      // Get localized price based on location
      subscriptionPrice = getLocalizedPrice(plan.name, locationInfo.isKenya);
      subscriptionCurrency = locationInfo.currency;
      subscriptionCurrencySymbol = locationInfo.currencySymbol;
    }

    // Create tenant in database
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
          theme: 'light',
          // Store subscription pricing info for future payments
          subscription: validatedData.planId ? {
            currency: subscriptionCurrency,
            currencySymbol: subscriptionCurrencySymbol,
            price: subscriptionPrice,
            planName: plan?.name || null,
          } : null,
        },
      },
    });

    let userId: string;
    
    // If user exists, use existing user_id; otherwise create new user
    if (existingUser) {
      userId = existingUser.id;
      
      // Update tenant with existing user_id
      await prisma.tenants.update({
        where: { id: tenant.id },
        data: {
          user_id: userId,
        },
      });

      // Update user metadata to include the new tenant_id
      await adminClient.auth.admin.updateUserById(userId, {
        user_metadata: {
          ...existingUser.user_metadata,
          tenant_id: tenant.id,
          name: validatedData.adminName,
          role: 'tenant_admin',
        },
      }).catch((error) => {
        console.error('Failed to update user metadata:', error);
      });
    } else {
      // Create new user in Supabase Auth
      const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
        email: validatedData.adminEmail,
        password: validatedData.adminPassword,
        email_confirm: true,
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

        return NextResponse.json(
          { message: `Failed to create admin user: ${authError?.message || 'Unknown error'}` },
          { status: 500 }
        );
      }

      userId = authUser.user.id;
      
      // Update tenant with user_id
      await prisma.tenants.update({
        where: { id: tenant.id },
        data: {
          user_id: userId,
        },
      });
    }

    // Generate login URL with subdomain format
    let loginUrl: string;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const isLocalhost = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1');
    
    if (isLocalhost) {
      const url = new URL(baseUrl);
      loginUrl = `${url.protocol}//${tenant.subdomain}.${url.hostname}${url.port ? `:${url.port}` : ''}/dashboard/login`;
    } else {
      loginUrl = `https://${tenant.subdomain}.dukanest.com/dashboard/login`;
    }

    // Send welcome email
    const { sendWelcomeEmail } = await import('@/lib/email/sendgrid');
    sendWelcomeEmail({
      to: validatedData.adminEmail,
      tenantName: tenant.name,
      subdomain: tenant.subdomain,
      adminName: validatedData.adminName,
      loginUrl,
    }).catch((error) => {
      console.error('Failed to send welcome email:', error);
    });

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Tenant registered successfully',
      tenant: {
        id: tenant.id,
        name: tenant.name,
        subdomain: tenant.subdomain,
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

