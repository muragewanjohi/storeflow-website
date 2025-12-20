/**
 * Cron Job Logger
 * 
 * Logs cron job executions to database for monitoring
 */

import { prisma } from '@/lib/prisma/client';

export interface CronJobLogInput {
  jobName: string;
  jobPath: string;
  metadata?: Record<string, any>;
}

export interface CronJobLogResult {
  result?: Record<string, any>;
  error?: string;
}

/**
 * Start logging a cron job execution
 */
export async function startCronJobLog(input: CronJobLogInput): Promise<string> {
  const log = await prisma.cron_job_logs.create({
    data: {
      job_name: input.jobName,
      job_path: input.jobPath,
      status: 'running',
      metadata: input.metadata || {},
    },
  });
  return log.id;
}

/**
 * Complete a cron job log (success or failure)
 */
export async function completeCronJobLog(
  logId: string,
  status: 'success' | 'failed',
  result?: CronJobLogResult
): Promise<void> {
  const startedAt = await prisma.cron_job_logs.findUnique({
    where: { id: logId },
    select: { started_at: true },
  });

  const durationMs = startedAt
    ? Math.floor((new Date().getTime() - startedAt.started_at.getTime()))
    : null;

  await prisma.cron_job_logs.update({
    where: { id: logId },
    data: {
      status,
      completed_at: new Date(),
      duration_ms: durationMs,
      result: result?.result || {},
      error: result?.error || null,
    },
  });
}

/**
 * Get recent cron job logs
 */
export async function getCronJobLogs(limit: number = 50) {
  return await prisma.cron_job_logs.findMany({
    orderBy: { started_at: 'desc' },
    take: limit,
  });
}

/**
 * Get cron job logs by job name
 */
export async function getCronJobLogsByName(jobName: string, limit: number = 20) {
  return await prisma.cron_job_logs.findMany({
    where: { job_name: jobName },
    orderBy: { started_at: 'desc' },
    take: limit,
  });
}

/**
 * Get cron job statistics
 */
export async function getCronJobStats() {
  const [total, successful, failed, running] = await Promise.all([
    prisma.cron_job_logs.count(),
    prisma.cron_job_logs.count({ where: { status: 'success' } }),
    prisma.cron_job_logs.count({ where: { status: 'failed' } }),
    prisma.cron_job_logs.count({ where: { status: 'running' } }),
  ]);

  // Get last execution for each job
  const jobs = await prisma.cron_job_logs.findMany({
    select: {
      job_name: true,
      job_path: true,
      status: true,
      started_at: true,
      completed_at: true,
      duration_ms: true,
      error: true,
    },
    orderBy: { started_at: 'desc' },
  });

  // Group by job name and get latest
  const jobMap = new Map<string, typeof jobs[0]>();
  for (const job of jobs) {
    if (!jobMap.has(job.job_name)) {
      jobMap.set(job.job_name, job);
    }
  }

  return {
    total,
    successful,
    failed,
    running,
    jobs: Array.from(jobMap.values()),
  };
}
