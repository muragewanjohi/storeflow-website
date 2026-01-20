/**
 * 2FA Settings Component (Email-Based)
 * 
 * Allows tenant admins to enable/disable email-based two-factor authentication
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ShieldCheckIcon, XMarkIcon, CheckIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import { createClient } from '@/lib/supabase/client';

type MFAStatus = {
  enabled: boolean;
};

export default function MFASettings() {
  const [status, setStatus] = useState<MFAStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnabling, setIsEnabling] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Fetch 2FA status and user email
  useEffect(() => {
    fetchStatus();
    fetchUserEmail();
  }, []);

  const fetchUserEmail = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
      }
    } catch (error) {
      console.error('Failed to fetch user email:', error);
    }
  };

  const fetchStatus = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const mfaEnabled = user.user_metadata?.mfa_enabled === true;
        setStatus({ enabled: mfaEnabled });
      }
    } catch (error) {
      console.error('Failed to fetch 2FA status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-enable 2FA if not enabled (mandatory)
  useEffect(() => {
    if (!isLoading && status && !status.enabled && !isEnabling) {
      handleEnable();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, status?.enabled]);

  const handleEnable = async () => {
    setIsEnabling(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('You must be logged in to enable 2FA');
        return;
      }

      // Update user metadata to enable 2FA
      const { error } = await supabase.auth.updateUser({
        data: {
          ...user.user_metadata,
          mfa_enabled: true,
        },
      });

      if (error) {
        toast.error(error.message || 'Failed to enable 2FA');
        return;
      }

      toast.success('Two-factor authentication has been enabled!');
      fetchStatus();
    } catch (error) {
      toast.error('An error occurred while enabling 2FA');
    } finally {
      setIsEnabling(false);
    }
  };

  const handleDisable = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDisabling(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('You must be logged in to disable 2FA');
        return;
      }

      // Verify password first
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: disablePassword,
      });

      if (signInError) {
        toast.error('Invalid password. Please try again.');
        setDisablePassword('');
        return;
      }

      // Update user metadata to disable 2FA
      const { error } = await supabase.auth.updateUser({
        data: {
          ...user.user_metadata,
          mfa_enabled: false,
        },
      });

      if (error) {
        toast.error(error.message || 'Failed to disable 2FA');
        return;
      }

      toast.success('Two-factor authentication has been disabled');
      setShowDisableConfirm(false);
      setDisablePassword('');
      fetchStatus();
    } catch (error) {
      toast.error('An error occurred while disabling 2FA');
    } finally {
      setIsDisabling(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Two-Factor Authentication</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
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
              Two-Factor Authentication
            </CardTitle>
            <CardDescription>
              Mandatory security feature for your account
            </CardDescription>
          </div>
          <Badge className="bg-green-500">Enabled</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <CheckIcon className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-green-900 dark:text-green-100 mb-1">
                Two-Factor Authentication is Active
              </h3>
              <p className="text-sm text-green-800 dark:text-green-200">
                Your account is protected with email-based 2FA. You&apos;ll receive a code via email each time you log in.
              </p>
              {userEmail && (
                <p className="text-xs text-green-700 dark:text-green-300 mt-2">
                  Codes are sent to: <strong>{userEmail}</strong>
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="font-semibold">How it works:</h4>
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            <li>Enter your email and password to log in</li>
            <li>Receive a 6-digit code via email</li>
            <li>Enter the code to complete login</li>
            <li>Codes expire after 10 minutes</li>
          </ol>
        </div>

        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Note:</strong> Two-factor authentication is mandatory for all accounts. 
            If you lose access to your email, contact support for assistance.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

