'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import ImageUploadField from '@/components/content/image-upload-field';
import { toast } from 'sonner';
import {
  ArrowLeftIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  MapPinIcon,
  MegaphoneIcon,
  TicketIcon,
} from '@heroicons/react/24/outline';
import { SPOOFING_DISCLOSURE_EN } from '@/lib/proximity/constants';
import { SaveButton } from '../../save-button';

type CampaignFormClientProps = Readonly<{
  campaignId?: string;
}>;

function toLocalDateTime(value: string | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function toTime(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  const date = new Date(value);
  return `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`;
}

export default function CampaignFormClient({ campaignId }: CampaignFormClientProps) {
  const router = useRouter();
  const [locations, setLocations] = useState<any[]>([]);
  const [advertisers, setAdvertisers] = useState<any[]>([]);
  const [placements, setPlacements] = useState<{ location_id: string; zone_id: string }[]>([]);
  const [campaign, setCampaign] = useState<any>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [previewHeadline, setPreviewHeadline] = useState('');
  const [previewBody, setPreviewBody] = useState('');
  const [couponEnabled, setCouponEnabled] = useState(false);
  const [loading, setLoading] = useState(Boolean(campaignId));
  const [saving, setSaving] = useState(false);
  const isEditing = Boolean(campaignId);

  useEffect(() => {
    const requests = [
      fetch('/api/dashboard/proximity/locations').then((r) => r.json()),
      fetch('/api/dashboard/proximity/zones').then((r) => r.json()),
      fetch('/api/dashboard/proximity/advertisers').then((r) => r.json()),
      ...(campaignId
        ? [fetch(`/api/dashboard/proximity/campaigns/${campaignId}`).then((r) => r.json())]
        : []),
    ];
    void Promise.all(requests).then(([loc, zon, adv, existing]) => {
      const locationsWithZones = (loc.data || []).map((location: any) => ({
        ...location,
        zones: (zon.data || []).filter((zone: any) => zone.location_id === location.id),
      }));
      setLocations(locationsWithZones);
      setAdvertisers(adv.data || []);
      if (campaignId) {
        if (!existing?.data) {
          toast.error(existing?.error || 'Campaign not found');
          router.push('/dashboard/proximity');
          return;
        }
        setCampaign(existing.data);
        setImageUrl(existing.data.image_url || null);
        setPreviewHeadline(existing.data.headline || '');
        setPreviewBody(existing.data.body || '');
        setCouponEnabled(Boolean(existing.data.coupon_enabled));
        setPlacements(
          (existing.data.placements || []).map((placement: any) => ({
            location_id: placement.location_id,
            zone_id: placement.zone_id,
          }))
        );
      }
      setLoading(false);
    }).catch((error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to load campaign');
      setLoading(false);
    });
  }, [campaignId, router]);

  if (loading) {
    return <div className="py-16 text-center text-sm text-muted-foreground">Loading campaign…</div>;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-10">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="-ml-3 mb-3"
          onClick={() => router.push('/dashboard/proximity?tab=campaigns')}
          >
            <ArrowLeftIcon className="mr-2 h-4 w-4" />
            Back to campaigns
          </Button>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
            Campaign studio
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            {isEditing ? 'Edit campaign' : 'Create a campaign'}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Build the shopper card, choose where it runs, and set its flight dates.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircleIcon className="h-5 w-5 text-emerald-600" />
          {isEditing ? `Status: ${campaign?.status}` : 'Vendor campaigns require approval'}
        </div>
      </div>

      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (placements.length === 0) {
            toast.error('Select at least one branch/zone');
            return;
          }
          const form = new FormData(event.currentTarget);
          const advertiserId = String(form.get('advertiser_id') || '');
          setSaving(true);
          try {
            const response = await fetch(
              isEditing
                ? `/api/dashboard/proximity/campaigns/${campaignId}`
                : '/api/dashboard/proximity/campaigns',
              {
                method: isEditing ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  advertiser_id: advertiserId || null,
                  name: form.get('name'),
                  headline: form.get('headline'),
                  body: form.get('body'),
                  image_url: imageUrl,
                  coupon_enabled: form.get('coupon_enabled') === 'on',
                  coupon_label: form.get('coupon_label') || null,
                  starts_at: new Date(String(form.get('starts_at'))).toISOString(),
                  ends_at: new Date(String(form.get('ends_at'))).toISOString(),
                  trading_hours_start: form.get('trading_hours_start') || null,
                  trading_hours_end: form.get('trading_hours_end') || null,
                  terms_accepted: true,
                  fee_amount: form.get('fee_amount') ? Number(form.get('fee_amount')) : null,
                  placements,
                }),
              }
            );
            const json = await response.json();
            if (!response.ok) throw new Error(json.error);
            toast.success(isEditing ? 'Campaign updated' : 'Campaign saved');
            router.push('/dashboard/proximity?tab=campaigns');
            router.refresh();
          } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed');
          } finally {
            setSaving(false);
          }
        }}
      >
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-6">
            <Card className="border-0 shadow-sm ring-1 ring-border">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <span className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700">
                    <MegaphoneIcon className="h-5 w-5" />
                  </span>
                  <div>
                    <CardTitle>Campaign details</CardTitle>
                    <CardDescription>Internal ownership and shopper-facing copy.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Campaign owner</Label>
                  <select
                    name="advertiser_id"
                    className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                    defaultValue={campaign?.advertiser_id || ''}
                  >
                    <option value="">House campaign</option>
                    {advertisers.map((advertiser) => (
                      <option key={advertiser.id} value={advertiser.id}>{advertiser.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Internal name</Label>
                  <Input name="name" defaultValue={campaign?.name || ''} placeholder="Wednesday beverage offer" required />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Shopper headline</Label>
                  <Input
                    name="headline"
                    defaultValue={campaign?.headline || ''}
                    placeholder="Save on your favourites today"
                    onChange={(event) => setPreviewHeadline(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Supporting message</Label>
                  <Textarea
                    name="body"
                    defaultValue={campaign?.body || ''}
                    placeholder="Tell shoppers what makes this offer useful."
                    rows={4}
                    onChange={(event) => setPreviewBody(event.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm ring-1 ring-border">
              <CardHeader>
                <CardTitle>Creative & offer</CardTitle>
                <CardDescription>Upload the image shown on the in-app campaign card.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <ImageUploadField
                  label="Campaign creative"
                  value={imageUrl}
                  onChange={setImageUrl}
                  aspectRatio={16 / 9}
                  allowSkipCrop
                  maxSizeMB={5}
                  recommendedDimensions="1200×675 or larger (16:9)"
                  helpText="JPEG, PNG, WebP or GIF. Maximum 5MB."
                />
                <div className="rounded-xl border bg-muted/20 p-4">
                  <label className="flex cursor-pointer items-center gap-3">
                    <input
                      id="coupon"
                      name="coupon_enabled"
                      type="checkbox"
                      checked={couponEnabled}
                      onChange={(event) => setCouponEnabled(event.target.checked)}
                      className="h-4 w-4"
                    />
                    <span>
                      <span className="block text-sm font-medium">Add a claimable coupon</span>
                      <span className="block text-xs text-muted-foreground">Shoppers receive a unique code in the app.</span>
                    </span>
                  </label>
                  {couponEnabled && (
                    <div className="mt-4 space-y-2">
                      <Label>Coupon label</Label>
                      <Input
                        name="coupon_label"
                        placeholder="Save KSh 50"
                        defaultValue={campaign?.coupon_label || ''}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm ring-1 ring-border">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <span className="rounded-xl bg-blue-50 p-2.5 text-blue-700">
                    <CalendarDaysIcon className="h-5 w-5" />
                  </span>
                  <div>
                    <CardTitle>Schedule & commercial terms</CardTitle>
                    <CardDescription>All campaign times use the retailer’s Nairobi timezone.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Starts</Label>
                  <Input name="starts_at" type="datetime-local" defaultValue={toLocalDateTime(campaign?.starts_at)} required />
                </div>
                <div className="space-y-2">
                  <Label>Ends</Label>
                  <Input name="ends_at" type="datetime-local" defaultValue={toLocalDateTime(campaign?.ends_at)} required />
                </div>
                <div className="space-y-2">
                  <Label>Daily start</Label>
                  <Input name="trading_hours_start" type="time" defaultValue={toTime(campaign?.trading_hours_start, '08:00')} step="60" />
                </div>
                <div className="space-y-2">
                  <Label>Daily end</Label>
                  <Input name="trading_hours_end" type="time" defaultValue={toTime(campaign?.trading_hours_end, '21:00')} step="60" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Fee (KSh, optional)</Label>
                  <Input name="fee_amount" type="number" min="0" step="0.01" defaultValue={campaign?.fee_amount ? String(campaign.fee_amount) : ''} placeholder="100000" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm ring-1 ring-border">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <span className="rounded-xl bg-violet-50 p-2.5 text-violet-700">
                    <MapPinIcon className="h-5 w-5" />
                  </span>
                  <div>
                    <CardTitle>Placements</CardTitle>
                    <CardDescription>Select one or more branch zones for this flight.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {locations.map((location) => (
                  <div key={location.id} className="rounded-xl border p-4">
                    <p className="font-medium">{location.name}</p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {(location.zones || []).map((zone: any) => {
                        const selected = placements.some((placement) => placement.zone_id === zone.id);
                        return (
                          <label
                            key={zone.id}
                            className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition-colors ${
                              selected ? 'border-emerald-300 bg-emerald-50' : 'hover:bg-muted/40'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={(event) => {
                                if (event.target.checked) {
                                  setPlacements((current) => [...current, { location_id: location.id, zone_id: zone.id }]);
                                } else {
                                  setPlacements((current) => current.filter((item) => item.zone_id !== zone.id));
                                }
                              }}
                            />
                            {zone.name}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
            <Card className="overflow-hidden border-0 shadow-lg ring-1 ring-border">
              <div className="relative aspect-video bg-gradient-to-br from-emerald-100 to-teal-50">
                {imageUrl ? (
                  <Image src={imageUrl} alt="" fill className="object-cover" sizes="380px" />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-emerald-700/50">
                    <MegaphoneIcon className="h-12 w-12" />
                    <p className="mt-2 text-sm font-medium">Creative preview</p>
                  </div>
                )}
              </div>
              <CardContent className="p-5">
                <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">In-store offer</Badge>
                <h2 className="mt-3 text-xl font-semibold">
                  {previewHeadline || 'Your campaign headline'}
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {previewBody || 'Your supporting campaign message will appear here.'}
                </p>
                {couponEnabled && (
                  <div className="mt-4 flex items-center gap-2 rounded-lg border border-dashed border-emerald-300 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
                    <TicketIcon className="h-5 w-5" />
                    Claim this offer
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900">
              <p className="font-semibold">Phase 1 measurement disclosure</p>
              <p className="mt-2">{SPOOFING_DISCLOSURE_EN}</p>
            </div>
          </aside>
        </div>

        <div className="sticky bottom-4 z-20 mt-6 flex items-center justify-between rounded-2xl border bg-background/95 p-4 shadow-lg backdrop-blur">
          <p className="hidden text-sm text-muted-foreground sm:block">
            {placements.length} placement{placements.length === 1 ? '' : 's'} selected
          </p>
          <div className="ml-auto flex gap-2">
            <Button type="button" variant="outline" onClick={() => router.push('/dashboard/proximity?tab=campaigns')}>
              Cancel
            </Button>
            {isEditing && campaignId && (
              <Button
                type="button"
                variant="outline"
                className="text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={async () => {
                  if (!window.confirm('Delete this campaign? Live, scheduled, or approved campaigns must be ended first.')) {
                    return;
                  }
                  try {
                    const response = await fetch(`/api/dashboard/proximity/campaigns/${campaignId}`, {
                      method: 'DELETE',
                    });
                    const json = await response.json();
                    if (!response.ok) {
                      throw new Error(json.error || 'Failed to delete campaign');
                    }
                    toast.success('Campaign deleted');
                    router.push('/dashboard/proximity?tab=campaigns');
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : 'Failed to delete campaign');
                  }
                }}
              >
                Delete
              </Button>
            )}
            <SaveButton type="submit" pending={saving} pendingLabel="Saving">
              {isEditing ? 'Update campaign' : 'Save campaign'}
            </SaveButton>
          </div>
        </div>
      </form>
    </div>
  );
}
