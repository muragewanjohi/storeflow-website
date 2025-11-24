/**
 * Edit Price Plan Form
 * 
 * Client component for editing an existing price plan
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PricePlan {
  id: string;
  name: string;
  price: number;
  duration_months: number;
  trial_days: number | null;
  features: any;
  status: string | null;
}

interface EditPlanFormProps {
  pricePlan: PricePlan;
}

export default function EditPlanForm({ pricePlan }: Readonly<EditPlanFormProps>) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: pricePlan.name,
    price: pricePlan.price.toString(),
    duration_months: pricePlan.duration_months.toString(),
    trial_days: (pricePlan.trial_days || 0).toString(),
    status: pricePlan.status || 'active',
    features: {
      max_products: pricePlan.features?.max_products?.toString() || '',
      max_orders: pricePlan.features?.max_orders?.toString() || '',
      max_storage_mb: pricePlan.features?.max_storage_mb?.toString() || '',
      max_customers: pricePlan.features?.max_customers?.toString() || '',
      max_pages: pricePlan.features?.max_pages?.toString() || '',
      max_blogs: pricePlan.features?.max_blogs?.toString() || '',
      max_staff_users: pricePlan.features?.max_staff_users?.toString() || '',
    },
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Build features object, converting empty strings to null and numbers
      const features: any = {};
      Object.entries(formData.features).forEach(([key, value]) => {
        if (value === '' || value === null) {
          features[key] = null;
        } else if (value === '-1' || value === 'unlimited') {
          features[key] = -1; // Unlimited
        } else {
          const numValue = parseInt(value as string, 10);
          features[key] = isNaN(numValue) ? null : numValue;
        }
      });

      const response = await fetch(`/api/admin/price-plans/${pricePlan.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          price: parseFloat(formData.price),
          duration_months: parseInt(formData.duration_months, 10),
          trial_days: parseInt(formData.trial_days, 10) || 0,
          status: formData.status,
          features,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update price plan');
      }

      // Redirect to price plans list
      router.push('/admin/price-plans');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsSubmitting(false);
    }
  };

  const handleFeatureChange = (key: string, value: string) => {
    setFormData({
      ...formData,
      features: {
        ...formData.features,
        [key]: value,
      },
    });
  };

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle>Plan Details</CardTitle>
          <CardDescription>
            Update the information for this price plan
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name">Plan Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Basic Plan, Pro Plan"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Price (USD) *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="29.99"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration_months">Duration (Months) *</Label>
              <Input
                id="duration_months"
                type="number"
                min="1"
                value={formData.duration_months}
                onChange={(e) => setFormData({ ...formData, duration_months: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="trial_days">Trial Period (Days)</Label>
              <Input
                id="trial_days"
                type="number"
                min="0"
                value={formData.trial_days}
                onChange={(e) => setFormData({ ...formData, trial_days: e.target.value })}
                placeholder="0 (no trial)"
              />
              <p className="text-xs text-muted-foreground">
                Number of free trial days (0 = no trial)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Plan Features & Limits</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Set limits for each feature. Use -1 or leave empty for unlimited.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="max_products">Max Products</Label>
                <Input
                  id="max_products"
                  type="number"
                  min="-1"
                  value={formData.features.max_products}
                  onChange={(e) => handleFeatureChange('max_products', e.target.value)}
                  placeholder="-1 for unlimited"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_orders">Max Orders</Label>
                <Input
                  id="max_orders"
                  type="number"
                  min="-1"
                  value={formData.features.max_orders}
                  onChange={(e) => handleFeatureChange('max_orders', e.target.value)}
                  placeholder="-1 for unlimited"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_storage_mb">Max Storage (MB)</Label>
                <Input
                  id="max_storage_mb"
                  type="number"
                  min="-1"
                  value={formData.features.max_storage_mb}
                  onChange={(e) => handleFeatureChange('max_storage_mb', e.target.value)}
                  placeholder="1024 for 1GB"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_customers">Max Customers</Label>
                <Input
                  id="max_customers"
                  type="number"
                  min="-1"
                  value={formData.features.max_customers}
                  onChange={(e) => handleFeatureChange('max_customers', e.target.value)}
                  placeholder="-1 for unlimited"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_pages">Max Pages</Label>
                <Input
                  id="max_pages"
                  type="number"
                  min="-1"
                  value={formData.features.max_pages}
                  onChange={(e) => handleFeatureChange('max_pages', e.target.value)}
                  placeholder="-1 for unlimited"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_blogs">Max Blog Posts</Label>
                <Input
                  id="max_blogs"
                  type="number"
                  min="-1"
                  value={formData.features.max_blogs}
                  onChange={(e) => handleFeatureChange('max_blogs', e.target.value)}
                  placeholder="-1 for unlimited"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_staff_users">Max Staff Users</Label>
                <Input
                  id="max_staff_users"
                  type="number"
                  min="-1"
                  value={formData.features.max_staff_users}
                  onChange={(e) => handleFeatureChange('max_staff_users', e.target.value)}
                  placeholder="-1 for unlimited"
                />
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Updating...' : 'Update Plan'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

