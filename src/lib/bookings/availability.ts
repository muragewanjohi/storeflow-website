/**
 * Real scheduling/booking — shared core (S2, docs/SERVICES_PLAN.md).
 *
 * Pure calculation functions (testable in isolation, scripts/test-bookings.ts)
 * plus the real Prisma-backed orchestrators both the public availability
 * endpoint (src/app/api/bookings/availability/route.ts) and checkout's
 * booking validation (checkout/route.ts) call — one tested implementation,
 * not two, same discipline as @/lib/orders/deposit.ts.
 *
 * Capacity, not named staff (user-confirmed scope): conflict prevention
 * counts overlapping service_bookings against products.booking_capacity,
 * never against a specific staff member's own calendar.
 */

import { prisma } from '@/lib/prisma/client';
import { getStaticOption } from '@/lib/settings/static-options';

export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export interface BookingDayHours {
  open: string; // "HH:mm"
  close: string; // "HH:mm"
  closed: boolean;
}

export interface BookingSettings {
  workingHours: Record<Weekday, BookingDayHours>;
  slotIntervalMinutes: number;
}

const DEFAULT_DAY: BookingDayHours = { open: '09:00', close: '18:00', closed: false };

/** Sensible default so a tenant who's never configured booking hours still gets a usable, non-empty availability list rather than silently zero slots. */
export const DEFAULT_BOOKING_SETTINGS: BookingSettings = {
  workingHours: {
    mon: { ...DEFAULT_DAY },
    tue: { ...DEFAULT_DAY },
    wed: { ...DEFAULT_DAY },
    thu: { ...DEFAULT_DAY },
    fri: { ...DEFAULT_DAY },
    sat: { open: '09:00', close: '16:00', closed: false },
    sun: { open: '09:00', close: '18:00', closed: true },
  },
  slotIntervalMinutes: 30,
};

const WEEKDAY_ORDER: Weekday[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export function weekdayForDate(dateStr: string): Weekday {
  // dateStr is "YYYY-MM-DD" — parsed as UTC midnight to avoid local-timezone
  // day-shifting, then mapped by UTC day-of-week, matching how the date is
  // always treated as a plain calendar date throughout this module.
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  return WEEKDAY_ORDER[d.getUTCDay()];
}

/**
 * Re-validated the same way every other tenant-configured JSON blob in
 * this codebase is (e.g. AI plan limits) — never trusted raw, falls back
 * to DEFAULT_BOOKING_SETTINGS per-field on anything malformed. Stored in
 * the real `static_options` table (option_name: 'booking_hours', a
 * JSON-stringified value) — the same established mechanism this
 * codebase already uses for the near-identical per-day open/close
 * `pickup_hours` setting (@/lib/settings/static-options.ts), not
 * `tenants.data` (that JSON bag is for onboarding-time facts like
 * business_type/niche, not a repeatedly-edited settings blob).
 */
export function getBookingSettings(rawJson: string | null | undefined): BookingSettings {
  let raw: Record<string, unknown> = {};
  if (rawJson) {
    try {
      const parsed = JSON.parse(rawJson);
      if (parsed && typeof parsed === 'object') raw = parsed as Record<string, unknown>;
    } catch {
      // malformed JSON — fall through to defaults
    }
  }

  const rawHours = raw.workingHours && typeof raw.workingHours === 'object' ? (raw.workingHours as Record<string, unknown>) : {};
  const workingHours = {} as Record<Weekday, BookingDayHours>;
  for (const day of WEEKDAY_ORDER) {
    const entry = rawHours[day];
    if (
      entry &&
      typeof entry === 'object' &&
      typeof (entry as any).open === 'string' &&
      typeof (entry as any).close === 'string'
    ) {
      workingHours[day] = {
        open: (entry as any).open,
        close: (entry as any).close,
        closed: (entry as any).closed === true,
      };
    } else {
      workingHours[day] = { ...DEFAULT_BOOKING_SETTINGS.workingHours[day] };
    }
  }

  const slotIntervalMinutes =
    typeof raw.slotIntervalMinutes === 'number' && raw.slotIntervalMinutes > 0
      ? raw.slotIntervalMinutes
      : DEFAULT_BOOKING_SETTINGS.slotIntervalMinutes;

  return { workingHours, slotIntervalMinutes };
}

function timeStringToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
}

