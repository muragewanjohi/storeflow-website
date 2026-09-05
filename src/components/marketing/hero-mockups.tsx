'use client';

import Image from 'next/image';
import { STOREFRONT_THEME_IMAGE } from '@/lib/marketing/constants';
import { ExpandableMarketingImage } from './expandable-marketing-image';

export function HeroMockups() {
  return (
    <div className="relative mx-auto hidden w-full max-w-[480px] lg:block">
      <ExpandableMarketingImage
        src={STOREFRONT_THEME_IMAGE}
        alt="Full DukaNest website preview — ClothesMall fashion theme"
        dialogTitle="Your website — full preview"
        buttonClassName="group w-full rounded-2xl border border-[#0B33B7]/10 bg-white p-2 shadow-[0_24px_60px_-12px_rgba(11,51,183,0.25)] transition-shadow hover:shadow-[0_28px_70px_-12px_rgba(11,51,183,0.35)]"
      >
        <div className="relative aspect-[9/10] max-h-[480px] w-full overflow-hidden rounded-xl">
          <Image
            src={STOREFRONT_THEME_IMAGE}
            alt="Example DukaNest website — ClothesMall fashion theme"
            fill
            sizes="(max-width: 1024px) 100vw, 480px"
            className="object-cover object-top"
            unoptimized
          />
        </div>
        <p className="mt-4 text-center text-sm font-medium text-[#0c0528] group-hover:text-[#0B33B7]">
          Your website
        </p>
      </ExpandableMarketingImage>
    </div>
  );
}
