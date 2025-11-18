/**
 * Tenant Settings Client Component
 * 
 * Client component for managing tenant settings
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
// Note: Alert component may need to be created if it doesn't exist
// For now, using inline divs for alerts
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  ExclamationTriangleIcon,
  TrashIcon 
} from '@heroicons/react/24/outline';

interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  custom_domain: string | null;
  status: string | null;
  created_at: Date | null;
  expire_date: Date | null;
  plan_id: string | null;
  price_plans: {
    id: string;
    name: string;
    price: number;
    duration_months: number;
  } | null;
}

interface PricePlan {
  id: string;
  name: string;
  price: number;
  duration_months: number;
  features: any;
}

interface TenantSettingsClientProps {
  tenant: Tenant;
  pricePlans: PricePlan[];
}

export default function TenantSettingsClient({ tenant, pricePlans }: TenantSettingsClientProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState(tenant.name);
  const [subdomain, setSubdomain] = useState(tenant.subdomain);
  const [customDomain, setCustomDomain] = useState(tenant.custom_domain || '');
  const [status, setStatus] = useState(tenant.status || 'active');
  const [planId, setPlanId] = useState(tenant.plan_id || '');
  const [expireDate, setExpireDate] = useState(
    tenant.expire_date ? new Date(tenant.expire_date).toISOString().split('T')[0] : ''
  );

  // Subdomain change state
  const [newSubdomain, setNewSubdomain] = useState('');
  const [isChangingSubdomain, setIsChangingSubdomain] = useState(false);
  const [subdomainError, setSubdomainError] = useState<string | null>(null);

  // Delete state
  const [isDeleting, setIsDeleting] = useState(false);

  // Subscription management state
  const [isChangingSubscription, setIsChangingSubscription] = useState(false);
  const [subscriptionAction, setSubscriptionAction] = useState<'upgrade' | 'downgrade' | 'renew'>('upgrade');
  const [newPlanId, setNewPlanId] = useState('');
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);
  const [subscriptionSuccess, setSubscriptionSuccess] = useState<string | null>(null);

  // Billing history state
  const [billingHistory, setBillingHistory] = useState<any[]>([]);
  const [isLoadingBilling, setIsLoadingBilling] = useState(false);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/admin/tenants/${tenant.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          custom_domain: customDomain || null,
          status,
          plan_id: planId || null,
          expire_date: expireDate || null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Tenant settings updated successfully');
        router.refresh();
      } else {
        setError(data.message || 'Failed to update tenant settings');
      }
    } catch (err) {
      setError('An error occurred while updating tenant settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubdomainChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsChangingSubdomain(true);
    setSubdomainError(null);
    setError(null);

    if (!newSubdomain || newSubdomain === tenant.subdomain) {
      setSubdomainError('Please enter a different subdomain');
      setIsChangingSubdomain(false);
      return;
    }

    try {
      const response = await fetch(`/api/admin/tenants/${tenant.id}/subdomain`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newSubdomain: newSubdomain.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(`Subdomain changed successfully to ${newSubdomain}.dukanest.com`);
        setSubdomain(newSubdomain);
        setNewSubdomain('');
        router.refresh();
      } else {
        setSubdomainError(data.message || 'Failed to change subdomain');
      }
    } catch (err) {
      setSubdomainError('An error occurred while changing subdomain');
    } finally {
      setIsChangingSubdomain(false);
    }
  };

  const handleStatusToggle = async (newStatus: string) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/admin/tenants/${tenant.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus(newStatus);
        setSuccess(`Tenant ${newStatus === 'active' ? 'activated' : 'suspended'} successfully`);
        router.refresh();
      } else {
        setError(data.message || 'Failed to update tenant status');
      }
    } catch (err) {
      setError('An error occurred while updating tenant status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(
      `Are you sure you want to delete "${tenant.name}"?\n\n` +
      'This will:\n' +
      '- Soft delete the tenant (can be restored)\n' +
      '- Remove the subdomain from Vercel\n' +
      '- Suspend all tenant access\n\n' +
      'This action cannot be undone. Type the tenant name to confirm.'
    )) {
      return;
    }

    const confirmation = prompt(`Type "${tenant.name}" to confirm deletion:`);
    if (confirmation !== tenant.name) {
      alert('Tenant name does not match. Deletion cancelled.');
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/tenants/${tenant.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        router.push('/admin/tenants');
      } else {
        setError(data.message || 'Failed to delete tenant');
        setIsDeleting(false);
      }
    } catch (err) {
      setError('An error occurred while deleting tenant');
      setIsDeleting(false);
    }
  };

  const handleSubscriptionChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsChangingSubscription(true);
    setSubscriptionError(null);
    setSubscriptionSuccess(null);

    if (!newPlanId || newPlanId === tenant.plan_id) {
      setSubscriptionError('Please select a different plan');
      setIsChangingSubscription(false);
      return;
    }

    try {
      const response = await fetch(`/api/admin/tenants/${tenant.id}/subscription`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan_id: newPlanId,
          action: subscriptionAction,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSubscriptionSuccess(
          `Subscription ${subscriptionAction === 'renew' ? 'renewed' : subscriptionAction === 'upgrade' ? 'upgraded' : 'downgraded'} successfully`
        );
        setPlanId(newPlanId);
        setNewPlanId('');
        router.refresh();
      } else {
        setSubscriptionError(data.message || 'Failed to change subscription');
      }
    } catch (err) {
      setSubscriptionError('An error occurred while changing subscription');
    } finally {
      setIsChangingSubscription(false);
    }
  };

  const loadBillingHistory = async () => {
    setIsLoadingBilling(true);
    try {
      const response = await fetch(`/api/admin/tenants/${tenant.id}/billing`);
      const data = await response.json();
      if (response.ok) {
        setBillingHistory(data.billingHistory || []);
      }
    } catch (err) {
      console.error('Failed to load billing history:', err);
    } finally {
      setIsLoadingBilling(false);
    }
  };

  useEffect(() => {
    loadBillingHistory();
  }, []);

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Active</Badge>;
      case 'suspended':
        return <Badge className="bg-yellow-500">Suspended</Badge>;
      case 'expired':
        return <Badge className="bg-red-500">Expired</Badge>;
      default:
        return <Badge variant="secondary">{status || 'Unknown'}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
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

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>Update tenant name and basic settings</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Store Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={handleStatusToggle}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan">Price Plan</Label>
              <Select value={planId || "none"} onValueChange={(value) => setPlanId(value === "none" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="No Plan (Free Trial)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Plan (Free Trial)</SelectItem>
                  {pricePlans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} - ${plan.price}/{plan.duration_months}mo
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expire_date">Expiration Date</Label>
              <Input
                id="expire_date"
                type="date"
                value={expireDate}
                onChange={(e) => setExpireDate(e.target.value)}
              />
            </div>

            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Subdomain Management */}
      <Card>
        <CardHeader>
          <CardTitle>Subdomain</CardTitle>
          <CardDescription>
            Current subdomain: <code className="text-sm bg-muted px-2 py-1 rounded">{subdomain}.dukanest.com</code>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubdomainChange} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newSubdomain">New Subdomain</Label>
              <div className="flex gap-2">
                <Input
                  id="newSubdomain"
                  value={newSubdomain}
                  onChange={(e) => setNewSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="new-subdomain"
                  pattern="[a-z0-9-]+"
                  minLength={3}
                  maxLength={63}
                />
                <span className="flex items-center text-muted-foreground">.dukanest.com</span>
              </div>
              {subdomainError && (
                <p className="text-sm text-destructive">{subdomainError}</p>
              )}
              <p className="text-sm text-muted-foreground">
                Subdomain can only contain lowercase letters, numbers, and hyphens (3-63 characters)
              </p>
            </div>

            <Button 
              type="submit" 
              variant="outline"
              disabled={isChangingSubdomain || !newSubdomain || newSubdomain === tenant.subdomain}
            >
              {isChangingSubdomain ? 'Changing...' : 'Change Subdomain'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Custom Domain Management */}
      <Card>
        <CardHeader>
          <CardTitle>Custom Domain</CardTitle>
          <CardDescription>Manage custom domain for this tenant</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {tenant.custom_domain ? (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Current custom domain:</p>
                <code className="text-sm bg-muted px-2 py-1 rounded">{tenant.custom_domain}</code>
                <p className="text-sm text-muted-foreground mt-4">
                  Custom domain management is handled in the tenant dashboard.
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No custom domain configured. Tenant can add a custom domain from their dashboard.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Subscription Management */}
      <Card>
        <CardHeader>
          <CardTitle>Subscription Management</CardTitle>
          <CardDescription>
            {tenant.price_plans ? (
              <>
                Current plan: <strong>{tenant.price_plans.name}</strong> (${tenant.price_plans.price}/{tenant.price_plans.duration_months}mo)
                {tenant.expire_date && (
                  <> - Expires: {new Date(tenant.expire_date).toLocaleDateString()}</>
                )}
              </>
            ) : (
              'No active subscription'
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {subscriptionError && (
            <div className="rounded-lg border border-red-500 bg-red-50 p-4 mb-4">
              <div className="flex items-center gap-2">
                <XCircleIcon className="h-4 w-4 text-red-600" />
                <p className="text-sm text-red-800">{subscriptionError}</p>
              </div>
            </div>
          )}

          {subscriptionSuccess && (
            <div className="rounded-lg border border-green-500 bg-green-50 p-4 mb-4">
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="h-4 w-4 text-green-600" />
                <p className="text-sm text-green-800">{subscriptionSuccess}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubscriptionChange} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subscriptionAction">Action</Label>
              <Select value={subscriptionAction} onValueChange={(value: any) => setSubscriptionAction(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upgrade">Upgrade Plan</SelectItem>
                  <SelectItem value="downgrade">Downgrade Plan</SelectItem>
                  <SelectItem value="renew">Renew Subscription</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPlan">New Plan</Label>
              <Select value={newPlanId || "none"} onValueChange={(value) => setNewPlanId(value === "none" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a plan" />
                </SelectTrigger>
                <SelectContent>
                  {pricePlans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} - ${plan.price}/{plan.duration_months}mo
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {subscriptionAction === 'renew' && 'Renewal extends from current expiration date'}
                {subscriptionAction === 'upgrade' && 'Upgrade starts immediately with new plan duration'}
                {subscriptionAction === 'downgrade' && 'Downgrade starts immediately with new plan duration'}
              </p>
            </div>

            <Button 
              type="submit" 
              disabled={isChangingSubscription || !newPlanId || newPlanId === tenant.plan_id}
            >
              {isChangingSubscription ? 'Processing...' : `${subscriptionAction === 'renew' ? 'Renew' : subscriptionAction === 'upgrade' ? 'Upgrade' : 'Downgrade'} Subscription`}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Billing History */}
      <Card>
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
          <CardDescription>View subscription and payment history</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingBilling ? (
            <p className="text-sm text-muted-foreground">Loading billing history...</p>
          ) : billingHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">No billing history available</p>
          ) : (
            <div className="space-y-4">
              {billingHistory.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">{item.description}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.date ? new Date(item.date).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${item.amount}</p>
                    <Badge variant={item.status === 'active' ? 'default' : 'secondary'}>
                      {item.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>Irreversible and destructive actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Delete Tenant</h4>
              <p className="text-sm text-muted-foreground mb-4">
                This will soft delete the tenant, remove the subdomain from Vercel, and suspend all access.
                The tenant can be restored later if needed.
              </p>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                <TrashIcon className="mr-2 h-4 w-4" />
                {isDeleting ? 'Deleting...' : 'Delete Tenant'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

