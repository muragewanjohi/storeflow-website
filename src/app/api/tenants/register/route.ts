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

    // Verify plan exists if provided (needed for both new and existing users)
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

    // Calculate expiration date (needed for both new and existing users)
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
    // Best practice: Check email in auth.users, then check if user_id exists in tenants table
    const adminClient = createAdminClient();
    
    // Step 1: Check if user exists by email in Supabase Auth
    // Since Supabase Admin API doesn't support direct email lookup, we use listUsers with pagination
    // For better performance, we limit the search to first few pages (most users will be recent)
    let existingUser = null;
    const maxPagesToSearch = 5; // Limit search to first 5 pages for performance
    const perPage = 1000;
    
    for (let page = 1; page <= maxPagesToSearch; page++) {
      const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers({
        page,
        perPage,
      });
      
      if (listError) {
        console.error('Error listing users:', listError);
        return NextResponse.json(
          { message: 'Failed to verify user account' },
          { status: 500 }
        );
      }
      
      // Find user by email (case-insensitive)
      existingUser = users.find(user => 
        user.email?.toLowerCase() === validatedData.adminEmail.toLowerCase()
      );
      
      if (existingUser) {
        // Found the user, break the loop
        break;
      }
      
      // If no more users, user doesn't exist
      if (users.length === 0 || users.length < perPage) {
        break;
      }
    }
    
    // Step 2: If user exists, check if they have tenants using the user_id
    if (existingUser) {
      // Best practice: Use a direct Prisma query with the user_id to check tenants table
      const userTenants = await prisma.tenants.findMany({
        where: { 
          user_id: existingUser.id, // Direct query using user_id from auth.users
        },
        select: {
          id: true,
          name: true,
          subdomain: true,
        },
      });

      if (userTenants.length > 0) {
        // User has existing tenants - send email with store URLs
        try {
          const storeListHtml = userTenants.map(tenant => 
            `<li style="margin: 10px 0;">
              <strong>${tenant.name}</strong><br>
              <a href="https://${tenant.subdomain}.dukanest.com/login" style="color: #667eea; text-decoration: none;">
                https://${tenant.subdomain}.dukanest.com/login
              </a>
            </li>`
          ).join('');

          await sendEmail({
            to: validatedData.adminEmail,
            subject: 'Your Store Login Information - Dukanest',
            html: `
              <!DOCTYPE html>
              <html>
                <head>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                </head>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                    <h1 style="color: white; margin: 0;">Welcome Back!</h1>
                  </div>
                  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
                    <p>You already have an account with us. Here are your store login URLs:</p>
                    <ul style="list-style: none; padding: 0;">
                      ${storeListHtml}
                    </ul>
                    <p>If you want to create a new store, please use a different email address or log in to your existing account.</p>
                    <p style="color: #666; font-size: 14px; margin-top: 30px;">
                      Best regards,<br>
                      The Dukanest Team
                    </p>
                  </div>
                </body>
              </html>
            `,
          });
        } catch (emailError) {
          console.error('Failed to send email:', emailError);
          // Continue even if email fails
        }

        return NextResponse.json(
          { 
            message: 'An account with this email already exists. Please check your email for your store login information, or log in to your existing account.',
            existingAccount: true,
          },
          { status: 409 }
        );
      } else {
        // User exists but has no tenants - allow them to create a tenant
        // Use the existing user_id instead of creating a new user
        const existingUserId = existingUser.id;
        
        // Create tenant in database with the existing user_id
        const tenant = await prisma.tenants.create({
          data: {
            name: validatedData.name,
            subdomain: validatedData.subdomain,
            contact_email: validatedData.contactEmail,
            status: 'active',
            start_date: new Date(),
            plan_id: validatedData.planId || null,
            expire_date: expireDate,
            user_id: existingUserId, // Use existing user_id from auth.users
            data: {
              theme: 'light', // Default to light mode for new stores
            },
          },
        });

        // Update user metadata to include the new tenant_id
        await adminClient.auth.admin.updateUserById(existingUserId, {
          user_metadata: {
            ...existingUser.user_metadata,
            tenant_id: tenant.id,
            name: validatedData.adminName, // Update name if provided
            role: 'tenant_admin', // Ensure role is set
          },
        }).catch((error) => {
          console.error('Failed to update user metadata:', error);
          // Continue even if metadata update fails
        });

        // Generate login URL with subdomain format
        let loginUrl: string;
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const isLocalhost = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1');
        
        if (isLocalhost) {
          // For local development, use subdomain format: http://subdomain.localhost:3000/login
          const url = new URL(baseUrl);
          loginUrl = `${url.protocol}//${tenant.subdomain}.${url.hostname}${url.port ? `:${url.port}` : ''}/login`;
        } else {
          // For production, use dukanest.com domain: https://subdomain.dukanest.com/login
          loginUrl = `https://${tenant.subdomain}.dukanest.com/login`;
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
          // Continue even if email fails
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
      }
    }
    
    // If we reach here, user doesn't exist - proceed with creating new user and tenant

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

    // Create tenant admin user in Supabase Auth (we already checked user doesn't exist above)
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

      return NextResponse.json(
        { message: `Failed to create admin user: ${authError?.message || 'Unknown error'}` },
        { status: 500 }
      );
    }

    // Update tenant with user_id (this should always happen now)
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
      // For production, use dukanest.com domain: https://subdomain.dukanest.com/login
      loginUrl = `https://${updatedTenant.subdomain}.dukanest.com/login`;
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

