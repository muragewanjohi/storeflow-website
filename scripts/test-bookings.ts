/**
 * Live smoke test for real scheduling/booking (S2, docs/SERVICES_PLAN.md,
 * tracker row S2), built speculatively (no confirmed merchant demand yet)
 * on top of the already-shipped requires_shipping (S1) and deposit
 * (S-Dep) support.
 *
 * Uses the real "testtwo" test tenant (same one test-product-category-required.ts
 * and test-services-no-shipping.ts already rely on) — creates a real
 * bookable test product + a real booking_hours static_option, exercises
 * the real exported functions from @/lib/bookings/availability (not
 * reimplemented copies), then cleans up everything back to how it found
 * it, including restoring any pre-existing booking_hours value.
 *
 * Usage: npm run test:bookings
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const TEST_TENANT_ID = 'e401c99b-c078-4ab4-96f9-fc901f9110a9'; // testtwo

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required in .env.local');

  const { prisma } = await import('../src/lib/prisma/client');
  const { getStaticOption, setStaticOption } = await import('../src/lib/settings/static-options');
  const {
    getBookingSettings,
    computeAvailableSlotsForDay,
    getAvailableSlotsForProduct,
    createBookingWithCapacityCheck,
    BookingUnavailableError,
    weekdayForDate,
    dbTimeToHHMM,
  } = await import('../src/lib/bookings/availability');

  let passed = 0;
  let total = 0;
  function check(label: string, condition: boolean, detail?: unknown) {
    total++;
    if (condition) {
      passed++;
      console.log(`PASS: ${label}`);
    } else {
      console.log(`FAIL: ${label}`, detail ?? '');
    }
  }

  console.log('--- Part 1: pure computeAvailableSlotsForDay() ---');
  const pureSlots = computeAvailableSlotsForDay({
    date: '2026-09-10',
    dayHours: { open: '09:00', close: '11:00', closed: false },
    slotIntervalMinutes: 30,
    durationMinutes: 30,
    capacity: 2,
    existingBookings: [{ startTime: '09:30', endTime: '10:00' }],
  });
  check('4 slots in a 9-11am window at 30-min intervals', pureSlots.length === 4, pureSlots);
  check('first slot starts at 09:00', pureSlots[0]?.startTime === '09:00', pureSlots[0]);
  check('last slot starts at 10:30 (30-min slot must fit before 11:00 close)', pureSlots[pureSlots.length - 1]?.startTime === '10:30', pureSlots);
  const bookedSlot = pureSlots.find((s) => s.startTime === '09:30');
  check('the 09:30 slot has capacityRemaining 1 (2 capacity - 1 existing booking)', bookedSlot?.capacityRemaining === 1, bookedSlot);
  const closedSlots = computeAvailableSlotsForDay({
    date: '2026-09-10',
    dayHours: { open: '09:00', close: '17:00', closed: true },
    slotIntervalMinutes: 30,
    durationMinutes: 30,
    capacity: 1,
    existingBookings: [],
  });
  check('closed day returns zero slots', closedSlots.length === 0, closedSlots);

  console.log('\n--- Part 2: getBookingSettings() defaults + real parsing ---');
  const defaults = getBookingSettings(null);
  check('null input falls back to real defaults', defaults.slotIntervalMinutes === 30 && defaults.workingHours.sun.closed === true, defaults);
  const parsed = getBookingSettings(JSON.stringify({ workingHours: { mon: { open: '10:00', close: '14:00', closed: false } }, slotIntervalMinutes: 15 }));
  check('real JSON parses correctly for the day given', parsed.workingHours.mon.open === '10:00' && parsed.slotIntervalMinutes === 15, parsed);
  check('a day not present in the given JSON falls back to its own default', parsed.workingHours.tue.open === '09:00', parsed.workingHours.tue);
  check('weekdayForDate resolves a known Thursday correctly', weekdayForDate('2026-09-10') === 'thu', weekdayForDate('2026-09-10'));

  console.log('\n--- Part 3: real DB round-trip ---');
  const tenant = await prisma.tenants.findUnique({ where: { id: TEST_TENANT_ID } });
  if (!tenant) throw new Error('Test tenant not found');
  const category = await prisma.categories.findFirst({ where: { tenant_id: TEST_TENANT_ID, status: 'active' } });
  if (!category) throw new Error('Test tenant has no real category to use');

  const originalBookingHours = await getStaticOption(TEST_TENANT_ID, 'booking_hours');
  const testDate = '2026-09-10'; // a real Thursday, safely in the future of this test's authoring date

  let productId: string | null = null;
  let bookingId: string | null = null;
  try {
    // A real, deterministic booking_hours setting for this test run —
    // restored to whatever the tenant actually had afterward.
    await setStaticOption(
      TEST_TENANT_ID,
      'booking_hours',
      JSON.stringify({
        workingHours: {
          mon: { open: '09:00', close: '17:00', closed: false },
          tue: { open: '09:00', close: '17:00', closed: false },
          wed: { open: '09:00', close: '17:00', closed: false },
          thu: { open: '09:00', close: '17:00', closed: false },
          fri: { open: '09:00', close: '17:00', closed: false },
          sat: { open: '09:00', close: '17:00', closed: false },
          sun: { open: '09:00', close: '17:00', closed: true },
        },
        slotIntervalMinutes: 30,
      }),
    );

    const created = await prisma.products.create({
      data: {
        tenant_id: TEST_TENANT_ID,
        name: 'Test Bookable Service — 30-Minute Consultation',
        slug: `test-bookable-service-${Date.now()}`,
        price: 1000,
        sku: `TESTBOOK-${Date.now()}`,
        status: 'active',
        category_id: category.id,
        requires_shipping: false,
        stock_quantity: null,
        is_bookable: true,
        booking_duration_minutes: 30,
        booking_capacity: 1,
      },
    });
    productId = created.id;
    check('real bookable product created', !!created.id);

    const slotsBefore = await getAvailableSlotsForProduct({ tenantId: TEST_TENANT_ID, productId, date: testDate });
    check('getAvailableSlotsForProduct returns real slots for a fresh date', Array.isArray(slotsBefore) && slotsBefore!.length > 0, slotsBefore);
    const targetSlot = slotsBefore?.[0];
    check('first available slot is 09:00 (matches the real configured hours)', targetSlot?.startTime === '09:00', targetSlot);

    const booking = await createBookingWithCapacityCheck({
      tenantId: TEST_TENANT_ID,
      productId,
      date: testDate,
      startTime: '09:00',
      customerName: 'Test Customer',
      customerPhone: '254700000000',
      status: 'pending',
    });
    bookingId = booking.id;
    check('real booking created', !!booking.id);

    const reread = await prisma.service_bookings.findUnique({ where: { id: booking.id } });
    check('booking_date reads back correctly', reread?.booking_date.toISOString().slice(0, 10) === testDate, reread?.booking_date);
    check('start_time reads back as 09:00', reread ? dbTimeToHHMM(reread.start_time) === '09:00' : false, reread?.start_time);
    check('end_time reads back as 09:30 (30-minute duration)', reread ? dbTimeToHHMM(reread.end_time) === '09:30' : false, reread?.end_time);
    check('status defaults to pending', reread?.status === 'pending', reread?.status);

    const slotsAfter = await getAvailableSlotsForProduct({ tenantId: TEST_TENANT_ID, productId, date: testDate });
    const stillHas0900 = slotsAfter?.some((s) => s.startTime === '09:00');
    check('the booked 09:00 slot no longer appears (capacity 1, now fully booked)', stillHas0900 === false, slotsAfter);

    let rejected = false;
    try {
      await createBookingWithCapacityCheck({
        tenantId: TEST_TENANT_ID,
        productId,
        date: testDate,
        startTime: '09:00',
        customerName: 'Second Test Customer',
      });
    } catch (err) {
      rejected = err instanceof BookingUnavailableError;
    }
    check('booking the same exhausted slot again is rejected (real capacity-conflict prevention)', rejected);

    // A different, non-overlapping slot on the same date must still be
    // genuinely bookable — capacity rejection must be scoped to the
    // specific overlapping slot, not the whole date.
    const secondBooking = await createBookingWithCapacityCheck({
      tenantId: TEST_TENANT_ID,
      productId,
      date: testDate,
      startTime: '10:00',
      customerName: 'Third Test Customer',
    });
    check('a real, different slot on the same date is still genuinely bookable', !!secondBooking.id, secondBooking);
    await prisma.service_bookings.delete({ where: { id: secondBooking.id } });

    const someOtherProduct = await prisma.products.findFirst({
      where: { tenant_id: TEST_TENANT_ID, is_bookable: false, id: { not: productId } },
      select: { id: true },
    });
    if (someOtherProduct) {
      const nonBookableCheck = await getAvailableSlotsForProduct({
        tenantId: TEST_TENANT_ID,
        productId: someOtherProduct.id,
        date: testDate,
      });
      check('a real, non-bookable product returns null, never invents slots', nonBookableCheck === null, nonBookableCheck);
    } else {
      console.log('SKIP: no other non-bookable product found on this tenant to test against');
    }
  } finally {
    if (bookingId) await prisma.service_bookings.delete({ where: { id: bookingId } }).catch(() => {});
    if (productId) await prisma.products.delete({ where: { id: productId } }).catch(() => {});
    await setStaticOption(TEST_TENANT_ID, 'booking_hours', originalBookingHours);
    const restoredHours = await getStaticOption(TEST_TENANT_ID, 'booking_hours');
    check('booking_hours restored to its original value', restoredHours === originalBookingHours, { restoredHours, originalBookingHours });
  }

  console.log(`\n${passed}/${total} checks passed.`);
  await prisma.$disconnect();
  if (passed !== total) process.exit(1);
}

main().catch((error) => {
  console.error('\nBookings test failed:', error);
  process.exit(1);
});
