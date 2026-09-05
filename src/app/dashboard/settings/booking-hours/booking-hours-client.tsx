/**
 * Booking Hours Client Component — real scheduling/booking (S2,
 * docs/SERVICES_PLAN.md). Day-by-day working-hours editor, mirroring the
 * shape (not the code — that one's file-private) of tenant-settings-client's
 * StoreHoursEditor for pickup_hours.
 */
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeftIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface DayHours {
  open: string;
  close: string;
  closed: boolean;
}

type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

interface BookingSettings {
  workingHours: Record<Weekday, DayHours>;
  slotIntervalMinutes: number;
}

const DAYS: { key: Weekday; label: string }[] = [
  { key: 'mon', label: 'Monday' },
  { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' },
  { key: 'sat', label: 'Saturday' },
  { key: 'sun', label: 'Sunday' },
];

export default function BookingHoursClient({ initialSettings }: { initialSettings: BookingSettings }) {
  const [settings, setSettings] = useState<BookingSettings>(initialSettings);
  const [saving, setSaving] = useState(false);

  const updateDay = (day: Weekday, updates: Partial<DayHours>) => {
    setSettings((prev) => ({
      ...prev,
      workingHours: { ...prev.workingHours, [day]: { ...prev.workingHours[day], ...updates } },
    }));
  };

  const setAllDays = (open: string, close: string, closed: boolean) => {
    setSettings((prev) => {
      const workingHours = { ...prev.workingHours };
      for (const day of DAYS) {
        workingHours[day.key] = { open, close, closed };
      }
      return { ...prev, workingHours };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/dashboard/settings/booking-hours', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || 'Failed to save booking hours');
        return;
      }
      toast.success('Booking hours saved');
    } catch {
      toast.error('Failed to save booking hours');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4 mb-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/settings">
            <ArrowLeftIcon className="mr-2 h-4 w-4" />
            Back to Settings
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold">Booking Hours</h1>
        <p className="text-muted-foreground mt-2">
          Set when customers can book a bookable service (S2, docs/SERVICES_PLAN.md) — used to compute available time slots at checkout.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Working Hours</CardTitle>
          <CardDescription>Applies to every bookable product in your store.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Button type="button" variant="outline" size="sm" onClick={() => setAllDays('09:00', '17:00', false)}>
              Set All: 9 AM - 5 PM
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setAllDays('08:00', '18:00', false)}>
              Set All: 8 AM - 6 PM
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setAllDays('', '', true)}>
              Close All
            </Button>
          </div>

          <div className="space-y-3">
            {DAYS.map((day) => {
              const dayHours = settings.workingHours[day.key];
              return (
                <div key={day.key} className="flex items-center gap-4 p-3 border rounded-lg">
                  <div className="w-24 font-medium">{day.label}</div>
                  <Checkbox
                    checked={!dayHours.closed}
                    onCheckedChange={(checked) => updateDay(day.key, { closed: !checked })}
                  />
                  {!dayHours.closed ? (
                    <>
                      <Input
                        type="time"
                        value={dayHours.open || '09:00'}
                        onChange={(e) => updateDay(day.key, { open: e.target.value })}
                        className="w-32"
                      />
                      <span className="text-muted-foreground">to</span>
                      <Input
                        type="time"
                        value={dayHours.close || '17:00'}
                        onChange={(e) => updateDay(day.key, { close: e.target.value })}
                        className="w-32"
                      />
                    </>
                  ) : (
                    <span className="text-muted-foreground">Closed</span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="space-y-2 pt-2">
            <Label htmlFor="slot_interval">Slot interval (minutes)</Label>
            <Input
              id="slot_interval"
              type="number"
              min="5"
              step="5"
              className="w-40"
              value={settings.slotIntervalMinutes}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, slotIntervalMinutes: parseInt(e.target.value, 10) || prev.slotIntervalMinutes }))
              }
            />
            <p className="text-xs text-muted-foreground">
              How far apart bookable start times are offered, e.g. every 30 minutes.
            </p>
          </div>

          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Booking Hours'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
