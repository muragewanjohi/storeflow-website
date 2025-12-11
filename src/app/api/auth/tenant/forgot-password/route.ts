/**
 * Forgot Password API Route
 * 
 * POST /api/auth/tenant/forgot-password
 * 
 * Validates that the email belongs to the current tenant before sending reset email
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTenant } from '@/lib/tenant-context/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { prisma } from '@/lib/prisma/client';
import { z } from 'zod';

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
  redirectTo: z.string().url('Invalid redirect URL').optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Get current tenant from request
    const tenant = await getTenant();
    
    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validatedData = forgotPasswordSchema.parse(body);

    // Get the base URL for redirect (tenant-specific)
    // Priority: Use the redirectTo from client (which includes tenant subdomain), or get from request
    let redirectTo: string;
    
    if (validatedData.redirectTo) {
      // Client already provided tenant-specific URL (e.g., http://scooters.localhost:3000/reset-password)
      redirectTo = validatedData.redirectTo;
    } else {
      // Fallback: construct from request origin
      const requestOrigin = request.headers.get('origin') || 
                          request.headers.get('referer')?.split('/').slice(0, 3).join('/') ||
                          `http://${request.headers.get('host')}`;
      redirectTo = `${requestOrigin}/reset-password`;
    }
    
    console.log('Password reset - Tenant:', tenant.subdomain);
    console.log('Password reset - Redirect URL:', redirectTo);

    // Step 1: Check if email exists in Supabase Auth
    const adminClient = createAdminClient();
    const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error listing users:', listError);
      // Return success to prevent email enumeration
      return NextResponse.json({
        success: true,
        message: 'If an account with that email exists for this store, a password reset link has been sent.',
      });
    }

    const existingUser = users.find(user => 
      user.email?.toLowerCase() === validatedData.email.toLowerCase()
    );

    // Step 2: If user exists, verify they belong to the current tenant
    if (existingUser) {
      // Check if this user_id is associated with the current tenant
      const tenantWithUser = await prisma.tenants.findFirst({
        where: {
          id: tenant.id,
          user_id: existingUser.id,
        },
      });

      if (!tenantWithUser) {
        // User exists in Supabase but doesn't belong to this tenant
        // Return success to prevent email enumeration
        return NextResponse.json({
          success: true,
          message: 'If an account with that email exists for this store, a password reset link has been sent.',
        });
      }

      // User exists and belongs to this tenant - proceed with password reset
      // Use Supabase's generateLink to create reset link
      // IMPORTANT: The redirectTo must be added to Supabase Dashboard > Authentication > URL Configuration > Redirect URLs
      const { data, error } = await adminClient.auth.admin.generateLink({
        type: 'recovery',
        email: validatedData.email,
        options: {
          redirectTo: redirectTo, // Full URL: e.g., http://scooters.localhost:3000/reset-password
        },
      });

      if (error) {
        console.error('Password reset link generation error:', error);
        console.error('Attempted redirectTo:', redirectTo);
        // Return success to prevent email enumeration
        return NextResponse.json({
          success: true,
          message: 'If an account with that email exists for this store, a password reset link has been sent.',
        });
      }
      
      console.log('Supabase generateLink success. Action link:', data?.properties?.action_link?.substring(0, 100) + '...');

      // Send password reset email using SendGrid (with tenant branding)
      if (data?.properties?.action_link) {
        try {
          const { sendEmail } = await import('@/lib/email/sendgrid');
          await sendEmail({
            to: validatedData.email,
            subject: `Reset Your Password - ${tenant.name}`,
            html: `
              <!DOCTYPE html>
              <html>
                <head>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                </head>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                    <h1 style="color: white; margin: 0;">Reset Your Password</h1>
                  </div>
                  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
                    <p>Hello,</p>
                    <p>You requested to reset your password for <strong>${tenant.name}</strong>. Click the button below to reset it:</p>
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="${data.properties.action_link}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                        Reset Password
                      </a>
                    </div>
                    <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
                    <p style="color: #666; font-size: 12px; word-break: break-all;">${data.properties.action_link}</p>
                    <p style="color: #666; font-size: 14px; margin-top: 30px;">
                      If you didn't request this, please ignore this email. This link will expire in 1 hour.
                    </p>
                    <p style="color: #666; font-size: 14px;">
                      Best regards,<br>
                      The ${tenant.name} Team
                    </p>
                  </div>
                </body>
              </html>
            `,
          });
        } catch (emailError) {
          console.error('Failed to send password reset email:', emailError);
          // Continue even if email fails - Supabase might have sent it
        }
      }
    }

    // Return success message (even if user doesn't exist to prevent email enumeration)
    return NextResponse.json({
      success: true,
      message: 'If an account with that email exists for this store, a password reset link has been sent.',
    });
  } catch (error: any) {
    console.error('Forgot password error:', error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          message: error.issues[0]?.message || 'Invalid input',
        },
        { status: 400 }
      );
    }

    // Return success even on error to prevent email enumeration
    return NextResponse.json({
      success: true,
      message: 'If an account with that email exists for this store, a password reset link has been sent.',
    });
  }
}

