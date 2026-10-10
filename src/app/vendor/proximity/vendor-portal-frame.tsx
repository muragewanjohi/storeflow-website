'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Megaphone,
  Plus,
  ReceiptText,
} from 'lucide-react';

export type VendorTab = 'results' | 'book' | 'campaigns' | 'invoices';

export const RANGE_LABELS: Record<string, string> = {
  this_month: 'This month',
  last_7_days: 'Last 7 days',
  last_30_days: 'Last 30 days',
};

const TABS: { id: VendorTab; label: string }[] = [
  { id: 'results', label: 'Overview' },
  { id: 'campaigns', label: 'Campaigns' },
  { id: 'book', label: 'Create campaign' },
  { id: 'invoices', label: 'Invoices' },
];

const TAB_ICONS = {
  results: LayoutDashboard,
  campaigns: Megaphone,
  book: Plus,
  invoices: ReceiptText,
} satisfies Record<VendorTab, typeof LayoutDashboard>;

export function statusClass(status: string): string {
  if (['approved', 'live', 'scheduled'].includes(status)) return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (status === 'submitted') return 'border-amber-200 bg-amber-50 text-amber-800';
  if (status === 'rejected') return 'border-red-200 bg-red-50 text-red-700';
  return 'border-slate-200 bg-slate-50 text-slate-700';
}

export function statusLabel(status: string): string {
  if (status === 'submitted') return 'Waiting for approval';
  if (status === 'approved') return 'Approved';
  return status;
}

export function vendorPortalHref(tab: VendorTab, range: string, branchId: string): string {
  const params = new URLSearchParams();
  if (tab !== 'results') params.set('tab', tab);
  if (range && range !== 'this_month') params.set('range', range);
  if (branchId) params.set('location_id', branchId);
  const query = params.toString();
  return query ? `/vendor/proximity?${query}` : '/vendor/proximity';
}

export function VendorPortalFrame({
  vendorName,
  active,
  branchId,
  range,
  locations,
  onBranchChange,
  onRangeChange,
  onSignOut,
  onTab,
  children,
}: {
  vendorName: string;
  active: VendorTab;
  branchId: string;
  range: string;
  locations: { id: string; name: string }[];
  onBranchChange: (value: string) => void;
  onRangeChange: (value: string) => void;
  onSignOut: () => void;
  onTab?: (tab: VendorTab) => void;
  children: React.ReactNode;
}) {
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
            {TABS.map((item) => {
              const Icon = TAB_ICONS[item.id];
              const className = `flex shrink-0 items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition ${
                active === item.id ? 'bg-[#1473e6] text-white shadow-sm' : 'text-blue-100 hover:bg-white/10'
              }`;
              if (onTab) {
                return (
                  <button key={item.id} type="button" onClick={() => onTab(item.id)} className={className}>
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                );
              }
              return (
                <Link key={item.id} href={vendorPortalHref(item.id, range, branchId)} className={className}>
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
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
              <p className="font-semibold text-[#101828]">{vendorName}</p>
            </div>
            <div className="flex items-center gap-3">
              <select
                aria-label="Branch"
                value={branchId}
                onChange={(event) => onBranchChange(event.target.value)}
                className="h-10 rounded-lg border bg-white px-3 text-sm"
              >
                <option value="">All branches</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>{location.name}</option>
                ))}
              </select>
              <select
                aria-label="Date range"
                value={range}
                onChange={(event) => onRangeChange(event.target.value)}
                className="h-10 rounded-lg border bg-white px-3 text-sm"
              >
                {Object.entries(RANGE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <Button type="button" variant="outline" onClick={onSignOut}>Sign out</Button>
            </div>
          </div>
        </header>
        <div className="space-y-6 px-4 py-6 lg:px-8">{children}</div>
      </section>
    </main>
  );
}
