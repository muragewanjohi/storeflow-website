import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { prisma } from '@/lib/prisma/client';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import type { UserRole } from '@/lib/auth/types';
import { generateAndSendOTP } from '@/lib/mfa/email-otp';

const mobileLoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createSupabaseClient(supabaseUrl, supabaseAnonKey);
}

export async function POST(request: NextRequest) {
  try {
    const parsedBody = await request.json();
    const validatedBody = mobileLoginSchema.parse(parsedBody);

    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: validatedBody.email,
      password: validatedBody.password,
    });

    if (error || !data.user || !data.session) {
      return NextResponse.json(
        mobileError('UNAUTHORIZED', 'Invalid credentials'),
        { status: 401 },
      );
    }

    const role = ((data.user.user_metadata?.role as UserRole | undefined) ?? 'customer');
    const isDashboardRole = role === 'tenant_admin' || role === 'tenant_staff' || role === 'landlord';

    if (!isDashboardRole) {
      await supabase.auth.signOut();
      return NextResponse.json(
        mobileError('FORBIDDEN', 'This account is not allowed to access the mobile dashboard API'),
        { status: 403 },
      );
    }

    const isTenantRole = role === 'tenant_admin' || role === 'tenant_staff';
    let tenantId =
      typeof data.user.user_metadata?.tenant_id === 'string' ? data.user.user_metadata.tenant_id : undefined;
    let tenantNameForMfa: string | undefined;

    if (!tenantId && isTenantRole) {
      const ownedTenant = await prisma.tenants.findFirst({
        where: {
          user_id: data.user.id,
          deleted_at: null,
        },
        select: { id: true, status: true },
      });

      if (ownedTenant?.status === 'deleted') {
        await supabase.auth.signOut();
        return NextResponse.json(
          mobileError('FORBIDDEN', 'Tenant account is deleted'),
          { status: 403 },
        );
      }

      tenantId = ownedTenant?.id;
    }

    if (isTenantRole && !tenantId) {
      await supabase.auth.signOut();
      return NextResponse.json(
        mobileError('FORBIDDEN', 'Tenant account is not linked to this user'),
        { status: 403 },
      );
    }

    if (isTenantRole) {
      const tenant = await prisma.tenants.findFirst({
        where: {
          OR: [
            ...(tenantId ? [{ id: tenantId }] : []),
            { user_id: data.user.id },
          ],
          deleted_at: null,
        },
        select: {
          id: true,
          name: true,
          subdomain: true,
          status: true,
        },
      });

      if (!tenant || tenant.status === 'deleted') {
        await supabase.auth.signOut();
        return NextResponse.json(
          mobileError('FORBIDDEN', 'Tenant account is deleted or unavailable'),
          { status: 403 },
        );
      }

      tenantNameForMfa = tenant.name || tenant.subdomain;
      await generateAndSendOTP(data.user.id, data.user.email ?? validatedBody.email, tenantNameForMfa);

      return NextResponse.json(
        mobileSuccess({
          requiresMfa: true,
          mfaMethod: 'email_otp',
          message: `A 6-digit code has been sent to ${data.user.email}`,
          user: {
            id: data.user.id,
            email: data.user.email,
            role,
            tenantId: tenant.id,
          },
          tempSession: {
            accessToken: data.session.access_token,
            refreshToken: data.session.refresh_token,
            expiresAt: data.session.expires_at,
          },
        }),
        { status: 200 },
      );
    }

    return NextResponse.json(
      mobileSuccess({
        requiresMfa: false,
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at,
        tokenType: 'Bearer',
        user: {
          id: data.user.id,
          email: data.user.email,
          role,
          tenantId,
        },
      }),
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        mobileError(
          'VALIDATION_ERROR',
          'Invalid login payload',
          error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        ),
        { status: 400 },
      );
    }

    console.error('[Mobile Auth Login] Unexpected error:', error);
    return NextResponse.json(
      mobileError('INTERNAL_ERROR', 'Failed to login'),
      { status: 500 },
    );
  }
}

