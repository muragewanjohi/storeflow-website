import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma/client';
import { requireTenant } from '@/lib/tenant-context/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const customerGoogleAuthSchema = z.object({
  redirect: z.string().optional(),
});

function sanitizeRedirectPath(path: string | undefined): string {
  if (!path) return '/account';
  if (path.startsWith('/') && !path.startsWith('//')) {
    return path;
  }
  return '/account';
}

function deriveCustomerName(userMetadata: Record<string, unknown>, email: string): string {
  const fullName = typeof userMetadata.full_name === 'string' ? userMetadata.full_name.trim() : '';
  const name = typeof userMetadata.name === 'string' ? userMetadata.name.trim() : '';
  if (fullName) return fullName;
  if (name) return name;
  return email.split('@')[0] || 'Customer';
}

function deriveUsername(email: string): string {
  const prefix = email.split('@')[0] || 'customer';
  const normalized = prefix
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return normalized || 'customer';
}

export async function POST(request: NextRequest) {
  try {
    const tenant = await requireTenant();
    const body = await request.json().catch(() => ({}));
    const validated = customerGoogleAuthSchema.parse(body);
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    if (!token) {
      return NextResponse.json({ error: 'Missing Google auth token' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 },
      );
    }

    const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey);
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user || !userData.user.email) {
      return NextResponse.json(
        { error: 'Google session is invalid or expired' },
        { status: 401 },
      );
    }

    const email = userData.user.email.toLowerCase();
    const userMetadata = (userData.user.user_metadata ?? {}) as Record<string, unknown>;
    const customerName = deriveCustomerName(userMetadata, email);
    const username = deriveUsername(email);
    const avatar =
      typeof userMetadata.avatar_url === 'string'
        ? userMetadata.avatar_url
        : typeof userMetadata.picture === 'string'
          ? userMetadata.picture
          : null;

    let customer = await prisma.customers.findFirst({
      where: {
        tenant_id: tenant.id,
        email,
      },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        email_verified: true,
      },
    });

    let isNewCustomer = false;
    if (!customer) {
      customer = await prisma.customers.create({
        data: {
          tenant_id: tenant.id,
          name: customerName,
          email,
          username,
          email_verified: true,
          image: avatar,
        },
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          email_verified: true,
        },
      });
      isNewCustomer = true;
    } else {
      const updateData: {
        email_verified?: boolean;
        image?: string;
      } = {};
      if (!customer.email_verified) {
        updateData.email_verified = true;
      }
      if (avatar) {
        updateData.image = avatar;
      }
      if (Object.keys(updateData).length > 0) {
        await prisma.customers.update({
          where: { id: customer.id },
          data: updateData,
        });
      }
    }

    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const cookieStore = await cookies();
    cookieStore.set('customer_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
      path: '/',
    });
    cookieStore.set('customer_email', customer.email, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
      path: '/',
    });

    fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/cart/merge`, {
      method: 'POST',
      headers: {
        Cookie: request.headers.get('cookie') || '',
      },
    }).catch((err) => {
      console.error('Failed to merge cart after Google customer auth:', err);
    });

    (async () => {
      try {
        const { linkGuestOrdersToCustomer } = await import('@/lib/orders/link-guest-orders');
        await linkGuestOrdersToCustomer(customer.id, customer.email, tenant.id);
      } catch (err) {
        console.error('Failed to link guest orders after Google customer auth:', err);
      }
    })();

    return NextResponse.json({
      success: true,
      isNewCustomer,
      redirectTo: sanitizeRedirectPath(validated.redirect),
      customer,
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Validation failed' },
        { status: 400 },
      );
    }

    const message = error instanceof Error ? error.message : 'Failed to authenticate customer';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

