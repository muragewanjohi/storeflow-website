export const BRAND = {
  primary: '#0B33B7',
  primaryDark: '#082a94',
  blue: '#0B33B7',
  blueDark: '#082a94',
  navy: '#0c0528',
  body: '#555555',
  muted: '#8d8d8d',
  lightBg: '#f6faff',
  sectionGray: '#f8f9fb',
} as const;

export const MARKETING_RADIUS = '1.5rem'; // 24px

export const PLAY_STORE_URL =
  process.env.NEXT_PUBLIC_PLAY_STORE_URL ??
  'https://play.google.com/store/apps/details?id=com.dukanest.dukanest_app';

export const PLAY_STORE_PACKAGE = 'com.dukanest.dukanest_app';

export const MOBILE_SCREENSHOTS = {
  home: '/images/marketing/mobile_home_screenshot.png',
  analytics: '/images/marketing/mobile_analytics_screenshot.png',
  orders: '/images/marketing/mobile_orders_screenshot.png',
  expenses: '/images/marketing/mobile_expenses_screenshot.png',
  storeSettings: '/images/marketing/mobile_store_settings_screenshot.png',
  tumizi: '/images/marketing/mobile_tumizi_screenshot.png',
} as const;

export const STOREFRONT_THEME_IMAGE = '/images/themes/clothes_multipurpose.png';

export const MOBILE_APP_FEATURES = [
  {
    key: 'home',
    title: 'Dashboard',
    description: 'Revenue, orders, and store health at a glance.',
    image: MOBILE_SCREENSHOTS.home,
    highlights: ['Today\'s orders', 'Revenue snapshot', 'Quick actions'],
  },
  {
    key: 'analytics',
    title: 'Analytics',
    description: 'Profit, loss, and performance insights.',
    image: MOBILE_SCREENSHOTS.analytics,
    highlights: ['Profit & loss', 'COGS tracking', 'Best sellers'],
  },
  {
    key: 'orders',
    title: 'Orders',
    description: 'Track and fulfil every customer order.',
    image: MOBILE_SCREENSHOTS.orders,
    highlights: ['Order status', 'Customer details', 'Fulfillment'],
  },
  {
    key: 'expenses',
    title: 'Expenses',
    description: 'Record costs for accurate profit reports.',
    image: MOBILE_SCREENSHOTS.expenses,
    highlights: ['Operating costs', 'COGS', 'Cleaner P&L'],
  },
  {
    key: 'storeSettings',
    title: 'Store Settings',
    description: 'Configure your store from your phone.',
    image: MOBILE_SCREENSHOTS.storeSettings,
    highlights: ['Branding', 'Payments', 'Delivery zones'],
  },
  {
    key: 'tumizi',
    title: 'Tumizi Wallet',
    description: 'Accept and manage payments with Tumizi.',
    image: MOBILE_SCREENSHOTS.tumizi,
    highlights: ['Wallet balance', 'Transactions', 'Payouts'],
  },
] as const;
