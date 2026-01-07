/**
 * API Route: Account Recovery Request
 * 
 * POST /api/auth/tenant/account-recovery
 * 
 * Handles account recovery requests for tenant admins who have lost access to their email.
 * Creates a landlord support ticket for manual verification and recovery.
 * 
 * This route does NOT require authentication since users cannot log in.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { z } from 'zod';

const recoveryRequestSchema = z.object({
  storeSubdomain: z.string().min(1, 'Store subdomain is required'),
  adminEmail: z.string().email('Invalid email address'),
  adminName: z.string().min(1, 'Admin name is required'),
  storeName: z.string().min(1, 'Store name is required'),
  approximateAccountCreationDate: z.string().optional(),
  lastSuccessfulLoginDate: z.string().optional(),
  additionalInfo: z.string().optional(),
  backupEmail: z.string().email('Invalid backup email').optional().or(z.literal('')),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = recoveryRequestSchema.parse(body);

    // Normalize subdomain (lowercase, no spaces)
    const normalizedSubdomain = validatedData.storeSubdomain.toLowerCase().trim();

    // Find tenant by subdomain
    const tenant = await prisma.tenants.findFirst({
      where: {
        subdomain: normalizedSubdomain,
      },
      select: {
        id: true,
        name: true,
        subdomain: true,
        user_id: true,
      },
    });

    if (!tenant) {
      // Don't reveal if tenant exists or not (security best practice)
      return NextResponse.json(
        {
          success: true,
          message: 'If the information provided matches our records, a recovery request has been submitted. Our support team will review your request within 24-48 hours.',
        },
        { status: 200 }
      );
    }

    // Verify email matches (but don't reveal if it doesn't)
    // We'll let support verify this manually
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const adminClient = createAdminClient();
    
    // Try to find user by email (but don't fail if not found - let support verify)
    let userFound = false;
    try {
      const { data: { users } } = await adminClient.auth.admin.listUsers();
      const matchingUser = users.find(
        (u) => u.email?.toLowerCase() === validatedData.adminEmail.toLowerCase() &&
               u.user_metadata?.tenant_id === tenant.id
      );
      userFound = !!matchingUser;
    } catch (error) {
      // If we can't check, that's okay - support will verify
      console.error('Error checking user:', error);
    }

    // Build recovery request description
    const recoveryDescription = `
ACCOUNT RECOVERY REQUEST

User Information:
- Admin Name: ${validatedData.adminName}
- Admin Email: ${validatedData.adminEmail}
- Store Name: ${validatedData.storeName}
- Store Subdomain: ${validatedData.storeSubdomain}
${validatedData.backupEmail ? `- Backup Email: ${validatedData.backupEmail}` : ''}

Verification Information:
${validatedData.approximateAccountCreationDate ? `- Approximate Account Creation: ${validatedData.approximateAccountCreationDate}` : ''}
${validatedData.lastSuccessfulLoginDate ? `- Last Successful Login: ${validatedData.lastSuccessfulLoginDate}` : ''}

Additional Information:
${validatedData.additionalInfo || 'None provided'}

System Information:
- Tenant ID: ${tenant.id}
- User Found in System: ${userFound ? 'Yes' : 'No'}
- Request IP: ${request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'Unknown'}
- Request Time: ${new Date().toISOString()}

ACTION REQUIRED:
1. Verify user identity using provided information
2. Check tenant records and user metadata
3. Contact user via backup email (if provided) or alternative method
4. Once verified, provide temporary access method or update email
5. Require password reset and email update after recovery
    `.trim();

    // Create landlord support ticket for account recovery
    const ticket = await prisma.landlord_support_tickets.create({
      data: {
        tenant_id: tenant.id,
        user_id: null, // User cannot authenticate, so no user_id
        subject: `Account Recovery Request - ${validatedData.storeName} (${validatedData.storeSubdomain})`,
        description: recoveryDescription,
        priority: 'high', // Account recovery is high priority
        category: 'account_recovery',
        status: 'open',
      },
      include: {
        tenants: {
          select: {
            id: true,
            name: true,
            subdomain: true,
            contact_email: true,
          },
        },
      },
    });

    // Send email notification to landlord admin
    try {
      const { sendNewLandlordTicketEmail } = await import('@/lib/landlord-support/emails');
      await sendNewLandlordTicketEmail({
        ticket,
        tenant: tenant as any,
      });
    } catch (emailError) {
      console.error('Error sending recovery ticket email:', emailError);
      // Don't fail the request if email fails
    }

    // Log recovery attempt (for security monitoring)
    console.log('Account recovery request submitted:', {
      tenantId: tenant.id,
      subdomain: normalizedSubdomain,
      adminEmail: validatedData.adminEmail,
      ticketId: ticket.id,
      timestamp: new Date().toISOString(),
    });

    // Always return success (don't reveal if account exists)
    return NextResponse.json({
      success: true,
      message: 'If the information provided matches our records, a recovery request has been submitted. Our support team will review your request within 24-48 hours.',
      ticketId: ticket.id, // Include for support reference (not shown to user)
    });
  } catch (error: any) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          message: 'Please check your input and try again',
          details: error.issues.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        },
        { status: 400 }
      );
    }

    console.error('Account recovery error:', error);

    // Don't expose internal errors
    return NextResponse.json(
      {
        error: 'Request failed',
        message: 'An error occurred while processing your recovery request. Please try again or contact support directly.',
      },
      { status: 500 }
    );
  }
}

