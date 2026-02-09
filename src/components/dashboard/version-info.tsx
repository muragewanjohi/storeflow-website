/**
 * Version Info Component
 * 
 * Displays system version information in settings
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Package, Calendar, CheckCircle2, Bug } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ChangelogEntry {
  version: string;
  date: string;
  features: string[];
  bugfixes: string[];
}

interface VersionInfo {
  version: string;
  buildTime: string;
  platform: string;
  lastUpdated: string;
  changelog: ChangelogEntry[];
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>System Version</CardTitle>
        <CardDescription>
          Application version and changelog
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Version */}
          <div className="flex items-start gap-3">
            <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium">Version</p>
              <p className="text-sm text-muted-foreground">v{data.version}</p>
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
        </div>

        {/* Changelog */}
        {data.changelog && data.changelog.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">What&apos;s New</h3>
            <div className="space-y-4">
              {data.changelog.map((entry, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="default">v{entry.version}</Badge>
                      {entry.date && (
                        <span className="text-sm text-muted-foreground">
                          {new Date(entry.date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {entry.features && entry.features.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        Features Added
                      </h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-6">
                        {entry.features.map((feature, featureIndex) => (
                          <li key={featureIndex}>{feature}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {entry.bugfixes && entry.bugfixes.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <Bug className="h-4 w-4 text-orange-600" />
                        Bugs Fixed
                      </h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-6">
                        {entry.bugfixes.map((bugfix, bugfixIndex) => (
                          <li key={bugfixIndex}>{bugfix}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Update Information */}
        <Alert className="mt-4">
          <AlertDescription className="text-sm">
            <strong>Zero-Downtime Deployments:</strong> DukaNest uses atomic deployments, 
            meaning updates are applied instantly without service interruption. Your store 
            remains accessible during all updates.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
