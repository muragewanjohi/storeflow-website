import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { requireMobileAuth } from '@/lib/auth/mobile-auth';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import { getStaticOptions, setStaticOption } from '@/lib/settings/static-options';
import {
  buildGettingStartedProgress,
  GETTING_STARTED_OPTION_NAMES,
} from '@/lib/onboarding/getting-started-progress';
import { countActiveDemoProducts } from '@/lib/products/demo-products';

const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'dukanest.com';

export type MobileGettingStartedItem = {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  href: string;
  cta?: string;
  priority?: number;
};

/**
 * GET /api/v1/mobile/dashboard/getting-started
 * Same completion rules as web `/api/dashboard/getting-started`; mobile `{ success, data }` envelope.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireMobileAuth(request);

    if (user.role !== 'tenant_admin' && user.role !== 'tenant_staff') {
      return NextResponse.json(
        mobileError('FORBIDDEN', 'Only tenant users can access getting started'),
        { status: 403 },
      );
    }

    if (!user.tenant_id) {
      return NextResponse.json(
        mobileError('FORBIDDEN', 'Tenant context missing for this user'),
        { status: 403 },
      );
    }

    const tenantId = user.tenant_id;

    const tenant = await prisma.tenants.findFirst({
      where: { id: tenantId, deleted_at: null },
      select: { id: true, subdomain: true },
    });

    if (!tenant) {
      return NextResponse.json(mobileError('NOT_FOUND', 'Tenant not found'), { status: 404 });
    }

    const storeUrl = `https://${tenant.subdomain}.${BASE_DOMAIN}`;

    const [productCount, categoryCount, activeDemoProductCount, deliveryZoneCount, bookableProductCount, settings] = await Promise.all([
      prisma.products.count({
        where: { tenant_id: tenantId, status: 'active', created_by: { not: null } },
      }),
      prisma.categories.count({
        where: { tenant_id: tenantId },
      }),
      countActiveDemoProducts(tenantId),
      prisma.delivery_zones.count({
        where: { tenant_id: tenantId, is_active: true },
      }),
      // Real scheduling/booking (S2, docs/SERVICES_PLAN.md)
      prisma.products.count({
        where: { tenant_id: tenantId, is_bookable: true },
      }),
      getStaticOptions(tenantId, [...GETTING_STARTED_OPTION_NAMES]),
    ]);

    const progress = buildGettingStartedProgress({
      productCount,
      categoryCount,
      activeDemoProductCount,
      deliveryZoneCount,
      bookableProductCount,
      settings,
      includeAssistantItem: true, // Flutter Phase 4 — the assistant now has a real center-tab entry point (/assistant)
    });
    const completionById = new Map(
      progress.items.map((item) => [item.id, item.completed] as const),
    );

    const items: MobileGettingStartedItem[] = [
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
        label: 'Preview your store',
        description: 'Open your storefront and confirm it looks right',
        completed: completionById.get('preview') ?? false,
        href: storeUrl,
        cta: 'Preview store',
        priority: 3,
      },
      {
        id: 'share',
        label: 'Share your store link',
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
        label: 'Try the DukaNest Assistant',
        description: 'Ask it a question — about your store, a feature, or what to do next',
        completed: completionById.get('assistant') ?? false,
        href: '/assistant', // real Flutter router.dart path — the center bottom-nav tab, not a web dashboard URL like the other entries above
        cta: 'Try it',
        priority: 9,
      },
      {
        // Real scheduling/booking (S2, docs/SERVICES_PLAN.md) — real Flutter
        // router.dart path (confirmed), a plain top-level GoRoute reachable
        // from the More menu.
        id: 'bookings',
        label: 'Set up a bookable service',
        description: 'Sell an appointment or consultation customers book a real time slot for',
        completed: completionById.get('bookings') ?? false,
        href: '/dashboard/products/new', // matches this array's dominant convention (see 'product'/'demo_products' above) — the Flutter getting-started widget doesn't currently consume `href` for navigation at all
        cta: 'Add a service',
        priority: 10,
      },
    ];

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

    return NextResponse.json(
      mobileSuccess({
        items,
        completedCount,
        totalCount,
        progressPercent,
        allComplete,
        nextSteps,
        nextAction,
        storeUrl,
      }),
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized mobile request')) {
      return NextResponse.json(
        mobileError('UNAUTHORIZED', 'Missing or invalid bearer token'),
        { status: 401 },
      );
    }
    console.error('[Mobile Getting Started GET]', error);
    return NextResponse.json(
      mobileError('INTERNAL_ERROR', 'Failed to load checklist'),
      { status: 500 },
    );
  }
}

/**
 * POST /api/v1/mobile/dashboard/getting-started
 * Body: `{ "action": "preview_done" | "share_done" }` — persists the same `static_options` flags as web.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireMobileAuth(request);

    if (user.role !== 'tenant_admin' && user.role !== 'tenant_staff') {
      return NextResponse.json(
        mobileError('FORBIDDEN', 'Only tenant users can update getting started'),
        { status: 403 },
      );
    }

    if (!user.tenant_id) {
      return NextResponse.json(
        mobileError('FORBIDDEN', 'Tenant context missing for this user'),
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const { action } = body as { action?: string };

    if (action === 'share_done') {
      await setStaticOption(user.tenant_id, 'getting_started_shared_link', 'true');
      return NextResponse.json(mobileSuccess({ shared: true }), { status: 200 });
    }
    if (action === 'preview_done') {
      await setStaticOption(user.tenant_id, 'getting_started_previewed_store', 'true');
      return NextResponse.json(mobileSuccess({ previewed: true }), { status: 200 });
    }
    if (action === 'assistant_tried') {
      // Mirrors the web getting-started route's action of the same name —
      // Flutter Phase 4 (IMPLEMENTATION_TRACKER.md). Marked the moment a
      // merchant sends their first message to the assistant tab.
      await setStaticOption(user.tenant_id, 'getting_started_tried_assistant', 'true');
      return NextResponse.json(mobileSuccess({ tried: true }), { status: 200 });
    }

    return NextResponse.json(
      mobileError('VALIDATION_ERROR', 'Unknown action', [
        { field: 'action', message: 'Use preview_done, share_done, or assistant_tried' },
      ]),
      { status: 400 },
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized mobile request')) {
      return NextResponse.json(
        mobileError('UNAUTHORIZED', 'Missing or invalid bearer token'),
        { status: 401 },
      );
    }
    console.error('[Mobile Getting Started POST]', error);
    return NextResponse.json(
      mobileError('INTERNAL_ERROR', 'Failed to update checklist'),
      { status: 500 },
    );
  }
}
