/**
 * Cron Jobs Monitoring Client Component
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

interface CronJobLog {
  id: string;
  job_name: string;
  job_path: string;
  status: 'running' | 'success' | 'failed';
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  result: any;
  error: string | null;
  metadata: any;
}

interface CronJobStats {
  total: number;
  successful: number;
  failed: number;
  running: number;
  jobs: Array<{
    job_name: string;
    job_path: string;
    status: string;
    started_at: string;
    completed_at: string | null;
    duration_ms: number | null;
    error: string | null;
  }>;
}

const CRON_JOBS = [
  {
    name: 'Payment Reminders',
    path: '/api/admin/subscriptions/payment-reminders',
    schedule: 'Daily at 9 AM UTC',
    description: 'Sends subscription renewal and payment due reminder emails',
  },
  {
    name: 'Expiry Checker',
    path: '/api/admin/subscriptions/expiry-checker',
    schedule: 'Daily at midnight UTC',
    description: 'Checks for expired subscriptions and applies grace period logic',
  },
  {
    name: 'Analytics Aggregate',
    path: '/api/admin/analytics/aggregate',
    schedule: 'Daily at 1 AM UTC',
    description: 'Pre-computes daily analytics data for all tenants',
  },
  {
    name: 'Process Scheduled Downgrades',
    path: '/api/admin/subscriptions/process-scheduled-downgrades',
    schedule: 'Daily at 4 AM UTC',
    description: 'Processes scheduled plan downgrades that are due to take effect',
  },
  {
    name: 'Data Cleanup',
    path: '/api/admin/cleanup',
    schedule: 'Weekly on Sunday at 2 AM UTC',
    description: 'Cleans up old data and temporary files',
  },
  {
    name: 'Hard Delete Tenants',
    path: '/api/admin/cleanup/hard-delete-tenants',
    schedule: 'Weekly on Sunday at 3 AM UTC',
    description: 'Hard deletes tenants past retention period (90 days)',
  },
];

export default function CronJobsClient() {
  const [logs, setLogs] = useState<CronJobLog[]>([]);
  const [stats, setStats] = useState<CronJobStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/cron-jobs');
      const data = await response.json();
      
      if (response.ok) {
        setLogs(data.logs || []);
        setStats(data.stats || null);
      } else {
        setError(data.message || 'Failed to fetch cron job logs');
      }
    } catch (err) {
      setError('Error fetching cron job logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // Refresh every 30 seconds
    const interval = setInterval(fetchLogs, 30000);
    return () => clearInterval(interval);
  }, []);

  const triggerJob = async (jobPath: string, jobName: string) => {
    try {
      setTriggering(jobPath);
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/admin/cron-jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jobPath }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(`Job "${jobName}" executed successfully`);
        // Refresh logs after a short delay
        setTimeout(fetchLogs, 1000);
      } else {
        setError(data.message || `Failed to trigger job "${jobName}"`);
      }
    } catch (err) {
      setError(`Error triggering job "${jobName}"`);
    } finally {
      setTriggering(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return (
          <Badge className="bg-green-500">
            <CheckCircleIcon className="h-3 w-3 mr-1" />
            Success
          </Badge>
        );
      case 'failed':
        return (
          <Badge className="bg-red-500">
            <XCircleIcon className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      case 'running':
        return (
          <Badge className="bg-blue-500">
            <ClockIcon className="h-3 w-3 mr-1" />
            Running
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getLastExecution = (jobPath: string) => {
    return stats?.jobs.find(j => j.job_path === jobPath);
  };

  return (
    <div className="space-y-6">
      {/* Alerts */}
      {error && (
        <div className="rounded-lg border border-red-500 bg-red-50 p-4">
          <div className="flex items-center gap-2">
            <XCircleIcon className="h-4 w-4 text-red-600" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-500 bg-green-50 p-4">
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="h-4 w-4 text-green-600" />
            <p className="text-sm text-green-800">{success}</p>
          </div>
        </div>
      )}

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Executions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Successful</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.successful}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Failed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Running</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.running}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Cron Jobs List */}
      <Card>
        <CardHeader>
          <CardTitle>Configured Cron Jobs</CardTitle>
          <CardDescription>
            View status and manually trigger cron jobs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {CRON_JOBS.map((job) => {
              const lastExecution = getLastExecution(job.path);
              return (
                <div
                  key={job.path}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold">{job.name}</h3>
                      {lastExecution && getStatusBadge(lastExecution.status)}
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">
                      {job.description}
                    </p>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>
                        <strong>Schedule:</strong> {job.schedule}
                      </p>
                      {lastExecution && (
                        <>
                          <p>
                            <strong>Last Run:</strong>{' '}
                            {new Date(lastExecution.started_at).toLocaleString()}
                          </p>
                          {lastExecution.completed_at && (
                            <p>
                              <strong>Duration:</strong>{' '}
                              {formatDuration(lastExecution.duration_ms)}
                            </p>
                          )}
                          {lastExecution.error && (
                            <p className="text-red-600">
                              <strong>Error:</strong> {lastExecution.error}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => triggerJob(job.path, job.name)}
                    disabled={triggering === job.path}
                  >
                    <ArrowPathIcon
                      className={`h-4 w-4 mr-2 ${triggering === job.path ? 'animate-spin' : ''}`}
                    />
                    {triggering === job.path ? 'Running...' : 'Restart'}
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Execution Logs</CardTitle>
          <CardDescription>
            Last 50 cron job executions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading logs...</p>
          ) : logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No logs available</p>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 border rounded-lg text-sm"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{log.job_name}</span>
                      {getStatusBadge(log.status)}
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>
                        Started: {new Date(log.started_at).toLocaleString()}
                      </p>
                      {log.completed_at && (
                        <p>
                          Completed: {new Date(log.completed_at).toLocaleString()} (
                          {formatDuration(log.duration_ms)})
                        </p>
                      )}
                      {log.error && (
                        <p className="text-red-600">Error: {log.error}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
