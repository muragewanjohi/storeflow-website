import { prisma } from '@/lib/prisma/client';
import type { Prisma } from '@prisma/client';
import type { Tenant } from '@/lib/tenant-context';

const SCHEDULED_REPORTS_KEY = 'scheduled_reports';

export async function listScheduledReports(tenant: Tenant) {
  const tenantData = (tenant.data as Record<string, unknown> | null) ?? {};
  return (tenantData[SCHEDULED_REPORTS_KEY] as unknown[]) ?? [];
}

export async function createScheduledReport(
  tenant: Tenant,
  body: {
    reportType?: string;
    report_type?: string;
    frequency: 'daily' | 'weekly' | 'monthly';
    emailRecipients?: string[];
    email_recipients?: string[];
    format?: 'csv' | 'pdf';
  },
) {
  const reportType = body.reportType ?? body.report_type;
  const emailRecipients = body.emailRecipients ?? body.email_recipients;
  const format = body.format ?? 'csv';

  if (!reportType || !body.frequency || !emailRecipients || !Array.isArray(emailRecipients)) {
    throw new Error('Missing required fields');
  }

  const now = new Date();
  const nextSendAt = new Date();

  switch (body.frequency) {
    case 'daily':
      nextSendAt.setDate(now.getDate() + 1);
      nextSendAt.setHours(9, 0, 0, 0);
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
    frequency: body.frequency,
    email_recipients: emailRecipients,
    format,
    last_sent_at: null,
    next_send_at: nextSendAt.toISOString(),
    is_active: true,
    created_at: new Date().toISOString(),
  };

  const tenantData = (tenant.data as Record<string, unknown> | null) ?? {};
  const reports = [...((tenantData[SCHEDULED_REPORTS_KEY] as unknown[]) ?? []), newReport];

  await prisma.tenants.update({
    where: { id: tenant.id },
    data: {
      data: {
        ...tenantData,
        [SCHEDULED_REPORTS_KEY]: reports,
      } as Prisma.InputJsonValue,
    },
  });

  return newReport;
}

export async function deleteScheduledReport(tenantId: string, reportId: string) {
  const tenant = await prisma.tenants.findFirst({
    where: { id: tenantId, deleted_at: null },
  });

  if (!tenant) {
    throw new Error('Tenant not found');
  }

  const tenantData = (tenant.data as Record<string, unknown> | null) ?? {};
  const reports = ((tenantData[SCHEDULED_REPORTS_KEY] as Array<{ id: string }>) ?? []).filter(
    (r) => r.id !== reportId,
  );

  await prisma.tenants.update({
    where: { id: tenantId },
    data: {
      data: {
        ...tenantData,
        [SCHEDULED_REPORTS_KEY]: reports,
      } as Prisma.InputJsonValue,
    },
  });
}
