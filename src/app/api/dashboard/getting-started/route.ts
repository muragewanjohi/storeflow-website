/**
 * Getting Started Checklist API
 *
 * Returns completion status for onboarding checklist items.
 * Used to guide new tenants through initial store setup.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import { getStaticOptions, setStaticOption } from '@/lib/settings/static-options';

export const dynamic = 'force-dynamic';

export interface GettingStartedItem {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  href: string;
  cta?: string;
  priority?: number;
}

export async function GET() {
  try {
    await requireAuth();
    const tenant = await requireTenant();

    const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'dukanest.com';
    const storeUrl = `https://${tenant.subdomain}.${baseDomain}`;

    // Fetch data in parallel
    const [productCount, deliveryZoneCount, settings] = await Promise.all([
      prisma.products.count({
        where: { tenant_id: tenant.id, status: 'active', created_by: { not: null } },
      }),
      prisma.delivery_zones.count({
        where: { tenant_id: tenant.id, is_active: true },
      }),
      getStaticOptions(tenant.id, [
        'getting_started_shared_link',
        'store_logo',
        'shipping_enabled',
        'shipping_method_type',
        'flat_rate_amount',
        'currency_code',
        'payment_cash_enabled',
        'payment_mpesa_enabled',
        'payment_mpesa_send_money_number',
        'payment_mpesa_buy_goods_till',
        'payment_mpesa_paybill_number',
        'payment_mpesa_paybill_account',
      ]),
    ]);

    const hasLogo = !!(
      settings.store_logo &&
      String(settings.store_logo).trim().length > 0
    );

    const flatRateSet =
      settings.flat_rate_amount != null &&
      settings.flat_rate_amount !== '' &&
      !isNaN(parseFloat(String(settings.flat_rate_amount)));
    const hasShipping =
      settings.shipping_enabled === 'true' &&
      (settings.shipping_method_type === 'delivery_zones'
        ? deliveryZoneCount > 0
        : flatRateSet);

    const hasPayment =
      settings.payment_cash_enabled === 'true' ||
      (settings.payment_mpesa_enabled === 'true' &&
        (!!(
          settings.payment_mpesa_send_money_number &&
          String(settings.payment_mpesa_send_money_number).trim()
        ) ||
          !!(
            settings.payment_mpesa_buy_goods_till &&
            String(settings.payment_mpesa_buy_goods_till).trim()
          ) ||
          !!(
            settings.payment_mpesa_paybill_number &&
            String(settings.payment_mpesa_paybill_number).trim()
          )));

    const hasCurrency = !!(
      settings.currency_code && String(settings.currency_code).trim()
    );

    const items: GettingStartedItem[] = [
      {
        id: 'product',
        label: 'Add your first product',
        description: 'Create a product so customers can start buying',
        completed: productCount > 0,
        href: '/dashboard/products/new',
        cta: 'Add product',
        priority: 1,
      },
      {
        id: 'delivery',
        label: 'Configure delivery & shipping',
        description: 'Set up flat rate or delivery zones for orders',
        completed: hasShipping,
        href:
          settings.shipping_method_type === 'delivery_zones'
            ? '/dashboard/settings/delivery-zones'
            : '/dashboard/settings',
        cta: 'Configure shipping',
        priority: 3,
      },
      {
        id: 'logo',
        label: 'Add your store logo',
        description: 'Brand your storefront with a logo',
        completed: hasLogo,
        href: '/dashboard/settings',
        cta: 'Add logo',
        priority: 4,
      },
      {
        id: 'payment',
        label: 'Set up checkout preferences',
        description: 'Enable Cash, M-Pesa, or other payment methods',
        completed: hasPayment,
        href: '/dashboard/settings',
        cta: 'Set up payments',
        priority: 2,
      },
      {
        id: 'currency',
        label: 'Set your store currency',
        description: 'Choose the currency for your prices',
        completed: hasCurrency,
        href: '/dashboard/settings',
        cta: 'Set currency',
        priority: 5,
      },
      {
        id: 'share',
        label: 'Share your store link',
        description: 'Copy and share your store URL with customers',
        completed: settings.getting_started_shared_link === 'true',
        href: storeUrl,
        cta: 'Copy link',
        priority: 6,
      },
    ];

    const completedCount = items.filter((i) => i.completed).length;
    const totalCount = items.length;
    const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
    const allComplete = completedCount === totalCount;
    const nextSteps = items
      .filter((item) => !item.completed)
      .sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999))
      .slice(0, 3);
    const nextAction = nextSteps[0] ?? null;

    return NextResponse.json({
      success: true,
      data: {
        items,
        completedCount,
        totalCount,
        progressPercent,
        allComplete,
        nextSteps,
        nextAction,
        storeUrl,
      },
    });
  } catch (error) {
    console.error('[Getting Started] Error:', error);
    return NextResponse.json(
      { error: 'Failed to load checklist' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/dashboard/getting-started
 * Mark a checklist item as done (e.g. after copying store link)
 */
export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const tenant = await requireTenant();

    const body = await request.json().catch(() => ({}));
    const { action } = body;

    if (action === 'share_done') {
      await setStaticOption(tenant.id, 'getting_started_shared_link', 'true');
      return NextResponse.json({ success: true, data: { shared: true } });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('[Getting Started] POST Error:', error);
    return NextResponse.json(
      { error: 'Failed to update checklist' },
      { status: 500 }
    );
  }
}
