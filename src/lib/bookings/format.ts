/**
 * Real scheduling/booking — response shaping (S2, docs/SERVICES_PLAN.md).
 * service_bookings.booking_date/start_time/end_time are DB date/time
 * columns Prisma reads back as Date objects on an arbitrary epoch — never
 * serialize them directly to JSON as-is, always through this.
 */
import { dbTimeToHHMM } from './availability';

export function formatBookingForResponse(booking: {
  id: string;
  tenant_id: string;
  order_id: string | null;
  order_product_id: string | null;
  product_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  booking_date: Date;
  start_time: Date;
  end_time: Date;
  staff_label: string | null;
  status: string;
  notes: string | null;
  created_at: Date | null;
  updated_at: Date | null;
  products?: { name: string } | null;
}) {
  return {
    id: booking.id,
    order_id: booking.order_id,
    order_product_id: booking.order_product_id,
    product_id: booking.product_id,
    product_name: booking.products?.name ?? null,
    customer_name: booking.customer_name,
    customer_phone: booking.customer_phone,
    customer_email: booking.customer_email,
    booking_date: booking.booking_date.toISOString().slice(0, 10),
    start_time: dbTimeToHHMM(booking.start_time),
    end_time: dbTimeToHHMM(booking.end_time),
    staff_label: booking.staff_label,
    status: booking.status,
    notes: booking.notes,
    created_at: booking.created_at,
    updated_at: booking.updated_at,
  };
}
