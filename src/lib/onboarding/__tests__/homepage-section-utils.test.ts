import {
  evaluateBannerUpdated,
  evaluateHeroDescription,
  evaluateHeroImage,
  evaluateSplitLayoutImage,
  extractHomepageInstallSnapshot,
  isCustomizedImage,
  isMerchantMediaUrl,
  isStockPlaceholderUrl,
  type HomepageInstallSnapshot,
} from '@/lib/onboarding/homepage-section-utils';
import type { HeroSection, BannersSection, SplitLayoutSection } from '@/lib/content/page-builder-types';

const TENANT_ID = '11111111-1111-1111-1111-111111111111';
const UNSPLASH = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200';
const MERCHANT = `https://cdn.example.com/media/${TENANT_ID}/hero.jpg`;

describe('homepage-section-utils', () => {
  const snapshot: HomepageInstallSnapshot = {
    captured_at: '2026-01-01T00:00:00.000Z',
    hero: {
      image: UNSPLASH,
      description: '',
      subtitle: 'Default subtitle',
    },
    banners: [
      {
        id: 'banner-1',
        image: UNSPLASH,
        title: 'Banner title',
        subtitle: 'Banner subtitle',
      },
    ],
    split_layout: {
      left_side_image: UNSPLASH,
    },
  };

  it('detects stock placeholder urls', () => {
    expect(isStockPlaceholderUrl(UNSPLASH)).toBe(true);
    expect(isStockPlaceholderUrl(MERCHANT)).toBe(false);
  });

  it('detects merchant media urls', () => {
    expect(isMerchantMediaUrl(MERCHANT, TENANT_ID)).toBe(true);
    expect(isMerchantMediaUrl(UNSPLASH, TENANT_ID)).toBe(false);
  });

  it('marks hero image incomplete when still on default unsplash', () => {
    const hero = { type: 'hero', id: 'h1', order: 0, title: 'Hi', image: UNSPLASH } as HeroSection;
    expect(evaluateHeroImage(hero, snapshot, TENANT_ID)).toBe(false);
  });

  it('marks hero image complete when merchant media is used', () => {
    const hero = { type: 'hero', id: 'h1', order: 0, title: 'Hi', image: MERCHANT } as HeroSection;
    expect(evaluateHeroImage(hero, snapshot, TENANT_ID)).toBe(true);
  });

  it('marks hero description complete when description differs from snapshot', () => {
    const hero = {
      type: 'hero',
      id: 'h1',
      order: 0,
      title: 'Hi',
      description: 'Our fresh catalog',
    } as HeroSection;
    expect(evaluateHeroDescription(hero, snapshot)).toBe(true);
  });

  it('marks banner updated when title changes', () => {
    const bannersSection = {
      type: 'banners',
      id: 'b1',
      order: 1,
      banners: [
        {
          id: 'banner-1',
          title: 'Updated banner title',
          image: UNSPLASH,
        },
      ],
    } as BannersSection;

    expect(evaluateBannerUpdated(bannersSection, snapshot, TENANT_ID)).toBe(true);
  });

  it('extracts snapshot fields from page builder data', () => {
    const snapshotResult = extractHomepageInstallSnapshot({
      sections: [
        {
          type: 'hero',
          id: 'hero-1',
          order: 0,
          title: 'Welcome',
          image: UNSPLASH,
          description: '',
        },
        {
          type: 'split_layout',
          id: 'split-1',
          order: 2,
          left_side: { type: 'banner', image: UNSPLASH },
          right_side: { type: 'text', content: 'Hello' },
        },
      ],
    });

    expect(snapshotResult.hero?.image).toBe(UNSPLASH);
    expect(snapshotResult.split_layout?.left_side_image).toBe(UNSPLASH);
  });

  it('uses hybrid image rule without snapshot', () => {
    expect(isCustomizedImage(MERCHANT, undefined, TENANT_ID)).toBe(true);
    expect(isCustomizedImage(UNSPLASH, undefined, TENANT_ID)).toBe(false);
    expect(isCustomizedImage('https://example.com/custom.jpg', undefined, TENANT_ID)).toBe(true);
  });

  it('marks split layout image complete when changed from snapshot', () => {
    const splitLayout = {
      type: 'split_layout',
      id: 'split-1',
      order: 2,
      left_side: { type: 'banner', image: MERCHANT },
      right_side: { type: 'text', content: 'Hello' },
    } as SplitLayoutSection;

    expect(evaluateSplitLayoutImage(splitLayout, snapshot, TENANT_ID)).toBe(true);
  });
});
