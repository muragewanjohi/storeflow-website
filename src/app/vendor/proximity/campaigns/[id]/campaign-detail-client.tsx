'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Megaphone } from 'lucide-react';
import {
  RANGE_LABELS,
  VendorPortalFrame,
  statusClass,
  statusLabel,
  vendorPortalHref,
} from '../../vendor-portal-frame';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const FUNNEL_COLOURS = ['#059669', '#f59e0b', '#0284c7', '#7c3aed'];

async function vendorFetch(path: string) {
  const response = await fetch(path, { credentials: 'include' });
  const json = await response.json();
  if (!response.ok) throw new Error(json.error || 'Request failed');
  return json;
}

function formatDay(value: string | null | undefined): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-KE', {
    timeZone: 'Africa/Nairobi',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export default function CampaignDetailClient() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const rangeParam = searchParams.get('range');
  const range = rangeParam === 'last_7_days' || rangeParam === 'last_30_days' ? rangeParam : 'this_month';
  const branchId = searchParams.get('location_id') || '';
  const [vendorName, setVendorName] = useState<string | null>(null);
  const [signedOut, setSignedOut] = useState(false);
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [campaign, setCampaign] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [invoice, setInvoice] = useState<any>(null);
  const [missing, setMissing] = useState(false);

  function replaceQuery(nextRange: string, nextBranch: string) {
    const query = new URLSearchParams();
    if (nextRange !== 'this_month') query.set('range', nextRange);
    if (nextBranch) query.set('location_id', nextBranch);
    const text = query.toString();
    router.replace(text ? `/vendor/proximity/campaigns/${params.id}?${text}` : `/vendor/proximity/campaigns/${params.id}`, { scroll: false });
  }

  useEffect(() => {
    let cancelled = false;
    setMissing(false);
    void Promise.all([
      vendorFetch('/api/v1/proximity/vendor/session'),
      vendorFetch('/api/v1/proximity/vendor/inventory'),
      vendorFetch(`/api/v1/proximity/vendor/campaigns/${params.id}?range=${range}${branchId ? `&location_id=${branchId}` : ''}`),
    ])
      .then(([session, inventory, detail]) => {
        if (cancelled) return;
        setVendorName(session.data.name);
        setLocations(inventory.data || []);
        setCampaign(detail.data);
        setStats(detail.stats);
        setInvoice(detail.invoice);
      })
      .catch((error) => {
        if (cancelled) return;
        if (error instanceof Error && error.message === 'Not found') {
          setMissing(true);
          return;
        }
        setSignedOut(true);
      });
    return () => {
      cancelled = true;
    };
  }, [params.id, range, branchId]);

  async function signOut() {
    await fetch('/api/v1/proximity/vendor/logout', { method: 'POST', credentials: 'include' });
    router.push('/vendor/proximity');
  }

  if (signedOut) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f8fc] px-4">
        <p className="text-sm text-muted-foreground">
          Sign in on the <Link href="/vendor/proximity" className="font-semibold text-[#355cad]">vendor portal</Link> to open this campaign.
        </p>
      </main>
    );
  }

  if (!campaign || !vendorName) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f8fc] px-4">
        <p className="text-sm text-muted-foreground">{missing ? 'Campaign not found.' : 'Loading campaign…'}</p>
      </main>
    );
  }

  const placements = (campaign.placements || []).filter((placement: any) => !branchId || placement.location?.id === branchId);
  const clickRate = Math.round((stats?.click_rate || 0) * 1000) / 10;
  const chart = [
    { name: 'On screen', value: stats?.delivered || 0 },
    { name: 'Clicks', value: stats?.clicked || 0 },
    { name: 'Claims', value: stats?.claimed || 0 },
    { name: 'Redeemed', value: stats?.redeemed || 0 },
  ];
  const days = String(campaign.days_of_week || '0123456')
    .split('')
    .map((day) => WEEKDAYS[Number(day)])
    .filter(Boolean)
    .join(', ');

  return (
    <VendorPortalFrame
      vendorName={vendorName}
      active="campaigns"
      branchId={branchId}
      range={range}
      locations={locations}
      onBranchChange={(value) => replaceQuery(range, value)}
      onRangeChange={(value) => replaceQuery(value, branchId)}
      onSignOut={() => void signOut()}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href={vendorPortalHref('campaigns', range, branchId)} className="text-sm font-semibold text-[#1473e6]">
            Back to campaigns
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-[#12376a]">{campaign.name}</h1>
          {campaign.advertiser?.name && <p className="text-sm font-medium text-[#355cad]">{campaign.advertiser.name}</p>}
        </div>
        <Badge className={statusClass(campaign.status)} variant="outline">
          {statusLabel(campaign.status)}
        </Badge>
      </div>

      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        {campaign.image_url ? (
          <img src={campaign.image_url} alt="" className="h-64 w-full rounded-2xl bg-white object-contain shadow-sm ring-1 ring-slate-200" />
        ) : (
          <div className="flex h-64 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
            <Megaphone className="h-12 w-12" />
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'On screen', value: String(stats?.delivered || 0), className: 'bg-emerald-600' },
            { label: 'Clicks', value: String(stats?.clicked || 0), className: 'bg-amber-500' },
            { label: 'Click rate', value: `${clickRate}%`, className: 'bg-sky-600' },
            { label: 'Claims', value: String(stats?.claimed || 0), className: 'bg-violet-600' },
          ].map((tile) => (
            <div key={tile.label} className={`rounded-2xl p-4 text-white shadow-sm ${tile.className}`}>
              <p className="text-xs font-medium uppercase tracking-wide text-white/80">{tile.label}</p>
              <p className="mt-2 text-3xl font-bold">{tile.value}</p>
              <p className="mt-1 text-xs text-white/80">{RANGE_LABELS[range]}</p>
            </div>
          ))}
        </div>
      </div>

      <Card className="border-0 shadow-sm ring-1 ring-border">
        <CardHeader>
          <CardTitle>Results</CardTitle>
          <CardDescription>
            {RANGE_LABELS[range]}{branchId ? ` · ${locations.find((location) => location.id === branchId)?.name || 'Selected branch'}` : ' · All branches'}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart} layout="vertical" margin={{ left: 16 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" name="Count" radius={[0, 6, 6, 0]}>
                  {chart.map((entry, index) => (
                    <Cell key={entry.name} fill={FUNNEL_COLOURS[index]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="border-0 shadow-sm ring-1 ring-border">
          <CardHeader>
            <CardTitle>Campaign</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-lg font-semibold text-[#12376a]">{campaign.headline}</p>
            {campaign.body && <p className="text-muted-foreground">{campaign.body}</p>}
            <p><span className="text-muted-foreground">Runs </span>{formatDay(campaign.starts_at)} – {formatDay(campaign.ends_at)}</p>
            <p><span className="text-muted-foreground">Days </span>{days}</p>
            {campaign.fee_amount != null && (
              <p className="font-semibold text-violet-700">KSh {Number(campaign.fee_amount).toLocaleString('en-KE')}</p>
            )}
            {campaign.status === 'rejected' && campaign.rejection_reason && (
              <p className="text-red-700">{campaign.rejection_reason}</p>
            )}
            {invoice && (
              <p>
                Invoice {invoice.invoice_number} · {invoice.status} ·{' '}
                <a className="font-medium text-[#355cad] hover:underline" href={`/api/v1/proximity/vendor/invoices/${invoice.id}`}>
                  Download PDF
                </a>
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm ring-1 ring-border">
          <CardHeader>
            <CardTitle>Shelf sections</CardTitle>
          </CardHeader>
          <CardContent>
            {placements.length === 0 ? (
              <p className="text-sm text-muted-foreground">This campaign is not on that branch.</p>
            ) : (
              <ul className="space-y-2">
                {placements.map((placement: any) => (
                  <li key={placement.id} className="rounded-xl bg-sky-50 px-3 py-2 text-sm font-medium text-sky-900">
                    {placement.location?.name} / {placement.zone?.name}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </VendorPortalFrame>
  );
}
