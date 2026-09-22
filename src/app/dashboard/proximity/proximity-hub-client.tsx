'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  BanknotesIcon,
  BuildingStorefrontIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ClipboardDocumentIcon,
  CursorArrowRaysIcon,
  DevicePhoneMobileIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  KeyIcon,
  MapPinIcon,
  MegaphoneIcon,
  PencilSquareIcon,
  PlusIcon,
  RadioIcon,
  ShieldCheckIcon,
  SignalIcon,
  TicketIcon,
  TrashIcon,
  UserGroupIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { CP35_TX_STEPS_DBM, DUKANEST_PROXIMITY_UUID } from '@/lib/proximity/constants';
import { SaveButton } from './save-button';

type InventoryKind = 'branch' | 'zone' | 'beacon' | 'campaign' | 'vendor' | 'invoice' | 'sdk';

const DELETE_COPY: Record<
  InventoryKind,
  { title: string; description: (name: string) => string; success: string; path: (id: string) => string }
> = {
  branch: {
    title: 'Delete branch?',
    description: (name) =>
      `“${name}” and its zones and beacons will be removed. Active campaigns using this branch must be ended or moved first.`,
    success: 'Branch deleted',
    path: (id) => `/api/dashboard/proximity/locations/${id}`,
  },
  zone: {
    title: 'Delete zone?',
    description: (name) =>
      `“${name}” and its beacons will be removed. Active campaigns using this zone must be ended or moved first.`,
    success: 'Zone deleted',
    path: (id) => `/api/dashboard/proximity/zones/${id}`,
  },
  beacon: {
    title: 'Delete beacon?',
    description: (name) => `“${name}” will be unregistered. Detection history stays, but this device will stop serving ads.`,
    success: 'Beacon deleted',
    path: (id) => `/api/dashboard/proximity/beacons/${id}`,
  },
  campaign: {
    title: 'Delete campaign?',
    description: (name) =>
      `“${name}” will be removed. Live, scheduled, or approved campaigns must be ended first.`,
    success: 'Campaign deleted',
    path: (id) => `/api/dashboard/proximity/campaigns/${id}`,
  },
  vendor: {
    title: 'Delete vendor?',
    description: (name) =>
      `“${name}” will lose portal access. Active campaigns for this vendor must be ended first.`,
    success: 'Vendor deleted',
    path: (id) => `/api/dashboard/proximity/advertisers/${id}`,
  },
  invoice: {
    title: 'Delete invoice?',
    description: (name) => `“${name}” will be removed from the register. Paid invoices cannot be deleted.`,
    success: 'Invoice deleted',
    path: (id) => `/api/dashboard/proximity/invoices/${id}`,
  },
  sdk: {
    title: 'Delete SDK key?',
    description: (name) =>
      `“${name}” will stop working immediately. Apps using this key must be issued a replacement.`,
    success: 'SDK key deleted',
    path: (id) => `/api/dashboard/proximity/sdk-apps/${id}`,
  },
};

type Tab = 'overview' | 'branches' | 'beacons' | 'campaigns' | 'vendors' | 'invoices' | 'sdk';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'branches', label: 'Branches & zones' },
  { id: 'beacons', label: 'Beacons' },
  { id: 'campaigns', label: 'Campaigns' },
  { id: 'vendors', label: 'Vendors' },
  { id: 'invoices', label: 'Invoices' },
  { id: 'sdk', label: 'SDK keys' },
];

const selectClassName =
  'h-10 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-sm outline-none focus:ring-2 focus:ring-ring';

function formatDate(value: string | null | undefined): string {
  if (!value) return 'Never';
  return new Intl.DateTimeFormat('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function campaignStatusClass(status: string): string {
  if (['approved', 'live', 'scheduled'].includes(status)) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }
  if (status === 'submitted') return 'border-amber-200 bg-amber-50 text-amber-700';
  if (status === 'rejected') return 'border-red-200 bg-red-50 text-red-700';
  return 'border-slate-200 bg-slate-50 text-slate-700';
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: Readonly<{
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}>) {
  return (
    <div className="rounded-xl border border-dashed bg-muted/20 px-6 py-10 text-center">
      <Icon className="mx-auto h-9 w-9 text-muted-foreground/60" />
      <p className="mt-3 text-sm font-semibold">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

async function api(path: string, init?: RequestInit) {
  const response = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.error || 'Request failed');
  }
  return json;
}

