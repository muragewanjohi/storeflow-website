import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { verifyOnboardingUnsubscribeToken } from '@/lib/onboarding/preferences';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  if (!token) {
    return new NextResponse('Missing unsubscribe token.', { status: 400 });
  }

  const payload = verifyOnboardingUnsubscribeToken(token);
  if (!payload) {
    return new NextResponse('Invalid or expired unsubscribe token.', { status: 400 });
  }

  try {
    const tenant = await prisma.tenants.findUnique({
      where: { id: payload.tenantId },
      select: { id: true, contact_email: true, data: true },
    });
    if (!tenant) {
      return new NextResponse('Tenant not found.', { status: 404 });
    }

    const expected = (tenant.contact_email || '').toLowerCase().trim();
    if (expected && expected !== payload.email) {
      return new NextResponse('Token/email mismatch.', { status: 400 });
    }

    const tenantData = (tenant.data as any) || {};
    const prefs = tenantData.email_preferences || {};
    const onboarding = tenantData.onboarding_emails || {};

    await prisma.tenants.update({
      where: { id: tenant.id },
      data: {
        data: {
          ...tenantData,
          email_preferences: {
            ...prefs,
            onboarding_opt_out: true,
          },
          onboarding_emails: {
            ...onboarding,
            unsubscribed_at: new Date().toISOString(),
          },
        },
      },
    });

    return new NextResponse(
      `
      <html>
        <head><title>Unsubscribed</title></head>
        <body style="font-family: Arial, sans-serif; max-width: 620px; margin: 40px auto; padding: 0 16px; color: #111827;">
          <h1 style="margin-bottom: 8px;">You are unsubscribed</h1>
          <p style="color: #4b5563;">You will no longer receive onboarding/tips emails for this store.</p>
          <p style="color: #4b5563;">Important account, billing, and security emails will still be sent.</p>
        </body>
      </html>
      `,
      {
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8' },
      }
    );
  } catch (error) {
    console.error('[Unsubscribe] Error:', error);
    return new NextResponse('Failed to process unsubscribe request.', { status: 500 });
  }
}

