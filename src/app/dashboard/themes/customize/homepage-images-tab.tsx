'use client';

/**
 * DA.25 — "Homepage Images" tab in Theme Customize.
 *
 * Lets a merchant see their 5 real AI-generated homepage images (hero, 3
 * banners, split-layout — the ones every registration gets automatically,
 * DA.21/23) and regenerate any one of them individually, gated by the same
 * real monthly quota (marketing_image_prompt) the Dashboard AI Assistant's
 * homepage_image chat target uses — a merchant gets identical behavior and
 * identical remaining-quota accounting whether they click the button here
 * or ask the assistant in chat.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Sparkles, ImageOff } from 'lucide-react';

type HomepageImageSlot = 'hero' | 'banner1' | 'banner2' | 'banner3' | 'split_layout';

interface HomepageImagesResponse {
  images: {
    hero: string | null;
    banner1: string | null;
    banner2: string | null;
    banner3: string | null;
    splitLayout: string | null;
    homepageFound: boolean;
  };
  quota: { allowed: boolean; current: number; limit: number | null; reason: string | null };
  slotLabels: Record<HomepageImageSlot, string>;
}

const SLOT_ORDER: HomepageImageSlot[] = ['hero', 'banner1', 'banner2', 'banner3', 'split_layout'];

function imageForSlot(images: HomepageImagesResponse['images'], slot: HomepageImageSlot): string | null {
  if (slot === 'split_layout') return images.splitLayout;
  return images[slot];
}

export default function HomepageImagesTab() {
  const queryClient = useQueryClient();
  const [regeneratingSlot, setRegeneratingSlot] = useState<HomepageImageSlot | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['homepage-images'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/homepage-images');
      if (!response.ok) throw new Error('Failed to load homepage images');
      return (await response.json()) as HomepageImagesResponse;
    },
  });

  const regenerate = useMutation({
    mutationFn: async (slot: HomepageImageSlot) => {
      const response = await fetch('/api/dashboard/homepage-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slot }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error || 'Regeneration failed');
      return body as { imageUrl: string; pagePatched: boolean; slot: HomepageImageSlot };
    },
    onMutate: (slot) => setRegeneratingSlot(slot),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['homepage-images'] });
      toast.success(
        result.pagePatched
          ? 'New image generated and applied to your homepage.'
          : 'New image generated, but it could not be auto-applied to your homepage — please refresh and check.'
      );
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Regeneration failed');
    },
    onSettled: () => setRegeneratingSlot(null),
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">Loading your homepage images...</CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-destructive">Could not load your homepage images. Please refresh the page.</CardContent>
      </Card>
    );
  }

  const { images, quota, slotLabels } = data;
  const remaining = typeof quota.limit === 'number' ? Math.max(0, quota.limit - quota.current) : null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Homepage Images</CardTitle>
          <CardDescription>
            These 5 AI-generated images were created automatically for your store. Regenerate any one of them individually if you&apos;d like a different look.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {quota.allowed ? (
            <p className="text-sm text-muted-foreground">
              {remaining !== null
                ? `${remaining} of ${quota.limit} regeneration${quota.limit === 1 ? '' : 's'} remaining this month.`
                : 'Unlimited regenerations on your plan.'}
            </p>
          ) : (
            <p className="text-sm text-amber-600">
              {quota.reason ?? "You've used all your regenerations for this month."} Resets next month, or{' '}
              <a href="/dashboard/subscription" className="underline">
                upgrade your plan
              </a>{' '}
              for a higher limit.
            </p>
          )}
          {!images.homepageFound && (
            <p className="mt-2 text-sm text-muted-foreground">
              No homepage sections were found to preview yet — regenerating will still create a real image, but it may not have a live homepage section to apply to.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {SLOT_ORDER.map((slot) => {
          const url = imageForSlot(images, slot);
          const isRegeneratingThis = regeneratingSlot === slot;
          const disabled = regenerate.isPending || !quota.allowed;

          return (
            <Card key={slot}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{slotLabels[slot]}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="aspect-video w-full overflow-hidden rounded-md border bg-muted flex items-center justify-center">
                  {url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={url} alt={slotLabels[slot]} className="h-full w-full object-cover" />
                  ) : (
                    <ImageOff className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  disabled={disabled}
                  onClick={() => regenerate.mutate(slot)}
                  title={!quota.allowed ? (quota.reason ?? 'No regenerations remaining this month') : undefined}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  {isRegeneratingThis ? 'Regenerating... (~15s)' : 'Regenerate'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
