/**
 * Cron Jobs Monitoring Dashboard
 * 
 * Displays cron job execution logs, status, and allows manual triggering
 */

import { redirect } from 'next/navigation';
import { requireAuthOrRedirect, requireRoleOrRedirect } from '@/lib/auth/server';
import CronJobsClient from './cron-jobs-client';

export default async function CronJobsPage() {
  const user = await requireAuthOrRedirect('/admin/login');
  await requireRoleOrRedirect(user, 'landlord', '/admin/login');

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Cron Jobs Monitoring</h1>
        <p className="text-muted-foreground mt-2">
          Monitor and manage automated background jobs
        </p>
      </div>
      <CronJobsClient />
    </div>
  );
}
