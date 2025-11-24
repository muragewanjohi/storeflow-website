/**
 * Tenant Settings Client Component
 * 
 * Allows tenant admin to edit contact email and other settings
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Tenant } from '@/lib/tenant-context';

interface TenantSettingsClientProps {
  tenant: Tenant;
}

export default function TenantSettingsClient({ tenant }: Readonly<TenantSettingsClientProps>) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    contactEmail: tenant.contact_email || '',
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/dashboard/settings/contact-email', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contactEmail: formData.contactEmail,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update contact email');
      }

      setSuccess('Contact email updated successfully!');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your store settings and preferences
        </p>
      </div>

      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>Contact Email</CardTitle>
            <CardDescription>
              This email will be used for customer inquiries, order notifications, and support.
              Customers will see this email in order confirmations and can contact you directly.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-lg bg-green-500/10 p-4 text-sm text-green-600 dark:text-green-400">
                {success}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="contactEmail">Support/Contact Email *</Label>
              <Input
                id="contactEmail"
                type="email"
                placeholder="support@example.com"
                value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                required
              />
              <p className="text-xs text-muted-foreground">
                This can be different from your admin login email. Use an email address that you 
                regularly check for customer inquiries and order notifications.
              </p>
            </div>
          </CardContent>
          <div className="px-6 pb-6">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

