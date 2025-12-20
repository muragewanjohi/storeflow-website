/**
 * Manual Subscription Service Trigger
 * 
 * Allows authenticated landlords to manually trigger subscription services
 * 
 * POST /api/admin/subscriptions/manual-trigger
 * Body: { "service": "payment-reminders" | "expiry-checker" }
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuthOrRedirect, requireRoleOrRedirect } from '@/lib/auth/server';
import { GET as paymentRemindersGET } from '../payment-reminders/route';
import { GET as expiryCheckerGET } from '../expiry-checker/route';

export async function POST(request: NextRequest) {
  try {
    // Require landlord authentication
    const user = await requireAuthOrRedirect('/admin/login');
    await requireRoleOrRedirect(user, 'landlord', '/admin/login');

    const body = await request.json();
    const { service } = body;

    if (!service || !['payment-reminders', 'expiry-checker'].includes(service)) {
      return NextResponse.json(
        { message: 'Invalid service. Use "payment-reminders" or "expiry-checker"' },
        { status: 400 }
      );
    }

    // Create a mock request with cron secret token for the service
    const cronToken = process.env.CRON_SECRET_TOKEN;
    const mockRequest = new NextRequest(request.url, {
      method: 'GET',
      headers: {
        'authorization': `Bearer ${cronToken}`,
      },
    });

    let result;
    if (service === 'payment-reminders') {
      result = await paymentRemindersGET(mockRequest);
    } else {
      result = await expiryCheckerGET(mockRequest);
    }

    const data = await result.json();

    return NextResponse.json({
      message: `Service "${service}" executed successfully`,
      service,
      results: data.results || data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in manual trigger:', error);
    return NextResponse.json(
      {
        message: 'Failed to trigger service',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
