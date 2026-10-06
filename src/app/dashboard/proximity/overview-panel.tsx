'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  CheckCircleIcon,
  CursorArrowRaysIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  MegaphoneIcon,
  RadioIcon,
  TicketIcon,
} from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { OverviewRange, ProximityOverview } from '@/lib/proximity/overview';

const RANGES: { id: OverviewRange; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'last_7_days', label: 'Last 7 days' },
  { id: 'this_month', label: 'This month' },
  { id: 'last_30_days', label: 'Last 30 days' },
];

const selectClassName =
  'h-10 rounded-lg border border-input bg-background px-3 text-sm shadow-sm outline-none focus:ring-2 focus:ring-ring';

const KPI_ICONS = {
  live_campaigns: MegaphoneIcon,
  detected: RadioIcon,
  on_screen: EyeIcon,
  clicked: CursorArrowRaysIcon,
  claimed: TicketIcon,
} as const;

const FUNNEL_COLORS = ['#2563eb', '#0284c7', '#059669', '#34d399'];

const ACTIVITY_TONE: Record<ProximityOverview['activity'][number]['tone'], string> = {
  active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  attention: 'border-amber-200 bg-amber-50 text-amber-800',
  completed: 'border-sky-200 bg-sky-50 text-sky-700',
  scheduled: 'border-indigo-200 bg-indigo-50 text-indigo-700',
};

function isRange(value: string | null): value is OverviewRange {
  return RANGES.some((item) => item.id === value);
}

function greeting(date = new Date()) {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Africa/Nairobi' }).format(date)
  );
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatCount(value: number) {
  return new Intl.NumberFormat('en-KE').format(value);
}

function formatMoney(value: number) {
  return `KSh ${new Intl.NumberFormat('en-KE', { maximumFractionDigits: 0 }).format(value)}`;
}

function formatCampaignDates(start: string | null, end: string | null) {
  if (!start || !end) return 'Dates not set';
  const fmt = new Intl.DateTimeFormat('en-KE', { day: 'numeric', month: 'short', timeZone: 'Africa/Nairobi' });
  return `${fmt.format(new Date(start))} – ${fmt.format(new Date(end))}`;
}

