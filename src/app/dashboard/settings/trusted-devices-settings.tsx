/**
 * Trusted Devices Settings Component
 * 
 * Allows users to view and manage their trusted devices
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { DevicePhoneMobileIcon, TrashIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';

interface TrustedDevice {
  id: string;
  deviceName: string;
  browserInfo: string;
  osInfo: string;
  lastUsedAt: string;
  expiresAt: string;
  createdAt: string;
}

export default function TrustedDevicesSettings() {
  const [devices, setDevices] = useState<TrustedDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/auth/tenant/trusted-devices');
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || errorData.error || 'Failed to fetch devices';
        
        // If it's a 401 (unauthorized), don't show error - user might not be logged in
        if (response.status === 401) {
          console.warn('Unauthorized access to trusted devices');
          setDevices([]);
          return;
        }
        
        // For other errors, log but don't show toast on initial load
        console.error('Error fetching trusted devices:', {
          status: response.status,
          statusText: response.statusText,
          error: errorMessage,
        });
        
        // Only show toast if it's not the initial load (user initiated action)
        setDevices([]);
        return;
      }

      const data = await response.json();
      setDevices(data.devices || []);
    } catch (error: any) {
      console.error('Error fetching trusted devices:', error);
      // Don't show toast on initial load - just set empty array
      setDevices([]);
    } finally {
      setIsLoading(false);
    }
  };

  const revokeDevice = async (deviceId: string) => {
    try {
      setRevokingId(deviceId);
      const response = await fetch(`/api/auth/tenant/trusted-devices?deviceId=${deviceId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to revoke device');
      }

      toast.success('Device revoked successfully');
      fetchDevices(); // Refresh list
    } catch (error) {
      console.error('Error revoking device:', error);
      toast.error('Failed to revoke device');
    } finally {
      setRevokingId(null);
    }
  };

  const revokeAllDevices = async () => {
    if (!confirm('Are you sure you want to revoke all trusted devices? You will need to complete 2FA on all devices.')) {
      return;
    }

    try {
      const response = await fetch('/api/auth/tenant/trusted-devices?revokeAll=true', {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to revoke devices');
      }

      toast.success('All devices revoked successfully');
      fetchDevices(); // Refresh list
    } catch (error) {
      console.error('Error revoking all devices:', error);
      toast.error('Failed to revoke devices');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Trusted Devices</CardTitle>
          <CardDescription>Manage devices that can skip 2FA verification</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">Loading devices...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheckIcon className="h-5 w-5" />
              Trusted Devices
            </CardTitle>
            <CardDescription>
              Devices that can skip 2FA verification for 30 days. Revoke any device you no longer use or recognize.
            </CardDescription>
          </div>
          {devices.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={revokeAllDevices}
              className="text-destructive hover:text-destructive"
            >
              Revoke All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {devices.length === 0 ? (
          <div className="text-center py-8">
            <DevicePhoneMobileIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-2">No trusted devices</p>
            <p className="text-sm text-muted-foreground">
              When you check &quot;Trust this device&quot; during login, it will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {devices.map((device) => {
              const expiresAt = new Date(device.expiresAt);
              const lastUsedAt = new Date(device.lastUsedAt);
              const isExpired = expiresAt < new Date();
              const expiresIn = formatDistanceToNow(expiresAt, { addSuffix: true });

              return (
                <div
                  key={device.id}
                  className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start gap-4 flex-1">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <DevicePhoneMobileIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-sm">{device.deviceName}</h4>
                        {isExpired && (
                          <Badge variant="secondary" className="text-xs">
                            Expired
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {device.browserInfo} • {device.osInfo}
                      </p>
                      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                        <span>Last used: {formatDistanceToNow(lastUsedAt, { addSuffix: true })}</span>
                        {!isExpired && <span>Expires: {expiresIn}</span>}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => revokeDevice(device.id)}
                    disabled={revokingId === device.id}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    {revokingId === device.id ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                      <TrashIcon className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Security Tip:</strong> Only trust devices that you own and use regularly. 
            If you notice any unfamiliar devices, revoke them immediately. Trusted devices automatically expire after 30 days.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

