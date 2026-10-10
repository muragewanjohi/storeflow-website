'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  MapPin,
  Radio,
  ShieldCheck,
  Smartphone,
  Store,
  Ticket,
} from 'lucide-react';
import { Navigation } from '@/components/marketing/navigation';
import { Footer } from '@/components/marketing/footer';
import { ScrollReveal } from '@/components/marketing/scroll-reveal';

const steps = [
  {
    n: '1',
    title: 'A beacon in the product section',
    body: 'The store places a small beacon in a department, such as beverages or checkout.',
    icon: Radio,
    image: '/images/proximity/proximity-beacon.jpg',
    alt: 'A small beacon mounted on a supermarket shelf',
  },
  {
    n: '2',
    title: 'The shopper sees a card',
    body: 'After a short pause in that section, the supermarket app shows an offer on the phone.',
    icon: Smartphone,
    image: '/images/proximity/proximity-hero.jpg',
    alt: 'A shopper looking at an offer on her phone in the aisle',
  },
  {
    n: '4',
    title: 'The store keeps the shopper',
    body: 'The vendor does not receive names or phone numbers. The relationship stays with the supermarket.',
    icon: ShieldCheck,
  },
];

const vendorBenefits = [
  {
    title: 'The right department',
    body: 'The offer appears where that product is sold, not on a homepage the shopper might never open.',
    icon: MapPin,
  },
  {
    title: 'You choose the floor',
    body: 'Book the branches and product sections you want. Leave the rest of the store alone.',
    icon: Store,
  },
  {
    title: 'A flight with dates',
    body: 'Set when the card starts and when it ends. The supermarket approves the creative before it can run.',
    icon: CalendarDays,
  },
  {
    title: 'Results you can see',
    body: 'On-screen views, clicks, and claims for that booking. No list of shopper identities.',
    icon: BadgeCheck,
  },
];

const sections = [
  { name: 'Entrance', note: 'The first moment in the store', image: '/images/proximity/proximity-entrance.jpg' },
  { name: 'Beverages', note: 'Drinks, while they are choosing', image: '/images/proximity/proximity-beverages.jpg' },
  { name: 'Beauty', note: 'Cosmetics and personal care', image: '/images/proximity/proximity-beauty.jpg' },
  { name: 'Electronics', note: 'Phones and appliances', image: '/images/proximity/proximity-electronics.jpg' },
  { name: 'Baby', note: 'Care products for parents in that aisle', image: '/images/proximity/proximity-baby.jpg' },
  { name: 'Checkout', note: 'The last stop before the till', image: '/images/proximity/proximity-checkout.jpg' },
];

const counted = [
  { label: 'On-screen cards', detail: 'Counted when the offer is actually shown after a short dwell.' },
  { label: 'Clicks', detail: 'When a shopper opens the offer from the card.' },
  { label: 'Claims', detail: 'When a shopper takes the offer inside the app.' },
];

const proof = [
  { icon: Store, label: 'Use the store you already have' },
  { icon: Smartphone, label: 'A card in the supermarket app' },
  { icon: Ticket, label: 'On-screen reporting' },
  { icon: ShieldCheck, label: 'The store keeps the shopper' },
];

const storePoints = [
  'Branches, product sections, and beacon placement',
  'Beacon status, battery, and last seen',
  'Campaign approval before a card can run',
  'On-screen cards, clicks, and claims',
];

const vendorPoints = [
  'Choose the branches and departments',
  'Set the start and end of the flight',
  'Read on-screen views, clicks, and claims',
  'No shopper names or phone numbers',
];

