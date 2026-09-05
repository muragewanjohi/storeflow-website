/**
 * Bookings Management Client Component — real scheduling/booking (S2,
 * docs/SERVICES_PLAN.md). Date-navigator + day-list (no calendar-grid
 * library — this codebase has consistently avoided one, see
 * @/components/analytics/date-range-picker.tsx).
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Loader2, PlusIcon, ArrowLeftIcon, ChevronLeftIcon, ChevronRightIcon, ClockIcon } from 'lucide-react';
import { toast } from 'sonner';

type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';

interface Booking {
  id: string;
  order_id: string | null;
  product_id: string | null;
  product_name: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  booking_date: string;
  start_time: string;
  end_time: string;
  staff_label: string | null;
  status: BookingStatus;
  notes: string | null;
}

interface BookableProduct {
  id: string;
  name: string;
  is_bookable?: boolean;
}

const STATUS_LABEL: Record<BookingStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No-show',
};

const STATUS_BADGE_VARIANT: Record<BookingStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'secondary',
  confirmed: 'default',
  completed: 'outline',
  cancelled: 'destructive',
  no_show: 'destructive',
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function BookingsClient() {
  const [date, setDate] = useState(todayStr());
  const [statusFilter, setStatusFilter] = useState<BookingStatus | 'all'>('all');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [bookableProducts, setBookableProducts] = useState<BookableProduct[]>([]);
  const [newProductId, setNewProductId] = useState('');
  const [newDate, setNewDate] = useState(todayStr());
  const [newSlots, setNewSlots] = useState<Array<{ startTime: string; endTime: string; capacityRemaining: number }>>([]);
  const [newSlotsLoading, setNewSlotsLoading] = useState(false);
  const [newStartTime, setNewStartTime] = useState('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerEmail, setNewCustomerEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ date, limit: '100' });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const response = await fetch(`/api/dashboard/bookings?${params.toString()}`);
      const data = await response.json();
      if (response.ok) {
        setBookings(data.bookings || []);
      } else {
        toast.error(data.error || 'Failed to load bookings');
      }
    } catch {
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }, [date, statusFilter]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  useEffect(() => {
    fetch('/api/products?limit=100&status=active')
      .then((res) => res.json())
      .then((data) => {
        const products = Array.isArray(data.products) ? data.products : [];
        setBookableProducts(products.filter((p: BookableProduct) => p.is_bookable === true));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!newProductId || !newDate) {
      setNewSlots([]);
      return;
    }
    let cancelled = false;
    setNewSlotsLoading(true);
    fetch(`/api/bookings/availability?productId=${encodeURIComponent(newProductId)}&date=${encodeURIComponent(newDate)}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setNewSlots(data.success ? data.slots || [] : []);
      })
      .catch(() => {
        if (!cancelled) setNewSlots([]);
      })
      .finally(() => {
        if (!cancelled) setNewSlotsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [newProductId, newDate]);

  const shiftDate = (deltaDays: number) => {
    const d = new Date(`${date}T00:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() + deltaDays);
    setDate(d.toISOString().slice(0, 10));
  };

  const updateStatus = async (id: string, status: BookingStatus) => {
    setUpdatingId(id);
    try {
      const response = await fetch(`/api/dashboard/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || 'Failed to update booking');
        return;
      }
      toast.success('Booking updated');
      fetchBookings();
    } catch {
      toast.error('Failed to update booking');
    } finally {
      setUpdatingId(null);
    }
  };

  const cancelBooking = async (id: string) => {
    if (!confirm('Cancel this booking?')) return;
    setUpdatingId(id);
    try {
      const response = await fetch(`/api/dashboard/bookings/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || 'Failed to cancel booking');
        return;
      }
      toast.success('Booking cancelled');
      fetchBookings();
    } catch {
      toast.error('Failed to cancel booking');
    } finally {
      setUpdatingId(null);
    }
  };

  const resetAddForm = () => {
    setNewProductId('');
    setNewDate(todayStr());
    setNewStartTime('');
    setNewSlots([]);
    setNewCustomerName('');
    setNewCustomerPhone('');
    setNewCustomerEmail('');
  };

  const handleAddBooking = async () => {
    if (!newProductId || !newStartTime) {
      toast.error('Select a service and a time slot');
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/dashboard/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: newProductId,
          date: newDate,
          start_time: newStartTime,
          customer_name: newCustomerName.trim() || null,
          customer_phone: newCustomerPhone.trim() || null,
          customer_email: newCustomerEmail.trim() || null,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || 'Failed to create booking');
        return;
      }
      toast.success('Booking created');
      setIsAddOpen(false);
      resetAddForm();
      setDate(newDate);
      fetchBookings();
    } catch {
      toast.error('Failed to create booking');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4 mb-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard">
            <ArrowLeftIcon className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">Bookings</h1>
          <p className="text-muted-foreground mt-2">
            Manage appointments for your bookable services. Configure hours in{' '}
            <Link href="/dashboard/settings/booking-hours" className="underline underline-offset-2">
              Booking Hours
            </Link>
            , and turn a product into a bookable service from its edit page.
          </p>
        </div>

        <Dialog
          open={isAddOpen}
          onOpenChange={(open) => {
            setIsAddOpen(open);
            if (!open) resetAddForm();
          }}
        >
          <DialogTrigger asChild>
            <Button disabled={bookableProducts.length === 0}>
              <PlusIcon className="mr-2 h-4 w-4" />
              Add Booking
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Booking</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Service</Label>
                <Select value={newProductId} onValueChange={setNewProductId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a bookable service" />
                  </SelectTrigger>
                  <SelectContent>
                    {bookableProducts.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new_booking_date">Date</Label>
                <Input
                  id="new_booking_date"
                  type="date"
                  min={todayStr()}
                  value={newDate}
                  onChange={(e) => {
                    setNewDate(e.target.value);
                    setNewStartTime('');
                  }}
                />
              </div>
              {newProductId && (
                <div className="space-y-2">
                  <Label>Available times</Label>
                  {newSlotsLoading && <p className="text-xs text-muted-foreground">Loading...</p>}
                  {!newSlotsLoading && newSlots.length === 0 && (
                    <p className="text-xs text-muted-foreground">No available times on this date.</p>
                  )}
                  {!newSlotsLoading && newSlots.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {newSlots.map((slot) => (
                        <button
                          key={slot.startTime}
                          type="button"
                          onClick={() => setNewStartTime(slot.startTime)}
                          className={`rounded border px-2 py-1 text-xs ${
                            newStartTime === slot.startTime
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-input hover:bg-muted'
                          }`}
                        >
                          {slot.startTime}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="new_customer_name">Customer name</Label>
                  <Input id="new_customer_name" value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new_customer_phone">Phone</Label>
                  <Input id="new_customer_phone" value={newCustomerPhone} onChange={(e) => setNewCustomerPhone(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new_customer_email">Email</Label>
                <Input id="new_customer_email" type="email" value={newCustomerEmail} onChange={(e) => setNewCustomerEmail(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button onClick={handleAddBooking} disabled={isSubmitting || !newProductId || !newStartTime}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Create Booking
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => shiftDate(-1)}>
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-40" />
            <Button variant="outline" size="icon" onClick={() => shiftDate(1)}>
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setDate(todayStr())}>
              Today
            </Button>
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as BookingStatus | 'all')}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {(Object.keys(STATUS_LABEL) as BookingStatus[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : bookings.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No bookings on this date.</p>
          ) : (
            <div className="space-y-3">
              {bookings.map((booking) => (
                <div key={booking.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <ClockIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {booking.start_time} – {booking.end_time}
                      </span>
                      <Badge variant={STATUS_BADGE_VARIANT[booking.status]}>{STATUS_LABEL[booking.status]}</Badge>
                    </div>
                    <p className="text-sm mt-1">{booking.product_name || 'Service'}</p>
                    <p className="text-xs text-muted-foreground">
                      {booking.customer_name || 'No name'}
                      {booking.customer_phone ? ` • ${booking.customer_phone}` : ''}
                      {booking.staff_label ? ` • ${booking.staff_label}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {booking.status === 'pending' && (
                      <Button size="sm" variant="outline" disabled={updatingId === booking.id} onClick={() => updateStatus(booking.id, 'confirmed')}>
                        Confirm
                      </Button>
                    )}
                    {(booking.status === 'pending' || booking.status === 'confirmed') && (
                      <>
                        <Button size="sm" variant="outline" disabled={updatingId === booking.id} onClick={() => updateStatus(booking.id, 'completed')}>
                          Complete
                        </Button>
                        <Button size="sm" variant="outline" disabled={updatingId === booking.id} onClick={() => updateStatus(booking.id, 'no_show')}>
                          No-show
                        </Button>
                        <Button size="sm" variant="destructive" disabled={updatingId === booking.id} onClick={() => cancelBooking(booking.id)}>
                          Cancel
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
