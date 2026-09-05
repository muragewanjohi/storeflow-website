import { buildRewardChecklistProgress } from '@/lib/onboarding/reward-checklist-progress';
import type { HomepageInstallSnapshot } from '@/lib/onboarding/homepage-section-utils';

const TENANT_ID = '11111111-1111-1111-1111-111111111111';
const UNSPLASH = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200';
const MERCHANT = `https://cdn.example.com/media/${TENANT_ID}/hero.jpg`;

const snapshot: HomepageInstallSnapshot = {
  captured_at: '2026-01-01T00:00:00.000Z',
  hero: { image: UNSPLASH, description: '' },
  banners: [{ id: 'banner-1', image: UNSPLASH, title: 'Banner title' }],
  split_layout: { left_side_image: UNSPLASH },
};

function buildHomeContent(overrides?: {
  heroImage?: string;
  heroDescription?: string;
  bannerTitle?: string;
  splitImage?: string;
}) {
  return JSON.stringify({
    sections: [
      {
        type: 'hero',
        id: 'hero-1',
        order: 0,
        title: 'Welcome',
        image: overrides?.heroImage ?? UNSPLASH,
        description: overrides?.heroDescription ?? '',
      },
      {
        type: 'banners',
        id: 'banners-1',
        order: 1,
        banners: [
          {
            id: 'banner-1',
            title: overrides?.bannerTitle ?? 'Banner title',
            image: UNSPLASH,
          },
        ],
      },
      {
        type: 'split_layout',
        id: 'split-1',
        order: 2,
        left_side: { type: 'banner', image: overrides?.splitImage ?? UNSPLASH },
        right_side: { type: 'text', content: 'Hello' },
      },
    ],
  });
}

describe('buildRewardChecklistProgress', () => {
  it('starts incomplete for default homepage and minimal catalog', () => {
    const progress = buildRewardChecklistProgress({
      productCount: 1,
      categoryCount: 1,
      activeSaleCount: 0,
      maxProductsOnActiveSale: 0,
      homePageContent: buildHomeContent(),
      homepageInstallSnapshot: snapshot,
      tenantId: TENANT_ID,
    });

    expect(progress.allComplete).toBe(false);
    expect(progress.completedCount).toBe(0);
    expect(progress.items.find((item) => item.id === 'hero_image')?.completed).toBe(false);
  });

  it('completes all steps when thresholds are met', () => {
    const progress = buildRewardChecklistProgress({
      productCount: 5,
      categoryCount: 2,
      activeSaleCount: 1,
      maxProductsOnActiveSale: 2,
      homePageContent: buildHomeContent({
        heroImage: MERCHANT,
        heroDescription: 'Fresh local produce',
        bannerTitle: 'New season deals',
        splitImage: MERCHANT,
      }),
      homepageInstallSnapshot: snapshot,
      tenantId: TENANT_ID,
    });

    expect(progress.allComplete).toBe(true);
    expect(progress.completedCount).toBe(8);
    expect(progress.progressPercent).toBe(100);
  });
});
