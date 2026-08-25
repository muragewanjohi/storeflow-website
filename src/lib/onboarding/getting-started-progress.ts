export interface GettingStartedItem {
  id: string;
  label: string;
  description: string;
  completed: boolean;
}

export interface GettingStartedProgressSummary {
  items: GettingStartedItem[];
  completedCount: number;
  totalCount: number;
  progressPercent: number;
}

export const GETTING_STARTED_OPTION_NAMES = [
  'getting_started_previewed_store',
  'getting_started_shared_link',
  'getting_started_tried_assistant',
  'store_phone',
  'store_logo',
  'shipping_enabled',
  'shipping_method_type',
  'flat_rate_amount',
  'payment_cash_enabled',
  'payment_mpesa_enabled',
  'payment_mpesa_send_money_number',
  'payment_mpesa_buy_goods_till',
  'payment_mpesa_paybill_number',
  'payment_mpesa_paybill_account',
] as const;

type SettingsMap = Record<string, string | null | undefined>;

interface BuildProgressInput {
  /** Active merchant-created products (same semantics as dashboard count query). */
  productCount: number;
  /** Product categories for this tenant (any row in `categories` for the tenant). */
  categoryCount?: number;
  activeDemoProductCount?: number;
  deliveryZoneCount: number;
  settings: SettingsMap;
  /**
   * Include the 'assistant' item ("Try the DukaNest Assistant"). Defaults to
   * false — the Dashboard AI Assistant (DA.0-DA.7) is web-only today, so
   * including it unconditionally would silently inflate totalCount for
   * callers with no UI for it, making 100% completion unreachable. The web
   * getting-started route (src/app/api/dashboard/getting-started/route.ts)
   * opts in explicitly; the mobile route
   * (src/app/api/v1/mobile/dashboard/getting-started/route.ts) does not —
   * found and fixed as a real regression when the user asked "is this for
   * both web and Flutter?", which prompted checking. Flip this once Flutter
   * has its own assistant entry point to link to.
   */
  includeAssistantItem?: boolean;
}

function hasValue(value: string | null | undefined): boolean {
  return !!(value && value.trim().length > 0);
}

export function buildGettingStartedProgress(input: BuildProgressInput): GettingStartedProgressSummary {
  const { productCount, categoryCount = 0, activeDemoProductCount = 0, deliveryZoneCount, settings, includeAssistantItem = false } = input;

  const hasLogo = hasValue(settings.store_logo);
  const hasContactPhone = hasValue(settings.store_phone);

  const flatRateSet =
    settings.flat_rate_amount != null &&
    settings.flat_rate_amount !== '' &&
    !isNaN(parseFloat(String(settings.flat_rate_amount)));

  const hasShipping =
    settings.shipping_enabled === 'true' &&
    (settings.shipping_method_type === 'delivery_zones' ? deliveryZoneCount > 0 : flatRateSet);

  const hasPayment =
    settings.payment_cash_enabled === 'true' ||
    (settings.payment_mpesa_enabled === 'true' &&
      (hasValue(settings.payment_mpesa_send_money_number) ||
        hasValue(settings.payment_mpesa_buy_goods_till) ||
        hasValue(settings.payment_mpesa_paybill_number)));

  const items: GettingStartedItem[] = [
    {
      id: 'category',
      label: 'Create your first category',
      description: 'Organize your catalog so products are easy to find',
      completed: categoryCount > 0,
    },
    {
      id: 'product',
      label: 'Add your first product',
      description: 'Create a product so customers can start buying',
      completed: productCount > 0,
    },
    {
      id: 'preview',
      label: 'Preview your store',
      description: 'Open your storefront in a new tab and confirm it looks right',
      completed: settings.getting_started_previewed_store === 'true',
    },
    {
      id: 'share',
      label: 'Share your store link',
      description: 'Copy and share your store URL with customers',
      completed: settings.getting_started_shared_link === 'true',
    },
    {
      id: 'contact_phone',
      label: 'Get order alerts via SMS',
      description: 'Add your phone number so you never miss a customer order',
      completed: hasContactPhone,
    },
    {
      id: 'payment',
      label: 'Set up checkout preferences',
      description: 'Enable Cash, M-Pesa, or other payment methods',
      completed: hasPayment,
    },
    {
      id: 'delivery',
      label: 'Configure delivery & shipping',
      description: 'Set up flat rate or delivery zones for orders',
      completed: hasShipping,
    },
    {
      id: 'logo',
      label: 'Add your store logo',
      description: 'Brand your storefront with a logo',
      completed: hasLogo,
    },
  ];

  // Web-only for now — see includeAssistantItem's doc comment above.
  if (includeAssistantItem) {
    items.push({
      id: 'assistant',
      label: 'Try the DukaNest Assistant',
      description: 'Ask it a question — about your store, a feature, or what to do next',
      completed: settings.getting_started_tried_assistant === 'true',
    });
  }

  // Only show this step when sample/demo products actually exist.
  if (activeDemoProductCount > 0) {
    items.push({
      id: 'demo_products',
      label: 'Remove demo products',
      description: 'Clear sample products once your real catalog is ready',
      completed: false,
    });
  }

  const completedCount = items.filter((item) => item.completed).length;
  const totalCount = items.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return {
    items,
    completedCount,
    totalCount,
    progressPercent,
  };
}
