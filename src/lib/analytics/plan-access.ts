/**
 * Analytics Plan Access Utilities
 * 
 * Functions to check if a tenant has access to advanced analytics features
 * based on their subscription plan
 */

/**
 * Check if a plan name has access to advanced analytics
 * Advanced analytics are available for Pro and Premium plans only
 * 
 * @param planName - The plan name (e.g., "Basic", "Pro", "Premium")
 * @returns true if plan has advanced analytics access
 */
export function hasAdvancedAnalyticsAccess(planName: string | null | undefined): boolean {
  if (!planName) return false;
  
  const normalizedName = planName.toLowerCase();
  
  // Advanced analytics available for Pro and Premium plans
  return normalizedName.includes('pro') || normalizedName.includes('premium');
}

/**
 * Get list of advanced analytics features that require Pro/Premium
 */
export function getAdvancedAnalyticsFeatures(): string[] {
  return [
    'Conversion Funnel Metrics',
    'Traffic & Marketing Analytics',
    'Product Performance Deep Dive',
    'Geographic Analytics',
    'Refunds & Returns Tracking',
    'Real-Time Analytics',
    'Customer Segmentation',
    'Discount Performance Analysis',
    'Period Comparisons',
    'Advanced Filtering',
    'Scheduled Reports',
  ];
}

/**
 * Get upgrade message for Basic plan users
 */
export function getUpgradeMessage(currentPlan: string | null): string {
  if (!currentPlan) {
    return 'Upgrade to Pro or Premium to unlock Advanced Analytics';
  }
  
  const normalizedName = currentPlan.toLowerCase();
  if (normalizedName.includes('basic')) {
    return 'Upgrade to Pro or Premium to unlock Advanced Analytics';
  }
  
  return 'Upgrade to unlock Advanced Analytics';
}
