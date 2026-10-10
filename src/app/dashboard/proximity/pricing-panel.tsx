'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { BanknotesIcon, BuildingStorefrontIcon, CalendarDaysIcon, TagIcon } from '@heroicons/react/24/outline';
import { SaveButton } from './save-button';
import { blendedDayFactor, defaultDayMultipliers } from '@/lib/proximity/pricing';

type BranchRate = {
  id: string;
  name: string;
  status: string;
  price_tier: 'small' | 'large';
  rate_multiplier: string;
};

type SectionRate = {
  id: string;
  name: string;
  kind: string;
  status: string;
  location_id: string;
  location_name: string;
  weekly_rate: string;
};

type KindRate = { kind: string; weekly_rate: string };
type WeekIndex = { label: string; starts_on: string; ends_on: string; multiplier: string };

const selectClassName =
  'h-10 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-sm outline-none focus:ring-2 focus:ring-ring';
const SECTION_PAGE_SIZE = 10;
const DAY_FIELDS = [
  { index: 1, label: 'Monday' },
  { index: 2, label: 'Tuesday' },
  { index: 3, label: 'Wednesday' },
  { index: 4, label: 'Thursday' },
  { index: 5, label: 'Friday' },
  { index: 6, label: 'Saturday' },
  { index: 0, label: 'Sunday' },
];

function dayInputs(weekend: string): string[] {
  return defaultDayMultipliers(Number(weekend) || 1.4).map(String);
}

function kes(value: number): string {
  return `KSh ${value.toLocaleString('en-KE', { maximumFractionDigits: 2 })}`;
}

