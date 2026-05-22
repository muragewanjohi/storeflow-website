import type {
  BannersSection,
  HeroSection,
  PageSection,
  SplitLayoutSection,
} from '@/lib/content/page-builder-types';
import {
  evaluateBannerUpdated,
  evaluateHeroDescription,
  evaluateHeroImage,
  evaluateSplitLayoutImage,
  findFirstVisibleSection,
  type HomepageInstallSnapshot,
  parsePageBuilderContent,
} from '@/lib/onboarding/homepage-section-utils';

export interface RewardChecklistItem {
  id: string;
  label: string;
  description: string;
  completed: boolean;
}

export interface RewardChecklistProgressSummary {
  items: RewardChecklistItem[];
  completedCount: number;
  totalCount: number;
  progressPercent: number;
  allComplete: boolean;
}

export interface BuildRewardChecklistInput {
  productCount: number;
  categoryCount: number;
  activeSaleCount: number;
  maxProductsOnActiveSale: number;
  homePageContent: string | null | undefined;
  homepageInstallSnapshot?: HomepageInstallSnapshot | null;
  tenantId: string;
}

function buildCompletionFlags(input: BuildRewardChecklistInput) {
  const pageBuilder = parsePageBuilderContent(input.homePageContent);
  const sections: PageSection[] = pageBuilder?.sections ?? [];
  const snapshot = input.homepageInstallSnapshot ?? null;

  const hero = findFirstVisibleSection(sections, 'hero') as HeroSection | null;
  const bannersSection = findFirstVisibleSection(sections, 'banners') as BannersSection | null;
  const splitLayout = findFirstVisibleSection(sections, 'split_layout') as SplitLayoutSection | null;

  return {
    products_five: input.productCount >= 5,
    categories_two: input.categoryCount >= 2,
    hero_image: evaluateHeroImage(hero, snapshot, input.tenantId),
    hero_description: evaluateHeroDescription(hero, snapshot),
    sale_active: input.activeSaleCount >= 1,
    sale_products_two: input.maxProductsOnActiveSale >= 2,
    banner_updated: evaluateBannerUpdated(bannersSection, snapshot, input.tenantId),
    split_layout_image: evaluateSplitLayoutImage(splitLayout, snapshot, input.tenantId),
  };
}

export function buildRewardChecklistProgress(
  input: BuildRewardChecklistInput,
): RewardChecklistProgressSummary {
  const completion = buildCompletionFlags(input);

  const items: RewardChecklistItem[] = [
    {
      id: 'products_five',
      label: 'Add 5 products',
      description: 'Build a catalog with at least five active products',
      completed: completion.products_five,
    },
    {
      id: 'categories_two',
      label: 'Create 2 categories',
      description: 'Organize products into at least two categories',
      completed: completion.categories_two,
    },
    {
      id: 'hero_image',
      label: 'Set your hero image',
      description: 'Upload or replace the hero banner on your homepage',
      completed: completion.hero_image,
    },
    {
      id: 'hero_description',
      label: 'Set your hero description',
      description: 'Add a description to your homepage hero section',
      completed: completion.hero_description,
    },
    {
      id: 'sale_active',
      label: 'Create a sale',
      description: 'Launch at least one active sale campaign',
      completed: completion.sale_active,
    },
    {
      id: 'sale_products_two',
      label: 'Add 2 products to a sale',
      description: 'Include at least two products in one of your active sales',
      completed: completion.sale_products_two,
    },
    {
      id: 'banner_updated',
      label: 'Update a homepage banner',
      description: 'Customize at least one banner on your homepage',
      completed: completion.banner_updated,
    },
    {
      id: 'split_layout_image',
      label: 'Set split layout image',
      description: 'Replace the left-side image in your homepage split layout',
      completed: completion.split_layout_image,
    },
  ];

  const completedCount = items.filter((item) => item.completed).length;
  const totalCount = items.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return {
    items,
    completedCount,
    totalCount,
    progressPercent,
    allComplete: completedCount === totalCount,
  };
}
