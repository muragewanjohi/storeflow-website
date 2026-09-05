import type { RewardChecklistItem } from '@/lib/onboarding/reward-checklist-progress';

export interface RewardChecklistDisplayItem extends RewardChecklistItem {
  href: string;
  cta?: string;
  priority: number;
}

export function buildRewardChecklistDisplayItems(
  items: RewardChecklistItem[],
  options: {
    homePageEditHref: string;
  },
): RewardChecklistDisplayItem[] {
  const completionById = new Map(items.map((item) => [item.id, item.completed] as const));
  const homeEditor = options.homePageEditHref;

  return [
    {
      id: 'products_five',
      label: 'Add 5 products',
      description: 'Build a catalog with at least five active products',
      completed: completionById.get('products_five') ?? false,
      href: '/dashboard/products/new',
      cta: 'Add product',
      priority: 1,
    },
    {
      id: 'categories_two',
      label: 'Create 2 categories',
      description: 'Organize products into at least two categories',
      completed: completionById.get('categories_two') ?? false,
      href: '/dashboard/categories/new',
      cta: 'Add category',
      priority: 2,
    },
    {
      id: 'hero_image',
      label: 'Set your hero image',
      description: 'Upload or replace the hero banner on your homepage',
      completed: completionById.get('hero_image') ?? false,
      href: homeEditor,
      cta: 'Edit homepage',
      priority: 3,
    },
    {
      id: 'hero_description',
      label: 'Set your hero description',
      description: 'Add a description to your homepage hero section',
      completed: completionById.get('hero_description') ?? false,
      href: homeEditor,
      cta: 'Edit homepage',
      priority: 4,
    },
    {
      id: 'sale_active',
      label: 'Create a sale',
      description: 'Launch at least one active sale campaign',
      completed: completionById.get('sale_active') ?? false,
      href: '/dashboard/sales/new',
      cta: 'Create sale',
      priority: 5,
    },
    {
      id: 'sale_products_two',
      label: 'Add 2 products to a sale',
      description: 'Include at least two products in one of your active sales',
      completed: completionById.get('sale_products_two') ?? false,
      href: '/dashboard/sales',
      cta: 'Manage sales',
      priority: 6,
    },
    {
      id: 'banner_updated',
      label: 'Update a homepage banner',
      description: 'Customize at least one banner on your homepage',
      completed: completionById.get('banner_updated') ?? false,
      href: homeEditor,
      cta: 'Edit homepage',
      priority: 7,
    },
    {
      id: 'split_layout_image',
      label: 'Set split layout image',
      description: 'Replace the left-side image in your homepage split layout',
      completed: completionById.get('split_layout_image') ?? false,
      href: homeEditor,
      cta: 'Edit homepage',
      priority: 8,
    },
  ];
}
