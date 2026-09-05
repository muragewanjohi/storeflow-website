import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';

const subscriptionSchema = z.object({
  endpoint: z.string().url('Invalid endpoint URL'),
  keys: z.object({
    p256dh: z.string().min(1, 'Missing p256dh key'),
    auth: z.string().min(1, 'Missing auth key'),
  }),
});

const bodySchema = z.object({
  subscription: subscriptionSchema,
  userAgent: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();

    if (user.role !== 'tenant_admin' && user.role !== 'tenant_staff') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = bodySchema.parse(await request.json());
    const tokenHash = createHash('sha256').update(body.subscription.endpoint).digest('hex');

    await prisma.mobile_push_devices.upsert({
      where: {
        tenant_id_user_id_device_id: {
          tenant_id: tenant.id,
          user_id: user.id,
          device_id: `web-${tokenHash.slice(0, 24)}`,
        },
      },
      create: {
        tenant_id: tenant.id,
        user_id: user.id,
        device_id: `web-${tokenHash.slice(0, 24)}`,
        platform: 'web',
        push_token: body.subscription.endpoint,
        app_version: 'web',
        device_name: body.userAgent?.slice(0, 255) || 'Web Browser',
        active: true,
        last_seen_at: new Date(),
      },
      update: {
        push_token: body.subscription.endpoint,
        app_version: 'web',
        device_name: body.userAgent?.slice(0, 255) || 'Web Browser',
        active: true,
        last_seen_at: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: 'Failed to register web push device' }, { status: 500 });
  }
}