export default function ProximityHubClient() {
  const [tab, setTab] = useState<Tab>('overview');
  const [overview, setOverview] = useState<any>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [beacons, setBeacons] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [advertisers, setAdvertisers] = useState<any[]>([]);
  const [sdkApps, setSdkApps] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [vendorTokenOnce, setVendorTokenOnce] = useState<string | null>(null);
  const [sdkKeyOnce, setSdkKeyOnce] = useState<string | null>(null);
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
  const [editingBeaconId, setEditingBeaconId] = useState<string | null>(null);
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [editingSdkId, setEditingSdkId] = useState<string | null>(null);
  const [locationDraft, setLocationDraft] = useState({ name: '', address: '' });
  const [zoneDraft, setZoneDraft] = useState({ name: '', location_id: '' });
  const [beaconDraft, setBeaconDraft] = useState({
    zone_id: '',
    mac_address: '',
    major: '',
    minor: '',
    tx_power_dbm: '-13.5',
  });
  const [vendorDraft, setVendorDraft] = useState({ name: '', email: '', phone: '' });
  const [invoiceDraft, setInvoiceDraft] = useState({ amount: '', notes: '', status: 'draft' });
  const [sdkDraft, setSdkDraft] = useState({ name: '' });
  const [deleteTarget, setDeleteTarget] = useState<{
    type: InventoryKind;
    id: string;
    name: string;
  } | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const savingInventory = pendingAction !== null;

  async function refresh() {
    try {
      const [over, loc, zon, bea, cam, adv, sdk, inv] = await Promise.all([
        api('/api/dashboard/proximity/overview'),
        api('/api/dashboard/proximity/locations'),
        api('/api/dashboard/proximity/zones'),
        api('/api/dashboard/proximity/beacons'),
        api('/api/dashboard/proximity/campaigns'),
        api('/api/dashboard/proximity/advertisers'),
        api('/api/dashboard/proximity/sdk-apps'),
        api('/api/dashboard/proximity/invoices'),
      ]);
      setOverview(over.data);
      setLocations(loc.data);
      setZones(zon.data);
      setBeacons(bea.data);
      setCampaigns(cam.data);
      setAdvertisers(adv.data);
      setSdkApps(sdk.data);
      setInvoices(inv.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load proximity data');
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function saveLocation(locationId: string) {
    if (!locationDraft.name.trim()) {
      toast.error('Branch name is required');
      return;
    }
    setPendingAction(`save-location:${locationId}`);
    try {
      await api(`/api/dashboard/proximity/locations/${locationId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: locationDraft.name.trim(),
          address: locationDraft.address.trim() || null,
        }),
      });
      setEditingLocationId(null);
      toast.success('Branch updated');
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update branch');
    } finally {
      setPendingAction(null);
    }
  }

  async function saveZone(zoneId: string) {
    if (!zoneDraft.name.trim()) {
      toast.error('Zone name is required');
      return;
    }
    setPendingAction(`save-zone:${zoneId}`);
    try {
      await api(`/api/dashboard/proximity/zones/${zoneId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: zoneDraft.name.trim(),
          location_id: zoneDraft.location_id,
        }),
      });
      setEditingZoneId(null);
      toast.success('Zone updated');
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update zone');
    } finally {
      setPendingAction(null);
    }
  }

  async function saveBeacon(beaconId: string) {
    const zone = zones.find((item) => item.id === beaconDraft.zone_id);
    if (!zone) {
      toast.error('Choose a zone');
      return;
    }
    setPendingAction(`save-beacon:${beaconId}`);
    try {
      await api(`/api/dashboard/proximity/beacons/${beaconId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          zone_id: zone.id,
          location_id: zone.location_id,
          mac_address: beaconDraft.mac_address.trim() || null,
          major: Number(beaconDraft.major),
          minor: Number(beaconDraft.minor),
          tx_power_dbm: Number(beaconDraft.tx_power_dbm),
        }),
      });
      setEditingBeaconId(null);
      toast.success('Beacon updated');
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update beacon');
    } finally {
      setPendingAction(null);
    }
  }

  async function saveVendor(vendorId: string) {
    if (!vendorDraft.name.trim()) {
      toast.error('Vendor name is required');
      return;
    }
    setPendingAction(`save-vendor:${vendorId}`);
    try {
      await api(`/api/dashboard/proximity/advertisers/${vendorId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: vendorDraft.name.trim(),
          email: vendorDraft.email.trim() || null,
          phone: vendorDraft.phone.trim() || null,
        }),
      });
      setEditingVendorId(null);
      toast.success('Vendor updated');
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update vendor');
    } finally {
      setPendingAction(null);
    }
  }

  async function saveInvoice(invoiceId: string) {
    const amount = Number(invoiceDraft.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Enter a valid invoice amount');
      return;
    }
    setPendingAction(`save-invoice:${invoiceId}`);
    try {
      await api(`/api/dashboard/proximity/invoices/${invoiceId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          amount,
          notes: invoiceDraft.notes.trim() || null,
          status: invoiceDraft.status,
        }),
      });
      setEditingInvoiceId(null);
      toast.success('Invoice updated');
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update invoice');
    } finally {
      setPendingAction(null);
    }
  }

  async function saveSdkApp(appId: string) {
    if (!sdkDraft.name.trim()) {
      toast.error('Application name is required');
      return;
    }
    setPendingAction(`save-sdk:${appId}`);
    try {
      await api(`/api/dashboard/proximity/sdk-apps/${appId}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: sdkDraft.name.trim() }),
      });
      setEditingSdkId(null);
      toast.success('SDK app updated');
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update SDK app');
    } finally {
      setPendingAction(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setPendingAction('delete');
    try {
      await api(DELETE_COPY[deleteTarget.type].path(deleteTarget.id), { method: 'DELETE' });
      toast.success(DELETE_COPY[deleteTarget.type].success);
      setDeleteTarget(null);
      setEditingLocationId((current) => (current === deleteTarget.id ? null : current));
      setEditingZoneId((current) => (current === deleteTarget.id ? null : current));
      setEditingBeaconId((current) => (current === deleteTarget.id ? null : current));
      setEditingVendorId((current) => (current === deleteTarget.id ? null : current));
      setEditingInvoiceId((current) => (current === deleteTarget.id ? null : current));
      setEditingSdkId((current) => (current === deleteTarget.id ? null : current));
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete');
    } finally {
      setPendingAction(null);
    }
  }

  useEffect(() => {
    const requestedTab = new URLSearchParams(window.location.search).get('tab');
    if (TABS.some((item) => item.id === requestedTab)) {
      setTab(requestedTab as Tab);
    }
  }, []);

  function selectTab(nextTab: Tab) {
    setTab(nextTab);
    window.history.replaceState(null, '', `/dashboard/proximity?tab=${nextTab}`);
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-800 text-white shadow-sm">
        <div className="flex flex-col gap-6 px-6 py-7 md:flex-row md:items-end md:justify-between md:px-8">
          <div className="max-w-3xl">
            <div className="mb-4 flex items-center gap-3">
              <span className="rounded-xl bg-white/10 p-2.5 ring-1 ring-white/20">
                <SignalIcon className="h-6 w-6" />
              </span>
              <Badge className="border-white/20 bg-white/10 text-white hover:bg-white/10">
                Retail media workspace
              </Badge>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">Proximity marketing</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-50/80">
              Manage branch inventory, zone beacons, vendor bookings and on-screen campaign performance
              from one focused workspace.
            </p>
          </div>
          <Button asChild size="lg" className="bg-white text-emerald-950 shadow-sm hover:bg-emerald-50">
            <Link href="/dashboard/proximity/campaigns/new">
              <MegaphoneIcon className="mr-2 h-5 w-5" />
              Create campaign
            </Link>
          </Button>
        </div>
        <div className="flex gap-1 overflow-x-auto border-t border-white/10 bg-black/10 px-4 py-3 md:px-6">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => selectTab(item.id)}
              className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                tab === item.id
                  ? 'bg-white text-emerald-950 shadow-sm'
                  : 'text-emerald-50/80 hover:bg-white/10 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
            {TABS.find((item) => item.id === tab)?.label}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Till purchases without a claim are not measured in Phase 1.
          </p>
        </div>
      </div>

      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {[
              { label: 'Live campaigns', value: overview?.live_campaigns ?? 0, icon: MegaphoneIcon },
              { label: 'Zone detections', value: overview?.stats?.detected ?? 0, icon: RadioIcon },
              { label: 'On-screen views', value: overview?.stats?.delivered ?? 0, icon: EyeIcon },
              { label: 'Clicks', value: overview?.stats?.clicked ?? 0, icon: CursorArrowRaysIcon },
              { label: 'Claims', value: overview?.stats?.claimed ?? 0, icon: TicketIcon },
            ].map((metric) => (
              <Card key={metric.label} className="overflow-hidden border-0 shadow-sm ring-1 ring-border">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{metric.label}</p>
                      <p className="mt-2 text-3xl font-semibold tracking-tight">{metric.value}</p>
                    </div>
                    <span className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700">
                      <metric.icon className="h-5 w-5" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <Card>
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle>Beacon health</CardTitle>
                  <CardDescription>Paid inventory stops billing after 24 hours without a signal.</CardDescription>
                </div>
                <Badge
                  className={
                    (overview?.dark_beacons || []).length
                      ? 'border-red-200 bg-red-50 text-red-700'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  }
                  variant="outline"
                >
                  {(overview?.dark_beacons || []).length
                    ? `${overview.dark_beacons.length} need attention`
                    : 'All healthy'}
                </Badge>
              </CardHeader>
              <CardContent>
                {(overview?.dark_beacons || []).length === 0 ? (
                  <EmptyState
                    icon={CheckCircleIcon}
                    title="No dark beacons"
                    description="All registered placements have reported within the last 24 hours."
                  />
                ) : (
                  <div className="space-y-3">
                    {(overview?.dark_beacons || []).map((beacon: any) => (
                      <div
                        key={beacon.id}
                        className="flex items-center justify-between rounded-xl border border-red-100 bg-red-50/50 p-4"
                      >
                        <div className="flex items-center gap-3">
                          <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
                          <div>
                            <p className="text-sm font-medium">
                              {beacon.location?.name} / {beacon.zone?.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Last seen {formatDate(beacon.last_seen_at)}
                            </p>
                          </div>
                        </div>
                        <Badge variant="destructive">Billing paused</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-amber-200 bg-amber-50/40">
              <CardHeader>
                <div className="mb-2 w-fit rounded-xl bg-amber-100 p-2.5 text-amber-700">
                  <ShieldCheckIcon className="h-5 w-5" />
                </div>
                <CardTitle>Measurement rules</CardTitle>
                <CardDescription>What Phase 1 reports to retailers and vendors.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-amber-950/80">
                <p>Impressions count only when the campaign card renders on screen.</p>
                <p>Detections remain retailer-only and are never sold as reach.</p>
                <p>Till purchases without a coupon claim are not attributed.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {tab === 'branches' && (
        <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <div className="space-y-6">
          <Card className="border-0 shadow-sm ring-1 ring-border">
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700">
                  <BuildingStorefrontIcon className="h-5 w-5" />
                </span>
                <div>
                  <CardTitle>Add a branch</CardTitle>
                  <CardDescription>Create a physical store location.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-3"
                onSubmit={async (event) => {
                  event.preventDefault();
                  const formEl = event.currentTarget;
                  const form = new FormData(formEl);
                  setPendingAction('create-branch');
                  try {
                    await api('/api/dashboard/proximity/locations', {
                      method: 'POST',
                      body: JSON.stringify({ name: form.get('name'), address: form.get('address') }),
                    });
                    formEl.reset();
                    toast.success('Branch created');
                    await refresh();
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : 'Failed');
                  } finally {
                    setPendingAction(null);
                  }
                }}
              >
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input name="name" placeholder="e.g. Ruaka Branch" required />
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input name="address" placeholder="Street, town or landmark" />
                </div>
                <SaveButton type="submit" className="w-full" pending={pendingAction === 'create-branch'} pendingLabel="Saving">
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Add branch
                </SaveButton>
              </form>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm ring-1 ring-border">
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="rounded-xl bg-teal-50 p-2.5 text-teal-700">
                  <MapPinIcon className="h-5 w-5" />
                </span>
                <div>
                  <CardTitle>Add a zone</CardTitle>
                  <CardDescription>Sell departments, not individual shelves.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-3"
                onSubmit={async (event) => {
                  event.preventDefault();
                  const formEl = event.currentTarget;
                  const form = new FormData(formEl);
                  setPendingAction('create-zone');
                  try {
                    await api('/api/dashboard/proximity/zones', {
                      method: 'POST',
                      body: JSON.stringify({
                        location_id: form.get('location_id'),
                        name: form.get('name'),
                        kind: form.get('kind') || 'department',
                      }),
                    });
                    formEl.reset();
                    toast.success('Zone created');
                    await refresh();
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : 'Failed');
                  } finally {
                    setPendingAction(null);
                  }
                }}
              >
                <div className="space-y-2">
                  <Label>Branch</Label>
                  <select name="location_id" className={selectClassName} required>
                    {locations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Zone name</Label>
                  <Input name="name" placeholder="Entrance, Beverages, Checkout" required />
                </div>
                <SaveButton
                  type="submit"
                  variant="outline"
                  className="w-full"
                  disabled={!locations.length}
                  pending={pendingAction === 'create-zone'}
                  pendingLabel="Saving"
                >
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Add zone
                </SaveButton>
              </form>
            </CardContent>
          </Card>
          </div>

          <Card className="border-0 shadow-sm ring-1 ring-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Placement inventory</CardTitle>
                  <CardDescription>{locations.length} branches · {zones.length} sellable zones</CardDescription>
                </div>
                <Badge variant="outline">{zones.length} zones</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {locations.length === 0 ? (
                <EmptyState
                  icon={BuildingStorefrontIcon}
                  title="No branches yet"
                  description="Add your first physical location to start building proximity inventory."
                />
              ) : (
                <div className="space-y-4">
                  {locations.map((location) => {
                    const locationZones = zones.filter((zone) => zone.location_id === location.id);
                    const isEditingLocation = editingLocationId === location.id;
                    return (
                      <div key={location.id} className="rounded-xl border bg-card p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <span className="rounded-lg bg-emerald-50 p-2 text-emerald-700">
                              <BuildingStorefrontIcon className="h-5 w-5" />
                            </span>
                            <div>
                              <p className="font-semibold">{location.name}</p>
                              <p className="mt-0.5 text-sm text-muted-foreground">
                                {location.address || 'No address added'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{locationZones.length} zones</Badge>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingLocationId(location.id);
                                setLocationDraft({
                                  name: location.name,
                                  address: location.address || '',
                                });
                              }}
                            >
                              <PencilSquareIcon className="mr-1.5 h-4 w-4" />
                              Edit
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:bg-red-50 hover:text-red-700"
                              onClick={() =>
                                setDeleteTarget({
                                  type: 'branch',
                                  id: location.id,
                                  name: location.name,
                                })
                              }
                            >
                              <TrashIcon className="mr-1.5 h-4 w-4" />
                              Delete
                            </Button>
                          </div>
                        </div>
                        {isEditingLocation && (
                          <div className="mt-4 space-y-3 rounded-lg border bg-muted/20 p-3">
                            <div className="space-y-2">
                              <Label>Branch name</Label>
                              <Input
                                value={locationDraft.name}
                                onChange={(event) =>
                                  setLocationDraft((current) => ({
                                    ...current,
                                    name: event.target.value,
                                  }))
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Address</Label>
                              <Input
                                value={locationDraft.address}
                                onChange={(event) =>
                                  setLocationDraft((current) => ({
                                    ...current,
                                    address: event.target.value,
                                  }))
                                }
                              />
                            </div>
                            <div className="flex gap-2">
                              <SaveButton
                                type="button"
                                size="sm"
                                disabled={savingInventory && pendingAction !== `save-location:${location.id}`}
                                pending={pendingAction === `save-location:${location.id}`}
                                onClick={() => void saveLocation(location.id)}
                              >
                                Save branch
                              </SaveButton>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingLocationId(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}
                        <div className="mt-4 space-y-2">
                          {locationZones.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No zones in this branch yet.</p>
                          ) : (
                            locationZones.map((zone) => {
                              const isEditingZone = editingZoneId === zone.id;
                              return (
                                <div
                                  key={zone.id}
                                  className="rounded-lg border bg-muted/20 px-3 py-2"
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <span className="inline-flex items-center gap-1.5 text-sm font-medium">
                                      <MapPinIcon className="h-3.5 w-3.5 text-emerald-600" />
                                      {zone.name}
                                    </span>
                                    <div className="flex items-center gap-1">
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                          setEditingZoneId(zone.id);
                                          setZoneDraft({
                                            name: zone.name,
                                            location_id: zone.location_id,
                                          });
                                        }}
                                      >
                                        <PencilSquareIcon className="h-4 w-4" />
                                        <span className="sr-only">Edit zone</span>
                                      </Button>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                                        onClick={() =>
                                          setDeleteTarget({
                                            type: 'zone',
                                            id: zone.id,
                                            name: zone.name,
                                          })
                                        }
                                      >
                                        <TrashIcon className="h-4 w-4" />
                                        <span className="sr-only">Delete zone</span>
                                      </Button>
                                    </div>
                                  </div>
                                  {isEditingZone && (
                                    <div className="mt-3 space-y-3">
                                      <div className="space-y-2">
                                        <Label>Zone name</Label>
                                        <Input
                                          value={zoneDraft.name}
                                          onChange={(event) =>
                                            setZoneDraft((current) => ({
                                              ...current,
                                              name: event.target.value,
                                            }))
                                          }
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label>Branch</Label>
                                        <select
                                          className={selectClassName}
                                          value={zoneDraft.location_id}
                                          onChange={(event) =>
                                            setZoneDraft((current) => ({
                                              ...current,
                                              location_id: event.target.value,
                                            }))
                                          }
                                        >
                                          {locations.map((option) => (
                                            <option key={option.id} value={option.id}>
                                              {option.name}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                      <div className="flex gap-2">
                                        <SaveButton
                                          type="button"
                                          size="sm"
                                          disabled={savingInventory && pendingAction !== `save-zone:${zone.id}`}
                                          pending={pendingAction === `save-zone:${zone.id}`}
                                          onClick={() => void saveZone(zone.id)}
                                        >
                                          Save zone
                                        </SaveButton>
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => setEditingZoneId(null)}
                                        >
                                          Cancel
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'beacons' && (
        <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <Card className="h-fit border-0 shadow-sm ring-1 ring-border">
            <CardHeader>
              <div className="mb-2 w-fit rounded-xl bg-emerald-50 p-2.5 text-emerald-700">
                <RadioIcon className="h-5 w-5" />
              </div>
              <CardTitle>Register a CP35</CardTitle>
              <CardDescription>
                Commission in DX-SMART first, then bind its identifiers to a sellable zone.
              </CardDescription>
            </CardHeader>
            <CardContent>
            <form
              className="space-y-4"
              onSubmit={async (event) => {
                event.preventDefault();
                const formEl = event.currentTarget;
                const form = new FormData(formEl);
                const zoneId = String(form.get('zone_id'));
                const zone = zones.find((item) => item.id === zoneId);
                setPendingAction('create-beacon');
                try {
                  await api('/api/dashboard/proximity/beacons', {
                    method: 'POST',
                    body: JSON.stringify({
                      zone_id: zoneId,
                      location_id: zone?.location_id,
                      mac_address: form.get('mac_address') || null,
                      major: Number(form.get('major')),
                      minor: Number(form.get('minor')),
                      tx_power_dbm: Number(form.get('tx_power_dbm') || -13.5),
                    }),
                  });
                  formEl.reset();
                  toast.success('Beacon registered');
                  await refresh();
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : 'Failed');
                } finally {
                  setPendingAction(null);
                }
              }}
            >
              <div className="space-y-2">
                <Label>Zone</Label>
                <select name="zone_id" className={selectClassName} required>
                  {zones.map((zone) => (
                    <option key={zone.id} value={zone.id}>
                      {zone.location?.name} / {zone.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>MAC</Label>
                <Input name="mac_address" placeholder="AA:BB:CC:DD:EE:FF" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Major</Label>
                  <Input name="major" type="number" min="0" max="65535" placeholder="Branch ID" required />
                </div>
                <div className="space-y-2">
                  <Label>Minor</Label>
                  <Input name="minor" type="number" min="0" max="65535" placeholder="Zone ID" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>TX power</Label>
                <select name="tx_power_dbm" className={selectClassName} defaultValue="-13.5">
                  {CP35_TX_STEPS_DBM.map((value) => (
                    <option key={value} value={value}>{value} dBm</option>
                  ))}
                </select>
              </div>
              <SaveButton
                type="submit"
                className="w-full"
                disabled={!zones.length}
                pending={pendingAction === 'create-beacon'}
                pendingLabel="Saving"
              >
                Register beacon
              </SaveButton>
            </form>
              <div className="mt-5 rounded-lg bg-muted/40 p-3">
                <p className="text-xs font-medium">Platform UUID</p>
                <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                  {DUKANEST_PROXIMITY_UUID}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm ring-1 ring-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Beacon fleet</CardTitle>
                  <CardDescription>Health and placement assignment across every branch.</CardDescription>
                </div>
                <Badge variant="outline">{beacons.length} registered</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {beacons.length === 0 ? (
                <EmptyState
                  icon={RadioIcon}
                  title="No beacons registered"
                  description="Commission a CP35 and bind it to a branch zone to create inventory."
                />
              ) : (
                <div className="space-y-3">
                  {beacons.map((beacon) => {
                    const isDark = !beacon.last_seen_at ||
                      Date.now() - new Date(beacon.last_seen_at).getTime() > 24 * 60 * 60 * 1000;
                    const isEditing = editingBeaconId === beacon.id;
                    return (
                      <div key={beacon.id} className="rounded-xl border p-4">
                        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                          <div className="flex items-center gap-3">
                            <span className={`rounded-full p-2 ${isDark ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                              <SignalIcon className="h-5 w-5" />
                            </span>
                            <div>
                              <p className="font-medium">{beacon.location?.name} / {beacon.zone?.name}</p>
                              <p className="text-xs text-muted-foreground">
                                Major {beacon.major} · Minor {beacon.minor} · TX {beacon.tx_power_dbm} dBm
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                            <Badge
                              variant="outline"
                              className={isDark
                                ? 'border-red-200 bg-red-50 text-red-700'
                                : 'border-emerald-200 bg-emerald-50 text-emerald-700'}
                            >
                              {isDark ? 'Dark' : 'Healthy'}
                            </Badge>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingBeaconId(beacon.id);
                                setBeaconDraft({
                                  zone_id: beacon.zone_id,
                                  mac_address: beacon.mac_address || '',
                                  major: String(beacon.major),
                                  minor: String(beacon.minor),
                                  tx_power_dbm: String(beacon.tx_power_dbm),
                                });
                              }}
                            >
                              <PencilSquareIcon className="mr-1.5 h-4 w-4" />
                              Edit
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:bg-red-50 hover:text-red-700"
                              onClick={() =>
                                setDeleteTarget({
                                  type: 'beacon',
                                  id: beacon.id,
                                  name: `${beacon.location?.name || 'Branch'} / ${beacon.zone?.name || 'Zone'}`,
                                })
                              }
                            >
                              <TrashIcon className="mr-1.5 h-4 w-4" />
                              Delete
                            </Button>
                          </div>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Seen {formatDate(beacon.last_seen_at)}
                          {beacon.mac_address ? ` · ${beacon.mac_address}` : ''}
                        </p>
                        {isEditing && (
                          <div className="mt-4 space-y-3 rounded-lg border bg-muted/20 p-3">
                            <div className="space-y-2">
                              <Label>Zone</Label>
                              <select
                                className={selectClassName}
                                value={beaconDraft.zone_id}
                                onChange={(event) =>
                                  setBeaconDraft((current) => ({ ...current, zone_id: event.target.value }))
                                }
                              >
                                {zones.map((zone) => (
                                  <option key={zone.id} value={zone.id}>
                                    {zone.location?.name} / {zone.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-2">
                              <Label>MAC</Label>
                              <Input
                                value={beaconDraft.mac_address}
                                onChange={(event) =>
                                  setBeaconDraft((current) => ({ ...current, mac_address: event.target.value }))
                                }
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-2">
                                <Label>Major</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  max="65535"
                                  value={beaconDraft.major}
                                  onChange={(event) =>
                                    setBeaconDraft((current) => ({ ...current, major: event.target.value }))
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Minor</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  max="65535"
                                  value={beaconDraft.minor}
                                  onChange={(event) =>
                                    setBeaconDraft((current) => ({ ...current, minor: event.target.value }))
                                  }
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label>TX power</Label>
                              <select
                                className={selectClassName}
                                value={beaconDraft.tx_power_dbm}
                                onChange={(event) =>
                                  setBeaconDraft((current) => ({ ...current, tx_power_dbm: event.target.value }))
                                }
                              >
                                {CP35_TX_STEPS_DBM.map((value) => (
                                  <option key={value} value={value}>{value} dBm</option>
                                ))}
                              </select>
                            </div>
                            <div className="flex gap-2">
                              <SaveButton
                                type="button"
                                size="sm"
                                disabled={savingInventory && pendingAction !== `save-beacon:${beacon.id}`}
                                pending={pendingAction === `save-beacon:${beacon.id}`}
                                onClick={() => void saveBeacon(beacon.id)}
                              >
                                Save beacon
                              </SaveButton>
                              <Button type="button" size="sm" variant="ghost" onClick={() => setEditingBeaconId(null)}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'campaigns' && (
        <div className="space-y-5">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-semibold">Campaign library</h2>
              <p className="text-sm text-muted-foreground">
                Review house promotions and vendor-funded flights.
              </p>
            </div>
            <Button asChild>
              <Link href="/dashboard/proximity/campaigns/new">
                <PlusIcon className="mr-2 h-4 w-4" />
                New campaign
              </Link>
            </Button>
          </div>

          {campaigns.length === 0 ? (
            <EmptyState
              icon={MegaphoneIcon}
              title="No campaigns yet"
              description="Create a house promotion or invite a vendor to book your first zone."
            />
          ) : (
            <div className="grid gap-5 xl:grid-cols-2">
              {campaigns.map((campaign) => (
                <Card key={campaign.id} className="overflow-hidden border-0 shadow-sm ring-1 ring-border">
                  <div className="grid min-h-56 sm:grid-cols-[180px_1fr]">
                    <div className="relative min-h-44 bg-gradient-to-br from-emerald-100 to-teal-50 sm:min-h-full">
                      {campaign.image_url ? (
                        <Image
                          src={campaign.image_url}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="180px"
                        />
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-emerald-700/50">
                          <MegaphoneIcon className="h-10 w-10" />
                          <span className="mt-2 text-xs font-medium">No creative</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline" className={campaignStatusClass(campaign.status)}>
                              {campaign.status}
                            </Badge>
                            <Badge variant="secondary">
                              {campaign.advertiser ? campaign.advertiser.name : 'House'}
                            </Badge>
                          </div>
                          <h3 className="mt-3 text-lg font-semibold">{campaign.name}</h3>
                          <p className="mt-1 text-sm text-muted-foreground">{campaign.headline}</p>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <CalendarDaysIcon className="h-4 w-4" />
                          {formatDate(campaign.starts_at)} – {formatDate(campaign.ends_at)}
                        </div>
                        <div className="flex items-start gap-2">
                          <MapPinIcon className="mt-0.5 h-4 w-4 shrink-0" />
                          <span>
                            {(campaign.placements || [])
                              .map((placement: any) => `${placement.location?.name} / ${placement.zone?.name}`)
                              .join(', ') || 'No placements'}
                          </span>
                        </div>
                      </div>

                      <div className="mt-auto flex flex-wrap gap-2 pt-5">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/dashboard/proximity/campaigns/${campaign.id}/edit`}>
                            <PencilSquareIcon className="mr-1.5 h-4 w-4" />
                            Edit
                          </Link>
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() =>
                            setDeleteTarget({
                              type: 'campaign',
                              id: campaign.id,
                              name: campaign.name,
                            })
                          }
                        >
                          <TrashIcon className="mr-1.5 h-4 w-4" />
                          Delete
                        </Button>
                        {campaign.status === 'submitted' && (
                          <>
                            <Button
                              size="sm"
                              onClick={async () => {
                                await api(`/api/dashboard/proximity/campaigns/${campaign.id}/review`, {
                                  method: 'POST',
                                  body: JSON.stringify({ action: 'approve' }),
                                });
                                toast.success('Campaign approved');
                                await refresh();
                              }}
                            >
                              <CheckCircleIcon className="mr-1.5 h-4 w-4" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={async () => {
                                await api(`/api/dashboard/proximity/campaigns/${campaign.id}/review`, {
                                  method: 'POST',
                                  body: JSON.stringify({
                                    action: 'reject',
                                    reason: 'Does not meet store guidelines',
                                  }),
                                });
                                toast.success('Campaign rejected');
                                await refresh();
                              }}
                            >
                              <XCircleIcon className="mr-1.5 h-4 w-4" />
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'vendors' && (
        <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <Card className="h-fit border-0 shadow-sm ring-1 ring-border">
            <CardHeader>
              <div className="mb-2 w-fit rounded-xl bg-violet-50 p-2.5 text-violet-700">
                <UserGroupIcon className="h-5 w-5" />
              </div>
              <CardTitle>Add a vendor</CardTitle>
              <CardDescription>Create a pilot advertiser and issue temporary portal access.</CardDescription>
            </CardHeader>
            <CardContent>
            <form
              className="space-y-4"
              onSubmit={async (event) => {
                event.preventDefault();
                const formEl = event.currentTarget;
                const form = new FormData(formEl);
                setPendingAction('create-vendor');
                try {
                  const result = await api('/api/dashboard/proximity/advertisers', {
                    method: 'POST',
                    body: JSON.stringify({ name: form.get('name'), email: form.get('email') }),
                  });
                  setVendorTokenOnce(result.access_token);
                  formEl.reset();
                  toast.success('Vendor created — copy the token now');
                  await refresh();
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : 'Failed');
                } finally {
                  setPendingAction(null);
                }
              }}
            >
              <div className="space-y-2">
                <Label>Vendor name</Label>
                <Input name="name" placeholder="e.g. Coca-Cola" required />
              </div>
              <div className="space-y-2">
                <Label>Contact email</Label>
                <Input name="email" type="email" placeholder="campaigns@vendor.com" />
              </div>
              <SaveButton type="submit" className="w-full" pending={pendingAction === 'create-vendor'} pendingLabel="Saving">
                Create vendor
              </SaveButton>
            </form>
            {vendorTokenOnce && (
              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-center gap-2 text-amber-900">
                  <KeyIcon className="h-5 w-5" />
                  <p className="text-sm font-semibold">Pilot access token — shown once</p>
                </div>
                <p className="mt-2 break-all rounded-lg bg-white/70 p-3 font-mono text-xs">{vendorTokenOnce}</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  onClick={async () => {
                    await navigator.clipboard.writeText(vendorTokenOnce);
                    toast.success('Token copied');
                  }}
                >
                  <ClipboardDocumentIcon className="mr-1.5 h-4 w-4" />
                  Copy token
                </Button>
                <p className="mt-3 text-xs text-amber-800">
                  Password-based vendor accounts should replace this pilot token before production.
                </p>
              </div>
            )}
          </CardContent>
          </Card>

          <Card className="border-0 shadow-sm ring-1 ring-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Vendor directory</CardTitle>
                  <CardDescription>Advertisers approved to submit campaigns to this retailer.</CardDescription>
                </div>
                <Badge variant="outline">{advertisers.length} vendors</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {advertisers.length === 0 ? (
                <EmptyState
                  icon={UserGroupIcon}
                  title="No vendors yet"
                  description="Create an advertiser to start accepting paid campaign bookings."
                />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {advertisers.map((advertiser) => {
                    const isEditing = editingVendorId === advertiser.id;
                    return (
                    <div key={advertiser.id} className="rounded-xl border p-4">
                      <div className="flex items-center justify-between">
                        <span className="rounded-full bg-violet-50 p-2 text-violet-700">
                          <UserGroupIcon className="h-5 w-5" />
                        </span>
                        <Badge variant="secondary">{advertiser._count?.campaigns || 0} campaigns</Badge>
                      </div>
                      <p className="mt-4 font-semibold">{advertiser.name}</p>
                      <p className="mt-1 truncate text-sm text-muted-foreground">
                        {advertiser.email || 'No contact email'}
                      </p>
                      {advertiser.phone && (
                        <p className="mt-1 text-sm text-muted-foreground">{advertiser.phone}</p>
                      )}
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingVendorId(advertiser.id);
                            setVendorDraft({
                              name: advertiser.name,
                              email: advertiser.email || '',
                              phone: advertiser.phone || '',
                            });
                          }}
                        >
                          <PencilSquareIcon className="mr-1.5 h-4 w-4" />
                          Edit
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() =>
                            setDeleteTarget({
                              type: 'vendor',
                              id: advertiser.id,
                              name: advertiser.name,
                            })
                          }
                        >
                          <TrashIcon className="mr-1.5 h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                      {isEditing && (
                        <div className="mt-4 space-y-3 rounded-lg border bg-muted/20 p-3">
                          <div className="space-y-2">
                            <Label>Vendor name</Label>
                            <Input
                              value={vendorDraft.name}
                              onChange={(event) =>
                                setVendorDraft((current) => ({ ...current, name: event.target.value }))
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Contact email</Label>
                            <Input
                              type="email"
                              value={vendorDraft.email}
                              onChange={(event) =>
                                setVendorDraft((current) => ({ ...current, email: event.target.value }))
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Phone</Label>
                            <Input
                              value={vendorDraft.phone}
                              onChange={(event) =>
                                setVendorDraft((current) => ({ ...current, phone: event.target.value }))
                              }
                            />
                          </div>
                          <div className="flex gap-2">
                            <SaveButton
                              type="button"
                              size="sm"
                              disabled={savingInventory && pendingAction !== `save-vendor:${advertiser.id}`}
                              pending={pendingAction === `save-vendor:${advertiser.id}`}
                              onClick={() => void saveVendor(advertiser.id)}
                            >
                              Save vendor
                            </SaveButton>
                            <Button type="button" size="sm" variant="ghost" onClick={() => setEditingVendorId(null)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'invoices' && (
        <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <Card className="h-fit border-0 shadow-sm ring-1 ring-border">
            <CardHeader>
              <div className="mb-2 w-fit rounded-xl bg-blue-50 p-2.5 text-blue-700">
                <BanknotesIcon className="h-5 w-5" />
              </div>
              <CardTitle>Draft an invoice</CardTitle>
              <CardDescription>Record the vendor fee and retailer revenue share.</CardDescription>
            </CardHeader>
            <CardContent>
            <form
              className="space-y-4"
              onSubmit={async (event) => {
                event.preventDefault();
                const formEl = event.currentTarget;
                const form = new FormData(formEl);
                setPendingAction('create-invoice');
                try {
                  await api('/api/dashboard/proximity/invoices', {
                    method: 'POST',
                    body: JSON.stringify({
                      campaign_id: form.get('campaign_id'),
                      amount: Number(form.get('amount')),
                      notes: form.get('notes') || null,
                    }),
                  });
                  formEl.reset();
                  toast.success('Invoice drafted');
                  await refresh();
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : 'Failed');
                } finally {
                  setPendingAction(null);
                }
              }}
            >
              <div className="space-y-2">
                <Label>Vendor campaign</Label>
                <select name="campaign_id" className={selectClassName} required>
                  <option value="">Select campaign</option>
                  {campaigns
                    .filter((campaign) => campaign.advertiser)
                    .map((campaign) => (
                      <option key={campaign.id} value={campaign.id}>
                        {campaign.name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Amount (KSh)</Label>
                <Input name="amount" type="number" min="1" step="0.01" placeholder="100,000" required />
              </div>
              <div className="space-y-2">
                <Label>Internal notes</Label>
                <Input name="notes" placeholder="PO number or payment terms" />
              </div>
              <SaveButton type="submit" className="w-full" pending={pendingAction === 'create-invoice'} pendingLabel="Saving">
                Create draft invoice
              </SaveButton>
            </form>
              <p className="mt-4 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
                Phase 1 records the 70/30 split. Collection and settlement remain manual.
              </p>
          </CardContent>
          </Card>

          <Card className="border-0 shadow-sm ring-1 ring-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Invoice register</CardTitle>
                  <CardDescription>Manual billing records for vendor-funded campaigns.</CardDescription>
                </div>
                <Badge variant="outline">{invoices.length} invoices</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <EmptyState
                  icon={BanknotesIcon}
                  title="No invoices yet"
                  description="Draft an invoice after a vendor campaign has been booked."
                />
              ) : (
                <div className="space-y-3">
                  {invoices.map((invoice) => {
                    const isEditing = editingInvoiceId === invoice.id;
                    return (
                    <div key={invoice.id} className="rounded-xl border p-4">
                      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                        <div>
                          <p className="font-medium">{invoice.campaign?.name || invoice.campaign_id}</p>
                          <p className="text-sm text-muted-foreground">{invoice.advertiser?.name}</p>
                          {invoice.notes && (
                            <p className="mt-1 text-xs text-muted-foreground">{invoice.notes}</p>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                          <p className="font-semibold">KSh {Number(invoice.amount).toLocaleString('en-KE')}</p>
                          <Badge variant="outline" className="capitalize">{invoice.status}</Badge>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingInvoiceId(invoice.id);
                              setInvoiceDraft({
                                amount: String(invoice.amount),
                                notes: invoice.notes || '',
                                status: invoice.status || 'draft',
                              });
                            }}
                          >
                            <PencilSquareIcon className="mr-1.5 h-4 w-4" />
                            Edit
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={() =>
                              setDeleteTarget({
                                type: 'invoice',
                                id: invoice.id,
                                name: invoice.campaign?.name || 'Invoice',
                              })
                            }
                          >
                            <TrashIcon className="mr-1.5 h-4 w-4" />
                            Delete
                          </Button>
                        </div>
                      </div>
                      {isEditing && (
                        <div className="mt-4 space-y-3 rounded-lg border bg-muted/20 p-3">
                          <div className="space-y-2">
                            <Label>Amount (KSh)</Label>
                            <Input
                              type="number"
                              min="1"
                              step="0.01"
                              value={invoiceDraft.amount}
                              onChange={(event) =>
                                setInvoiceDraft((current) => ({ ...current, amount: event.target.value }))
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Status</Label>
                            <select
                              className={selectClassName}
                              value={invoiceDraft.status}
                              onChange={(event) =>
                                setInvoiceDraft((current) => ({ ...current, status: event.target.value }))
                              }
                            >
                              <option value="draft">Draft</option>
                              <option value="issued">Issued</option>
                              <option value="paid">Paid</option>
                              <option value="void">Void</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <Label>Internal notes</Label>
                            <Input
                              value={invoiceDraft.notes}
                              onChange={(event) =>
                                setInvoiceDraft((current) => ({ ...current, notes: event.target.value }))
                              }
                            />
                          </div>
                          <div className="flex gap-2">
                            <SaveButton
                              type="button"
                              size="sm"
                              disabled={savingInventory && pendingAction !== `save-invoice:${invoice.id}`}
                              pending={pendingAction === `save-invoice:${invoice.id}`}
                              onClick={() => void saveInvoice(invoice.id)}
                            >
                              Save invoice
                            </SaveButton>
                            <Button type="button" size="sm" variant="ghost" onClick={() => setEditingInvoiceId(null)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'sdk' && (
        <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <Card className="h-fit border-0 shadow-sm ring-1 ring-border">
            <CardHeader>
              <div className="mb-2 w-fit rounded-xl bg-cyan-50 p-2.5 text-cyan-700">
                <KeyIcon className="h-5 w-5" />
              </div>
              <CardTitle>Issue an SDK key</CardTitle>
              <CardDescription>Keep shopper scanning and staff commissioning strictly separated.</CardDescription>
            </CardHeader>
            <CardContent>
            <form
              className="space-y-4"
              onSubmit={async (event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                setPendingAction('create-sdk');
                try {
                  const result = await api('/api/dashboard/proximity/sdk-apps', {
                    method: 'POST',
                    body: JSON.stringify({ name: form.get('name'), flavor: form.get('flavor') }),
                  });
                  setSdkKeyOnce(result.sdk_key);
                  toast.success(result.warning);
                  await refresh();
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : 'Failed');
                } finally {
                  setPendingAction(null);
                }
              }}
            >
              <div className="space-y-2">
                <Label>Application name</Label>
                <Input name="name" placeholder="Supermarket iOS app" required />
              </div>
              <div className="space-y-2">
                <Label>Key capability</Label>
                <select name="flavor" className={selectClassName}>
                  <option value="scan">Scan — consumer app</option>
                  <option value="commission">Commission — staff only</option>
                </select>
              </div>
              <SaveButton type="submit" className="w-full" pending={pendingAction === 'create-sdk'} pendingLabel="Saving">
                Issue key
              </SaveButton>
            </form>
              {sdkKeyOnce && (
                <div className="mt-5 rounded-xl border border-cyan-200 bg-cyan-50 p-4">
                  <p className="text-sm font-semibold text-cyan-950">SDK key — shown once</p>
                  <p className="mt-2 break-all rounded-lg bg-white/70 p-3 font-mono text-xs">{sdkKeyOnce}</p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="mt-3"
                    onClick={async () => {
                      await navigator.clipboard.writeText(sdkKeyOnce);
                      toast.success('SDK key copied');
                    }}
                  >
                    <ClipboardDocumentIcon className="mr-1.5 h-4 w-4" />
                    Copy key
                  </Button>
                </div>
              )}
              <div className="mt-5 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-900">
                <div className="flex items-center gap-2 font-semibold">
                  <ShieldCheckIcon className="h-5 w-5" />
                  Customer APK safety
                </div>
                <p className="mt-2 text-xs leading-5">
                  Never bundle a commission key or beacon configuration methods in a shopper application.
                </p>
              </div>
          </CardContent>
          </Card>

          <Card className="border-0 shadow-sm ring-1 ring-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Connected applications</CardTitle>
                  <CardDescription>Keys are displayed only when first issued.</CardDescription>
                </div>
                <Badge variant="outline">{sdkApps.length} apps</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {sdkApps.length === 0 ? (
                <EmptyState
                  icon={DevicePhoneMobileIcon}
                  title="No SDK applications"
                  description="Issue a scan key when the supermarket consumer app is ready for integration."
                />
              ) : (
                <div className="space-y-3">
                  {sdkApps.map((app) => {
                    const isEditing = editingSdkId === app.id;
                    return (
                    <div key={app.id} className="rounded-xl border p-4">
                      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                        <div className="flex items-center gap-3">
                          <span className="rounded-lg bg-cyan-50 p-2 text-cyan-700">
                            <DevicePhoneMobileIcon className="h-5 w-5" />
                          </span>
                          <div>
                            <p className="font-medium">{app.name}</p>
                            <p className="font-mono text-xs text-muted-foreground">{app.key_prefix}…</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant="outline"
                            className={app.flavor === 'scan'
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-amber-200 bg-amber-50 text-amber-700'}
                          >
                            {app.flavor}
                          </Badge>
                          {app.status === 'revoked' && (
                            <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">
                              revoked
                            </Badge>
                          )}
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingSdkId(app.id);
                              setSdkDraft({ name: app.name });
                            }}
                          >
                            <PencilSquareIcon className="mr-1.5 h-4 w-4" />
                            Edit
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={() =>
                              setDeleteTarget({
                                type: 'sdk',
                                id: app.id,
                                name: app.name,
                              })
                            }
                          >
                            <TrashIcon className="mr-1.5 h-4 w-4" />
                            Delete
                          </Button>
                        </div>
                      </div>
                      {isEditing && (
                        <div className="mt-4 space-y-3 rounded-lg border bg-muted/20 p-3">
                          <div className="space-y-2">
                            <Label>Application name</Label>
                            <Input
                              value={sdkDraft.name}
                              onChange={(event) => setSdkDraft({ name: event.target.value })}
                            />
                          </div>
                          <div className="flex gap-2">
                            <SaveButton
                              type="button"
                              size="sm"
                              disabled={savingInventory && pendingAction !== `save-sdk:${app.id}`}
                              pending={pendingAction === `save-sdk:${app.id}`}
                              onClick={() => void saveSdkApp(app.id)}
                            >
                              Save app
                            </SaveButton>
                            <Button type="button" size="sm" variant="ghost" onClick={() => setEditingSdkId(null)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTarget ? DELETE_COPY[deleteTarget.type].title : 'Delete item?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? DELETE_COPY[deleteTarget.type].description(deleteTarget.name) : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={savingInventory}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="relative overflow-hidden bg-red-600 hover:bg-red-700 disabled:opacity-100"
              disabled={savingInventory}
              onClick={(event) => {
                event.preventDefault();
                void confirmDelete();
              }}
            >
              {pendingAction === 'delete' ? (
                <span className="inline-flex items-center">
                  <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Deleting
                </span>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
