/**
 * Update Notification Banner
 * 
 * Displays a banner when a new version is available or after an update
 */

'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { X, Sparkles, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

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

interface UpdateNotificationBannerProps {
  /** Show banner even if no update detected */
  forceShow?: boolean;
  /** Custom message to display */
  customMessage?: string;
  /** Callback when user dismisses banner */
  onDismiss?: () => void;
  /** Show refresh button */
  showRefresh?: boolean;
}

const STORAGE_KEY = 'dukanest_last_seen_version';
const STORAGE_DISMISS_KEY = 'dukanest_update_dismissed';

export function UpdateNotificationBanner({
  forceShow = false,
  customMessage,
  onDismiss,
  showRefresh = true,
}: Readonly<UpdateNotificationBannerProps>) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const { data: versionInfo, isLoading } = useQuery<VersionInfo>({
    queryKey: ['system-version'],
    queryFn: async () => {
      const response = await fetch('/api/system/version');
      if (!response.ok) {
        throw new Error('Failed to fetch version information');
      }
      return response.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 1000 * 60 * 10, // Check every 10 minutes
  });

  useEffect(() => {
    if (!versionInfo || isLoading) return;

    // Check if user has dismissed this version
    const dismissedVersion = localStorage.getItem(STORAGE_DISMISS_KEY);
    if (dismissedVersion === versionInfo.version) {
      setIsDismissed(true);
      setIsVisible(false);
      return;
    }

    // Check if this is a new version
    const lastSeenVersion = localStorage.getItem(STORAGE_KEY);
    
    if (forceShow || customMessage) {
      setIsVisible(true);
    } else if (lastSeenVersion && lastSeenVersion !== versionInfo.version) {
      // New version detected
      setIsVisible(true);
    } else if (!lastSeenVersion) {
      // First time - show welcome message
      setIsVisible(true);
    }

    // Update last seen version
    localStorage.setItem(STORAGE_KEY, versionInfo.version);
  }, [versionInfo, isLoading, forceShow, customMessage]);

  const handleDismiss = () => {
    setIsDismissed(true);
    setIsVisible(false);
    
    if (versionInfo) {
      localStorage.setItem(STORAGE_DISMISS_KEY, versionInfo.version);
    }
    
    onDismiss?.();
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  if (isLoading || !isVisible || isDismissed || !versionInfo) {
    return null;
  }

  const isNewVersion = (() => {
    const lastSeenVersion = localStorage.getItem(STORAGE_KEY);
    return lastSeenVersion && lastSeenVersion !== versionInfo.version;
  })();

  return (
    <Alert
      className={cn(
        'mb-6 border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800',
        'relative'
      )}
    >
      <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
      <AlertTitle className="text-blue-900 dark:text-blue-100">
        {customMessage || (isNewVersion ? 'System Updated' : 'Welcome to DukaNest')}
      </AlertTitle>
      <AlertDescription className="text-blue-800 dark:text-blue-200">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            {customMessage ? (
              <p>{customMessage}</p>
            ) : isNewVersion ? (
              <>
                <p>
                  DukaNest has been updated to version <strong>v{versionInfo.version}</strong>.
                </p>
                <p className="text-sm">
                  Updates are applied instantly with zero downtime. Your store remains fully 
                  accessible during all updates.
                </p>
                {showRefresh && (
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Refresh your browser to ensure you&apos;re seeing the latest features.
                  </p>
                )}
              </>
            ) : (
              <>
                <p>
                  You&apos;re running DukaNest version <strong>v{versionInfo.version}</strong>.
                </p>
                <p className="text-sm">
                  All updates are applied automatically with zero downtime.
                </p>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {showRefresh && isNewVersion && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                className="border-blue-300 text-blue-900 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-100 dark:hover:bg-blue-900"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}
