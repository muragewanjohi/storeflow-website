/**
 * Original hardcoded features for pricing plans
 * These match the features that were in the original landing page
 */

export function getPlanFeatures(planName: string): string[] {
  const normalizedName = planName.toLowerCase();
  
  if (normalizedName.includes('basic')) {
    return [
      'Staff Users: 1',
      'Products: 100',
      'Orders: 500/month',
      'Storage: 5 GB',
      'Customers: 1,000',
      'Custom Pages: 10',
      'Blog Posts: Unlimited',
      'Languages: 2',
      'Basic Analytics',
      'Email Support'
    ];
  } else if (normalizedName.includes('standard') || normalizedName.includes('pro')) {
    return [
      'Staff Users: 5',
      'Products: 1,000',
      'Orders: 5,000/month',
      'Storage: 25 GB',
      'Customers: 10,000',
      'Custom Pages: 50',
      'Blog Posts: 100',
      'Languages: 4',
      'Advanced Analytics',
      'Abandoned Cart Recovery - Coming Soon',
      'Gift Cards - Coming Soon',
      'Priority Support',
      'Automatic payment verification (Mpesa,Stripe) - Coming Soon',
      'Add and buy custom domain - Coming Soon'
    ];
  } else if (normalizedName.includes('premium')) {
    return [
      'Staff Users: 10',
      'Products: Unlimited',
      'Orders: Unlimited',
      'Storage: 200 GB',
      'Customers: Unlimited',
      'Custom Pages: Unlimited',
      'Blog Posts: Unlimited',
      'Languages: Unlimited',
      'Advanced Analytics',
      'Abandoned Cart Recovery',
      'Gift Cards',
      'API Access',
      'Priority Support (Email + Chat)',
      'Automatic payment verification (Mpesa,Stripe) - Coming Soon',
      'Add and buy custom domain - Coming Soon'
    ];
  }
  
  // Fallback: return empty array
  return [];
}
