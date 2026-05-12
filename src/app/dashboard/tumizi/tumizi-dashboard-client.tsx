'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Loader2,
  AlertCircle,
  ChevronRight,
  Save,
  Filter,
  Download,
  Wallet,
  Hourglass,
  CalendarClock,
  FolderOpen,
  ArrowRight,
  FileText,
  Smartphone,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  buildTumiziGeneralInfoView,
  getWalletSnapshotFromMerchantData,
} from '@/lib/tumizi/merchant-general-info';
import {
  WITHDRAWAL_CHARGE_TIERS,
  getChargeForAmount,
  getMaxWithdrawable,
  getMinimumWithdrawalWithCharge,
} from '@/lib/tumizi/wallet-withdrawal-tiers';

/** Vertical nav items — inactive: plain muted text; active: card + primary accent (theme `--primary`). */
const TUMIZI_NAV_TRIGGER_CLASS = cn(
  'relative flex w-full items-center justify-between gap-3 rounded-xl border-l-4 border-transparent bg-transparent px-3 py-2.5 text-left text-sm font-medium text-muted-foreground shadow-none transition-all',
  'outline-none hover:text-foreground',
  'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
  '[&>svg]:opacity-0 [&>svg]:transition-opacity data-[state=active]:[&>svg]:opacity-100',
  'data-[state=active]:!border-l-[hsl(var(--primary))] data-[state=active]:!bg-card data-[state=active]:!text-[hsl(var(--primary))] data-[state=active]:!font-semibold data-[state=active]:shadow-sm',
);

const MERCHANT_DESCRIPTION_MAX = 255;

const MERCHANT_COUNTRY_DEFAULTS = [
  'Kenya',
  'Uganda',
  'Tanzania',
  'Rwanda',
  'Ethiopia',
  'South Africa',
  'Nigeria',
] as const;

const MERCHANT_STATUS_OPTIONS = ['active', 'inactive', 'suspended'] as const;

const MINIMUM_WITHDRAWAL_AMOUNT = getMinimumWithdrawalWithCharge();

interface TumiziDashboardClientProps {
  tenantName: string;
  isTumiziEnabled: boolean;
  embedded?: boolean;
}

interface RefundRow {
  id: string;
  status: string | null;
  amount: number;
  currency: string | null;
  externalReference: string | null;
  refundReference: string | null;
  orderId: string | null;
  orderNumber: string | null;
  originalPaymentReference: string | null;
  createdAt: string | null;
  updatedAt?: string | null;
}

const REFUND_SUCCESS_STATUSES = new Set(['completed', 'complete', 'success', 'succeeded', 'settled', 'paid']);
const REFUND_PENDING_STATUSES = new Set([
  'pending',
  'processing',
  'requested',
  'submitted',
  'in_progress',
  'queued',
]);

