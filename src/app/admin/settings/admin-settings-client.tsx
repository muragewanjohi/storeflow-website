/**
 * Admin Settings Client Component
 * 
 * Displays platform settings, system information, and environment status
 */

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface AdminSettingsClientProps {
  stats: {
    tenantCount: number;
    activeTenantCount: number;
    planCount: number;
  };
  envStatus: {
    supabaseUrl: boolean;
    supabaseAnonKey: boolean;
    supabaseServiceKey: boolean;
    databaseUrl: boolean;
    resendApiKey: boolean;
    resendFromEmail: boolean;
    googleMapsApiKey: boolean;
    vercelUrl: boolean;
    cronSecret: boolean;
  };
  systemInfo: {
    nodeEnv: string;
    vercelUrl: string | null;
  };
}

export default function AdminSettingsClient({
  stats,
  envStatus,
  systemInfo,
}: Readonly<AdminSettingsClientProps>) {
  const getStatusBadge = (configured: boolean) => {
    return configured ? (
      <Badge className="bg-green-100 text-green-800">
        <CheckCircleIcon className="h-3 w-3 mr-1" />
        Configured
      </Badge>
    ) : (
      <Badge className="bg-red-100 text-red-800">
        <XCircleIcon className="h-3 w-3 mr-1" />
        Missing
      </Badge>
    );
  };

  const requiredEnvVars = [
    { key: 'NEXT_PUBLIC_SUPABASE_URL', label: 'Supabase URL', configured: envStatus.supabaseUrl },
    { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', label: 'Supabase Anon Key', configured: envStatus.supabaseAnonKey },
    { key: 'SUPABASE_SERVICE_ROLE_KEY', label: 'Supabase Service Role Key', configured: envStatus.supabaseServiceKey },
    { key: 'DATABASE_URL', label: 'Database URL', configured: envStatus.databaseUrl },
    { key: 'RESEND_API_KEY (or legacy SENDGRID_API_KEY)', label: 'Resend API Key', configured: envStatus.resendApiKey },
    {
      key: 'RESEND_FROM_EMAIL (or legacy SENDGRID_FROM_EMAIL/SMTP_FROM)',
      label: 'Email From Address',
      configured: envStatus.resendFromEmail,
    },
  ];

  const optionalEnvVars = [
    { key: 'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY', label: 'Google Maps API Key', configured: envStatus.googleMapsApiKey },
    { key: 'VERCEL_URL', label: 'Vercel URL', configured: envStatus.vercelUrl },
    { key: 'CRON_SECRET / CRON_SECRET_TOKEN', label: 'Cron Secret Token', configured: envStatus.cronSecret },
  ];

  const allRequiredConfigured = requiredEnvVars.every(v => v.configured);

  return (
    <div className="space-y-6">
      {/* Platform Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.tenantCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.activeTenantCount} active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Price Plans</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.planCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Available plans
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {allRequiredConfigured ? (
                <span className="text-green-600">Operational</span>
              ) : (
                <span className="text-yellow-600">Warning</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {allRequiredConfigured ? 'All systems ready' : 'Configuration issues'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Environment Variables Status */}
      <Card>
        <CardHeader>
          <CardTitle>Environment Configuration</CardTitle>
          <CardDescription>
            Status of required and optional environment variables
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Required Variables */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              Required Variables
              {!allRequiredConfigured && (
                <Badge variant="destructive" className="text-xs">
                  Action Required
                </Badge>
              )}
            </h3>
            <div className="space-y-2">
              {requiredEnvVars.map((envVar) => (
                <div
                  key={envVar.key}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium">{envVar.label}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {envVar.key}
                    </p>
                  </div>
                  {getStatusBadge(envVar.configured)}
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Optional Variables */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Optional Variables</h3>
            <div className="space-y-2">
              {optionalEnvVars.map((envVar) => (
                <div
                  key={envVar.key}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium">{envVar.label}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {envVar.key}
                    </p>
                  </div>
                  {getStatusBadge(envVar.configured)}
                </div>
              ))}
            </div>
          </div>

          {/* Warning Alert */}
          {!allRequiredConfigured && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Configuration Required</AlertTitle>
              <AlertDescription>
                Some required environment variables are missing. Please configure
                them in your Vercel project settings or .env.local file. See the
                documentation for setup instructions.
              </AlertDescription>
            </Alert>
          )}

          {/* Info Alert */}
          <Alert>
            <InformationCircleIcon className="h-4 w-4" />
            <AlertTitle>Environment Variables</AlertTitle>
            <AlertDescription>
              Environment variables are configured in your Vercel project
              settings or .env.local file. Changes require a redeployment to
              take effect. Never commit sensitive keys to version control.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* System Information */}
      <Card>
        <CardHeader>
          <CardTitle>System Information</CardTitle>
          <CardDescription>
            Platform version and deployment information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium">Environment</p>
              <p className="text-sm text-muted-foreground">
                {systemInfo.nodeEnv}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium">Deployment URL</p>
              <p className="text-sm text-muted-foreground font-mono">
                {systemInfo.vercelUrl || 'Not configured'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>Documentation & Resources</CardTitle>
          <CardDescription>
            Helpful links for platform management
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <a
              href="https://vercel.com/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline block"
            >
              Vercel Documentation
            </a>
            <a
              href="https://supabase.com/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline block"
            >
              Supabase Documentation
            </a>
            <a
              href="https://resend.com/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline block"
            >
              Resend Documentation
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
