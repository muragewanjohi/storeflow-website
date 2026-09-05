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
import {
  buildGettingStartedProgress,
  GETTING_STARTED_OPTION_NAMES,
} from '@/lib/onboarding/getting-started-progress';
import { countActiveDemoProducts } from '@/lib/products/demo-products';

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
    const [productCount, categoryCount, activeDemoProductCount, deliveryZoneCount, bookableProductCount, settings] = await Promise.all([
      prisma.products.count({
        where: { tenant_id: tenant.id, status: 'active', created_by: { not: null } },
      }),
      prisma.categories.count({
        where: { tenant_id: tenant.id },
      }),
      countActiveDemoProducts(tenant.id),
      prisma.delivery_zones.count({
        where: { tenant_id: tenant.id, is_active: true },
      }),
      // Real scheduling/booking (S2, docs/SERVICES_PLAN.md)
      prisma.products.count({
        where: { tenant_id: tenant.id, is_bookable: true },
      }),
      getStaticOptions(tenant.id, [...GETTING_STARTED_OPTION_NAMES]),
    ]);

    const progress = buildGettingStartedProgress({
      productCount,
      categoryCount,
      activeDemoProductCount,
      deliveryZoneCount,
      bookableProductCount,
      settings,
      includeAssistantItem: true, // web-only for now — see the flag's doc comment
    });
    const completionById = new Map(
      progress.items.map((item) => [item.id, item.completed] as const),
    );
    const items: GettingStartedItem[] = [
      {
        id: 'category',
        label: 'Create your first category',
        description: 'Organize your catalog so products are easy to find',
        completed: completionById.get('category') ?? false,
        href: '/dashboard/categories/new',
        cta: 'Add category',
        priority: 1,
      },
      {
        id: 'product',
        label: 'Add your first product',
        description: 'Create a product so customers can start buying',
        completed: completionById.get('product') ?? false,
        href: '/dashboard/products/new',
        cta: 'Add product',
        priority: 2,
      },
      {
        id: 'preview',
        label: 'Preview your store 👀',
        description: 'Open your storefront in a new tab and confirm it looks right',
        completed: completionById.get('preview') ?? false,
        href: storeUrl,
        cta: 'Preview store',
        priority: 3,
      },
      {
        id: 'share',
        label: 'Share your store 🔗',
        description: 'Copy and share your store URL with customers',
        completed: completionById.get('share') ?? false,
        href: storeUrl,
        cta: 'Copy link',
        priority: 4,
      },
      {
        id: 'contact_phone',
        label: 'Get order alerts via SMS',
        description: 'Add your phone number so you never miss a customer order',
        completed: completionById.get('contact_phone') ?? false,
        href: '/dashboard/settings',
        cta: 'Add phone',
        priority: 5,
      },
      {
        id: 'payment',
        label: 'Set up checkout preferences',
        description: 'Enable Cash, M-Pesa, or other payment methods',
        completed: completionById.get('payment') ?? false,
        href: '/dashboard/settings',
        cta: 'Set up payments',
        priority: 6,
      },
      {
        id: 'delivery',
        label: 'Configure delivery & shipping',
        description: 'Set up flat rate or delivery zones for orders',
        completed: completionById.get('delivery') ?? false,
        href:
          settings.shipping_method_type === 'delivery_zones'
            ? '/dashboard/settings/delivery-zones'
            : '/dashboard/settings',
        cta: 'Configure shipping',
        priority: 7,
      },
      {
        id: 'logo',
        label: 'Add your store logo',
        description: 'Brand your storefront with a logo',
        completed: completionById.get('logo') ?? false,
        href: '/dashboard/settings',
        cta: 'Add logo',
        priority: 8,
      },
      {
        id: 'assistant',
        label: 'Try the DukaNest Assistant 🤖',
        description: 'Ask it a question — about your store, a feature, or what to do next',
        completed: completionById.get('assistant') ?? false,
        // Plain query-param navigation, not a special onClick handler — this
        // renders through the same generic <Link href={item.href}> fallback
        // every other non-special item already uses, so it needed zero
        // changes to this page's (multi-instance) checklist rendering.
        // AssistantPanel opens itself and strips the param on mount when it
        // sees ?openAssistant=1 — see its docblock.
        href: '/dashboard?openAssistant=1',
        cta: 'Try it',
        priority: 9,
      },
      {
        // Real scheduling/booking (S2, docs/SERVICES_PLAN.md)
        id: 'bookings',
        label: 'Set up a bookable service 📅',
        description: 'Sell an appointment or consultation customers book a real time slot for',
        completed: completionById.get('bookings') ?? false,
        href: '/dashboard/products/new',
        cta: 'Add a service',
        priority: 10,
      },
    ];

    // Show cleanup task only when demo products exist.
    if (completionById.has('demo_products')) {
      items.push({
        id: 'demo_products',
        label: 'Remove demo products',
        description: 'Clear sample products once your real catalog is ready',
        completed: completionById.get('demo_products') ?? false,
        href: '/dashboard/products',
        cta: 'Remove demo products',
        priority: 11,
      });
    }

    const completedCount = progress.completedCount;
    const totalCount = progress.totalCount;
    const progressPercent = progress.progressPercent;
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
 * Mark a checklist item as done
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
    if (action === 'preview_done') {
      await setStaticOption(tenant.id, 'getting_started_previewed_store', 'true');
      return NextResponse.json({ success: true, data: { previewed: true } });
    }
    if (action === 'assistant_tried') {
      await setStaticOption(tenant.id, 'getting_started_tried_assistant', 'true');
      return NextResponse.json({ success: true, data: { tried: true } });
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