function formatRefundCurrency(amount: number, currencyCode: string): string {
  const code = currencyCode && currencyCode.length === 3 ? currencyCode.toUpperCase() : 'KES';
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${code}`;
  }
}

function escapeCsvCell(v: string): string {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

function normalizeRefundApiRow(r: Record<string, unknown>): RefundRow {
  return {
    id: String(r.id ?? ''),
    status: r.status != null ? String(r.status) : null,
    amount: Number(r.amount) || 0,
    currency: r.currency != null ? String(r.currency) : null,
    externalReference: r.externalReference != null ? String(r.externalReference) : null,
    refundReference: r.refundReference != null ? String(r.refundReference) : null,
    orderId: r.orderId != null ? String(r.orderId) : null,
    orderNumber: r.orderNumber != null ? String(r.orderNumber) : null,
    originalPaymentReference:
      r.originalPaymentReference != null ? String(r.originalPaymentReference) : null,
    createdAt: r.createdAt != null ? String(r.createdAt) : null,
    updatedAt: r.updatedAt != null ? String(r.updatedAt) : null,
  };
}

interface WithdrawalRow {
  id: string;
  amount: number;
  currency: string | null;
  status: string | null;
  externalReference: string | null;
  withdrawalReference: string | null;
  createdAt: string | null;
}

function toDisplay(v: unknown): string {
  if (v === null || v === undefined || v === '') return '-';
  if (typeof v === 'string') return v;
  return JSON.stringify(v);
}

function TumiziInfoField({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1.5 break-words text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function TumiziInfoSection({ title, children }: Readonly<{ title: string; children: ReactNode }>) {
  return (
    <div className="border-t border-border pt-6 first:border-t-0 first:pt-0">
      <h3 className="text-base font-semibold tracking-tight text-foreground">{title}</h3>
      <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </div>
  );
}

function RefundsStatCard({
  label,
  value,
  children,
}: Readonly<{ label: string; value: string; children: ReactNode }>) {
  return (
    <div className="flex gap-4 rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#355cad]/25 bg-white">
        {children}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 truncate text-lg font-bold text-[#101828]">{value}</p>
      </div>
    </div>
  );
}

function currencyFullLabel(code: string | null | undefined): string {
  const c = (code || 'KES').toUpperCase();
  if (c === 'KES') return 'Kenya Shillings';
  if (c === 'USD') return 'US Dollar';
  return c;
}

function WithdrawalStatusBadge({ status }: Readonly<{ status: string | null }>) {
  const raw = status || 'pending';
  const s = raw.toLowerCase();
  if (['completed', 'success', 'succeeded', 'paid', 'settled'].includes(s)) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-900">
        <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" aria-hidden />
        {raw}
      </span>
    );
  }
  if (['failed', 'rejected', 'cancelled', 'error'].includes(s)) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-red-900">
        <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" aria-hidden />
        {raw}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-900">
      <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" aria-hidden />
      {raw}
    </span>
  );
}

export default function TumiziDashboardClient({
  tenantName,
  isTumiziEnabled,
  embedded = false,
}: Readonly<TumiziDashboardClientProps>) {
  const [isLoadingMerchant, setIsLoadingMerchant] = useState(false);
  const [merchantData, setMerchantData] = useState<Record<string, any> | null>(null);
  const [merchantError, setMerchantError] = useState<string | null>(null);

  const [isSavingMerchant, setIsSavingMerchant] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    merchantName: '',
    merchantEmail: '',
    merchantPhone: '',
    merchantCountry: '',
    merchantDescription: '',
    merchantStatus: 'active',
    ownerName: '',
    ownerEmail: '',
    walletName: '',
    walletAccountNumber: '',
    walletCurrency: 'KES',
    status: 'active',
  });

  const [refundRows, setRefundRows] = useState<RefundRow[]>([]);
  const [isLoadingRefunds, setIsLoadingRefunds] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);
  const [refundFiltersOpen, setRefundFiltersOpen] = useState(false);
  const [refundSearch, setRefundSearch] = useState('');
  const [refundStatusFilter, setRefundStatusFilter] = useState<'all' | 'pending' | 'settled' | 'failed'>(
    'all',
  );
  const [isLoadingWallet, setIsLoadingWallet] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [walletData, setWalletData] = useState<Record<string, any> | null>(null);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawPhone, setWithdrawPhone] = useState('');
  const [withdrawNarration, setWithdrawNarration] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawMessage, setWithdrawMessage] = useState<string | null>(null);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [recentWithdrawals, setRecentWithdrawals] = useState<WithdrawalRow[]>([]);

  const generalInfo = useMemo(() => buildTumiziGeneralInfoView(merchantData), [merchantData]);

  const cachedWalletSnapshot = useMemo(
    () => getWalletSnapshotFromMerchantData(merchantData),
    [merchantData],
  );

  const withdrawalAvailableBalance = useMemo(() => {
    if (walletData && typeof walletData.availableBalance === 'number') {
      return walletData.availableBalance;
    }
    return cachedWalletSnapshot?.availableBalance ?? 0;
  }, [walletData, cachedWalletSnapshot]);

  const withdrawalWalletCurrency = useMemo(() => {
    return (
      (walletData?.wallet?.currency as string) || cachedWalletSnapshot?.currency || 'KES'
    );
  }, [walletData, cachedWalletSnapshot]);

  const withdrawalAccountNumber = useMemo(() => {
    return (
      (walletData?.wallet?.account_number as string) || cachedWalletSnapshot?.accountNumber || ''
    );
  }, [walletData, cachedWalletSnapshot]);

  const maxWithdrawableComputed = useMemo(() => {
    if (walletData && typeof walletData.maxWithdrawableAmount === 'number') {
      return {
        amount: Number(walletData.maxWithdrawableAmount) || 0,
        charge: Number(walletData.maxWithdrawableCharge) || 0,
      };
    }
    return getMaxWithdrawable(withdrawalAvailableBalance);
  }, [walletData, withdrawalAvailableBalance]);

  const currentWithdrawCharge = useMemo(() => {
    const amount = Number(withdrawAmount);
    if (!Number.isFinite(amount) || amount <= 0) return 0;
    return getChargeForAmount(amount);
  }, [withdrawAmount]);

  const withdrawAmountNum = Number(withdrawAmount);
  const maxWithdrawableAmount = maxWithdrawableComputed.amount;
  const amountExceedsMax =
    withdrawAmount.trim() !== '' &&
    Number.isFinite(withdrawAmountNum) &&
    maxWithdrawableAmount > 0 &&
    withdrawAmountNum > maxWithdrawableAmount;

  const merchantCountryChoices = useMemo(() => {
    const c = formData.merchantCountry.trim();
    const defaults: string[] = [...MERCHANT_COUNTRY_DEFAULTS];
    if (c && !defaults.includes(c)) return [c, ...defaults];
    return defaults;
  }, [formData.merchantCountry]);

  const filteredRefundRows = useMemo(() => {
    const q = refundSearch.trim().toLowerCase();
    const failedLike = ['failed', 'rejected', 'cancelled', 'error'];
    return refundRows.filter((r) => {
      const st = (r.status || '').toLowerCase();
      if (refundStatusFilter === 'pending') {
        if (REFUND_SUCCESS_STATUSES.has(st) || failedLike.includes(st)) return false;
      } else if (refundStatusFilter === 'settled') {
        if (!REFUND_SUCCESS_STATUSES.has(st)) return false;
      } else if (refundStatusFilter === 'failed') {
        if (!failedLike.includes(st)) return false;
      }
      if (!q) return true;
      const hay = [
        r.orderNumber,
        r.orderId,
        r.refundReference,
        r.originalPaymentReference,
        r.externalReference,
        r.id,
        r.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [refundRows, refundSearch, refundStatusFilter]);

  const refundSummary = useMemo(() => {
    const currency =
      refundRows.find((r) => r.currency)?.currency || generalInfo?.walletCurrency || 'KES';
    let totalRefunded = 0;
    let pending = 0;
    const processingHours: number[] = [];
    const failedLike = new Set(['failed', 'rejected', 'cancelled', 'error']);

    for (const r of refundRows) {
      const st = (r.status || '').toLowerCase();
      if (REFUND_SUCCESS_STATUSES.has(st)) {
        totalRefunded += Number(r.amount) || 0;
        if (r.updatedAt && r.createdAt) {
          const ms = new Date(r.updatedAt).getTime() - new Date(r.createdAt).getTime();
          if (Number.isFinite(ms) && ms >= 0) processingHours.push(ms / 36e5);
        }
      } else if (failedLike.has(st)) {
        continue;
      } else {
        pending += 1;
      }
    }

    let avgLabel = 'N/A';
    if (processingHours.length > 0) {
      const avg = processingHours.reduce((a, b) => a + b, 0) / processingHours.length;
      if (avg >= 48) avgLabel = `${(avg / 24).toFixed(1)}d`;
      else if (avg >= 1) avgLabel = `${avg.toFixed(1)}h`;
      else avgLabel = `${Math.max(1, Math.round(avg * 60))}m`;
    }

    return {
      totalRefunded,
      totalRefundedLabel: formatRefundCurrency(totalRefunded, currency),
      pending,
      avgLabel,
    };
  }, [refundRows, generalInfo?.walletCurrency]);

  const hydrateFormFromMerchant = (payload: Record<string, any>) => {
    const merchantRoot = (payload.merchant as any)?.data || payload.merchant || {};
    const walletRoot = (payload.wallet as any)?.data?.wallet || (payload.wallet as any)?.wallet || {};
    const merchantNode = merchantRoot.merchant || {};
    const ownerNode = merchantRoot.owner || {};
    const topStatus = merchantRoot.status || merchantNode.status || 'active';
    const rawStatus = String(merchantNode.status || topStatus || 'active').toLowerCase();
    const normalizedStatus = MERCHANT_STATUS_OPTIONS.includes(
      rawStatus as (typeof MERCHANT_STATUS_OPTIONS)[number],
    )
      ? rawStatus
      : 'active';

    setFormData({
      merchantName: merchantNode.name || '',
      merchantEmail: merchantNode.email || '',
      merchantPhone: merchantNode.phone || '',
      merchantCountry: (merchantNode.country as string)?.trim() || 'Kenya',
      merchantDescription: merchantNode.description || '',
      merchantStatus: normalizedStatus,
      ownerName: ownerNode.name || '',
      ownerEmail: ownerNode.email || '',
      walletName: walletRoot.name || '',
      walletAccountNumber: walletRoot.account_number || '',
      walletCurrency: walletRoot.currency || 'KES',
      status: normalizedStatus,
    });
  };

  const fetchMerchant = async () => {
    if (!isTumiziEnabled) return;
    setIsLoadingMerchant(true);
    setMerchantError(null);
    try {
      const response = await fetch('/api/tumizi/merchant');
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to load merchant');
      }
      setMerchantData(data.data);
      hydrateFormFromMerchant(data.data);
    } catch (error) {
      setMerchantError(error instanceof Error ? error.message : 'Failed to load merchant');
    } finally {
      setIsLoadingMerchant(false);
    }
  };

  const fetchRefunds = async () => {
    if (!isTumiziEnabled) return;
    setIsLoadingRefunds(true);
    setRefundError(null);
    try {
      const response = await fetch('/api/tumizi/refunds');
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to load refunds');
      }
      const raw = Array.isArray(data.data) ? data.data : [];
      setRefundRows(
        raw.map((row: unknown) =>
          normalizeRefundApiRow(row && typeof row === 'object' ? (row as Record<string, unknown>) : {}),
        ),
      );
    } catch (error) {
      setRefundError(error instanceof Error ? error.message : 'Failed to load refunds');
    } finally {
      setIsLoadingRefunds(false);
    }
  };

  const fetchWallet = async () => {
    if (!isTumiziEnabled) return;
    setIsLoadingWallet(true);
    setWalletError(null);
    try {
      const response = await fetch('/api/tumizi/wallet');
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to load wallet');
      }
      setWalletData(data.data);
      setRecentWithdrawals(Array.isArray(data.data?.recentWithdrawals) ? data.data.recentWithdrawals : []);
    } catch (error) {
      setWalletError(error instanceof Error ? error.message : 'Failed to load wallet');
    } finally {
      setIsLoadingWallet(false);
    }
  };

  useEffect(() => {
    void fetchMerchant();
    void fetchRefunds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTumiziEnabled]);

  useEffect(() => {
    if (!isTumiziEnabled || !merchantData) return;
    setWithdrawAmount((prev) => {
      if (prev.trim() !== '') return prev;
      const snap = getWalletSnapshotFromMerchantData(merchantData);
      if (!snap) return prev;
      const max = getMaxWithdrawable(snap.availableBalance).amount;
      return max > 0 ? String(max) : '';
    });
  }, [isTumiziEnabled, merchantData]);

  const handleWithdraw = async () => {
    setWithdrawMessage(null);
    setWithdrawError(null);
    setIsWithdrawing(true);
    try {
      const amount = Number(withdrawAmount);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error('Enter a valid withdrawal amount');
      }
      const maxAmount = maxWithdrawableComputed.amount;
      if (maxAmount > 0 && amount > maxAmount) {
        throw new Error(`Amount exceeds max withdrawable (${maxAmount})`);
      }
      if (amount < MINIMUM_WITHDRAWAL_AMOUNT) {
        throw new Error(`Minimum withdrawal is ${MINIMUM_WITHDRAWAL_AMOUNT}`);
      }
      if (!withdrawPhone.trim()) {
        throw new Error('Enter destination M-Pesa phone number');
      }

      const response = await fetch('/api/tumizi/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          phoneNumber: withdrawPhone.trim(),
          narration: withdrawNarration.trim() || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Withdrawal failed');
      }

      setWithdrawMessage('Withdrawal initiated successfully.');
      setWithdrawNarration('');
      await fetchWallet();
    } catch (error) {
      setWithdrawError(error instanceof Error ? error.message : 'Withdrawal failed');
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleSaveMerchant = async () => {
    setSaveMessage(null);
    setSaveError(null);
    setIsSavingMerchant(true);
    try {
      const payload = {
        merchant: {
          name: formData.merchantName || undefined,
          email: formData.merchantEmail || undefined,
          phone: formData.merchantPhone || undefined,
          country: formData.merchantCountry || undefined,
          description: formData.merchantDescription || undefined,
          status: formData.merchantStatus || undefined,
        },
        owner: {
          name: formData.ownerName || undefined,
          email: formData.ownerEmail || undefined,
        },
        wallet: {
          name: formData.walletName || undefined,
          account_number: formData.walletAccountNumber || undefined,
          currency: formData.walletCurrency || undefined,
        },
        status: formData.status || undefined,
      };

      const response = await fetch('/api/tumizi/merchant', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update merchant');
      }

      setSaveMessage('Merchant details updated successfully.');
      await fetchMerchant();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to update merchant');
    } finally {
      setIsSavingMerchant(false);
    }
  };

  const handleExportRefundsCsv = () => {
    if (filteredRefundRows.length === 0) return;
    const headers = ['Created', 'Order', 'Amount', 'Currency', 'Status', 'Refund Ref', 'Payment Ref'];
    const lines = [headers.join(',')];
    for (const r of filteredRefundRows) {
      lines.push(
        [
          escapeCsvCell(r.createdAt ? new Date(r.createdAt).toISOString() : ''),
          escapeCsvCell(String(r.orderNumber || r.orderId || '')),
          escapeCsvCell(String(r.amount)),
          escapeCsvCell(r.currency || ''),
          escapeCsvCell(r.status || ''),
          escapeCsvCell(r.refundReference || ''),
          escapeCsvCell(String(r.originalPaymentReference || r.externalReference || '')),
        ].join(','),
      );
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `refund-records-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDiscardMerchantChanges = () => {
    if (merchantData) {
      hydrateFormFromMerchant(merchantData);
    }
    setSaveMessage(null);
    setSaveError(null);
  };

  return (
    <div className="space-y-6">
      {!embedded && (
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tumizi</h1>
          <p className="mt-1 text-muted-foreground">
            Manage Tumizi merchant details and review refund history for {tenantName}.
          </p>
        </div>
      )}

      {!isTumiziEnabled && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Tumizi is disabled</AlertTitle>
          <AlertDescription>
            Enable Tumizi under Settings &gt; Payments (or Tumizi) to activate the General Information, Edit
            Merchant, Refunds, and M-Pesa withdrawal sections.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="general" orientation="vertical" className="w-full">
        {/*
          Radix renders TabsList + every TabsContent as siblings. A grid on Tabs would place
          each hidden panel in its own row — content ends up below the nav. Wrap nav + panels
          in a two-column grid and center the main column.
        */}
        <div className="flex w-full flex-col gap-6 md:grid md:grid-cols-[minmax(220px,280px)_minmax(0,1fr)] md:items-start md:gap-8">
          <aside className="w-full shrink-0 md:sticky md:top-6 md:self-start">
            <TabsList className="h-auto w-full flex-col items-stretch gap-1.5 rounded-xl bg-transparent p-0 shadow-none">
          <TabsTrigger value="general" disabled={!isTumiziEnabled} className={TUMIZI_NAV_TRIGGER_CLASS}>
            <span className="min-w-0 flex-1">General Information</span>
            <ChevronRight className="h-4 w-4 shrink-0 text-[hsl(var(--primary))]" strokeWidth={2} aria-hidden />
          </TabsTrigger>
          <TabsTrigger value="edit" disabled={!isTumiziEnabled} className={TUMIZI_NAV_TRIGGER_CLASS}>
            <span className="min-w-0 flex-1">Edit Merchant</span>
            <ChevronRight className="h-4 w-4 shrink-0 text-[hsl(var(--primary))]" strokeWidth={2} aria-hidden />
          </TabsTrigger>
          <TabsTrigger value="refunds" disabled={!isTumiziEnabled} className={TUMIZI_NAV_TRIGGER_CLASS}>
            <span className="min-w-0 flex-1">Refunds</span>
            <ChevronRight className="h-4 w-4 shrink-0 text-[hsl(var(--primary))]" strokeWidth={2} aria-hidden />
          </TabsTrigger>
          <TabsTrigger value="withdrawal" disabled={!isTumiziEnabled} className={TUMIZI_NAV_TRIGGER_CLASS}>
            <span className="min-w-0 flex-1">M-Pesa withdrawal</span>
            <ChevronRight className="h-4 w-4 shrink-0 text-[hsl(var(--primary))]" strokeWidth={2} aria-hidden />
          </TabsTrigger>
            </TabsList>
          </aside>

          <div className="flex min-h-0 min-w-0 w-full flex-1 justify-center md:justify-center">
            <div className="w-full max-w-3xl">
        <TabsContent value="general" className="!mt-0 w-full focus-visible:outline-none">
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 border-b pb-4">
              <div className="space-y-1.5">
                <CardTitle>Merchant account overview</CardTitle>
                <CardDescription>Live details from Tumizi Get Merchant API.</CardDescription>
              </div>
              {generalInfo && (
                <Badge
                  variant="outline"
                  className={cn(
                    'shrink-0 uppercase tracking-wide',
                    generalInfo.status.toLowerCase() === 'active' &&
                      'border-emerald-200 bg-emerald-50 text-emerald-900',
                  )}
                >
                  {generalInfo.status}
                </Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-2 pt-6">
              {isLoadingMerchant && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading merchant details...
                </div>
              )}
              {merchantError && <p className="text-sm text-destructive">{merchantError}</p>}
              {!isLoadingMerchant && !merchantError && generalInfo && (
                <div className="space-y-8">
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    <TumiziInfoField label="Organisation / merchant name" value={generalInfo.organisationName} />
                    <TumiziInfoField
                      label="Primary contact"
                      value={
                        generalInfo.ownerEmail !== '-' ? generalInfo.ownerEmail : generalInfo.merchantContactEmail
                      }
                    />
                    <TumiziInfoField label="Account status" value={generalInfo.status} />
                    <TumiziInfoField label="Merchant external ID" value={generalInfo.merchantExternalId} />
                    <TumiziInfoField label="Region" value={generalInfo.merchantCountry} />
                    <TumiziInfoField label="Available balance" value={generalInfo.availableBalanceLabel} />
                  </div>

                  <TumiziInfoSection title="Merchant information">
                    <TumiziInfoField label="Merchant ID" value={generalInfo.merchantId} />
                    <TumiziInfoField label="Merchant external ID" value={generalInfo.merchantExternalId} />
                    <TumiziInfoField label="Status" value={generalInfo.status} />
                  </TumiziInfoSection>

                  <TumiziInfoSection title="Organisation">
                    <TumiziInfoField label="Organisation ID" value={generalInfo.organisationId} />
                    <TumiziInfoField label="Organisation name" value={generalInfo.organisationName} />
                    <TumiziInfoField label="Organisation domain" value={generalInfo.organisationDomain} />
                  </TumiziInfoSection>

                  <TumiziInfoSection title="Wallet">
                    <TumiziInfoField label="Wallet ID" value={generalInfo.walletId} />
                    <TumiziInfoField label="Wallet name" value={generalInfo.walletName} />
                    <TumiziInfoField label="Account number" value={generalInfo.walletAccountNumber} />
                    <TumiziInfoField label="Currency" value={generalInfo.walletCurrency} />
                    <TumiziInfoField label="Available balance" value={generalInfo.availableBalanceLabel} />
                  </TumiziInfoSection>

                  <TumiziInfoSection title="Merchant profile">
                    <TumiziInfoField label="Merchant name" value={generalInfo.merchantContactName} />
                    <TumiziInfoField label="Merchant email" value={generalInfo.merchantContactEmail} />
                    <TumiziInfoField label="Merchant phone" value={generalInfo.merchantContactPhone} />
                    <TumiziInfoField label="Country" value={generalInfo.merchantCountry} />
                    <TumiziInfoField label="Description" value={generalInfo.merchantDescription} />
                  </TumiziInfoSection>

                  <TumiziInfoSection title="Owner">
                    <TumiziInfoField label="Owner name" value={generalInfo.ownerName} />
                    <TumiziInfoField label="Owner email" value={generalInfo.ownerEmail} />
                  </TumiziInfoSection>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="edit" className="!mt-0 w-full focus-visible:outline-none">
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-[#101828]">Edit Merchant</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Update profile and financial configuration for {tenantName}.
              </p>
            </div>

            <Card className="rounded-2xl border border-border/80 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-[#101828]">Merchant information</CardTitle>
                <CardDescription>Core identification details for the merchant entity.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#101828]">Merchant name</Label>
                    <Input
                      value={formData.merchantName}
                      onChange={(e) => setFormData((prev) => ({ ...prev, merchantName: e.target.value }))}
                      className="h-11 rounded-xl border-border bg-muted/40"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#101828]">Email address</Label>
                    <Input
                      type="email"
                      value={formData.merchantEmail}
                      onChange={(e) => setFormData((prev) => ({ ...prev, merchantEmail: e.target.value }))}
                      className="h-11 rounded-xl border-border bg-muted/40"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#101828]">Phone number</Label>
                    <Input
                      value={formData.merchantPhone}
                      onChange={(e) => setFormData((prev) => ({ ...prev, merchantPhone: e.target.value }))}
                      placeholder="+254 700 000 000"
                      className="h-11 rounded-xl border-border bg-muted/40"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#101828]">Country</Label>
                    <Select
                      value={
                        formData.merchantCountry.trim() &&
                        merchantCountryChoices.includes(formData.merchantCountry)
                          ? formData.merchantCountry
                          : merchantCountryChoices[0]!
                      }
                      onValueChange={(v) => setFormData((prev) => ({ ...prev, merchantCountry: v }))}
                    >
                      <SelectTrigger className="h-11 rounded-xl border-border bg-muted/40">
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        {merchantCountryChoices.map((country) => (
                          <SelectItem key={country} value={country}>
                            {country}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-border/80 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-[#101828]">Ownership</CardTitle>
                <CardDescription>Stakeholder contact details and accountability.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#101828]">Owner name</Label>
                    <Input
                      value={formData.ownerName}
                      onChange={(e) => setFormData((prev) => ({ ...prev, ownerName: e.target.value }))}
                      className="h-11 rounded-xl border-border bg-muted/40"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#101828]">Owner email</Label>
                    <Input
                      type="email"
                      value={formData.ownerEmail}
                      onChange={(e) => setFormData((prev) => ({ ...prev, ownerEmail: e.target.value }))}
                      className="h-11 rounded-xl border-border bg-muted/40"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-border/80 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-[#101828]">Wallet details</CardTitle>
                <CardDescription>Financial routing and transactional status.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#101828]">Wallet name</Label>
                    <Input
                      value={formData.walletName}
                      onChange={(e) => setFormData((prev) => ({ ...prev, walletName: e.target.value }))}
                      className="h-11 rounded-xl border-border bg-muted/40"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#101828]">Wallet account number</Label>
                    <Input
                      value={formData.walletAccountNumber}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, walletAccountNumber: e.target.value }))
                      }
                      className="h-11 rounded-xl border-border bg-muted/40 font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#101828]">Wallet currency</Label>
                    <div className="flex min-h-11 items-center">
                      <Badge
                        variant="secondary"
                        className="rounded-lg border border-primary/20 bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary"
                      >
                        {formData.walletCurrency || 'KES'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Default settlement currency cannot be changed while the wallet is active.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#101828]">Merchant status</Label>
                    <Select
                      value={(() => {
                        const s = formData.merchantStatus.toLowerCase();
                        return MERCHANT_STATUS_OPTIONS.includes(s as (typeof MERCHANT_STATUS_OPTIONS)[number])
                          ? s
                          : 'active';
                      })()}
                      onValueChange={(v) =>
                        setFormData((prev) => ({ ...prev, merchantStatus: v, status: v }))
                      }
                    >
                      <SelectTrigger className="h-11 rounded-xl border-border bg-muted/40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MERCHANT_STATUS_OPTIONS.map((s) => (
                          <SelectItem key={s} value={s} className="capitalize">
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-border/80 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-[#101828]">Merchant description</CardTitle>
                <CardDescription>
                  Public-facing profile summary used for directory and receipts.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Textarea
                    rows={5}
                    maxLength={MERCHANT_DESCRIPTION_MAX}
                    value={formData.merchantDescription}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        merchantDescription: e.target.value.slice(0, MERCHANT_DESCRIPTION_MAX),
                      }))
                    }
                    className="min-h-[140px] resize-y rounded-xl border-border bg-muted/40"
                  />
                  <p className="text-right text-xs text-muted-foreground">
                    Character count: {formData.merchantDescription.length}/{MERCHANT_DESCRIPTION_MAX}
                  </p>
                </div>
              </CardContent>
            </Card>

            {saveMessage && <p className="text-sm font-medium text-emerald-700">{saveMessage}</p>}
            {saveError && <p className="text-sm text-destructive">{saveError}</p>}

            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border pt-6">
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-xl px-5"
                onClick={handleDiscardMerchantChanges}
                disabled={isSavingMerchant}
              >
                Discard changes
              </Button>
              <Button
                type="button"
                className="h-11 rounded-xl bg-[#355cad] px-5 font-semibold text-white hover:bg-[#2d4e96]"
                onClick={() => void handleSaveMerchant()}
                disabled={isSavingMerchant || !isTumiziEnabled}
              >
                {isSavingMerchant ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" strokeWidth={2} />
                )}
                Save merchant changes
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="refunds" className="!mt-0 w-full focus-visible:outline-none">
          <div className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-[#101828]">Refund records</h2>
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                  Detailed overview of all customer refund requests, transaction references, and settlement
                  statuses.
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-xl border-[#355cad]/40 font-semibold text-[#355cad] hover:bg-[#355cad]/5"
                  onClick={() => setRefundFiltersOpen((o) => !o)}
                >
                  <Filter className="mr-2 h-4 w-4" strokeWidth={2} aria-hidden />
                  Filter
                </Button>
                <Button
                  type="button"
                  className="h-10 rounded-xl bg-[#355cad] px-4 font-semibold text-white hover:bg-[#2d4e96]"
                  onClick={handleExportRefundsCsv}
                  disabled={filteredRefundRows.length === 0 || isLoadingRefunds}
                >
                  <Download className="mr-2 h-4 w-4" strokeWidth={2} aria-hidden />
                  Export CSV
                </Button>
              </div>
            </div>

            {refundFiltersOpen && (
              <Card className="rounded-2xl border border-border/80 shadow-sm">
                <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#101828]">Search</Label>
                    <Input
                      value={refundSearch}
                      onChange={(e) => setRefundSearch(e.target.value)}
                      placeholder="Order, reference, status…"
                      className="h-10 rounded-xl border-border bg-muted/40"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#101828]">Status</Label>
                    <Select
                      value={refundStatusFilter}
                      onValueChange={(v) =>
                        setRefundStatusFilter(v as 'all' | 'pending' | 'settled' | 'failed')
                      }
                    >
                      <SelectTrigger className="h-10 rounded-xl border-border bg-muted/40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        <SelectItem value="pending">Pending / in progress</SelectItem>
                        <SelectItem value="settled">Settled / paid</SelectItem>
                        <SelectItem value="failed">Failed / cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="rounded-2xl border border-border/80 shadow-sm">
              <CardContent className="p-0">
                {isLoadingRefunds && (
                  <div className="flex items-center gap-2 px-6 py-12 text-sm text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Loading refunds…
                  </div>
                )}
                {refundError && (
                  <p className="px-6 py-8 text-sm text-destructive">{refundError}</p>
                )}
                {!isLoadingRefunds && !refundError && filteredRefundRows.length === 0 && (
                  <div className="flex flex-col items-center px-6 py-14 text-center">
                    <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-b from-primary/15 to-primary/5 ring-1 ring-primary/20">
                      <FolderOpen
                        className="h-11 w-11 text-[#355cad] opacity-90"
                        strokeWidth={1.25}
                        aria-hidden
                      />
                    </div>
                    <h3 className="text-lg font-bold text-[#101828]">
                      {refundRows.length === 0
                        ? 'No refund records found'
                        : 'No refunds match your filters'}
                    </h3>
                    <p className="mt-2 max-w-md text-sm text-muted-foreground">
                      {refundRows.length === 0
                        ? "It looks like there haven't been any refunds processed yet. Once a refund is initiated through checkout or the merchant tools, it will appear here."
                        : 'Try clearing search or changing the status filter to see more records.'}
                    </p>
                    <Link
                      href="/tumizi"
                      className="mt-6 text-sm font-semibold text-[#355cad] underline-offset-4 hover:underline"
                    >
                      Learn about refunds
                    </Link>
                  </div>
                )}
                {!isLoadingRefunds && !refundError && filteredRefundRows.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b bg-muted/40">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold text-[#101828]">Created</th>
                          <th className="px-4 py-3 text-left font-semibold text-[#101828]">Order</th>
                          <th className="px-4 py-3 text-left font-semibold text-[#101828]">Amount</th>
                          <th className="px-4 py-3 text-left font-semibold text-[#101828]">Status</th>
                          <th className="px-4 py-3 text-left font-semibold text-[#101828]">Refund ref</th>
                          <th className="px-4 py-3 text-left font-semibold text-[#101828]">Payment ref</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRefundRows.map((row) => (
                          <tr key={row.id} className="border-t border-border/80 hover:bg-muted/20">
                            <td className="px-4 py-3 text-muted-foreground">
                              {row.createdAt ? new Date(row.createdAt).toLocaleString() : '-'}
                            </td>
                            <td className="px-4 py-3 font-medium text-[#101828]">
                              {row.orderNumber || row.orderId || '-'}
                            </td>
                            <td className="px-4 py-3 font-medium text-[#101828]">
                              {row.amount} {row.currency || ''}
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="outline" className="font-normal capitalize">
                                {row.status || 'pending'}
                              </Badge>
                            </td>
                            <td className="max-w-[140px] truncate px-4 py-3 font-mono text-xs">
                              {row.refundReference || '-'}
                            </td>
                            <td className="max-w-[160px] truncate px-4 py-3 font-mono text-xs">
                              {row.originalPaymentReference || row.externalReference || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-3">
              <RefundsStatCard label="Total refunded" value={refundSummary.totalRefundedLabel}>
                <Wallet className="h-5 w-5 text-[#355cad]" strokeWidth={2} aria-hidden />
              </RefundsStatCard>
              <RefundsStatCard
                label="Pending processing"
                value={String(refundSummary.pending)}
              >
                <Hourglass className="h-5 w-5 text-[#355cad]" strokeWidth={2} aria-hidden />
              </RefundsStatCard>
              <RefundsStatCard label="Average time" value={refundSummary.avgLabel}>
                <CalendarClock className="h-5 w-5 text-[#355cad]" strokeWidth={2} aria-hidden />
              </RefundsStatCard>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="withdrawal" className="!mt-0 w-full focus-visible:outline-none">
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-[#101828]">M-Pesa withdrawal</h2>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Move funds from your Tumizi wallet to an M-Pesa number. Charges apply by amount tier and are
                deducted automatically from the withdrawal.
              </p>
            </div>

            {isLoadingMerchant && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading merchant…
              </div>
            )}
            {merchantError && <p className="text-sm text-destructive">{merchantError}</p>}

            {!isLoadingMerchant && !merchantError && !merchantData && (
              <p className="text-sm text-muted-foreground">
                Merchant details are not available. Enable Tumizi and ensure your merchant profile is set up.
              </p>
            )}

            {!isLoadingMerchant && merchantData && (() => {
              const wCur = withdrawalWalletCurrency;
              const accountNo = toDisplay(withdrawalAccountNumber);
              const avail = withdrawalAvailableBalance;
              const maxW = maxWithdrawableComputed.amount;
              const estFeeAtMax = maxWithdrawableComputed.charge;
              return (
                <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_340px]">
                  <div className="space-y-6">
                    {walletError && <p className="text-sm text-destructive">{walletError}</p>}
                    <div className="rounded-2xl border-2 border-[#355cad]/35 bg-card p-6 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Wallet account number
                      </p>
                      <p className="mt-1 font-mono text-2xl font-bold tracking-tight text-[#355cad]">
                        {accountNo}
                      </p>
                      <p className="mt-6 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Available balance
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <p className="text-2xl font-bold text-[#101828]">
                          {formatRefundCurrency(avail, wCur)}
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 shrink-0 rounded-lg border-border"
                          onClick={() => void fetchWallet()}
                          disabled={!isTumiziEnabled || isLoadingWallet}
                          aria-label="Refresh wallet balance from Tumizi"
                        >
                          <RefreshCw
                            className={cn('h-4 w-4', isLoadingWallet && 'animate-spin')}
                            aria-hidden
                          />
                        </Button>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Balance reflects your merchant profile until you refresh for the latest wallet data.
                      </p>
                      <div className="mt-8 flex flex-col gap-4 border-t border-border/80 pt-6 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Currency
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <Badge
                              variant="secondary"
                              className="rounded-md border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary"
                            >
                              {wCur}
                            </Badge>
                            <span className="text-sm text-muted-foreground">{currencyFullLabel(wCur)}</span>
                          </div>
                        </div>
                        <div className="rounded-xl bg-muted/50 px-4 py-3 sm:text-right">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Max withdrawable
                          </p>
                          <p className="mt-1 text-lg font-bold text-[#355cad]">
                            {formatRefundCurrency(maxW, wCur)}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Est. fee at max: {formatRefundCurrency(estFeeAtMax, wCur)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
                      <div className="mb-6 flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#355cad] text-white">
                          <ArrowRight className="h-5 w-5" strokeWidth={2} aria-hidden />
                        </div>
                        <h3 className="text-lg font-bold text-[#101828]">Initiate withdrawal</h3>
                      </div>
                      <div className="grid gap-5 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Withdrawal amount
                          </Label>
                          <Input
                            type="number"
                            min={MINIMUM_WITHDRAWAL_AMOUNT}
                            max={maxWithdrawableAmount > 0 ? maxWithdrawableAmount : undefined}
                            value={withdrawAmount}
                            onChange={(e) => setWithdrawAmount(e.target.value)}
                            placeholder={`${wCur} 0.00`}
                            className="h-11 rounded-xl border-border bg-muted/40"
                          />
                          {amountExceedsMax && (
                            <p className="text-xs text-destructive">
                              Amount cannot exceed max withdrawable (
                              {formatRefundCurrency(maxWithdrawableAmount, wCur)}).
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Minimum withdrawal:{' '}
                            {formatRefundCurrency(MINIMUM_WITHDRAWAL_AMOUNT, wCur)} · Fee for this amount:{' '}
                            {formatRefundCurrency(currentWithdrawCharge, wCur)}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            M-Pesa phone number
                          </Label>
                          <div className="relative">
                            <Smartphone
                              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                              aria-hidden
                            />
                            <Input
                              value={withdrawPhone}
                              onChange={(e) => setWithdrawPhone(e.target.value)}
                              placeholder="2547XXXXXXXX"
                              className="h-11 rounded-xl border-border bg-muted/40 pl-10"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="mt-5 space-y-2">
                        <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Narration (optional)
                        </Label>
                        <Textarea
                          rows={3}
                          value={withdrawNarration}
                          onChange={(e) => setWithdrawNarration(e.target.value)}
                          placeholder="Enter reason or reference for this withdrawal…"
                          className="min-h-[100px] resize-y rounded-xl border-border bg-muted/40"
                        />
                      </div>
                      {withdrawMessage && (
                        <p className="mt-4 text-sm font-medium text-emerald-700">{withdrawMessage}</p>
                      )}
                      {withdrawError && (
                        <p className="mt-4 text-sm text-destructive">{withdrawError}</p>
                      )}
                      <Button
                        type="button"
                        className="mt-6 h-12 w-full rounded-xl bg-[#355cad] text-base font-semibold text-white hover:bg-[#2d4e96] md:w-auto md:min-w-[220px]"
                        onClick={() => void handleWithdraw()}
                        disabled={isWithdrawing || !isTumiziEnabled || amountExceedsMax}
                      >
                        {isWithdrawing ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Processing…
                          </>
                        ) : (
                          <>
                            Confirm withdrawal
                            <ArrowRight className="ml-2 h-5 w-5" strokeWidth={2} aria-hidden />
                          </>
                        )}
                      </Button>
                    </div>

                    <div className="rounded-2xl border border-border/80 bg-card shadow-sm">
                      <div className="flex flex-col gap-2 border-b border-border/80 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <h3 className="text-lg font-bold text-[#101828]">Recent activity</h3>
                        <Link
                          href="/dashboard/orders"
                          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#355cad] hover:underline"
                        >
                          View all transaction history
                          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                        </Link>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/40">
                            <tr>
                              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                Created
                              </th>
                              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                Amount
                              </th>
                              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                Status
                              </th>
                              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                Withdraw ref
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {!walletData ? (
                              <tr>
                                <td className="px-4 py-10 text-center text-muted-foreground" colSpan={4}>
                                  Use the refresh control next to your balance to load recent withdrawal activity from
                                  Tumizi.
                                </td>
                              </tr>
                            ) : recentWithdrawals.length === 0 ? (
                              <tr>
                                <td className="px-4 py-10 text-center text-muted-foreground" colSpan={4}>
                                  No withdrawals yet.
                                </td>
                              </tr>
                            ) : (
                              recentWithdrawals.slice(0, 8).map((row) => (
                                <tr key={row.id} className="border-t border-border/80 hover:bg-muted/15">
                                  <td className="px-4 py-3 text-muted-foreground">
                                    {row.createdAt
                                      ? new Date(row.createdAt).toLocaleDateString(undefined, {
                                          year: 'numeric',
                                          month: 'short',
                                          day: 'numeric',
                                        })
                                      : '-'}
                                  </td>
                                  <td className="px-4 py-3 font-semibold text-[#355cad]">
                                    {formatRefundCurrency(Number(row.amount) || 0, row.currency || wCur)}
                                  </td>
                                  <td className="px-4 py-3">
                                    <WithdrawalStatusBadge status={row.status} />
                                  </td>
                                  <td className="max-w-[120px] truncate px-4 py-3 font-mono text-xs text-[#101828]">
                                    {row.withdrawalReference || '-'}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="overflow-hidden rounded-2xl border border-border/80 shadow-sm">
                      <div className="flex items-start gap-3 bg-[#355cad] px-4 py-4 text-white">
                        <FileText className="mt-0.5 h-5 w-5 shrink-0 opacity-95" strokeWidth={2} aria-hidden />
                        <div>
                          <p className="font-bold leading-tight">Withdrawal charge tiers</p>
                          <p className="mt-1 text-xs text-white/85">
                            Fees are deducted automatically from each withdrawal based on the amount band.
                          </p>
                        </div>
                      </div>
                      <div className="overflow-x-auto bg-card">
                        <table className="w-full text-sm">
                          <thead className="border-b bg-muted/30">
                            <tr>
                              <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                Range ({wCur})
                              </th>
                              <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                Fee
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {WITHDRAWAL_CHARGE_TIERS.map((row) => (
                              <tr key={`${row.min}-${row.max}`} className="border-t border-border/60">
                                <td className="px-4 py-2.5 text-[#101828]">
                                  {row.min.toLocaleString()} — {row.max.toLocaleString()}
                                </td>
                                <td className="px-4 py-2.5">
                                  <Badge
                                    variant="secondary"
                                    className="rounded-md border border-[#355cad]/20 bg-[#355cad]/10 font-mono text-xs font-semibold text-[#355cad]"
                                  >
                                    {formatRefundCurrency(row.charge, wCur)}
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-border/60 bg-muted/40 p-5">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-[#355cad]">
                        Important note
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        M-Pesa payouts are usually credited within a few minutes. Always double-check the destination
                        phone number — incorrect numbers may delay or fail settlement and may not be reversible.
                      </p>
                    </div>

                    <div className="rounded-2xl border border-border/60 bg-muted/40 p-5">
                      <div className="flex gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                          <ShieldCheck className="h-5 w-5" strokeWidth={2} aria-hidden />
                        </div>
                        <div>
                          <p className="font-bold text-[#101828]">Encrypted transfers</p>
                          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                            Withdrawal requests are sent over TLS. High-value activity may require additional
                            verification from Tumizi or your bank partner.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </TabsContent>
            </div>
          </div>
        </div>
      </Tabs>
    </div>
  );
}
