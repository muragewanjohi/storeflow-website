/**
 * Page View Tracking API Route
 * 
 * Tracks individual page views for analytics
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import { getCurrentCustomer } from '@/lib/customers/get-current-customer';

export async function POST(request: NextRequest) {
  try {
    const tenant = await requireTenant();
    const body = await request.json();
    
    const {
      sessionId,
      pagePath,
      pageTitle,
      productId,
      categoryId,
      referrer,
      timeOnPage,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      utm_content,
    } = body;

    if (!sessionId || !pagePath) {
      return NextResponse.json(
        { error: 'Session ID and page path are required' },
        { status: 400 }
      );
    }

    // Get customer ID if authenticated
    const customer = await getCurrentCustomer();
    const customerId = customer?.id || null;

    // Insert page view
    await prisma.$executeRaw`
      INSERT INTO analytics_page_views (
        tenant_id,
        session_id,
        customer_id,
        page_path,
        page_title,
        product_id,
        category_id,
        referrer,
        utm_source,
        utm_medium,
        utm_campaign,
        time_on_page,
        created_at
      ) VALUES (
        ${tenant.id}::uuid,
        ${sessionId},
        ${customerId ? `${customerId}::uuid` : 'NULL'},
        ${pagePath},
        ${pageTitle || null},
        ${productId ? `${productId}::uuid` : 'NULL'},
        ${categoryId ? `${categoryId}::uuid` : 'NULL'},
        ${referrer || null},
        ${utm_source || null},
        ${utm_medium || null},
        ${utm_campaign || null},
        ${timeOnPage || null},
        NOW()
      )
    `;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error tracking page view:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to track page view' },
      { status: 500 }
    );
  }
}