function positiveAmount(value: string): number | null {
  if (value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function moneyInput(value: number | null | undefined): string {
  return value == null ? '' : String(value);
}

export function PricingPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [defaultRate, setDefaultRate] = useState('10000');
  const [dailyRate, setDailyRate] = useState('2000');
  const [weekendMultiplier, setWeekendMultiplier] = useState('1.4');
  const [dayMultipliers, setDayMultipliers] = useState<string[]>(() => dayInputs('1.4'));
  const [daysOpen, setDaysOpen] = useState(false);
  const [smallMultiplier, setSmallMultiplier] = useState('1');
  const [largeMultiplier, setLargeMultiplier] = useState('2');
  const [kindRates, setKindRates] = useState<KindRate[]>([]);
  const [newKind, setNewKind] = useState('');
  const [branches, setBranches] = useState<BranchRate[]>([]);
  const [sections, setSections] = useState<SectionRate[]>([]);
  const [weekIndexes, setWeekIndexes] = useState<WeekIndex[]>([]);
  const [sectionFilter, setSectionFilter] = useState('');
  const [sectionPage, setSectionPage] = useState(1);

  useEffect(() => {
    void fetch('/api/dashboard/proximity/pricing')
      .then(async (response) => {
        const json = await response.json();
        if (!response.ok) throw new Error(json.error || 'Failed to load pricing');
        const data = json.data;
        setDefaultRate(moneyInput(data.default_weekly_rate) || '10000');
        setDailyRate(moneyInput(data.default_daily_rate) || '2000');
        const weekend = String(data.weekend_multiplier ?? 1.4);
        setWeekendMultiplier(weekend);
        setDayMultipliers(
          Array.isArray(data.day_multipliers) && data.day_multipliers.length === 7
            ? data.day_multipliers.map(String)
            : dayInputs(weekend)
        );
        setSmallMultiplier(String(data.small_multiplier ?? 1));
        setLargeMultiplier(String(data.large_multiplier ?? 2));
        const kinds = new Map<string, string>(
          (data.section_rates || []).map((rate: { kind: string; weekly_rate: number }) => [rate.kind, String(rate.weekly_rate)])
        );
        for (const section of data.sections || []) {
          if (!kinds.has(section.kind)) kinds.set(section.kind, '');
        }
        setKindRates([...kinds.entries()].map(([kind, weekly_rate]) => ({ kind, weekly_rate })));
        setBranches(
          (data.branches || []).map((branch: BranchRate & { rate_multiplier: number | null }) => ({
            id: branch.id,
            name: branch.name,
            status: branch.status,
            price_tier: branch.price_tier === 'large' ? 'large' : 'small',
            rate_multiplier: moneyInput(branch.rate_multiplier),
          }))
        );
        setSections(
          (data.sections || []).map((section: SectionRate & { weekly_rate: number | null }) => ({
            ...section,
            weekly_rate: moneyInput(section.weekly_rate),
          }))
        );
        setWeekIndexes(
          (data.week_indexes || []).map((index: WeekIndex & { multiplier: number }) => ({
            label: index.label,
            starts_on: index.starts_on,
            ends_on: index.ends_on,
            multiplier: String(index.multiplier),
          }))
        );
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : 'Failed to load pricing');
      })
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    const parsedDefault = defaultRate.trim() === '' ? null : Number(defaultRate);
    const parsedDaily = dailyRate.trim() === '' ? null : Number(dailyRate);
    const parsedWeekend = Number(weekendMultiplier);
    const parsedSmall = Number(smallMultiplier);
    const parsedLarge = Number(largeMultiplier);
    if (parsedDefault != null && (!Number.isFinite(parsedDefault) || parsedDefault < 0)) {
      toast.error('Default section rate must be a positive amount');
      return;
    }
    if (parsedDaily != null && (!Number.isFinite(parsedDaily) || parsedDaily < 0)) {
      toast.error('Default daily section rate must be a positive amount');
      return;
    }
    if (!(parsedWeekend > 0) || parsedWeekend > 10) {
      toast.error('Weekend multiplier must be between 0 and 10');
      return;
    }
    const parsedDays = dayMultipliers.map(Number);
    if (parsedDays.length !== 7 || parsedDays.some((value) => !(value > 0) || value > 10)) {
      toast.error('Each day multiplier must be between 0 and 10');
      return;
    }
    if (!(parsedSmall > 0) || !(parsedLarge > 0)) {
      toast.error('Branch multipliers must be greater than zero');
      return;
    }

    const sectionRates = kindRates
      .filter((rate) => rate.weekly_rate.trim() !== '')
      .map((rate) => ({ kind: rate.kind, weekly_rate: Number(rate.weekly_rate) }));
    if (sectionRates.some((rate) => !Number.isFinite(rate.weekly_rate) || rate.weekly_rate < 0)) {
      toast.error('Each product section rate must be a positive amount');
      return;
    }

    const indexes = weekIndexes.filter((index) => index.label || index.starts_on || index.ends_on || index.multiplier);
    if (indexes.some((index) => !index.label.trim() || !index.starts_on || !index.ends_on || !(Number(index.multiplier) > 0))) {
      toast.error('Each week index needs a name, dates, and a multiplier');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/dashboard/proximity/pricing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          default_weekly_rate: parsedDefault,
          default_daily_rate: parsedDaily,
          weekend_multiplier: parsedWeekend,
          day_multipliers: parsedDays,
          small_multiplier: parsedSmall,
          large_multiplier: parsedLarge,
          section_rates: sectionRates,
          week_indexes: indexes.map((index) => ({
            label: index.label.trim(),
            starts_on: index.starts_on,
            ends_on: index.ends_on,
            multiplier: Number(index.multiplier),
          })),
          branches: branches.map((branch) => ({
            id: branch.id,
            price_tier: branch.price_tier,
            rate_multiplier: branch.rate_multiplier.trim() === '' ? null : Number(branch.rate_multiplier),
          })),
          sections: sections.map((section) => ({
            id: section.id,
            weekly_rate: section.weekly_rate.trim() === '' ? null : Number(section.weekly_rate),
          })),
        }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Failed to save pricing');
      toast.success('Pricing published');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save pricing');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading pricing…</p>;
  }

  const sectionQuery = sectionFilter.trim().toLowerCase();
  const filteredSections = sections.filter((section) => {
    if (!sectionQuery) return true;
    return (
      section.name.toLowerCase().includes(sectionQuery) ||
      String(section.kind || '').toLowerCase().includes(sectionQuery) ||
      String(section.location_name || '').toLowerCase().includes(sectionQuery)
    );
  });
  const sectionPageCount = Math.max(1, Math.ceil(filteredSections.length / SECTION_PAGE_SIZE));
  const sectionPageIndex = Math.min(sectionPage, sectionPageCount);
  const sectionStart = (sectionPageIndex - 1) * SECTION_PAGE_SIZE;
  const visibleSections = filteredSections.slice(sectionStart, sectionStart + SECTION_PAGE_SIZE);

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-sm ring-1 ring-border">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700">
                <BanknotesIcon className="h-5 w-5" />
              </span>
              <div>
                <CardTitle>Rate card</CardTitle>
                <CardDescription>
                  A campaign is priced from these defaults. Saturday and Sunday use the weekend multiplier on their own. Change the number to change every weekend. You do not enter weekend dates.
                </CardDescription>
              </div>
            </div>
            <SaveButton type="button" pending={saving} onClick={() => void save()}>
              Publish rates
            </SaveButton>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="default-section-rate">Default section rate (KSh)</Label>
            <Input
              id="default-section-rate"
              type="number"
              min="0"
              step="0.01"
              value={defaultRate}
              onChange={(event) => setDefaultRate(event.target.value)}
              placeholder="10000"
            />
            <p className="text-xs text-muted-foreground">One week on a shelf that has no rate of its own.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="default-daily-rate">Default daily section rate (KSh)</Label>
            <Input
              id="default-daily-rate"
              type="number"
              min="0"
              step="0.01"
              value={dailyRate}
              onChange={(event) => setDailyRate(event.target.value)}
              placeholder="2000"
            />
            <p className="text-xs text-muted-foreground">Used when a campaign runs for fewer than 7 days.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="weekend-multiplier">Weekend multiplier</Label>
            <Input
              id="weekend-multiplier"
              type="number"
              min="0.01"
              max="10"
              step="0.001"
              value={weekendMultiplier}
              onChange={(event) => {
                const next = event.target.value;
                setDayMultipliers((current) =>
                  current.map((value, index) =>
                    (index === 0 || index === 6) && value === weekendMultiplier ? next : value
                  )
                );
                setWeekendMultiplier(next);
              }}
            />
            <p className="text-xs text-muted-foreground">1.4 means every Saturday and Sunday costs 40% more. Set 1 to charge them the same as weekdays.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="small-multiplier">Smaller branch multiplier</Label>
            <Input
              id="small-multiplier"
              type="number"
              min="0.01"
              max="10"
              step="0.001"
              value={smallMultiplier}
              onChange={(event) => setSmallMultiplier(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="large-multiplier">Larger branch multiplier</Label>
            <Input
              id="large-multiplier"
              type="number"
              min="0.01"
              max="10"
              step="0.001"
              value={largeMultiplier}
              onChange={(event) => setLargeMultiplier(event.target.value)}
            />
          </div>
          </div>
          <button
            type="button"
            className="text-sm font-medium text-emerald-800 hover:underline"
            aria-expanded={daysOpen}
            onClick={() => setDaysOpen((open) => !open)}
          >
            {daysOpen ? 'Hide day multipliers' : 'Adjust each day'}
          </button>
          {daysOpen && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
              {DAY_FIELDS.map((day) => (
                <div key={day.label} className="space-y-2">
                  <Label htmlFor={`day-multiplier-${day.index}`}>{day.label}</Label>
                  <Input
                    id={`day-multiplier-${day.index}`}
                    type="number"
                    min="0.01"
                    max="10"
                    step="0.001"
                    aria-label={`${day.label} multiplier`}
                    value={dayMultipliers[day.index] ?? '1'}
                    onChange={(event) =>
                      setDayMultipliers((current) =>
                        current.map((value, index) => (index === day.index ? event.target.value : value))
                      )
                    }
                  />
                </div>
              ))}
            </div>
          )}
          <RateExample
            sectionRate={defaultRate}
            dailyRate={dailyRate}
            branchMultiplier={smallMultiplier}
            dayMultipliers={dayMultipliers}
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-0 shadow-sm ring-1 ring-border">
          <CardHeader>
            <div className="flex items-center gap-3">
              <span className="rounded-xl bg-violet-50 p-2.5 text-violet-700">
                <TagIcon className="h-5 w-5" />
              </span>
              <div>
                <CardTitle>Product sections</CardTitle>
                <CardDescription>One weekly rate per section kind, such as checkout or beverages.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {kindRates.length === 0 && (
              <p className="text-sm text-muted-foreground">Add a branch zone first, or name a kind below.</p>
            )}
            {kindRates.map((rate) => (
              <div key={rate.kind} className="grid grid-cols-[1fr_140px] items-center gap-3">
                <p className="text-sm font-medium capitalize">{rate.kind}</p>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  aria-label={`${rate.kind} weekly rate`}
                  value={rate.weekly_rate}
                  placeholder="Uses default"
                  onChange={(event) =>
                    setKindRates((current) =>
                      current.map((item) => (item.kind === rate.kind ? { ...item, weekly_rate: event.target.value } : item))
                    )
                  }
                />
              </div>
            ))}
            <div className="flex gap-2 pt-2">
              <Input
                value={newKind}
                placeholder="Add a kind, e.g. entrance"
                onChange={(event) => setNewKind(event.target.value)}
              />
              <SaveButton
                type="button"
                variant="outline"
                pending={false}
                onClick={() => {
                  const kind = newKind.trim().toLowerCase();
                  if (!kind) return;
                  if (kindRates.some((rate) => rate.kind === kind)) {
                    toast.error('That kind is already on the rate card');
                    return;
                  }
                  setKindRates((current) => [...current, { kind, weekly_rate: '' }]);
                  setNewKind('');
                }}
              >
                Add
              </SaveButton>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm ring-1 ring-border">
          <CardHeader>
            <div className="flex items-center gap-3">
              <span className="rounded-xl bg-sky-50 p-2.5 text-sky-700">
                <BuildingStorefrontIcon className="h-5 w-5" />
              </span>
              <div>
                <CardTitle>Branches</CardTitle>
                <CardDescription>Larger branches use the higher multiplier unless you set one for that store.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {branches.length === 0 && <p className="text-sm text-muted-foreground">No branches yet.</p>}
            {branches.map((branch) => (
              <div key={branch.id} className="grid gap-2 rounded-xl border p-3 sm:grid-cols-[1fr_140px_140px] sm:items-center">
                <div>
                  <p className="text-sm font-medium">{branch.name}</p>
                  {branch.status !== 'active' && <Badge variant="outline">Inactive</Badge>}
                </div>
                <select
                  className={selectClassName}
                  aria-label={`${branch.name} tier`}
                  value={branch.price_tier}
                  onChange={(event) =>
                    setBranches((current) =>
                      current.map((item) =>
                        item.id === branch.id ? { ...item, price_tier: event.target.value === 'large' ? 'large' : 'small' } : item
                      )
                    )
                  }
                >
                  <option value="small">Smaller</option>
                  <option value="large">Larger</option>
                </select>
                <Input
                  type="number"
                  min="0.01"
                  max="10"
                  step="0.001"
                  aria-label={`${branch.name} multiplier`}
                  placeholder="Tier default"
                  value={branch.rate_multiplier}
                  onChange={(event) =>
                    setBranches((current) =>
                      current.map((item) => (item.id === branch.id ? { ...item, rate_multiplier: event.target.value } : item))
                    )
                  }
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm ring-1 ring-border">
        <CardHeader>
          <CardTitle>Section overrides</CardTitle>
          <CardDescription>A rate here replaces the kind rate for that one shelf section.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sections.length === 0 ? (
            <p className="text-sm text-muted-foreground">No shelf sections yet.</p>
          ) : (
            <>
              <Input
                value={sectionFilter}
                placeholder="Filter by branch, section, or kind"
                aria-label="Filter shelf sections"
                onChange={(event) => {
                  setSectionFilter(event.target.value);
                  setSectionPage(1);
                }}
              />
              {filteredSections.length === 0 ? (
                <p className="text-sm text-muted-foreground">No shelf sections match that filter.</p>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] text-sm">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="py-2 pr-3 font-medium">Branch</th>
                          <th className="py-2 pr-3 font-medium">Shelf section</th>
                          <th className="py-2 pr-3 font-medium">Kind</th>
                          <th className="py-2 font-medium">Section rate (KSh)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleSections.map((section) => (
                          <tr key={section.id} className="border-b last:border-0">
                            <td className="py-2 pr-3">{section.location_name}</td>
                            <td className="py-2 pr-3">{section.name}</td>
                            <td className="py-2 pr-3 capitalize">{section.kind}</td>
                            <td className="py-2">
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                aria-label={`${section.location_name} ${section.name} section rate`}
                                placeholder="Uses kind rate"
                                value={section.weekly_rate}
                                onChange={(event) =>
                                  setSections((current) =>
                                    current.map((item) =>
                                      item.id === section.id ? { ...item, weekly_rate: event.target.value } : item
                                    )
                                  )
                                }
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
                    <p>
                      {sectionStart + 1}–{Math.min(sectionStart + SECTION_PAGE_SIZE, filteredSections.length)} of {filteredSections.length}
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="rounded-lg border px-3 py-1.5 disabled:opacity-40"
                        disabled={sectionPageIndex <= 1}
                        onClick={() => setSectionPage(sectionPageIndex - 1)}
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border px-3 py-1.5 disabled:opacity-40"
                        disabled={sectionPageIndex >= sectionPageCount}
                        onClick={() => setSectionPage(sectionPageIndex + 1)}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm ring-1 ring-border">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="rounded-xl bg-amber-50 p-2.5 text-amber-700">
                <CalendarDaysIcon className="h-5 w-5" />
              </span>
              <div>
                <CardTitle>Week indexes</CardTitle>
                <CardDescription>
                  Holiday or payday dates multiply the rate. Weekends are already included by the weekend multiplier.
                </CardDescription>
              </div>
            </div>
            <SaveButton
              type="button"
              variant="outline"
              pending={false}
              onClick={() => setWeekIndexes((current) => [...current, { label: '', starts_on: '', ends_on: '', multiplier: '1.2' }])}
            >
              Add week
            </SaveButton>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {weekIndexes.length === 0 && <p className="text-sm text-muted-foreground">No seasonal indexes yet.</p>}
          {weekIndexes.map((index, position) => (
            <div key={`${index.starts_on}-${position}`} className="grid gap-2 md:grid-cols-[1.2fr_140px_140px_120px_auto] md:items-end">
              <Input
                aria-label="Week index name"
                placeholder="Payday week"
                value={index.label}
                onChange={(event) =>
                  setWeekIndexes((current) => current.map((item, itemIndex) => (itemIndex === position ? { ...item, label: event.target.value } : item)))
                }
              />
              <Input
                type="date"
                aria-label="Week index start"
                value={index.starts_on}
                onChange={(event) =>
                  setWeekIndexes((current) => current.map((item, itemIndex) => (itemIndex === position ? { ...item, starts_on: event.target.value } : item)))
                }
              />
              <Input
                type="date"
                aria-label="Week index end"
                value={index.ends_on}
                onChange={(event) =>
                  setWeekIndexes((current) => current.map((item, itemIndex) => (itemIndex === position ? { ...item, ends_on: event.target.value } : item)))
                }
              />
              <Input
                type="number"
                min="0.01"
                max="10"
                step="0.001"
                aria-label="Week index multiplier"
                value={index.multiplier}
                onChange={(event) =>
                  setWeekIndexes((current) => current.map((item, itemIndex) => (itemIndex === position ? { ...item, multiplier: event.target.value } : item)))
                }
              />
              <button
                type="button"
                className="h-10 px-3 text-sm text-muted-foreground hover:text-foreground"
                onClick={() => setWeekIndexes((current) => current.filter((_, itemIndex) => itemIndex !== position))}
              >
                Remove
              </button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

const SAMPLE_WEEK = ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11'];
const SAMPLE_WEEKEND = ['2026-10-10', '2026-10-11'];

function RateExample({
  sectionRate,
  dailyRate,
  branchMultiplier,
  dayMultipliers,
}: {
  sectionRate: string;
  dailyRate: string;
  branchMultiplier: string;
  dayMultipliers: string[];
}) {
  const section = positiveAmount(sectionRate) ?? 10000;
  const daily = positiveAmount(dailyRate) ?? 2000;
  const branch = positiveAmount(branchMultiplier) ?? 1;
  const days = dayMultipliers.map((value) => positiveAmount(value) ?? 1);
  const weekFactor = blendedDayFactor(SAMPLE_WEEK, days);
  const weekendOnly = blendedDayFactor(SAMPLE_WEEKEND, days);
  const oneWeek = section * branch * weekFactor;
  const saturdaySunday = daily * 2 * branch * weekendOnly;

  return (
    <div className="rounded-xl bg-slate-50 p-4 text-sm">
      <p className="font-medium">Example</p>
      <p className="mt-1 text-muted-foreground">
        Monday 5 October to Sunday 11 October. The two weekend days are included automatically.
      </p>
      <p className="mt-2">
        One week on a smaller branch:{' '}
        <span className="font-medium">
          {kes(section)} × {branch} × {weekFactor} day blend = {kes(oneWeek)}
        </span>
      </p>
      <p className="mt-2">
        Saturday and Sunday only, using the daily rate:{' '}
        <span className="font-medium">
          {kes(daily)} × 2 days × {branch} × {weekendOnly} = {kes(saturdaySunday)}
        </span>
      </p>
      <p className="mt-2 text-muted-foreground">
        Change the weekend multiplier to change Saturday and Sunday together. Open Adjust each day when one weekday should differ.
      </p>
    </div>
  );
}