function formatDayLabel(day: string) {
  const month = Number(day.slice(5, 7));
  const date = Number(day.slice(8, 10));
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${date} ${names[month - 1] || ''}`;
}

function formatClock(value: string) {
  return new Intl.DateTimeFormat('en-KE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Africa/Nairobi',
  }).format(new Date(value));
}

function Delta({
  kpi,
  comparison,
}: Readonly<{ kpi: ProximityOverview['kpis'][number]; comparison: string }>) {
  if (kpi.started !== null) {
    return (
      <p className="text-xs font-medium text-emerald-700">
        {kpi.started > 0 ? `+${kpi.started} started` : 'No new campaigns'}
      </p>
    );
  }
  if (kpi.delta_pct === null) {
    return <p className="text-xs font-medium text-emerald-700">New this period</p>;
  }
  const tone = kpi.delta_pct > 0 ? 'text-emerald-700' : kpi.delta_pct < 0 ? 'text-red-600' : 'text-muted-foreground';
  const prefix = kpi.delta_pct > 0 ? '+' : '';
  return (
    <p className={`text-xs font-medium ${tone}`}>
      {prefix}
      {kpi.delta_pct}% {comparison}
    </p>
  );
}

export function OverviewPanel({
  viewerName,
  roleLabel,
  storeName,
  revision,
  onOpenTab,
  onShowBeacons,
}: Readonly<{
  viewerName: string;
  roleLabel: string;
  storeName: string;
  revision: number;
  onOpenTab: (tab: 'campaigns' | 'invoices') => void;
  onShowBeacons: (beaconIds: string[]) => void;
}>) {
  const [range, setRange] = useState<OverviewRange>('this_month');
  const [locationId, setLocationId] = useState('');
  const [data, setData] = useState<ProximityOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const wroteUrl = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedRange = params.get('range');
    if (isRange(requestedRange)) setRange(requestedRange);
    setLocationId(params.get('location_id') || '');
  }, []);

  useEffect(() => {
    if (!wroteUrl.current) {
      wroteUrl.current = true;
      return;
    }
    const params = new URLSearchParams(window.location.search);
    params.set('tab', params.get('tab') || 'overview');
    params.set('range', range);
    if (locationId) params.set('location_id', locationId);
    else params.delete('location_id');
    const nextUrl = `/dashboard/proximity?${params}`;
    if (`${window.location.pathname}${window.location.search}` !== nextUrl) {
      window.history.replaceState(null, '', nextUrl);
    }
  }, [range, locationId]);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ range });
    if (locationId) params.set('location_id', locationId);
    setLoading(true);
    setError(null);
    fetch(`/api/dashboard/proximity/overview?${params}`, { signal: controller.signal })
      .then(async (response) => {
        const json = await response.json();
        if (!response.ok) throw new Error(json.error || 'Failed to load overview');
        setData(json.data);
      })
      .catch((fetchError: unknown) => {
        if (fetchError instanceof DOMException && fetchError.name === 'AbortError') return;
        setError(fetchError instanceof Error ? fetchError.message : 'Failed to load overview');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [range, locationId, revision]);

  const comparison = data?.comparison_label || 'vs prior period';
  const maxOnScreen = Math.max(...(data?.campaigns.map((campaign) => campaign.on_screen) || [0]), 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-2xl font-semibold tracking-tight">
            {greeting()}, {viewerName}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {roleLabel} · here&apos;s how {storeName} is performing {data?.period_label?.toLowerCase() || 'this month'}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SystemStatus status={data?.system} onShowBeacons={onShowBeacons} />
          <select
            aria-label="Branch"
            className={selectClassName}
            value={locationId}
            onChange={(event) => setLocationId(event.target.value)}
          >
            <option value="">All branches</option>
            {(data?.locations || []).map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Period"
            className={selectClassName}
            value={range}
            onChange={(event) => {
              if (isRange(event.target.value)) setRange(event.target.value);
            }}
          >
            {RANGES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {(data?.kpis || PLACEHOLDER_KPIS).map((metric) => {
          const Icon = KPI_ICONS[metric.key as keyof typeof KPI_ICONS] || MegaphoneIcon;
          return (
            <Card key={metric.key} className="border-0 shadow-sm ring-1 ring-border">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">{metric.label}</p>
                    <p className="mt-2 text-3xl font-semibold tracking-tight">
                      {loading && !data ? '—' : formatCount(metric.value)}
                    </p>
                  </div>
                  <span className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700">
                    <Icon className="h-5 w-5" />
                  </span>
                </div>
                <div className="mt-3">
                  {data ? <Delta kpi={metric} comparison={comparison} /> : <p className="text-xs text-muted-foreground">Loading</p>}
                </div>
              </CardContent>
            </Card>
          );
        })}
        <Card className="border-0 shadow-sm ring-1 ring-border">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Beacon health</p>
                <p className="mt-2 text-3xl font-semibold tracking-tight">
                  {data ? `${data.beacon_health.reporting} / ${data.beacon_health.total}` : '—'}
                </p>
              </div>
              <span className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700">
                <RadioIcon className="h-5 w-5" />
              </span>
            </div>
            <p className="mt-3 text-xs font-medium text-muted-foreground">
              {data
                ? `${data.beacon_health.online} online · ${data.beacon_health.low_battery} low battery · ${data.beacon_health.offline} offline`
                : 'Loading'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_1fr_0.9fr]">
        <Card className="border-0 shadow-sm ring-1 ring-border">
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle>Campaign performance</CardTitle>
              <CardDescription>On-screen views in {data?.period_label?.toLowerCase() || 'this period'}. Pocket detections are excluded.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onOpenTab('campaigns')}>
              View all campaigns
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {!data ? (
              <p className="text-sm text-muted-foreground">Loading campaigns…</p>
            ) : data.campaigns.length === 0 ? (
              <p className="text-sm text-muted-foreground">Campaign bars appear after a card is shown on screen.</p>
            ) : (
              data?.campaigns.map((campaign) => (
                <div key={campaign.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-50 text-xs font-semibold text-sky-700">
                    {campaign.brand.slice(0, 2).toUpperCase()}
                  </span>
                  <div>
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="truncate text-sm font-medium">{campaign.name}</p>
                      <p className="shrink-0 text-xs text-muted-foreground">{formatCount(campaign.on_screen)} views</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {campaign.brand} · {formatCampaignDates(campaign.starts_at, campaign.ends_at)} · {formatCount(campaign.claims)} claims
                    </p>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-sky-500"
                        style={{ width: `${Math.max(4, Math.round((campaign.on_screen / maxOnScreen) * 100))}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm ring-1 ring-border">
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle>Advertising revenue</CardTitle>
              <CardDescription>Issued and paid invoices. Drafts stay off this chart.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onOpenTab('invoices')}>
              View invoices
            </Button>
          </CardHeader>
          <CardContent>
            {!data ? (
              <p className="flex h-40 items-center text-sm text-muted-foreground">Loading revenue…</p>
            ) : data.revenue.gross > 0 ? (
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.revenue.series}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="day" tickFormatter={formatDayLabel} tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                    <YAxis hide />
                    <Tooltip
                      formatter={(value) => [formatMoney(Number(value)), 'Invoiced']}
                      labelFormatter={(value) => formatDayLabel(String(value))}
                    />
                    <Area type="monotone" dataKey="amount" stroke="#059669" fill="#d1fae5" strokeWidth={2} dot={{ r: 3, fill: '#059669' }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="flex h-40 items-center text-sm text-muted-foreground">
                Invoice totals for this period will chart here.
              </p>
            )}
            <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Gross</p>
                <p className="font-semibold">{formatMoney(data?.revenue.gross || 0)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Your share ({data?.revenue.supermarket_pct || 0}%)</p>
                <p className="font-semibold">{formatMoney(data?.revenue.supermarket_share || 0)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">DukaNest ({data?.revenue.dukanest_pct || 0}%)</p>
                <p className="font-semibold">{formatMoney(data?.revenue.dukanest_share || 0)}</p>
              </div>
            </div>
            {!!data?.revenue.omitted_shared_invoices && (
              <p className="mt-3 text-xs text-muted-foreground">
                {data.revenue.omitted_shared_invoices} invoice
                {data.revenue.omitted_shared_invoices === 1 ? '' : 's'} cover more than one branch and stay on All branches.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm ring-1 ring-border">
          <CardHeader>
            <CardTitle>Zone status</CardTitle>
            <CardDescription>Beacons heard in the last 24 hours. This is signal health, not a floor map.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!data ? (
              <p className="text-sm text-muted-foreground">Loading zones…</p>
            ) : data.zones.length === 0 ? (
              <p className="text-sm text-muted-foreground">Register a beacon to see which zones are online.</p>
            ) : (
              data?.zones.map((zone) => (
                <div key={zone.zone_id} className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">{zone.zone_name}</p>
                    <p className="text-xs text-muted-foreground">{zone.branch_name}</p>
                  </div>
                  <ZoneDots zone={zone} />
                </div>
              ))
            )}
            <div className="flex flex-wrap gap-3 pt-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Online</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-400" /> Low battery</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500" /> Offline</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-0 shadow-sm ring-1 ring-border">
          <CardHeader>
            <CardTitle>Store performance</CardTitle>
            <CardDescription>Every branch for {data?.period_label?.toLowerCase() || 'this period'}. Ad revenue is your share of single-branch invoices.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="pb-2 font-medium">Branch</th>
                    <th className="pb-2 font-medium">On-screen</th>
                    <th className="pb-2 font-medium">Claims</th>
                    <th className="pb-2 font-medium">Change</th>
                    <th className="pb-2 text-right font-medium">Your share</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.branches || []).map((branch) => (
                    <tr
                      key={branch.location_id}
                      className={`border-b last:border-0 ${branch.location_id === locationId ? 'bg-emerald-50/70' : ''}`}
                    >
                      <td className="py-3 font-medium">{branch.name}</td>
                      <td className="py-3">{formatCount(branch.on_screen)}</td>
                      <td className="py-3">{formatCount(branch.claims)}</td>
                      <td className="py-3">
                        <BranchDelta delta={branch.delta_pct} />
                      </td>
                      <td className="py-3 text-right">{formatMoney(branch.ad_revenue)}</td>
                    </tr>
                  ))}
                  {(data?.branches || []).length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 text-muted-foreground">
                        Add a branch to compare stores.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm ring-1 ring-border">
          <CardHeader>
            <CardTitle>Shopper funnel</CardTitle>
            <CardDescription>Distinct shoppers. Reached is a zone detection and stays inside the store.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(data?.funnel || []).map((step, index) => (
                <div key={step.key} className="rounded-xl px-3 py-3 text-white" style={{ backgroundColor: FUNNEL_COLORS[index] }}>
                  <p className="text-xs text-white/80">{step.label}</p>
                  <p className="mt-1 text-xl font-semibold">{formatCount(step.value)}</p>
                  <p className="text-xs text-white/80">{step.share_pct}% of reached</p>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-sm text-amber-950/80">
              <p>On-screen views count only when the campaign card renders.</p>
              <p className="mt-1">Till purchases without a coupon claim are not on this funnel.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm ring-1 ring-border">
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
          <CardDescription>Last 30 days, including the beacons and redemptions outside the chart period.</CardDescription>
        </CardHeader>
        <CardContent>
          {!data ? (
            <p className="text-sm text-muted-foreground">Loading activity…</p>
          ) : data.activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">Approvals, redemptions, invoices, and beacon warnings will show up here.</p>
          ) : (
            <div className="divide-y">
              {data?.activity.map((item, index) => (
                <div key={`${item.at}-${item.title}-${index}`} className="flex items-center justify-between gap-3 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <p className="w-12 shrink-0 text-xs text-muted-foreground">{formatClock(item.at)}</p>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.branch}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={`capitalize ${ACTIVITY_TONE[item.tone]}`}>
                    {item.tone === 'attention' ? 'Attention' : item.tone}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SystemStatus({
  status,
  onShowBeacons,
}: Readonly<{
  status: ProximityOverview['system'] | undefined;
  onShowBeacons: (beaconIds: string[]) => void;
}>) {
  const attention = status?.tone === 'attention' && (status.beacon_ids?.length ?? 0) > 0;
  const className = `inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${
    status?.tone === 'attention'
      ? 'border-amber-200 bg-amber-50 text-amber-800'
      : 'border-emerald-200 bg-emerald-50 text-emerald-700'
  }`;
  const content = (
    <>
      {status?.tone === 'attention' ? (
        <ExclamationTriangleIcon className="mr-1.5 h-3.5 w-3.5" />
      ) : (
        <CheckCircleIcon className="mr-1.5 h-3.5 w-3.5" />
      )}
      {status?.label || 'Checking beacons'}
    </>
  );
  if (!attention || !status) {
    return <span className={className}>{content}</span>;
  }
  const count = status.beacon_ids.length;
  return (
    <button
      type="button"
      className={`${className} cursor-pointer hover:bg-amber-100`}
      onClick={() => onShowBeacons(status.beacon_ids)}
    >
      {content}
      <span className="sr-only">{count === 1 ? 'Open this beacon' : 'Open these beacons'}</span>
    </button>
  );
}

function ZoneDots({
  zone,
}: Readonly<{ zone: ProximityOverview['zones'][number] }>) {
  const dots = [
    ...Array.from({ length: zone.online }, () => 'bg-emerald-500'),
    ...Array.from({ length: zone.low_battery }, () => 'bg-amber-400'),
    ...Array.from({ length: zone.offline }, () => 'bg-red-500'),
  ].slice(0, 8);
  return (
    <span className="flex gap-1">
      {dots.map((color, index) => (
        <span key={`${color}-${index}`} className={`h-2.5 w-2.5 rounded-full ${color}`} />
      ))}
    </span>
  );
}

function BranchDelta({ delta }: Readonly<{ delta: number | null }>) {
  if (delta === null) return <span className="font-medium text-emerald-700">New</span>;
  if (delta > 0) return <span className="font-medium text-emerald-700">+{delta}%</span>;
  if (delta < 0) return <span className="font-medium text-red-600">{delta}%</span>;
  return <span className="text-muted-foreground">0%</span>;
}

const PLACEHOLDER_KPIS: ProximityOverview['kpis'] = [
  { key: 'live_campaigns', label: 'Live campaigns', value: 0, previous: 0, delta_pct: 0, started: 0 },
  { key: 'detected', label: 'Zone detections', value: 0, previous: 0, delta_pct: 0, started: null },
  { key: 'on_screen', label: 'On-screen views', value: 0, previous: 0, delta_pct: 0, started: null },
  { key: 'clicked', label: 'Clicks', value: 0, previous: 0, delta_pct: 0, started: null },
  { key: 'claimed', label: 'Claims', value: 0, previous: 0, delta_pct: 0, started: null },
];
