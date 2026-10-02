'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { SPOOFING_DISCLOSURE_EN } from '@/lib/proximity/constants';
import { Lock, Mail } from 'lucide-react';

type VendorTab = 'results' | 'book' | 'campaigns' | 'invoices';

const TABS: { id: VendorTab; label: string }[] = [
  { id: 'results', label: 'Results' },
  { id: 'book', label: 'Book a flight' },
  { id: 'campaigns', label: 'Campaigns' },
  { id: 'invoices', label: 'Invoices' },
];

function statusClass(status: string): string {
  if (['approved', 'live', 'scheduled'].includes(status)) return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (status === 'submitted') return 'border-amber-200 bg-amber-50 text-amber-800';
  if (status === 'rejected') return 'border-red-200 bg-red-50 text-red-700';
  return 'border-slate-200 bg-slate-50 text-slate-700';
}

function statusLabel(status: string): string {
  if (status === 'submitted') return 'Waiting for approval';
  if (status === 'approved') return 'Approved';
  return status;
}

async function vendorFetch(path: string, init?: RequestInit) {
  const response = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json.error || 'Request failed');
  return json;
}

export default function VendorProximityClient() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [vendor, setVendor] = useState<{ name: string; email: string } | null>(null);
  const [tab, setTab] = useState<VendorTab>('results');
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [inventory, setInventory] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [placements, setPlacements] = useState<{ location_id: string; zone_id: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [headline, setHeadline] = useState('');
  const [body, setBody] = useState('');
  const [daysOfWeek, setDaysOfWeek] = useState('0123456');

  async function loadPortal() {
    const [session, list, inv, bills] = await Promise.all([
      vendorFetch('/api/v1/proximity/vendor/session'),
      vendorFetch('/api/v1/proximity/vendor/campaigns'),
      vendorFetch('/api/v1/proximity/vendor/inventory'),
      vendorFetch('/api/v1/proximity/vendor/invoices'),
    ]);
    setVendor(session.data);
    setCampaigns(list.data);
    setStats(list.stats);
    setInventory(inv.data);
    setInvoices(bills.data);
  }

  useEffect(() => {
    void loadPortal().catch(() => setVendor(null));
  }, []);

  async function signIn(event: React.FormEvent) {
    event.preventDefault();
    setSigningIn(true);
    setLoginError(null);
    try {
      const response = await fetch('/api/v1/proximity/vendor/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Invalid email or password');
      setPassword('');
      await loadPortal();
      toast.success('Signed in');
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Invalid email or password');
    } finally {
      setSigningIn(false);
    }
  }

  async function signOut() {
    await fetch('/api/v1/proximity/vendor/logout', { method: 'POST', credentials: 'include' });
    setVendor(null);
    setCampaigns([]);
    setInvoices([]);
  }

  function toggleDay(day: string) {
    setDaysOfWeek((current) => {
      const next = current.includes(day) ? current.replace(day, '') : `${current}${day}`;
      return next.split('').sort().join('');
    });
  }

  function togglePlacement(locationId: string, zoneId: string) {
    setPlacements((current) => {
      const exists = current.some((item) => item.zone_id === zoneId);
      return exists
        ? current.filter((item) => item.zone_id !== zoneId)
        : [...current, { location_id: locationId, zone_id: zoneId }];
    });
  }

  if (!vendor) {
    return (
      <main className="flex-1 bg-gradient-to-b from-[#eff6ff] via-[#fcfeff] to-white px-4 py-8">
        <div className="mx-auto w-full max-w-[408px]">
          <div className="mb-8 flex justify-center">
            <Link href="/" className="relative flex h-10 w-[170px] items-center justify-center">
              <img src="/logo_with_name.png" alt="DukaNest" className="h-10 w-auto object-contain" />
            </Link>
          </div>
          <div className="rounded-2xl border border-[#e5e7eb] bg-white px-6 py-6 shadow-[0_10px_15px_rgba(0,0,0,0.1),0_4px_6px_rgba(0,0,0,0.1)]">
            <div className="text-center">
              <h1 className="text-[24px] font-black leading-8 text-[#101828]">Vendor sign in</h1>
              <p className="mt-2 text-base text-[#4a5565]">
                Book in-store ads and see on-screen results. The supermarket approves each flight.
              </p>
            </div>
            <form onSubmit={signIn} className="mt-8 space-y-4">
              {loginError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                  <p className="text-sm text-red-700">{loginError}</p>
                </div>
              )}
              <div>
                <Label htmlFor="email" className="text-sm font-bold text-[#101828]">Email</Label>
                <div className="relative mt-2">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#99a1af]" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@vendor.com"
                    className="h-[60px] rounded-2xl border-[#e5e7eb] bg-[#f9fafb] pl-12 text-base"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="password" className="text-sm font-bold text-[#101828]">Password</Label>
                <div className="relative mt-2">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#99a1af]" />
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••"
                    className="h-[60px] rounded-2xl border-[#e5e7eb] bg-[#f9fafb] pl-12 text-base"
                  />
                </div>
              </div>
              <p className="text-right text-sm text-[#6a7282]">Ask the supermarket to reset your password.</p>
              <Button
                type="submit"
                className="h-[68px] w-full rounded-2xl bg-gradient-to-b from-[#355cad] to-[#4a7bd9] text-[18px] font-bold text-white"
                disabled={signingIn}
              >
                {signingIn ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>
          </div>
        </div>
      </main>
    );
  }

  const ctr = stats?.delivered ? Math.round((stats.clicked / stats.delivered) * 1000) / 10 : 0;

  return (
    <main className="min-h-screen bg-[#f8fafc]">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#355cad]">In-store ads</p>
            <h1 className="text-xl font-semibold text-[#101828]">{vendor.name}</h1>
            <p className="text-sm text-[#4a5565]">{vendor.email}</p>
          </div>
          <Button type="button" variant="outline" onClick={() => void signOut()}>
            Sign out
          </Button>
        </div>
        <div className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 pb-3">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                tab === item.id ? 'bg-[#101828] text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        {tab === 'results' && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ['On-screen views', stats?.delivered ?? 0],
                ['Clicks', stats?.clicked ?? 0],
                ['Claims', stats?.claimed ?? 0],
                ['Click rate', `${ctr}%`],
              ].map(([label, value]) => (
                <Card key={String(label)} className="border-0 shadow-sm ring-1 ring-border">
                  <CardHeader className="pb-2">
                    <CardDescription>{label}</CardDescription>
                    <CardTitle className="text-3xl">{value}</CardTitle>
                  </CardHeader>
                </Card>
              ))}
            </div>
            <Card className="border-0 shadow-sm ring-1 ring-border">
              <CardContent className="pt-6 text-sm text-muted-foreground">{stats?.note}</CardContent>
            </Card>
          </>
        )}

        {tab === 'book' && (
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <Card className="border-0 shadow-sm ring-1 ring-border">
              <CardHeader>
                <CardTitle>Book a flight</CardTitle>
                <CardDescription>Choose zones and dates. The supermarket approves before the ad can run.</CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  className="space-y-4"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    const formEl = event.currentTarget;
                    const form = new FormData(formEl);
                    if (!placements.length) {
                      toast.error('Choose at least one zone');
                      return;
                    }
                    if (!daysOfWeek) {
                      toast.error('Choose at least one day');
                      return;
                    }
                    setSubmitting(true);
                    try {
                      await vendorFetch('/api/v1/proximity/vendor/campaigns', {
                        method: 'POST',
                        body: JSON.stringify({
                          name: form.get('name'),
                          headline,
                          body: body || null,
                          headline_sw: null,
                          body_sw: null,
                          headline_b: null,
                          body_b: null,
                          coupon_enabled: false,
                          coupon_label: null,
                          starts_at: new Date(String(form.get('starts_at'))).toISOString(),
                          ends_at: new Date(String(form.get('ends_at'))).toISOString(),
                          trading_hours_start: form.get('trading_hours_start') || null,
                          trading_hours_end: form.get('trading_hours_end') || null,
                          days_of_week: daysOfWeek,
                          purpose: 'standard',
                          fee_amount: form.get('fee_amount') ? Number(form.get('fee_amount')) : null,
                          terms_accepted: true,
                          placements,
                        }),
                      });
                      formEl.reset();
                      setHeadline('');
                      setBody('');
                      setDaysOfWeek('0123456');
                      setPlacements([]);
                      toast.success('Submitted for supermarket approval');
                      await loadPortal();
                      setTab('campaigns');
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : 'Failed');
                    } finally {
                      setSubmitting(false);
                    }
                  }}
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input name="name" placeholder="Campaign name" required />
                    <Input name="fee_amount" type="number" min="0" placeholder="Fee KSh (optional)" />
                  </div>
                  <Input value={headline} onChange={(event) => setHeadline(event.target.value)} placeholder="Headline shoppers see" required />
                  <Input value={body} onChange={(event) => setBody(event.target.value)} placeholder="Supporting message" />
                  <div className="flex items-start justify-between gap-3 rounded-xl border border-dashed bg-muted/30 p-3">
                    <p className="text-sm text-muted-foreground">
                      Claimable coupons are coming in version 2, after we align with the supermarket team.
                    </p>
                    <Badge variant="outline" className="shrink-0">Coming soon</Badge>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="starts_at">Starts</Label>
                      <Input id="starts_at" name="starts_at" type="datetime-local" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ends_at">Ends</Label>
                      <Input id="ends_at" name="ends_at" type="datetime-local" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="trading_hours_start">Daily start</Label>
                      <Input id="trading_hours_start" name="trading_hours_start" type="time" defaultValue="08:00" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="trading_hours_end">Daily end</Label>
                      <Input id="trading_hours_end" name="trading_hours_end" type="time" defaultValue="21:00" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Days</Label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        ['0', 'Sun'],
                        ['1', 'Mon'],
                        ['2', 'Tue'],
                        ['3', 'Wed'],
                        ['4', 'Thu'],
                        ['5', 'Fri'],
                        ['6', 'Sat'],
                      ].map(([id, label]) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => toggleDay(id)}
                          className={`rounded-full px-3 py-1.5 text-sm ${
                            daysOfWeek.includes(id) ? 'bg-[#101828] text-white' : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      The offer appears only on the selected days, in Nairobi time.
                    </p>
                  </div>
                  <div>
                    <p className="mb-2 text-sm font-medium">Zones</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {inventory.flatMap((location: any) =>
                        (location.zones || []).map((zone: any) => {
                          const selected = placements.some((item) => item.zone_id === zone.id);
                          return (
                            <button
                              key={zone.id}
                              type="button"
                              onClick={() => togglePlacement(location.id, zone.id)}
                              className={`rounded-xl border p-3 text-left text-sm ${
                                selected ? 'border-[#355cad] bg-blue-50' : 'bg-white'
                              }`}
                            >
                              <p className="font-medium">{location.name}</p>
                              <p className="text-muted-foreground">{zone.name}</p>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{SPOOFING_DISCLOSURE_EN}</p>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? 'Submitting...' : 'Submit for approval'}
                  </Button>
                </form>
              </CardContent>
            </Card>
            <Card className="h-fit border-0 shadow-sm ring-1 ring-border">
              <CardHeader>
                <CardTitle>Shopper card</CardTitle>
                <CardDescription>What shoppers see on the in-app card.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-2xl border bg-white p-4">
                  <p className="text-lg font-semibold">{headline || 'Your headline'}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{body || 'Your supporting message'}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {tab === 'campaigns' && (
          <div className="space-y-3">
            {campaigns.length === 0 && <p className="text-sm text-muted-foreground">No flights yet.</p>}
            {campaigns.map((campaign) => (
              <Card key={campaign.id} className="border-0 shadow-sm ring-1 ring-border">
                <CardContent className="flex flex-wrap items-start justify-between gap-3 pt-6">
                  <div>
                    <p className="font-semibold">{campaign.name}</p>
                    <p className="text-sm text-muted-foreground">{campaign.headline}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {(campaign.placements || [])
                        .map((placement: any) => `${placement.location?.name} / ${placement.zone?.name}`)
                        .join(' · ') || 'No zones'}
                    </p>
                  </div>
                  <Badge className={statusClass(campaign.status)} variant="outline">
                    {statusLabel(campaign.status)}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {tab === 'invoices' && (
          <Card className="border-0 shadow-sm ring-1 ring-border">
            <CardHeader>
              <CardTitle>Invoices</CardTitle>
              <CardDescription>Pay the supermarket offline. Settlement is not automatic.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {invoices.length === 0 && <p className="text-sm text-muted-foreground">No invoices yet.</p>}
              {invoices.map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between rounded-xl border p-4">
                  <div>
                    <p className="font-medium">{invoice.campaign?.name || 'Campaign'}</p>
                    <p className="text-sm text-muted-foreground">KSh {Number(invoice.amount).toLocaleString('en-KE')}</p>
                  </div>
                  <Badge variant="secondary">{invoice.status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
