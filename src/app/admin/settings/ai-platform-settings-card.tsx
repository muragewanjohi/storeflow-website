'use client';

/**
 * DA.26 — landlord-editable AI/platform settings card.
 *
 * Currently exposes exactly one real setting: the DA.24 starter-pack
 * generic-image reuse cap. Self-contained (own fetch, own save call),
 * dropped into admin/settings alongside the existing read-only cards —
 * same pattern as HomepageImagesTab (dashboard) rather than threading new
 * server-fetched props through admin/settings/page.tsx's existing
 * data-fetching.
 *
 * Also links to the AI Usage page's plan-quota editor, where the DA.25
 * per-tier "regenerate my hero image" monthly cap (Basic 4/mo, Pro 20/mo)
 * is already editable — see AI_FEATURES_PLAN.md / DA.14. That one is a
 * per-plan quota (price_plans.features.ai), genuinely different from this
 * card's platform-wide reuse cap, so it isn't duplicated here.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import Link from 'next/link';

interface PlatformSettingsResponse {
  genericImageCacheReuseCap: {
    value: number;
    default: number;
    isOverridden: boolean;
    updatedAt: string | null;
  };
}

export default function AiPlatformSettingsCard() {
  const queryClient = useQueryClient();
  const [draftValue, setDraftValue] = useState<string>('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-platform-settings'],
    queryFn: async () => {
      const response = await fetch('/api/admin/platform-settings');
      if (!response.ok) throw new Error('Failed to load platform settings');
      const body = (await response.json()) as PlatformSettingsResponse;
      setDraftValue(String(body.genericImageCacheReuseCap.value));
      return body;
    },
  });

  const save = useMutation({
    mutationFn: async (value: number) => {
      const response = await fetch('/api/admin/platform-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'generic_image_cache_reuse_cap', value }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error || 'Save failed');
      return body;
    },
    onSuccess: () => {
      toast.success('Saved.');
      queryClient.invalidateQueries({ queryKey: ['admin-platform-settings'] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    },
  });

  const handleSave = () => {
    const parsed = Number.parseInt(draftValue, 10);
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > 1000) {
      toast.error('Enter a whole number between 1 and 1000.');
      return;
    }
    save.mutate(parsed);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI &amp; Image Generation</CardTitle>
        <CardDescription>Platform-wide settings for AI-generated content</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : error || !data ? (
          <p className="text-sm text-destructive">Could not load these settings.</p>
        ) : (
          <div className="space-y-2 max-w-sm">
            <Label htmlFor="reuse-cap">Starter-pack image reuse cap</Label>
            <p className="text-xs text-muted-foreground">
              How many times a niche&apos;s shared starter-pack homepage images (hero/banners/split-layout) are reused
              across new registrations before a fresh set is generated. Default: {data.genericImageCacheReuseCap.default}.
              {data.genericImageCacheReuseCap.isOverridden ? ' Currently overridden from the default.' : ' Currently using the default.'}
            </p>
            <div className="flex items-center gap-2">
              <Input
                id="reuse-cap"
                type="number"
                min={1}
                max={1000}
                value={draftValue}
                onChange={(e) => setDraftValue(e.target.value)}
                className="w-28"
              />
              <Button type="button" onClick={handleSave} disabled={save.isPending}>
                {save.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        )}

        <div className="pt-2 border-t">
          <p className="text-sm text-muted-foreground">
            Looking for the per-plan monthly image-regeneration cap (Basic/Pro)? That&apos;s edited per plan on the{' '}
            <Link href="/admin/price-plans" className="text-primary hover:underline">
              Price Plans
            </Link>{' '}
            page, under each plan&apos;s &quot;AI Assistant &amp; Features&quot; section.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
