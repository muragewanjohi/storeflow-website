'use client';

const items = [
  'Online Store',
  'M-Pesa Payments',
  'Inventory Tracking',
  'Delivery Zones',
  'WhatsApp Orders',
  'Mobile App',
  'Beautiful Themes',
  'Zero Coding',
  '14-Day Free Trial',
  'Kenyan Businesses',
];

export function LandingMarquee() {
  const doubled = [...items, ...items];

  return (
    <div className="relative overflow-hidden border-y border-[#0025cc]/10 bg-white/80 py-4 backdrop-blur-sm">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-white to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-white to-transparent" />
      <div className="flex animate-marquee whitespace-nowrap">
        {doubled.map((item, i) => (
          <span
            key={`${item}-${i}`}
            className="mx-6 flex items-center gap-3 text-sm font-medium tracking-wide text-[#0c0528]/70"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#0025cc]" />
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
