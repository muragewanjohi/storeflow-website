/**
 * Send Scheduled Reports Cron Job
 * 
 * Processes and sends scheduled analytics reports via email
 * Should be called daily by a cron job
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { verifyCronJobAuth } from '@/lib/cron-jobs/auth';
import { startCronJobLog, completeCronJobLog } from '@/lib/cron-jobs/logger';
import { sendPlatformEmail } from '@/lib/email/service';
import { getTenantContactEmail } from '@/lib/orders/emails';

const SCHEDULED_REPORTS_KEY = 'scheduled_reports';

export async function GET(request: NextRequest) {
  const logId = await startCronJobLog({
    jobName: 'Send Scheduled Reports',
    jobPath: '/api/admin/analytics/send-scheduled-reports',
  });

  try {
    // Verify cron job authentication
    const authResult = verifyCronJobAuth(request);
    
    if (!authResult.authorized) {
      await completeCronJobLog(logId, 'failed', {
        error: `Unauthorized - ${authResult.reason || 'Invalid token'}`,
      });
      return NextResponse.json(
        { message: 'Unauthorized', error: authResult.reason || 'Invalid token' },
        { status: 401 }
      );
    }

    const now = new Date();
    const results = {
      reports_checked: 0,
      reports_sent: 0,
      errors: [] as string[],
    };

    // Get all active tenants
    const tenants = await prisma.tenants.findMany({
      where: {
        status: 'active',
      },
      select: {
        id: true,
        name: true,
        subdomain: true,
        data: true,
      },
    });

    for (const tenant of tenants) {
      try {
        const tenantData = ((tenant as any).data as any) || {};
        const reports = tenantData[SCHEDULED_REPORTS_KEY] || [];

        for (const report of reports) {
          if (!report.is_active) continue;

          results.reports_checked++;

          const nextSendAt = new Date(report.next_send_at);
          
          // Check if it's time to send
          if (now >= nextSendAt) {
            try {
              // Generate report data
              const reportData = await generateReport(tenant.id, report.report_type);
              
              // Format report based on type
              let reportContent = '';
              let subject = '';
              
              if (report.format === 'csv') {
                reportContent = formatReportAsCSV(reportData, report.report_type);
                subject = `${report.report_type} Report - ${tenant.name}`;
              } else {
                // PDF generation would go here
                reportContent = formatReportAsText(reportData, report.report_type);
                subject = `${report.report_type} Report - ${tenant.name}`;
              }

              // Send email to recipients
              for (const email of report.email_recipients) {
                await sendPlatformEmail({
                  to: email,
                  subject,
                  html: `
                    <h2>${report.report_type} Analytics Report</h2>
                    <p>Please find your scheduled analytics report attached.</p>
                    <pre style="white-space: pre-wrap; font-family: monospace;">${reportContent}</pre>
                    <p><small>Report generated on ${now.toLocaleString()}</small></p>
                  `,
                });
              }

              // Update report
              const updatedReports = reports.map((r: any) => {
                if (r.id === report.id) {
                  let nextSend = new Date();
                  switch (r.frequency) {
                    case 'daily':
                      nextSend.setDate(nextSend.getDate() + 1);
                      break;
                    case 'weekly':
                      nextSend.setDate(nextSend.getDate() + 7);
                      break;
                    case 'monthly':
                      nextSend.setMonth(nextSend.getMonth() + 1);
                      break;
                  }
                  return {
                    ...r,
                    last_sent_at: now.toISOString(),
                    next_send_at: nextSend.toISOString(),
                  };
                }
                return r;
              });

              await prisma.tenants.update({
                where: { id: tenant.id },
                data: {
                  data: {
                    ...tenantData,
                    [SCHEDULED_REPORTS_KEY]: updatedReports,
                  },
                },
              });

              results.reports_sent++;
            } catch (error) {
              const errorMsg = `Failed to send report ${report.id} for tenant ${tenant.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
              results.errors.push(errorMsg);
              console.error(errorMsg, error);
            }
          }
        }
      } catch (error) {
        const errorMsg = `Error processing reports for tenant ${tenant.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        results.errors.push(errorMsg);
        console.error(errorMsg, error);
      }
    }

    await completeCronJobLog(logId, 'success', {
      result: results,
    });

    return NextResponse.json({
      message: 'Scheduled reports processed',
      results,
      timestamp: now.toISOString(),
    });
  } catch (error: any) {
    console.error('Error processing scheduled reports:', error);
    
    await completeCronJobLog(logId, 'failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    return NextResponse.json(
      {
        message: process.env.NODE_ENV === 'development'
          ? (error instanceof Error ? error.message : 'Internal server error')
          : 'Failed to process scheduled reports'
      },
      { status: 500 }
    );
  }
}

async function generateReport(tenantId: string, reportType: string): Promise<any> {
  // Fetch analytics data based on report type
  // This is a simplified version - in production, fetch actual analytics
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const endDate = new Date();

  // Fetch basic metrics
  const [orders, revenue, customers] = await Promise.all([
    prisma.orders.count({
      where: {
        tenant_id: tenantId,
        created_at: { gte: startDate, lte: endDate },
      },
    }),
    prisma.orders.aggregate({
      where: {
        tenant_id: tenantId,
        payment_status: 'paid',
        created_at: { gte: startDate, lte: endDate },
      },
      _sum: { total_amount: true },
    }),
    prisma.customers.count({
      where: {
        tenant_id: tenantId,
        created_at: { gte: startDate, lte: endDate },
      },
    }),
  ]);

  return {
    period: { start: startDate, end: endDate },
    orders: { total: orders },
    revenue: { total: Number(revenue._sum.total_amount || 0) },
    customers: { new: customers },
  };
}

function formatReportAsCSV(data: any, reportType: string): string {
  // Simple CSV formatting
  return `Period,${data.period.start.toISOString()},${data.period.end.toISOString()}
Total Orders,${data.orders.total}
Total Revenue,${data.revenue.total}
New Customers,${data.customers.new}`;
}

function formatReportAsText(data: any, reportType: string): string {
  return `
Analytics Report: ${reportType}
Period: ${data.period.start.toLocaleDateString()} - ${data.period.end.toLocaleDateString()}

Total Orders: ${data.orders.total}
Total Revenue: ${data.revenue.total}
New Customers: ${data.customers.new}
  `.trim();
}
