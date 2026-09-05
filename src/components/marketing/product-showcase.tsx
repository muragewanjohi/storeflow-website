'use client';

import { ImageWithFallback } from './image-with-fallback';
import { ExpandableMarketingImage } from './expandable-marketing-image';
import { MOBILE_APP_FEATURES } from '@/lib/marketing/constants';

export function ProductShowcase() {
  return (
    <section id="features" className="bg-[#f8f9fb] py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <h2 className="text-4xl font-bold tracking-tight text-[#0c0528] md:text-5xl">
            Everything You Need To Run Your Business
          </h2>
          <p className="mt-4 text-lg text-[#8d8d8d]">
            Manage your entire store from the DukaNest mobile app — dashboard to payments.
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {MOBILE_APP_FEATURES.map((feature) => (
            <article
              key={feature.key}
              className="overflow-hidden rounded-3xl border border-[#0B33B7]/10 bg-white shadow-lg"
            >
              <div className="border-b border-[#eaeaea] px-6 py-4">
                <h3 className="text-lg font-semibold text-[#0c0528]">{feature.title}</h3>
                <p className="mt-1 text-sm text-[#8d8d8d]">{feature.description}</p>
              </div>
              <div className="p-4">
                <ExpandableMarketingImage
                  src={feature.image}
                  alt={`DukaNest mobile app — ${feature.title}`}
                  dialogTitle={`${feature.title} — full preview`}
                  buttonClassName="mx-auto block w-full max-w-[220px] rounded-2xl transition-shadow hover:shadow-lg"
                  fullWidth={640}
                  fullHeight={1280}
                >
                  <ImageWithFallback
                    src={feature.image}
                    alt={`DukaNest mobile app — ${feature.title}`}
                    width={640}
                    height={1280}
                    className="w-full rounded-2xl shadow-md"
                  />
                </ExpandableMarketingImage>
                <ul className="mt-4 space-y-2 text-sm text-[#555]">
                  {feature.highlights.map((item) => (
                    <li key={item} className="flex items-center gap-2 px-1">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#0B33B7]" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
