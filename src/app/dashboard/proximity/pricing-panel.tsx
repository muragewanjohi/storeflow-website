'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { BanknotesIcon, BuildingStorefrontIcon, CalendarDaysIcon, TagIcon } from '@heroicons/react/24/outline';
import { SaveButton } from './save-button';

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

function moneyInput(value: number | null | undefined): string {
  return value == null ? '' : String(value);
}

export function PricingPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [defaultRate, setDefaultRate] = useState('');
  const [smallMultiplier, setSmallMultiplier] = useState('1');
  const [largeMultiplier, setLargeMultiplier] = useState('2');
  const [kindRates, setKindRates] = useState<KindRate[]>([]);
  const [newKind, setNewKind] = useState('');
  const [branches, setBranches] = useState<BranchRate[]>([]);
  const [sections, setSections] = useState<SectionRate[]>([]);
  const [weekIndexes, setWeekIndexes] = useState<WeekIndex[]>([]);

  useEffect(() => {
    void fetch('/api/dashboard/proximity/pricing')
      .then(async (response) => {
        const json = await response.json();
        if (!response.ok) throw new Error(json.error || 'Failed to load pricing');
        const data = json.data;
        setDefaultRate(moneyInput(data.default_weekly_rate));
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
    const parsedSmall = Number(smallMultiplier);
    const parsedLarge = Number(largeMultiplier);
    if (parsedDefault != null && (!Number.isFinite(parsedDefault) || parsedDefault < 0)) {
      toast.error('Default weekly rate must be a positive amount');
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

  const sectionsByBranch = branches.map((branch) => ({
    branch,
    sections: sections.filter((section) => section.location_id === branch.id),
  }));

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
                  A flight is priced as section weekly rate × branch multiplier × weeks × week index. Vendors see the total. They do not type it.
                </CardDescription>
              </div>
            </div>
            <SaveButton type="button" pending={saving} onClick={() => void save()}>
              Publish rates
            </SaveButton>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="default-weekly-rate">Default weekly rate (KSh)</Label>
            <Input
              id="default-weekly-rate"
              type="number"
              min="0"
              step="0.01"
              value={defaultRate}
              onChange={(event) => setDefaultRate(event.target.value)}
              placeholder="10000"
            />
            <p className="text-xs text-muted-foreground">Used when a product section has no rate of its own.</p>
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
          <CardDescription>A rate here replaces the kind rate for that one product section.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {sections.length === 0 && <p className="text-sm text-muted-foreground">No product sections yet.</p>}
          {sectionsByBranch.map(({ branch, sections: branchSections }) =>
            branchSections.length === 0 ? null : (
              <div key={branch.id} className="space-y-2">
                <p className="text-sm font-semibold">{branch.name}</p>
                {branchSections.map((section) => (
                  <div key={section.id} className="grid grid-cols-[1fr_140px] items-center gap-3">
                    <p className="text-sm">
                      {section.name} <span className="text-muted-foreground">· {section.kind}</span>
                    </p>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      aria-label={`${section.name} weekly rate`}
                      placeholder="Uses kind rate"
                      value={section.weekly_rate}
                      onChange={(event) =>
                        setSections((current) =>
                          current.map((item) => (item.id === section.id ? { ...item, weekly_rate: event.target.value } : item))
                        )
                      }
                    />
                  </div>
                ))}
              </div>
            )
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
                <CardDescription>Holiday or payday weeks multiply the rate. Other days stay at 1.</CardDescription>
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
