import type {
  BannersSection,
  HeroSection,
  PageBuilderData,
  PageSection,
  SplitLayoutSection,
} from '@/lib/content/page-builder-types';

export interface HomepageInstallSnapshot {
  captured_at: string;
  hero?: {
    image?: string;
    banner_image?: string;
    description?: string;
    subtitle?: string;
  };
  banners?: Array<{
    id: string;
    image?: string;
    title?: string;
    subtitle?: string;
  }>;
  split_layout?: {
    left_side_image?: string;
  };
}

const STOCK_IMAGE_HOSTS = ['images.unsplash.com', 'plus.unsplash.com', 'source.unsplash.com'];

export function parsePageBuilderContent(content: string | null | undefined): PageBuilderData | null {
  if (!content || !content.trim()) return null;
  try {
    const parsed = JSON.parse(content) as PageBuilderData;
    if (!parsed || !Array.isArray(parsed.sections)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function findFirstVisibleSection<T extends PageSection['type']>(
  sections: PageSection[],
  type: T,
): Extract<PageSection, { type: T }> | null {
  const match = sections.find((section) => section.type === type && !section.hidden);
  return (match as Extract<PageSection, { type: T }> | undefined) ?? null;
}

export function hasNonEmptyText(value: string | null | undefined): boolean {
  return !!(value && value.trim().length > 0);
}

export function isMerchantMediaUrl(url: string | null | undefined, tenantId: string): boolean {
  if (!url || !url.trim()) return false;
  const normalized = url.trim().toLowerCase();
  const tenantSegment = `media/${tenantId.toLowerCase()}/`;
  return normalized.includes(tenantSegment);
}

export function isStockPlaceholderUrl(url: string | null | undefined): boolean {
  if (!url || !url.trim()) return true;
  const normalized = url.trim().toLowerCase();
  if (normalized.startsWith('blob:')) return true;
  try {
    const host = new URL(normalized).hostname.toLowerCase();
    return STOCK_IMAGE_HOSTS.some((stockHost) => host === stockHost || host.endsWith(`.${stockHost}`));
  } catch {
    return false;
  }
}

export function isCustomizedImage(
  currentUrl: string | null | undefined,
  snapshotUrl: string | null | undefined,
  tenantId: string,
): boolean {
  if (!hasNonEmptyText(currentUrl)) return false;
  const current = currentUrl!.trim();
  if (isMerchantMediaUrl(current, tenantId)) return true;
  if (snapshotUrl != null && current !== snapshotUrl.trim()) return true;
  if (snapshotUrl == null && !isStockPlaceholderUrl(current)) return true;
  return false;
}

export function isCustomizedText(
  currentValue: string | null | undefined,
  snapshotValue: string | null | undefined,
): boolean {
  if (!hasNonEmptyText(currentValue)) return false;
  const current = currentValue!.trim();
  if (snapshotValue == null) return true;
  return current !== snapshotValue.trim();
}

export function extractHomepageInstallSnapshot(pageBuilderData: unknown): HomepageInstallSnapshot {
  const snapshot: HomepageInstallSnapshot = {
    captured_at: new Date().toISOString(),
  };

  if (
    !pageBuilderData ||
    typeof pageBuilderData !== 'object' ||
    !('sections' in pageBuilderData) ||
    !Array.isArray((pageBuilderData as PageBuilderData).sections)
  ) {
    return snapshot;
  }

  const sections = (pageBuilderData as PageBuilderData).sections;
  const hero = findFirstVisibleSection(sections, 'hero') as HeroSection | null;
  if (hero) {
    snapshot.hero = {
      image: hero.image,
      banner_image: hero.banner_image,
      description: hero.description,
      subtitle: hero.subtitle,
    };
  }

  const bannersSection = findFirstVisibleSection(sections, 'banners') as BannersSection | null;
  if (bannersSection?.banners?.length) {
    snapshot.banners = bannersSection.banners.map((banner) => ({
      id: banner.id,
      image: banner.image,
      title: banner.title,
      subtitle: banner.subtitle,
    }));
  }

  const splitLayout = findFirstVisibleSection(sections, 'split_layout') as SplitLayoutSection | null;
  if (splitLayout?.left_side?.image) {
    snapshot.split_layout = {
      left_side_image: splitLayout.left_side.image,
    };
  }

  return snapshot;
}

export function evaluateHeroImage(
  hero: HeroSection | null,
  snapshot: HomepageInstallSnapshot | null | undefined,
  tenantId: string,
): boolean {
  if (!hero) return false;
  const snapshotHero = snapshot?.hero;
  return (
    isCustomizedImage(hero.image, snapshotHero?.image, tenantId) ||
    isCustomizedImage(hero.banner_image, snapshotHero?.banner_image, tenantId)
  );
}

export function evaluateHeroDescription(
  hero: HeroSection | null,
  snapshot: HomepageInstallSnapshot | null | undefined,
): boolean {
  if (!hero) return false;
  return isCustomizedText(hero.description, snapshot?.hero?.description);
}

export function evaluateBannerUpdated(
  bannersSection: BannersSection | null,
  snapshot: HomepageInstallSnapshot | null | undefined,
  tenantId: string,
): boolean {
  if (!bannersSection?.banners?.length) return false;
  const snapshotById = new Map((snapshot?.banners ?? []).map((banner) => [banner.id, banner]));

  return bannersSection.banners.some((banner) => {
    const snapshotBanner = snapshotById.get(banner.id);
    return (
      isCustomizedImage(banner.image, snapshotBanner?.image, tenantId) ||
      isCustomizedText(banner.title, snapshotBanner?.title) ||
      isCustomizedText(banner.subtitle, snapshotBanner?.subtitle)
    );
  });
}

export function evaluateSplitLayoutImage(
  splitLayout: SplitLayoutSection | null,
  snapshot: HomepageInstallSnapshot | null | undefined,
  tenantId: string,
): boolean {
  if (!splitLayout?.left_side) return false;
  return isCustomizedImage(
    splitLayout.left_side.image,
    snapshot?.split_layout?.left_side_image,
    tenantId,
  );
}
