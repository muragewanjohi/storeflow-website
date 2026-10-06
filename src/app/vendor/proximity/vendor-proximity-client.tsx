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
import {
  BarChart3,
  CheckCircle2,
  Eye,
  FileText,
  LayoutDashboard,
  Lock,
  Mail,
  Megaphone,
  MousePointerClick,
  Plus,
  ReceiptText,
  Store,
  Tag,
} from 'lucide-react';

type VendorTab = 'results' | 'book' | 'campaigns' | 'invoices';

const TABS: { id: VendorTab; label: string }[] = [
  { id: 'results', label: 'Overview' },
  { id: 'campaigns', label: 'Campaigns' },
  { id: 'book', label: 'Book a flight' },
  { id: 'invoices', label: 'Invoices' },
];

const TAB_ICONS = {
  results: LayoutDashboard,
  campaigns: Megaphone,
  book: Plus,
  invoices: ReceiptText,
} satisfies Record<VendorTab, typeof LayoutDashboard>;

const RANGE_LABELS: Record<string, string> = {
  this_month: 'This month',
  last_7_days: 'Last 7 days',
  last_30_days: 'Last 30 days',
};

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

function metricChange(current: number, previous: number): string {
  if (!previous) return current ? 'New this period' : 'No change';
  const change = Math.round(((current - previous) / previous) * 100);
  return `${change >= 0 ? '+' : ''}${change}% vs. previous`;
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
  const [dashboard, setDashboard] = useState<any>(null);
  const [range, setRange] = useState('this_month');
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
      vendorFetch(`/api/v1/proximity/vendor/campaigns?range=${range}`),
      vendorFetch('/api/v1/proximity/vendor/inventory'),
      vendorFetch('/api/v1/proximity/vendor/invoices'),
    ]);
    setVendor(session.data);
    setCampaigns(list.data);
    setStats(list.stats);
    setDashboard(list.dashboard);
    setInventory(inv.data);
    setInvoices(bills.data);
  }

  useEffect(() => {
    void loadPortal().catch(() => setVendor(null));
  }, [range]);

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
  const activeCreative =
    campaigns.find((campaign) => ['live', 'approved', 'scheduled'].includes(campaign.status)) || campaigns[0];
  const performanceById = new Map(
    (dashboard?.performance || []).map((item: any) => [item.id, item])
  );
  const maxFunnel = Math.max(stats?.delivered || 0, 1);
  const nairobiHour = Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Nairobi',
      hour: '2-digit',
      hourCycle: 'h23',
    }).format(new Date())
  );
  const greeting = nairobiHour < 12 ? 'Good morning' : nairobiHour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <main className="min-h-screen bg-[#f5f8fc] lg:flex">
      <aside className="border-b bg-[#082b55] text-white lg:fixed lg:inset-y-0 lg:w-60 lg:border-b-0">
        <div className="flex h-full flex-col">
          <div className="border-b border-white/10 px-6 py-5">
            <Link href="/" className="flex items-center gap-3">
              <img src="/logo_with_name.png" alt="DukaNest" className="h-9 w-auto brightness-0 invert" />
            </Link>
            <p className="mt-1 text-xs text-blue-200">Proximity advertiser portal</p>
          </div>
          <nav className="flex gap-2 overflow-x-auto p-3 lg:flex-1 lg:flex-col lg:overflow-visible lg:p-4">
          {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`flex shrink-0 items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition ${
                  tab === item.id ? 'bg-[#1473e6] text-white shadow-sm' : 'text-blue-100 hover:bg-white/10'
                }`}
              >
                {(() => {
                  const Icon = TAB_ICONS[item.id];
                  return <Icon className="h-4 w-4" />;
                })()}
                {item.label}
              </button>
          ))}
          </nav>
          <div className="hidden border-t border-white/10 p-5 text-xs text-blue-200 lg:block">
            On-screen campaign measurement
            <p className="mt-1 text-white">No attributed-sales claims</p>
          </div>
        </div>
      </aside>

      <section className="min-w-0 flex-1 lg:ml-60">
        <header className="border-b bg-white">
          <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 lg:px-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#355cad]">Advertiser account</p>
              <p className="font-semibold text-[#101828]">{vendor.name}</p>
            </div>
            <div className="flex items-center gap-3">
              <select
                aria-label="Date range"
                value={range}
                onChange={(event) => setRange(event.target.value)}
                className="h-10 rounded-lg border bg-white px-3 text-sm"
              >
                {Object.entries(RANGE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <Button type="button" variant="outline" onClick={() => void signOut()}>Sign out</Button>
            </div>
          </div>
        </header>

        <div className="space-y-6 px-4 py-6 lg:px-8">
        {tab === 'results' && (
          <>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold text-[#12376a]">{greeting}, {vendor.name}</h1>
                <p className="text-sm text-muted-foreground">Here is how your in-store campaigns are performing.</p>
              </div>
              <Button type="button" onClick={() => setTab('book')} className="bg-[#1473e6]">
                <Plus className="mr-2 h-4 w-4" /> Create campaign
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {[
                { label: 'On-screen views', value: stats?.delivered ?? 0, previous: stats?.previous?.delivered ?? 0, icon: Eye },
                { label: 'Clicks', value: stats?.clicked ?? 0, previous: stats?.previous?.clicked ?? 0, icon: MousePointerClick },
                { label: 'Click rate', value: ctr, previous: Math.round((stats?.previous?.click_rate ?? 0) * 1000) / 10, suffix: '%', icon: BarChart3 },
                { label: 'Claims', value: stats?.claimed ?? 0, previous: stats?.previous?.claimed ?? 0, icon: Tag },
                { label: 'Redemptions', value: stats?.redeemed ?? 0, previous: 0, icon: CheckCircle2 },
              ].map((metric) => (
                <Card key={metric.label} className="border-0 shadow-sm ring-1 ring-slate-200">
                  <CardContent className="p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-xs font-semibold text-slate-500">{metric.label}</p>
                      <span className="rounded-full bg-blue-50 p-2 text-[#1473e6]"><metric.icon className="h-4 w-4" /></span>
                    </div>
                    <p className="text-2xl font-bold text-[#12376a]">
                      {metric.value.toLocaleString('en-KE')}{metric.suffix}
                    </p>
                    <p className="mt-2 text-xs text-emerald-600">
                      {metricChange(metric.value, metric.previous)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid gap-5 xl:grid-cols-[1.7fr_0.8fr]">
              <Card className="border-0 shadow-sm ring-1 ring-slate-200">
                <CardHeader>
                  <CardTitle className="text-base text-[#12376a]">Campaign funnel</CardTitle>
                  <CardDescription>From a card shown on screen to a redeemed claim</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-4">
                    {[
                      ['On screen', stats?.delivered ?? 0, 'bg-[#1473e6]'],
                      ['Clicked', stats?.clicked ?? 0, 'bg-[#16a5c7]'],
                      ['Claimed', stats?.claimed ?? 0, 'bg-[#25b879]'],
                      ['Redeemed', stats?.redeemed ?? 0, 'bg-[#8167df]'],
                    ].map(([label, value, color]) => (
                      <div key={String(label)}>
                        <div className={`${color} rounded-xl px-3 py-4 text-center text-white`}>
                          <p className="text-xs">{label}</p>
                          <p className="mt-1 text-xl font-bold">{Number(value).toLocaleString('en-KE')}</p>
                        </div>
                        <p className="mt-2 text-center text-xs text-muted-foreground">
                          {Math.round((Number(value) / maxFunnel) * 100)}% of views
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden border-0 shadow-sm ring-1 ring-slate-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-[#12376a]">Campaign creative</CardTitle>
                </CardHeader>
                {activeCreative?.image_url ? (
                  <img src={activeCreative.image_url} alt={activeCreative.headline || ''} className="h-40 w-full object-cover" />
                ) : (
                  <div className="flex h-40 items-center justify-center bg-gradient-to-br from-red-600 to-red-800 text-white">
                    <Megaphone className="h-10 w-10" />
                  </div>
                )}
                <CardContent className="pt-4">
                  <p className="font-semibold">{activeCreative?.headline || 'No campaign creative yet'}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {(activeCreative?.placements || [])
                      .map((placement: any) => `${placement.location?.name} · ${placement.zone?.name}`)
                      .join(' · ') || 'Book a branch and zone'}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-5 xl:grid-cols-[1.7fr_0.8fr]">
              <Card className="border-0 shadow-sm ring-1 ring-slate-200">
                <CardHeader className="flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base text-[#12376a]">Campaign performance</CardTitle>
                    <CardDescription>Measured on-screen results across booked stores</CardDescription>
                  </div>
                  <button type="button" onClick={() => setTab('campaigns')} className="text-xs font-semibold text-[#1473e6]">
                    View all
                  </button>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <table className="w-full min-w-[700px] text-left text-sm">
                    <thead className="border-b text-xs text-muted-foreground">
                      <tr>
                        <th className="pb-3 font-medium">Campaign</th>
                        <th className="pb-3 font-medium">Period</th>
                        <th className="pb-3 font-medium">Zones</th>
                        <th className="pb-3 font-medium">On screen</th>
                        <th className="pb-3 font-medium">Click rate</th>
                        <th className="pb-3 font-medium">Claims</th>
                        <th className="pb-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {campaigns.slice(0, 6).map((campaign) => {
                        const result: any = performanceById.get(campaign.id) || {};
                        return (
                          <tr key={campaign.id} className="border-b last:border-0">
                            <td className="py-3">
                              <div className="flex items-center gap-3">
                                {campaign.image_url ? (
                                  <img src={campaign.image_url} alt="" className="h-10 w-12 rounded object-cover" />
                                ) : (
                                  <span className="flex h-10 w-12 items-center justify-center rounded bg-blue-50 text-[#1473e6]"><Megaphone className="h-4 w-4" /></span>
                                )}
                                <span className="font-medium">{campaign.name}</span>
                              </div>
                            </td>
                            <td className="py-3 text-xs text-muted-foreground">
                              {new Date(campaign.starts_at).toLocaleDateString('en-KE')} – {new Date(campaign.ends_at).toLocaleDateString('en-KE')}
                            </td>
                            <td className="py-3">{campaign.placements?.length || 0}</td>
                            <td className="py-3">{result.delivered || 0}</td>
                            <td className="py-3">{Math.round((result.click_rate || 0) * 1000) / 10}%</td>
                            <td className="py-3">{result.claimed || 0}</td>
                            <td className="py-3"><Badge className={statusClass(campaign.status)} variant="outline">{statusLabel(campaign.status)}</Badge></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm ring-1 ring-slate-200">
                <CardHeader>
                  <CardTitle className="text-base text-[#12376a]">Recent activity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(dashboard?.activity || []).length === 0 && (
                    <p className="text-sm text-muted-foreground">No activity in this period.</p>
                  )}
                  {(dashboard?.activity || []).map((item: any, index: number) => (
                    <div key={`${item.type}-${item.at}-${index}`} className="flex gap-3">
                      <span className="mt-0.5 rounded-full bg-blue-50 p-2 text-[#1473e6]">
                        {item.type === 'redeemed' ? <CheckCircle2 className="h-4 w-4" /> : item.type === 'invoice' ? <FileText className="h-4 w-4" /> : <Tag className="h-4 w-4" />}
                      </span>
                      <div>
                        <p className="text-sm font-medium">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.detail} · {new Date(item.at).toLocaleString('en-KE')}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <Card className="border-0 shadow-sm ring-1 ring-slate-200">
              <CardHeader>
                <CardTitle className="text-base text-[#12376a]">Branch performance</CardTitle>
                <CardDescription>On-screen results at branches included in your campaigns</CardDescription>
              </CardHeader>
              <CardContent>
                {(dashboard?.branches || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No branch activity in this period.</p>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {(dashboard?.branches || []).map((branch: any) => (
                      <div key={branch.name} className="rounded-xl border p-4">
                        <div className="flex items-center gap-2 font-semibold text-[#12376a]"><Store className="h-4 w-4" />{branch.name}</div>
                        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                          <div><p className="font-bold">{branch.delivered}</p><p className="text-[10px] text-muted-foreground">On screen</p></div>
                          <div><p className="font-bold">{branch.clicked}</p><p className="text-[10px] text-muted-foreground">Clicks</p></div>
                          <div><p className="font-bold">{branch.claimed}</p><p className="text-[10px] text-muted-foreground">Claims</p></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <p className="text-xs text-muted-foreground">{stats?.note}</p>
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
      </section>
    </main>
  );
}
