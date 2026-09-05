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
  price_kes?: number | null;
  duration_months: number;
  trial_days: number | null;
  onboarding_reward_window_days: number | null;
  onboarding_reward_bonus_days: number | null;
  features: any;
  status: string | null;
}

/** Mirrors AiPlanLimits (@/lib/subscriptions/limits) — kept as a separate, plain type here since this is a client component. */
interface AiLimits {
  setup: {
    descriptions: number | null;
    photoQaPasses: number | null;
    marketingImages: number | null;
    themeStylingPasses: number | null;
    legalPageDrafts: number | null;
  };
  monthly: {
    descriptionsAndPhotoQa: number | null;
    marketingImages: number | null;
    analyticsInsights: number | null;
    assistantQueries: number | null;
  };
}

interface EditPlanFormProps {
  pricePlan: PricePlan;
  /** Real EFFECTIVE quotas (declared, or the plan-tier default) — see effectiveAiPlanLimits()'s docblock. Never null in practice (every field always has a numeric default), typed nullable only to mirror AiPlanLimits exactly. */
  aiLimits: AiLimits;
}

function aiFieldToString(value: number | null): string {
  return value == null ? '' : value.toString();
}

export default function EditPlanForm({ pricePlan, aiLimits }: Readonly<EditPlanFormProps>) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: pricePlan.name,
    price: pricePlan.price.toString(),
    price_kes: pricePlan.price_kes != null ? pricePlan.price_kes.toString() : '',
    duration_months: pricePlan.duration_months.toString(),
    trial_days: (pricePlan.trial_days || 0).toString(),
    onboarding_reward_window_days: (pricePlan.onboarding_reward_window_days ?? 30).toString(),
    onboarding_reward_bonus_days: (pricePlan.onboarding_reward_bonus_days ?? 30).toString(),
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
    ai: {
      setupDescriptions: aiFieldToString(aiLimits.setup.descriptions),
      setupPhotoQaPasses: aiFieldToString(aiLimits.setup.photoQaPasses),
      setupMarketingImages: aiFieldToString(aiLimits.setup.marketingImages),
      setupThemeStylingPasses: aiFieldToString(aiLimits.setup.themeStylingPasses),
      setupLegalPageDrafts: aiFieldToString(aiLimits.setup.legalPageDrafts),
      monthlyDescriptionsAndPhotoQa: aiFieldToString(aiLimits.monthly.descriptionsAndPhotoQa),
      monthlyMarketingImages: aiFieldToString(aiLimits.monthly.marketingImages),
      monthlyAnalyticsInsights: aiFieldToString(aiLimits.monthly.analyticsInsights),
      monthlyAssistantQueries: aiFieldToString(aiLimits.monthly.assistantQueries),
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

      // Always writes the COMPLETE 9-field ai block, never a partial one —
      // canUseAiFeature() treats ANY declared field as "this plan's ai
      // block is now authoritative", so leaving a field out here would
      // silently hard-gate that feature off for this plan (readNumberOrNull
      // -> null for a missing key), not "use the default". A blank input
      // means "not available on this plan" (null), matching the existing
      // -1/empty convention used by the flat feature fields above.
      const toAiValue = (raw: string): number | null => {
        const trimmed = raw.trim();
        if (trimmed === '') return null;
        const parsed = parseInt(trimmed, 10);
        return isNaN(parsed) ? null : parsed;
      };
      features.ai = {
        setup: {
          descriptions: toAiValue(formData.ai.setupDescriptions),
          photo_qa_passes: toAiValue(formData.ai.setupPhotoQaPasses),
          marketing_images: toAiValue(formData.ai.setupMarketingImages),
          theme_styling_passes: toAiValue(formData.ai.setupThemeStylingPasses),
          legal_page_drafts: toAiValue(formData.ai.setupLegalPageDrafts),
        },
        monthly: {
          descriptions_and_photo_qa: toAiValue(formData.ai.monthlyDescriptionsAndPhotoQa),
          marketing_images: toAiValue(formData.ai.monthlyMarketingImages),
          analytics_insights: toAiValue(formData.ai.monthlyAnalyticsInsights),
          assistant_queries: toAiValue(formData.ai.monthlyAssistantQueries),
        },
      };

      const response = await fetch(`/api/admin/price-plans/${pricePlan.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          price: parseFloat(formData.price),
          price_kes: formData.price_kes.trim() ? parseFloat(formData.price_kes) : null,
          duration_months: parseInt(formData.duration_months, 10),
          trial_days: parseInt(formData.trial_days, 10) || 0,
          onboarding_reward_window_days: parseInt(formData.onboarding_reward_window_days, 10) || 0,
          onboarding_reward_bonus_days: parseInt(formData.onboarding_reward_bonus_days, 10) || 0,
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

  const handleAiFieldChange = (key: keyof typeof formData.ai, value: string) => {
    setFormData({
      ...formData,
      ai: {
        ...formData.ai,
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
              <Label htmlFor="price">Monthly price (USD) *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="e.g. 10 for Basic, 30 for Pro"
                required
              />
              <p className="text-xs text-muted-foreground">
                Default for non-Kenya tenants and international visitors ($).
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="price_kes">Monthly price (KES)</Label>
              <Input
                id="price_kes"
                type="number"
                step="1"
                min="0"
                value={formData.price_kes}
                onChange={(e) => setFormData({ ...formData, price_kes: e.target.value })}
                placeholder="e.g. 1000 for Basic, 3000 for Pro"
              />
              <p className="text-xs text-muted-foreground">
                Kenya tenants and Kenya geo on marketing pages. Leave empty to fall back to USD price.
              </p>
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
              <Label htmlFor="onboarding_reward_window_days">Setup Reward Window (Days)</Label>
              <Input
                id="onboarding_reward_window_days"
                type="number"
                min="0"
                value={formData.onboarding_reward_window_days}
                onChange={(e) =>
                  setFormData({ ...formData, onboarding_reward_window_days: e.target.value })
                }
                placeholder="30"
              />
              <p className="text-xs text-muted-foreground">
                Days after signup to complete the reward checklist (0 = disabled)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="onboarding_reward_bonus_days">Setup Reward Bonus (Days)</Label>
              <Input
                id="onboarding_reward_bonus_days"
                type="number"
                min="0"
                value={formData.onboarding_reward_bonus_days}
                onChange={(e) =>
                  setFormData({ ...formData, onboarding_reward_bonus_days: e.target.value })
                }
                placeholder="30 (1 month free)"
              />
              <p className="text-xs text-muted-foreground">
                Extra subscription days when the reward checklist is completed (30 = 1 month free, 0 = no bonus)
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

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">AI Assistant &amp; Features</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Monthly quotas reset on the 1st of each calendar month; setup quotas are one-time, consumed during initial store build.
              Leave a field empty to disable that AI feature entirely for this plan (not &quot;unlimited&quot; — for that, see docs/AI_FEATURES_PLAN.md).
              Haiku 4.5 cost is trivial at these volumes (well under $1/tenant/month even near the top of these ranges) — these limits exist for plan-tier differentiation, not cost control.
            </p>

            <h4 className="text-sm font-medium text-muted-foreground mb-2">Monthly (recurring)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="space-y-2">
                <Label htmlFor="ai_monthly_assistant_queries">Dashboard AI Assistant — requests/month</Label>
                <Input
                  id="ai_monthly_assistant_queries"
                  type="number"
                  min="0"
                  value={formData.ai.monthlyAssistantQueries}
                  onChange={(e) => handleAiFieldChange('monthlyAssistantQueries', e.target.value)}
                  placeholder="e.g. 50 (Basic), 200 (Pro)"
                />
                <p className="text-xs text-muted-foreground">
                  Every assistant chat turn (a question, a category/product-creation exchange) counts as one request.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ai_monthly_descriptions">Product descriptions + photo QA/month</Label>
                <Input
                  id="ai_monthly_descriptions"
                  type="number"
                  min="0"
                  value={formData.ai.monthlyDescriptionsAndPhotoQa}
                  onChange={(e) => handleAiFieldChange('monthlyDescriptionsAndPhotoQa', e.target.value)}
                  placeholder="e.g. 40 (Basic), 150 (Pro)"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ai_monthly_marketing">Marketing images/month</Label>
                <Input
                  id="ai_monthly_marketing"
                  type="number"
                  min="0"
                  value={formData.ai.monthlyMarketingImages}
                  onChange={(e) => handleAiFieldChange('monthlyMarketingImages', e.target.value)}
                  placeholder="e.g. 4 (Basic), 20 (Pro)"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ai_monthly_analytics">Analytics insight summaries/month</Label>
                <Input
                  id="ai_monthly_analytics"
                  type="number"
                  min="0"
                  value={formData.ai.monthlyAnalyticsInsights}
                  onChange={(e) => handleAiFieldChange('monthlyAnalyticsInsights', e.target.value)}
                  placeholder="e.g. 30 (Pro only)"
                />
                <p className="text-xs text-muted-foreground">
                  Advanced analytics is also gated by plan tier separately (hasAdvancedAnalyticsAccess) — this number only matters on plans where that access is already granted.
                </p>
              </div>
            </div>

            <h4 className="text-sm font-medium text-muted-foreground mb-2">Setup (one-time, during initial store build)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ai_setup_descriptions">Product descriptions</Label>
                <Input
                  id="ai_setup_descriptions"
                  type="number"
                  min="0"
                  value={formData.ai.setupDescriptions}
                  onChange={(e) => handleAiFieldChange('setupDescriptions', e.target.value)}
                  placeholder="e.g. 50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ai_setup_photo_qa">Photo QA passes</Label>
                <Input
                  id="ai_setup_photo_qa"
                  type="number"
                  min="0"
                  value={formData.ai.setupPhotoQaPasses}
                  onChange={(e) => handleAiFieldChange('setupPhotoQaPasses', e.target.value)}
                  placeholder="e.g. 50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ai_setup_marketing">Marketing images</Label>
                <Input
                  id="ai_setup_marketing"
                  type="number"
                  min="0"
                  value={formData.ai.setupMarketingImages}
                  onChange={(e) => handleAiFieldChange('setupMarketingImages', e.target.value)}
                  placeholder="e.g. 15"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ai_setup_theme">Theme styling passes</Label>
                <Input
                  id="ai_setup_theme"
                  type="number"
                  min="0"
                  value={formData.ai.setupThemeStylingPasses}
                  onChange={(e) => handleAiFieldChange('setupThemeStylingPasses', e.target.value)}
                  placeholder="e.g. 5"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ai_setup_legal">Legal page drafts</Label>
                <Input
                  id="ai_setup_legal"
                  type="number"
                  min="0"
                  value={formData.ai.setupLegalPageDrafts}
                  onChange={(e) => handleAiFieldChange('setupLegalPageDrafts', e.target.value)}
                  placeholder="e.g. 3"
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