const faqs = [
  {
    q: 'Do shoppers need to download a DukaNest app?',
    a: 'The card appears in the supermarket app, after a short pause in a product section. Bluetooth has to be available, and the app has to be able to receive the signal.',
  },
  {
    q: 'Can a beacon identify the exact shelf?',
    a: 'A beacon marks a department, such as beverages or checkout. Adjacent bays often share a signal, so the offer belongs to that section, not one facing.',
  },
  {
    q: 'What does the vendor get to see?',
    a: 'On-screen cards, clicks, and claims for the booking they made. The vendor does not receive shopper names or phone numbers.',
  },
  {
    q: 'Are till sales counted?',
    a: 'A purchase at the till without a claim is not measured. The count stops at the card, the click, and the claim.',
  },
];

export default function ProximityMarketingPage() {
  return (
    <div className="min-h-screen bg-white text-[#0c0528]">
      <Navigation />

      <main>
        <section
          className="relative overflow-hidden pt-24"
          style={{ background: 'linear-gradient(160deg, #ffffff 0%, #f6faff 50%, #eef4ff 100%)' }}
        >
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-32 top-1/4 h-[420px] w-[420px] rounded-full bg-[#0B33B7]/10 blur-[100px]" />
            <div className="absolute -right-24 bottom-0 h-[360px] w-[360px] rounded-full bg-[#082a94]/10 blur-[90px]" />
          </div>

          <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-24">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#0B33B7]">
                Proximity marketing
              </p>
              <h1 className="mt-4 text-[clamp(2.4rem,5.5vw,4.25rem)] font-bold leading-[1.05] tracking-tight">
                Put a brand offer in the aisle where the shopper is standing.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-[#555]">
                DukaNest proximity shows a card in the supermarket app when someone pauses in a product section. Vendors book that section. The store approves what shoppers see.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0B33B7] to-[#082a94] px-7 py-4 font-semibold text-white shadow-[0_20px_40px_-12px_rgba(11,51,183,0.45)]"
                >
                  Talk to us
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <Link
                  href="/vendor/proximity"
                  className="inline-flex items-center justify-center rounded-2xl border-2 border-[#0B33B7]/20 bg-white px-7 py-4 font-semibold text-[#0B33B7]"
                >
                  Vendor portal
                </Link>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-xl">
              <div className="relative h-[320px] overflow-hidden rounded-[1.6rem] border border-[#d7e4f5] bg-[#e8f2fd] shadow-[0_28px_65px_rgba(18,51,107,0.18)] sm:h-[410px]">
                <Image
                  src="/images/proximity/supermarket-beacon-scene.jpg"
                  alt="A shopper in the beverages aisle looking at an offer, with a beacon mounted above the shelf"
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 560px"
                  className="object-cover object-[58%_center]"
                />
              </div>
              <p className="mt-3 max-w-lg text-xs leading-relaxed text-[#70809a]">
                Illustrative scene. A beacon marks a product section. It does not pinpoint the exact shelf a shopper is standing at.
              </p>
            </div>
          </div>
        </section>

        <section className="border-y border-[#edf2fa] bg-white py-6" aria-label="What proximity marketing covers">
          <div className="mx-auto grid max-w-7xl gap-4 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
            {proof.map((item) => (
              <div key={item.label} className="flex items-center gap-3 text-sm font-semibold text-[#526582]">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#edf4ff] text-[#0B33B7]">
                  <item.icon className="h-5 w-5" />
                </span>
                {item.label}
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <ScrollReveal>
              <div className="mx-auto max-w-2xl text-center">
                <h2 className="text-4xl font-bold tracking-tight md:text-5xl">How it works</h2>
                <p className="mt-4 text-lg text-[#555]">
                  From a beacon in the aisle to a card the vendor booked and the store approved.
                </p>
              </div>
            </ScrollReveal>

            <div className="mx-auto mt-14 grid max-w-5xl gap-4 md:grid-cols-2">
              {steps.slice(0, 2).map((step) => (
                <article key={step.n} className="overflow-hidden rounded-3xl border border-[#eaeaea] bg-white shadow-sm">
                  <div className="relative h-52">
                    <Image src={step.image} alt={step.alt} fill sizes="(max-width: 768px) 100vw, 480px" className="object-cover" />
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0B33B7] text-sm font-bold text-white">
                        {step.n}
                      </span>
                      <step.icon className="h-5 w-5 text-[#0B33B7]" />
                    </div>
                    <h3 className="mt-4 text-xl font-semibold">{step.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-[#555]">{step.body}</p>
                  </div>
                </article>
              ))}
            </div>

            <ScrollReveal className="mx-auto mt-6 max-w-5xl">
              <article className="overflow-hidden rounded-[2rem] border border-[#0B33B7]/15 bg-[#0c0528] text-white shadow-[0_30px_80px_-40px_rgba(12,5,40,0.8)]">
                <div className="grid gap-8 p-6 sm:p-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#9eb6ff]">Step 3</p>
                    <h3 className="mt-3 text-3xl font-bold tracking-tight">Vendors advertise</h3>
                    <p className="mt-4 leading-relaxed text-white/75">
                      A brand books a branch and a product section, submits the card, and waits. The supermarket approves the creative before shoppers can see it.
                    </p>
                    <div className="relative mt-6 h-48 overflow-hidden rounded-2xl">
                      <Image
                        src="/images/proximity/proximity-vendor.jpg"
                        alt="A brand and a store manager reviewing an in-aisle offer"
                        fill
                        sizes="(max-width: 1024px) 100vw, 420px"
                        className="object-cover"
                      />
                    </div>
                  </div>
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {vendorBenefits.map((benefit) => (
                        <li key={benefit.title} className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
                        <benefit.icon className="h-5 w-5 text-[#9eb6ff]" />
                        <p className="mt-3 font-semibold">{benefit.title}</p>
                        <p className="mt-1 text-sm leading-relaxed text-white/70">{benefit.body}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            </ScrollReveal>

            <article className="mx-auto mt-6 max-w-5xl rounded-3xl border border-[#eaeaea] bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0B33B7] text-sm font-bold text-white">
                  4
                </span>
                <ShieldCheck className="h-5 w-5 text-[#0B33B7]" />
              </div>
              <h3 className="mt-4 text-xl font-semibold">{steps[2].title}</h3>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#555]">{steps[2].body}</p>
            </article>
            <div className="mx-auto mt-6 flex max-w-5xl items-start gap-3 rounded-2xl border border-[#d9e8fa] bg-[#f7fbff] px-4 py-4 text-sm text-[#5f7190]">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#e3efff] text-xs font-bold text-[#0B33B7]">i</span>
              <p>
                <span className="font-semibold text-[#0c0528]">Good to know. </span>
                A beacon stands for a product section. Placement is checked in the real store so nearby departments do not trigger the wrong card.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-[#f7f9ff] py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <ScrollReveal>
              <div className="mx-auto max-w-2xl text-center">
                <h2 className="text-4xl font-bold tracking-tight md:text-5xl">Two dashboards</h2>
                <p className="mt-4 text-lg text-[#555]">
                  The supermarket runs the floor. The vendor books a section and reads the result.
                </p>
              </div>
            </ScrollReveal>
            <article className="mt-16 grid items-center gap-10 lg:grid-cols-[0.82fr_1.18fr]">
              <div>
                <span className="inline-flex rounded-full border border-[#c6f0e3] bg-[#e0f8f0] px-3 py-1.5 text-xs font-bold tracking-[0.08em] text-[#087c69]">
                  FOR THE SUPERMARKET
                </span>
                <h3 className="mt-4 text-3xl font-bold tracking-tight">Your stores. Your sections. Your approval.</h3>
                <p className="mt-3 text-[#63738d]">
                  See where beacons sit, which sections are live, and which creatives are waiting. A card does not run until the store approves it.
                </p>
                <ul className="mt-6 space-y-3">
                  {storePoints.map((point) => (
                    <li key={point} className="flex items-start gap-3 text-sm text-[#485e7c]">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#dff8ef] text-[11px] font-bold text-[#07876f]">✓</span>
                      {point}
                    </li>
                  ))}
                </ul>
                <Link href="/dashboard/proximity" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#0B33B7] to-[#082a94] px-5 py-3 text-sm font-semibold text-white">
                  Store dashboard
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <StoreDashboardVisual />
            </article>

            <article className="mt-20 grid items-center gap-10 lg:grid-cols-[1.18fr_0.82fr]">
              <div className="lg:order-2">
                <span className="inline-flex rounded-full border border-[#dbd3ff] bg-[#eeeaff] px-3 py-1.5 text-xs font-bold tracking-[0.08em] text-[#5a40c3]">
                  FOR THE VENDOR
                </span>
                <h3 className="mt-4 text-3xl font-bold tracking-tight">Book the aisle, then watch the flight.</h3>
                <p className="mt-3 text-[#63738d]">
                  Choose the branches and departments, set the dates, and read the result for that booking. Shopper names stay with the store.
                </p>
                <ul className="mt-6 space-y-3">
                  {vendorPoints.map((point) => (
                    <li key={point} className="flex items-start gap-3 text-sm text-[#485e7c]">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#eeeaff] text-[11px] font-bold text-[#674bd1]">✓</span>
                      {point}
                    </li>
                  ))}
                </ul>
                <Link href="/vendor/proximity" className="mt-6 inline-flex items-center gap-2 rounded-xl border border-[#ccd9ec] bg-white px-5 py-3 text-sm font-semibold text-[#0c0528]">
                  Vendor portal
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="lg:order-1">
                <VendorDashboardVisual />
              </div>
            </article>
          </div>
        </section>

        <section className="bg-[#f6f8ff] py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <ScrollReveal>
              <div className="max-w-2xl">
                <h2 className="text-4xl font-bold tracking-tight md:text-5xl">Product sections, not shelves</h2>
                <p className="mt-4 text-lg text-[#555]">
                  A section is a department. Adjacent bays often share a signal, so the offer belongs to the area, not one facing.
                </p>
              </div>
            </ScrollReveal>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sections.map((section) => (
                <article key={section.name} className="overflow-hidden rounded-3xl border border-white bg-white shadow-sm">
                  <div className="relative h-44">
                    <Image src={section.image} alt={`${section.name} product section in a supermarket`} fill sizes="(max-width: 640px) 100vw, 360px" className="object-cover" />
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-semibold">{section.name}</h3>
                    <p className="mt-2 text-sm text-[#555]">{section.note}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <ScrollReveal>
              <div className="max-w-2xl">
                <h2 className="text-4xl font-bold tracking-tight md:text-5xl">What gets counted</h2>
                <p className="mt-4 text-lg text-[#555]">
                  A shopper with the phone in a pocket, Bluetooth off, or the app closed is not reached. A till purchase without a claim is not measured.
                </p>
              </div>
            </ScrollReveal>
            <div className="mt-12 grid gap-4 md:grid-cols-3">
              {counted.map((item) => (
                <article key={item.label} className="rounded-3xl border border-[#eaeaea] p-6">
                  <Ticket className="h-6 w-6 text-[#0B33B7]" />
                  <h3 className="mt-4 text-xl font-semibold">{item.label}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#555]">{item.detail}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#f6f8ff] py-24" id="faq">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <ScrollReveal>
              <div className="text-center">
                <h2 className="text-4xl font-bold tracking-tight md:text-5xl">Before you start</h2>
                <p className="mt-4 text-lg text-[#555]">What the signal can do, and what the vendor is allowed to see.</p>
              </div>
            </ScrollReveal>
            <div className="mt-10 space-y-3">
              {faqs.map((item) => (
                <details key={item.q} className="group rounded-2xl border border-[#e0e8f4] bg-white px-5">
                  <summary className="cursor-pointer list-none py-4 pr-8 font-semibold text-[#0c0528] [&::-webkit-details-marker]:hidden">
                    <span className="flex items-center justify-between gap-4">
                      {item.q}
                      <span className="text-xl font-normal text-[#0B33B7] group-open:hidden">+</span>
                      <span className="hidden text-xl font-normal text-[#0B33B7] group-open:inline">−</span>
                    </span>
                  </summary>
                  <p className="pb-4 text-sm leading-relaxed text-[#62728e]">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="py-24" style={{ background: 'linear-gradient(135deg, #0c0528 0%, #0B33B7 60%, #082a94 100%)' }}>
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="text-4xl font-bold tracking-tight text-white md:text-5xl">
              Bring offers to the aisle.
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-white/80">
              Stores set up the sections. Vendors book them. Shoppers see the card where they are already standing.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-4 font-semibold text-[#0B33B7] shadow-xl"
              >
                Talk to us
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/dashboard/proximity"
                className="inline-flex items-center rounded-2xl border border-white/30 px-8 py-4 font-semibold text-white"
              >
                Store dashboard
              </Link>
              <Link
                href="/vendor/proximity"
                className="inline-flex items-center rounded-2xl border border-white/30 px-8 py-4 font-semibold text-white"
              >
                Vendor portal
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function MockSidebar({
  label,
  items,
  active,
}: Readonly<{ label: string; items: string[]; active: string }>) {
  return (
    <aside className="hidden bg-gradient-to-b from-[#102d60] to-[#081c3d] p-3 text-white sm:block">
      <p className="text-[11px] font-bold">DukaNest</p>
      <p className="mt-0.5 text-[9px] uppercase tracking-[0.12em] text-[#8fb8eb]">{label}</p>
      <nav className="mt-4 space-y-1 text-[11px] font-semibold">
        {items.map((item) => (
          <p key={item} className={item === active ? 'rounded-lg bg-[#216eea] px-2 py-2' : 'rounded-lg px-2 py-2 text-[#c8d8f1]'}>
            {item}
          </p>
        ))}
      </nav>
    </aside>
  );
}

function StoreDashboardVisual() {
  const metrics = [
    { label: 'Live campaigns', value: '6' },
    { label: 'On-screen', value: '12,480' },
    { label: 'Claims', value: '316' },
    { label: 'Beacons online', value: '4 / 5', note: '1 low battery' },
  ];
  const zones = [
    { name: 'Beverages', place: 'Aisle area · Beacon 03', status: 'Online', low: false },
    { name: 'Beauty', place: 'Display · Beacon 06', status: 'Online', low: false },
    { name: 'Electronics', place: 'End display · Beacon 09', status: 'Low battery', low: true },
    { name: 'Checkout', place: 'Exit lane · Beacon 10', status: 'Online', low: false },
  ];
  const beacons = [
    'left-[18%] top-[34%] bg-[#1787f5]',
    'left-[62%] top-[34%] bg-[#12a98c]',
    'left-[46%] top-[58%] bg-[#8a6bf4]',
    'left-[16%] top-[78%] bg-[#12a98c]',
    'left-[80%] top-[78%] bg-[#e9a12c]',
  ];

  return (
    <div className="overflow-hidden rounded-[1.25rem] border border-[#d7e4f5] bg-[#f3f7fd] shadow-[0_24px_60px_rgba(18,51,107,0.13)]">
      <div className="sm:grid sm:grid-cols-[7.5rem_1fr]">
        <MockSidebar label="Proximity" items={['Overview', 'Branches', 'Zones', 'Campaigns']} active="Zones" />
        <div className="min-w-0 bg-[#f5f8fd] p-3">
          <div className="mb-3 flex flex-wrap gap-1 sm:hidden">
            {['Overview', 'Zones', 'Campaigns'].map((tab) => (
              <span key={tab} className={tab === 'Zones' ? 'rounded-full bg-[#216eea] px-2.5 py-1 text-[11px] font-semibold text-white' : 'rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-[#355cad] ring-1 ring-[#d7e4f5]'}>
                {tab}
              </span>
            ))}
          </div>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-[#102b58]">Westlands Market</p>
              <p className="text-[11px] text-[#7889a3]">Branches / Westlands / Zones</p>
            </div>
            <span className="rounded-full bg-[#ddf8ef] px-2 py-1 text-[10px] font-bold text-[#07876b]">Beacons reporting</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 xl:grid-cols-4">
            {metrics.map((metric) => (
              <div key={metric.label} className="rounded-lg border border-[#e0e9f6] bg-white p-2.5">
                <p className="text-[10px] text-[#7889a3]">{metric.label}</p>
                <p className="mt-1 text-base font-bold tracking-tight text-[#10336b]">{metric.value}</p>
                {metric.note ? <p className="text-[10px] font-semibold text-[#d68b19]">{metric.note}</p> : null}
              </div>
            ))}
          </div>
          <div className="mt-2 grid gap-2 lg:grid-cols-2">
            <div className="rounded-lg border border-[#e0e9f6] bg-white p-2.5">
              <p className="text-xs font-semibold text-[#102b58]">Branch layout</p>
              <p className="text-[10px] text-[#8a98ae]">Westlands · ground floor</p>
              <div className="relative mt-2 h-36 overflow-hidden rounded-md border border-[#e3ebf6] bg-gradient-to-br from-[#fbfdff] to-[#edf4fd]">
                <span className="absolute left-[38%] top-[4%] rounded bg-[#e1edff] px-1.5 py-0.5 text-[9px] font-bold text-[#315783]">ENTRANCE</span>
                <span className="absolute left-[8%] top-[28%] h-2.5 w-[84%] rounded bg-[#dde7f4]" />
                <span className="absolute left-[8%] top-[52%] h-2.5 w-[84%] rounded bg-[#dde7f4]" />
                <span className="absolute left-[8%] top-[76%] h-2.5 w-[84%] rounded bg-[#dde7f4]" />
                <span className="absolute left-[6%] top-[12%] rounded bg-white/90 px-1 py-0.5 text-[9px] font-bold text-[#586b87]">Beverages</span>
                <span className="absolute right-[6%] top-[12%] rounded bg-white/90 px-1 py-0.5 text-[9px] font-bold text-[#586b87]">Beauty</span>
                <span className="absolute bottom-[6%] left-[6%] rounded bg-white/90 px-1 py-0.5 text-[9px] font-bold text-[#586b87]">Checkout</span>
                {beacons.map((place) => (
                  <span key={place} className={`absolute h-3 w-3 rounded-full border-2 border-white shadow ${place}`} />
                ))}
              </div>
              <p className="mt-2 text-[10px] text-[#8090a8]">Blue, green, and amber dots are beacon placements.</p>
            </div>
            <div className="rounded-lg border border-[#e0e9f6] bg-white p-2.5">
              <p className="text-xs font-semibold text-[#102b58]">Sections and beacons</p>
              <ul className="mt-2">
                {zones.map((zone) => (
                  <li key={zone.name} className="flex items-center justify-between gap-2 border-t border-[#edf1f7] py-2 first:border-t-0">
                    <span>
                      <span className="block text-[11px] font-semibold text-[#183963]">{zone.name}</span>
                      <span className="block text-[10px] text-[#8492a9]">{zone.place}</span>
                    </span>
                    <span className={zone.low ? 'rounded-full bg-[#fff1d8] px-2 py-0.5 text-[10px] font-bold text-[#9a6413]' : 'rounded-full bg-[#e0f8f0] px-2 py-0.5 text-[10px] font-bold text-[#07856c]'}>
                      {zone.status}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-2 rounded-lg border border-[#e0e9f6] bg-white p-2.5">
            <p className="text-xs font-semibold text-[#102b58]">Waiting for approval</p>
            <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
              <span><span className="font-semibold text-[#1b365f]">Glow Care</span> · Beauty · 5–20 Oct</span>
              <span className="rounded-full bg-[#e7f0ff] px-2 py-0.5 text-[10px] font-bold text-[#245db3]">Review</span>
            </div>
          </div>
          <p className="mt-2 text-right text-[10px] text-[#8a98ad]">Illustrative dashboard · sample branch and counts</p>
        </div>
      </div>
    </div>
  );
}

function VendorDashboardVisual() {
  const metrics = [
    { label: 'On-screen', value: '6,240' },
    { label: 'Clicks', value: '914' },
    { label: 'Claims', value: '128' },
  ];
  const funnel = [
    { label: 'On screen', value: '6,240', color: 'bg-[#1473e6]' },
    { label: 'Clicked', value: '914', color: 'bg-[#16a5c7]' },
    { label: 'Claimed', value: '128', color: 'bg-[#25b879]' },
  ];
  const branches = [
    { name: 'Westlands', views: '6,240', width: '100%' },
    { name: 'Kilimani', views: '4,110', width: '66%' },
    { name: 'Karen', views: '2,180', width: '35%' },
  ];

  return (
    <div className="overflow-hidden rounded-[1.25rem] border border-[#dddff6] bg-[#f7f7ff] shadow-[0_24px_60px_rgba(18,51,107,0.13)]">
      <div className="sm:grid sm:grid-cols-[7.5rem_1fr]">
        <MockSidebar label="Advertiser" items={['Overview', 'Campaigns', 'Create', 'Invoices']} active="Overview" />
        <div className="min-w-0 p-3">
          <div className="flex flex-wrap gap-1 sm:hidden">
            {['Overview', 'Campaigns', 'Create'].map((tab, index) => (
              <span key={tab} className={index === 0 ? 'rounded-full bg-[#216eea] px-2.5 py-1 text-[11px] font-semibold text-white' : 'rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-[#355cad] ring-1 ring-[#dddff6]'}>
                {tab}
              </span>
            ))}
          </div>
          <p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-[#355cad] sm:mt-0">Advertiser account</p>
          <p className="text-sm font-semibold text-[#12376a]">Nairobi Tea Co.</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {metrics.map((metric) => (
              <div key={metric.label} className="rounded-lg border border-[#e0e9f6] bg-white p-2">
                <p className="text-[10px] text-slate-500">{metric.label}</p>
                <p className="mt-1 text-sm font-bold text-[#12376a]">{metric.value}</p>
              </div>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {funnel.map((step) => (
              <div key={step.label} className={`${step.color} rounded-lg px-2 py-3 text-center text-white`}>
                <p className="text-sm font-bold">{step.value}</p>
                <p className="text-[10px]">{step.label}</p>
              </div>
            ))}
          </div>
          <div className="mt-2 rounded-lg border border-[#e0e9f6] bg-white p-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-[#12376a]">On-screen by branch</p>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Live</span>
            </div>
            <ul className="mt-2 space-y-2">
              {branches.map((branch) => (
                <li key={branch.name} className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-2 text-[11px]">
                  <span className="text-[#5d718d]">{branch.name}</span>
                  <span className="h-1.5 overflow-hidden rounded-full bg-[#eaf0fa]">
                    <span className="block h-full rounded-full bg-[#2166e8]" style={{ width: branch.width }} />
                  </span>
                  <span className="font-semibold text-[#183963]">{branch.views}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[10px] leading-relaxed text-slate-500">Beverages · 6 Oct – 19 Oct. Counts are for this booking. No shopper names.</p>
          </div>
          <p className="mt-2 text-right text-[10px] text-[#8a98ad]">Illustrative dashboard · sample counts, not campaign results</p>
        </div>
      </div>
    </div>
  );
}
