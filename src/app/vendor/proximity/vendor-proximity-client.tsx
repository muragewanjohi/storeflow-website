'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { SPOOFING_DISCLOSURE_EN } from '@/lib/proximity/constants';

export default function VendorProximityClient() {
  const [token, setToken] = useState('');
  const [authed, setAuthed] = useState(false);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [inventory, setInventory] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [placements, setPlacements] = useState<{ location_id: string; zone_id: string }[]>([]);

  async function vendorFetch(path: string, init?: RequestInit) {
    const response = await fetch(path, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(init?.headers || {}),
      },
    });
    const json = await response.json();
    if (!response.ok) throw new Error(json.error || 'Request failed');
    return json;
  }

  async function load() {
    const [list, inv, bills] = await Promise.all([
      vendorFetch('/api/v1/proximity/vendor/campaigns'),
      vendorFetch('/api/v1/proximity/vendor/inventory'),
      vendorFetch('/api/v1/proximity/vendor/invoices'),
    ]);
    setCampaigns(list.data);
    setStats(list.stats);
    setInventory(inv.data);
    setInvoices(bills.data);
    setAuthed(true);
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Book an in-store ad</h1>
        <p className="text-sm text-muted-foreground mt-1">
          You are buying calendar time on a store zone. The supermarket must approve before go-live.
        </p>
      </div>
      {!authed ? (
        <Card>
          <CardHeader>
            <CardTitle>Vendor access</CardTitle>
            <CardDescription>Paste the token the retailer issued once.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Label>Access token</Label>
            <Input value={token} onChange={(event) => setToken(event.target.value)} />
            <Button
              onClick={async () => {
                try {
                  await load();
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : 'Invalid token');
                }
              }}
            >
              Continue
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Your results</CardTitle>
              <CardDescription>On-screen impressions only. Not ROAS.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <p>Delivered: {stats?.delivered ?? 0}</p>
              <p>Clicked: {stats?.clicked ?? 0}</p>
              <p>Claimed: {stats?.claimed ?? 0}</p>
              <p className="text-muted-foreground">{stats?.note}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Submit a flight</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-3"
                onSubmit={async (event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  try {
                    await vendorFetch('/api/v1/proximity/vendor/campaigns', {
                      method: 'POST',
                      body: JSON.stringify({
                        name: form.get('name'),
                        headline: form.get('headline'),
                        body: form.get('body'),
                        coupon_enabled: form.get('coupon_enabled') === 'on',
                        coupon_label: form.get('coupon_label') || null,
                        starts_at: new Date(String(form.get('starts_at'))).toISOString(),
                        ends_at: new Date(String(form.get('ends_at'))).toISOString(),
                        terms_accepted: form.get('terms') === 'on',
                        fee_amount: form.get('fee_amount') ? Number(form.get('fee_amount')) : null,
                        placements,
                      }),
                    });
                    toast.success('Submitted for retailer approval');
                    await load();
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : 'Failed');
                  }
                }}
              >
                <Input name="name" placeholder="Campaign name" required />
                <Input name="headline" placeholder="Headline on the in-app card" required />
                <Input name="body" placeholder="Body" />
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="coupon_enabled" /> Claimable coupon
                </label>
                <Input name="coupon_label" placeholder="Coupon copy" />
                <Input name="starts_at" type="datetime-local" required />
                <Input name="ends_at" type="datetime-local" required />
                <Input name="fee_amount" type="number" placeholder="Fee KSh (optional)" />
                <div className="space-y-1">
                  {inventory.flatMap((location: any) =>
                    (location.zones || []).map((zone: any) => (
                      <label key={zone.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          onChange={(event) => {
                            if (event.target.checked) {
                              setPlacements((current) => [...current, { location_id: location.id, zone_id: zone.id }]);
                            } else {
                              setPlacements((current) => current.filter((item) => item.zone_id !== zone.id));
                            }
                          }}
                        />
                        {location.name} / {zone.name}
                      </label>
                    ))
                  )}
                </div>
                <label className="flex items-start gap-2 text-xs text-muted-foreground">
                  <input type="checkbox" name="terms" required className="mt-1" />
                  {SPOOFING_DISCLOSURE_EN}
                </label>
                <Button type="submit">Submit for approval</Button>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Your campaigns</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              {campaigns.map((campaign) => (
                <p key={campaign.id}>
                  {campaign.name} — {campaign.status}
                </p>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Invoices</CardTitle>
              <CardDescription>Manual Phase 1 bills. Pay DukaNest offline.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              {invoices.length === 0 && <p>No invoices yet.</p>}
              {invoices.map((invoice) => (
                <p key={invoice.id}>
                  {invoice.campaign?.name || invoice.campaign_id} — KSh {invoice.amount} ({invoice.status})
                </p>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
