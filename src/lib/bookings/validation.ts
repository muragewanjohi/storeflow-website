/**
 * Real scheduling/booking — validation schemas (S2, docs/SERVICES_PLAN.md).
 * Shared by the dashboard routes and their mobile mirrors.
 */
import { z } from 'zod';

export const BOOKING_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled', 'no_show'] as const;

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD');
const timeSchema = z.string().regex(/^\d{2}:\d{2}$/, 'time must be HH:mm');

/** Manual dashboard "add booking" (e.g. a phone-booked customer) — the same real capacity-checked write path checkout uses. */
export const createBookingSchema = z.object({
  product_id: z.string().uuid(),
  date: dateSchema,
  start_time: timeSchema,
  customer_name: z.string().min(1).optional().nullable(),
  customer_phone: z.string().min(1).optional().nullable(),
  customer_email: z.string().email().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export const updateBookingSchema = z.object({
  status: z.enum(BOOKING_STATUSES).optional(),
  staff_label: z.string().max(100).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export const bookingQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(BOOKING_STATUSES).optional(),
  date: dateSchema.optional(),
  date_from: dateSchema.optional(),
  date_to: dateSchema.optional(),
});