function minutesToTimeString(minutes: number): string {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

/** Prisma reads a `@db.Time` column back as a Date on an arbitrary epoch day — only the time-of-day portion is real. */
export function dbTimeToHHMM(value: Date): string {
  return `${value.getUTCHours().toString().padStart(2, '0')}:${value.getUTCMinutes().toString().padStart(2, '0')}`;
}

/** Inverse of dbTimeToHHMM — Prisma's `@db.Time` columns accept a full Date, storing only the time portion. */
export function hhmmToDbTime(time: string): Date {
  return new Date(`1970-01-01T${time}:00.000Z`);
}

export interface SlotAvailability {
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  capacityRemaining: number;
}

export interface ExistingBookingWindow {
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
}

/**
 * Pure slot computation for one calendar day — given the day's working
 * hours, slot grid, service duration/capacity, and every non-cancelled
 * booking already on the books for that date, returns every slot with at
 * least 1 unit of remaining capacity. Slots that have already passed (when
 * `date` is today) are excluded via the injectable `now`.
 */
export function computeAvailableSlotsForDay(params: {
  date: string; // "YYYY-MM-DD"
  dayHours: BookingDayHours;
  slotIntervalMinutes: number;
  durationMinutes: number;
  capacity: number;
  existingBookings: ExistingBookingWindow[];
  now?: Date;
}): SlotAvailability[] {
  const { date, dayHours, slotIntervalMinutes, durationMinutes, capacity, existingBookings, now } = params;
  if (dayHours.closed || durationMinutes <= 0 || slotIntervalMinutes <= 0) return [];

  const openMin = timeStringToMinutes(dayHours.open);
  const closeMin = timeStringToMinutes(dayHours.close);
  if (openMin >= closeMin) return [];

  const bookedRanges = existingBookings.map((b) => ({
    start: timeStringToMinutes(b.startTime),
    end: timeStringToMinutes(b.endTime),
  }));

  const isToday = now ? date === now.toISOString().slice(0, 10) : false;
  const nowMinutes = now ? now.getUTCHours() * 60 + now.getUTCMinutes() : 0;

  const slots: SlotAvailability[] = [];
  for (let slotStart = openMin; slotStart + durationMinutes <= closeMin; slotStart += slotIntervalMinutes) {
    const slotEnd = slotStart + durationMinutes;
    if (isToday && slotStart <= nowMinutes) continue;

    const overlapping = bookedRanges.filter((r) => slotStart < r.end && r.start < slotEnd).length;
    const capacityRemaining = capacity - overlapping;
    if (capacityRemaining > 0) {
      slots.push({
        startTime: minutesToTimeString(slotStart),
        endTime: minutesToTimeString(slotEnd),
        capacityRemaining,
      });
    }
  }
  return slots;
}

export class BookingUnavailableError extends Error {
  constructor(message = 'This time slot is no longer available.') {
    super(message);
    this.name = 'BookingUnavailableError';
  }
}

/** Real Prisma-backed orchestrator — fetches tenant settings, product config, and the day's existing bookings, then delegates to the pure function above. Returns null when the product isn't bookable at all (never invents slots for a non-bookable product). */
export async function getAvailableSlotsForProduct(params: {
  tenantId: string;
  productId: string;
  date: string; // "YYYY-MM-DD"
  now?: Date;
}): Promise<SlotAvailability[] | null> {
  const { tenantId, productId, date, now } = params;

  const [product, bookingHoursJson, existingRows] = await Promise.all([
    prisma.products.findFirst({
      where: { id: productId, tenant_id: tenantId },
      select: { is_bookable: true, booking_duration_minutes: true, booking_capacity: true },
    }),
    getStaticOption(tenantId, 'booking_hours'),
    prisma.service_bookings.findMany({
      where: {
        tenant_id: tenantId,
        product_id: productId,
        booking_date: new Date(`${date}T00:00:00.000Z`),
        status: { notIn: ['cancelled', 'no_show'] },
      },
      select: { start_time: true, end_time: true },
    }),
  ]);

  if (!product || !product.is_bookable || !product.booking_duration_minutes) return null;

  const settings = getBookingSettings(bookingHoursJson);
  const dayHours = settings.workingHours[weekdayForDate(date)];

  return computeAvailableSlotsForDay({
    date,
    dayHours,
    slotIntervalMinutes: settings.slotIntervalMinutes,
    durationMinutes: product.booking_duration_minutes,
    capacity: product.booking_capacity,
    existingBookings: existingRows.map((r) => ({
      startTime: dbTimeToHHMM(r.start_time),
      endTime: dbTimeToHHMM(r.end_time),
    })),
    now,
  });
}

export interface CreateBookingInput {
  tenantId: string;
  productId: string;
  date: string; // "YYYY-MM-DD"
  startTime: string; // "HH:mm"
  orderId?: string | null;
  orderProductId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  status?: string; // defaults to 'pending'
}

/**
 * The ONE write path for creating a service_booking — used by both
 * checkout (customer self-service) and the dashboard's manual "add
 * booking" endpoint. Re-checks capacity inside a transaction immediately
 * before insert, closing the race-condition window a plain read-then-write
 * would leave open (two customers booking the last remaining slot at the
 * same moment).
 */
export async function createBookingWithCapacityCheck(input: CreateBookingInput) {
  const { tenantId, productId, date, startTime, orderId, orderProductId, customerName, customerPhone, customerEmail, status } =
    input;

  return prisma.$transaction(async (tx) => {
    const product = await tx.products.findFirst({
      where: { id: productId, tenant_id: tenantId },
      select: { is_bookable: true, booking_duration_minutes: true, booking_capacity: true },
    });
    if (!product || !product.is_bookable || !product.booking_duration_minutes) {
      throw new BookingUnavailableError('This product is not bookable.');
    }

    const startMinutes = timeStringToMinutes(startTime);
    const endTime = minutesToTimeString(startMinutes + product.booking_duration_minutes);

    const overlapping = await tx.service_bookings.findMany({
      where: {
        tenant_id: tenantId,
        product_id: productId,
        booking_date: new Date(`${date}T00:00:00.000Z`),
        status: { notIn: ['cancelled', 'no_show'] },
      },
      select: { start_time: true, end_time: true },
    });
    const overlapCount = overlapping.filter((b) => {
      const bStart = timeStringToMinutes(dbTimeToHHMM(b.start_time));
      const bEnd = timeStringToMinutes(dbTimeToHHMM(b.end_time));
      return startMinutes < bEnd && bStart < startMinutes + product.booking_duration_minutes!;
    }).length;

    if (overlapCount >= product.booking_capacity) {
      throw new BookingUnavailableError();
    }

    return tx.service_bookings.create({
      data: {
        tenant_id: tenantId,
        order_id: orderId ?? null,
        order_product_id: orderProductId ?? null,
        product_id: productId,
        customer_name: customerName ?? null,
        customer_phone: customerPhone ?? null,
        customer_email: customerEmail ?? null,
        booking_date: new Date(`${date}T00:00:00.000Z`),
        start_time: hhmmToDbTime(startTime),
        end_time: hhmmToDbTime(endTime),
        status: status ?? 'pending',
      },
    });
  });
}
