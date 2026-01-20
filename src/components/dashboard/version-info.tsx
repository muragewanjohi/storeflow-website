/**
 * Version Info Component
 * 
 * Displays system version information in settings
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Package, Calendar, GitBranch, Globe, Code } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface VersionInfo {
  version: string;
  buildTime: string;
  commitHash: string;
  environment: string;
  deploymentUrl: string | null;
  nodeVersion: string;
  platform: string;
  lastUpdated: string;
}

export function VersionInfo() {
  const { data, isLoading, error } = useQuery<VersionInfo>({
    queryKey: ['system-version'],
    queryFn: async () => {
      const response = await fetch('/api/system/version');
      if (!response.ok) {
        throw new Error('Failed to fetch version information');
      }
      return response.json();
    },
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>System Version</CardTitle>
          <CardDescription>Application version and build information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Loading version information...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>System Version</CardTitle>
          <CardDescription>Application version and build information</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>
              Failed to load version information. Please try again later.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
      });
    } catch {
      return dateString;
    }
  };

  const getEnvironmentBadgeVariant = (env: string) => {
    switch (env.toLowerCase()) {
      case 'production':
        return 'default';
      case 'preview':
        return 'secondary';
      case 'development':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>System Version</CardTitle>
        <CardDescription>
          Application version, build information, and deployment details
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Version */}
          <div className="flex items-start gap-3">
            <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium">Version</p>
              <p className="text-sm text-muted-foreground">v{data.version}</p>
            </div>
          </div>

          {/* Environment */}
          <div className="flex items-start gap-3">
            <Globe className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium">Environment</p>
              <Badge variant={getEnvironmentBadgeVariant(data.environment)} className="mt-1">
                {data.environment}
              </Badge>
            </div>
          </div>

          {/* Build Time */}
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium">Build Time</p>
              <p className="text-sm text-muted-foreground">{formatDate(data.buildTime)}</p>
            </div>
          </div>

          {/* Commit Hash */}
          <div className="flex items-start gap-3">
            <GitBranch className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium">Commit</p>
              <code className="text-xs bg-muted px-2 py-1 rounded mt-1 inline-block">
                {data.commitHash}
              </code>
            </div>
          </div>

          {/* Node Version */}
          <div className="flex items-start gap-3">
            <Code className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium">Node.js Version</p>
              <p className="text-sm text-muted-foreground">{data.nodeVersion}</p>
            </div>
          </div>

          {/* Deployment URL */}
          {data.deploymentUrl && (
            <div className="flex items-start gap-3">
              <Globe className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">Deployment URL</p>
                <a
                  href={data.deploymentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline break-all"
                >
                  {data.deploymentUrl}
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Update Information */}
        <Alert className="mt-4">
          <AlertDescription className="text-sm">
            <strong>Zero-Downtime Deployments:</strong> StoreFlow uses atomic deployments, 
            meaning updates are applied instantly without service interruption. Your store 
            remains accessible during all updates.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
