/**
 * Scheduled Reports API Route
 * 
 * Manages scheduled analytics reports:
 * - Create scheduled report
 * - List scheduled reports
 * - Delete scheduled report
 * - Trigger report generation
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import { sendPlatformEmail } from '@/lib/email/service';
import { getTenantContactEmail } from '@/lib/orders/emails';

interface ScheduledReport {
  id: string;
  tenant_id: string;
  report_type: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  email_recipients: string[];
  format: 'csv' | 'pdf';
  last_sent_at: Date | null;
  next_send_at: Date;
  is_active: boolean;
  created_at: Date;
}

// In-memory store for scheduled reports (in production, use database table)
// For now, we'll use a simple approach with tenant data field
const SCHEDULED_REPORTS_KEY = 'scheduled_reports';

/**
 * GET /api/analytics/scheduled-reports
 * List all scheduled reports for the tenant
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();

    // Get scheduled reports from tenant data
    const tenantData = (tenant as any).data as any;
    const reports = tenantData?.[SCHEDULED_REPORTS_KEY] || [];

    return NextResponse.json({ success: true, data: reports });
  } catch (error: any) {
    console.error('Error fetching scheduled reports:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch scheduled reports' },
      { status: error.status || 500 }
    );
  }
}

/**
 * POST /api/analytics/scheduled-reports
 * Create a new scheduled report
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();

    const body = await request.json();
    const { reportType, frequency, emailRecipients, format = 'csv' } = body;

    if (!reportType || !frequency || !emailRecipients || !Array.isArray(emailRecipients)) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Calculate next send date
    const now = new Date();
    let nextSendAt = new Date();

    switch (frequency) {
      case 'daily':
        nextSendAt.setDate(now.getDate() + 1);
        nextSendAt.setHours(9, 0, 0, 0); // 9 AM
        break;
      case 'weekly':
        nextSendAt.setDate(now.getDate() + 7);
        nextSendAt.setHours(9, 0, 0, 0);
        break;
      case 'monthly':
        nextSendAt.setMonth(now.getMonth() + 1);
        nextSendAt.setDate(1);
        nextSendAt.setHours(9, 0, 0, 0);
        break;
    }

    const newReport = {
      id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tenant_id: tenant.id,
      report_type: reportType,
      frequency,
      email_recipients: emailRecipients,
      format,
      last_sent_at: null,
      next_send_at: nextSendAt.toISOString(),
      is_active: true,
      created_at: new Date().toISOString(),
    };

    // Save to tenant data
    const tenantData = ((tenant as any).data as any) || {};
    const reports = tenantData[SCHEDULED_REPORTS_KEY] || [];
    reports.push(newReport);

    await prisma.tenants.update({
      where: { id: tenant.id },
      data: {
        data: {
          ...tenantData,
          [SCHEDULED_REPORTS_KEY]: reports,
        },
      },
    });

    return NextResponse.json({ success: true, data: newReport });
  } catch (error: any) {
    console.error('Error creating scheduled report:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create scheduled report' },
      { status: error.status || 500 }
    );
  }
}

/**
 * DELETE /api/analytics/scheduled-reports/[id]
 * Delete a scheduled report
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();

    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get('id');

    if (!reportId) {
      return NextResponse.json(
        { error: 'Report ID is required' },
        { status: 400 }
      );
    }

    // Remove from tenant data
    const tenantData = ((tenant as any).data as any) || {};
    const reports = (tenantData[SCHEDULED_REPORTS_KEY] || []).filter(
      (r: any) => r.id !== reportId
    );

    await prisma.tenants.update({
      where: { id: tenant.id },
      data: {
        data: {
          ...tenantData,
          [SCHEDULED_REPORTS_KEY]: reports,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting scheduled report:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete scheduled report' },
      { status: error.status || 500 }
    );
  }
}
