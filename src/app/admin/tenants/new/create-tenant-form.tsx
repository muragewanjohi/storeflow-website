/**
 * Create Tenant Form
 * 
 * Client component for creating a new tenant
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface PricePlan {
  id: string;
  name: string;
  price: number;
  duration_months: number;
  features: any;
}

export default function CreateTenantForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pricePlans, setPricePlans] = useState<PricePlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    subdomain: '',
    adminEmail: '',
    adminPassword: '',
    adminName: '',
    contactEmail: '',
    planId: '',
  });

  // Fetch price plans on mount
  useEffect(() => {
    async function fetchPricePlans() {
      try {
        const response = await fetch('/api/admin/price-plans');
        if (response.ok) {
          const data = await response.json();
          setPricePlans(data.pricePlans || []);
        }
      } catch (err) {
        console.error('Failed to fetch price plans:', err);
      } finally {
        setLoadingPlans(false);
      }
    }
    fetchPricePlans();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/tenants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          planId: formData.planId || undefined, // Send undefined instead of empty string
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create tenant');
      }

      // Redirect to tenants list
      router.push('/admin/tenants');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsSubmitting(false);
    }
  };

  const handleSubdomainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setFormData({ ...formData, subdomain: value });
  };

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle>Tenant Information</CardTitle>
          <CardDescription>
            Enter the details for the new tenant store
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Store Name *</Label>
            <Input
              id="name"
              type="text"
              placeholder="My Awesome Store"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subdomain">Subdomain *</Label>
            <div className="flex items-center gap-2">
              <Input
                id="subdomain"
                type="text"
                placeholder="mystore"
                value={formData.subdomain}
                onChange={handleSubdomainChange}
                required
                pattern="[a-z0-9-]+"
                minLength={3}
                maxLength={63}
              />
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                .dukanest.com
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Only lowercase letters, numbers, and hyphens. Will be accessible at {formData.subdomain || 'subdomain'}.dukanest.com
            </p>
          </div>

          <div className="border-t pt-4 mt-4">
            <h3 className="text-lg font-semibold mb-4">Subscription Plan (Optional)</h3>
            
            {loadingPlans ? (
              <p className="text-sm text-muted-foreground">Loading plans...</p>
            ) : pricePlans.length > 0 ? (
              <div className="space-y-3">
                <Select
                  value={formData.planId}
                  onValueChange={(value) => setFormData({ ...formData, planId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a plan (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No Plan (Free Trial)</SelectItem>
                    {pricePlans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name} - ${Number(plan.price).toFixed(2)}/{plan.duration_months === 1 ? 'month' : `${plan.duration_months} months`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.planId && (
                  <div className="rounded-lg border p-4 bg-muted/50">
                    {(() => {
                      const selectedPlan = pricePlans.find(p => p.id === formData.planId);
                      if (!selectedPlan) return null;
                      return (
                        <>
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold">{selectedPlan.name}</span>
                            <Badge variant="secondary">
                              ${Number(selectedPlan.price).toFixed(2)}/{selectedPlan.duration_months === 1 ? 'month' : `${selectedPlan.duration_months} months`}
                            </Badge>
                          </div>
                          {selectedPlan.features && typeof selectedPlan.features === 'object' && (
                            <p className="text-xs text-muted-foreground">
                              {Object.keys(selectedPlan.features).length} features included
                            </p>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}
                {!formData.planId && (
                  <p className="text-xs text-muted-foreground">
                    Tenant can select a plan later from their dashboard.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No plans available. Tenant will be created without a subscription plan.
              </p>
            )}
          </div>

          <div className="border-t pt-4 mt-4">
            <h3 className="text-lg font-semibold mb-4">Tenant Admin Account</h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="adminName">Admin Name *</Label>
                <Input
                  id="adminName"
                  type="text"
                  placeholder="John Doe"
                  value={formData.adminName}
                  onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="adminEmail">Admin Email *</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  placeholder="admin@example.com"
                  value={formData.adminEmail}
                  onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="adminPassword">Admin Password *</Label>
                <Input
                  id="adminPassword"
                  type="password"
                  placeholder="••••••••"
                  value={formData.adminPassword}
                  onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                  required
                  minLength={8}
                />
                <p className="text-xs text-muted-foreground">
                  Minimum 8 characters
                </p>
              </div>
            </div>
          </div>

          <div className="border-t pt-4 mt-4">
            <h3 className="text-lg font-semibold mb-4">Contact Email</h3>
            
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
                This email will be used for customer inquiries, order notifications, and support. 
                It can be different from your admin login email. Customers will see this email in order confirmations and can contact you directly.
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/admin/tenants')}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Tenant'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

