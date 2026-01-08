/**
 * Subscription Proration Utilities
 * 
 * Calculates prorated charges for plan upgrades and downgrades
 * Following industry best practices for SaaS billing
 */

export interface ProrationResult {
  proratedAmount: number;
  daysRemaining: number;
  totalDaysInCycle: number;
  currentPlanRemainingValue: number;
  newPlanRemainingValue: number;
  effectiveDate: Date;
}

/**
 * Calculate prorated charge for plan upgrade
 * 
 * Formula:
 * - Calculate daily rates for both plans
 * - Calculate remaining value for current plan
 * - Calculate remaining value for new plan
 * - Charge the difference (new - current)
 * 
 * @param currentPlanPrice - Current plan monthly price
 * @param newPlanPrice - New plan monthly price
 * @param expireDate - Current plan expiration date
 * @param startDate - Current plan start date (or tenant creation date)
 * @returns ProrationResult with calculated amounts
 */
export function calculateUpgradeProration(
  currentPlanPrice: number,
  newPlanPrice: number,
  expireDate: Date | null,
  startDate: Date | null
): ProrationResult {
  const now = new Date();
  
  // If no expiration date or already expired, no proration needed
  if (!expireDate || expireDate <= now) {
    return {
      proratedAmount: 0,
      daysRemaining: 0,
      totalDaysInCycle: 0,
      currentPlanRemainingValue: 0,
      newPlanRemainingValue: 0,
      effectiveDate: now,
    };
  }

  // Calculate total days in current billing cycle
  const cycleStart = startDate || now;
  const totalDaysInCycle = Math.ceil(
    (expireDate.getTime() - cycleStart.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Calculate days remaining in current cycle
  const daysRemaining = Math.ceil(
    (expireDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Calculate daily rates (assuming monthly billing, 30 days per month)
  const daysPerMonth = 30;
  const currentPlanDailyRate = currentPlanPrice / daysPerMonth;
  const newPlanDailyRate = newPlanPrice / daysPerMonth;

  // Calculate remaining values
  const currentPlanRemainingValue = currentPlanDailyRate * daysRemaining;
  const newPlanRemainingValue = newPlanDailyRate * daysRemaining;

  // Prorated charge is the difference
  const proratedAmount = Math.max(0, newPlanRemainingValue - currentPlanRemainingValue);

  return {
    proratedAmount: Math.round(proratedAmount * 100) / 100, // Round to 2 decimal places
    daysRemaining,
    totalDaysInCycle,
    currentPlanRemainingValue: Math.round(currentPlanRemainingValue * 100) / 100,
    newPlanRemainingValue: Math.round(newPlanRemainingValue * 100) / 100,
    effectiveDate: now,
  };
}

/**
 * Determine if user should get trial period on upgrade
 * 
 * Rules:
 * - No trial if user has been paying for more than 30 days
 * - No trial if user has upgraded before
 * - No trial if user is on any paid plan (not free/trial)
 * - Trial only for first upgrade from free/trial tier
 * 
 * @param currentPlanPrice - Current plan price (0 = free/trial)
 * @param daysAsPayingCustomer - Days user has been a paying customer
 * @param hasUpgradedBefore - Whether user has upgraded before
 * @returns true if trial should be offered
 */
export function shouldOfferTrialOnUpgrade(
  currentPlanPrice: number,
  daysAsPayingCustomer: number,
  hasUpgradedBefore: boolean
): boolean {
  // No trial if user has been paying for more than 30 days
  if (daysAsPayingCustomer > 30) {
    return false;
  }

  // No trial if user has upgraded before
  if (hasUpgradedBefore) {
    return false;
  }

  // No trial if user is on a paid plan
  if (currentPlanPrice > 0) {
    return false;
  }

  // Offer trial for first upgrade from free/trial tier
  return true;
}

/**
 * Calculate days as paying customer
 * 
 * @param tenantCreatedAt - When tenant was created
 * @param currentPlanStartDate - When current plan started
 * @param currentPlanPrice - Current plan price
 * @returns Number of days as paying customer
 */
export function calculateDaysAsPayingCustomer(
  tenantCreatedAt: Date | null,
  currentPlanStartDate: Date | null,
  currentPlanPrice: number
): number {
  // If on free plan, return 0
  if (currentPlanPrice === 0) {
    return 0;
  }

  const now = new Date();
  const startDate = currentPlanStartDate || tenantCreatedAt || now;
  
  return Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Determine if this is an upgrade or downgrade
 * 
 * @param currentPlanPrice - Current plan price
 * @param newPlanPrice - New plan price
 * @returns 'upgrade' | 'downgrade' | 'same'
 */
export function getPlanChangeType(
  currentPlanPrice: number,
  newPlanPrice: number
): 'upgrade' | 'downgrade' | 'same' {
  if (newPlanPrice > currentPlanPrice) {
    return 'upgrade';
  } else if (newPlanPrice < currentPlanPrice) {
    return 'downgrade';
  }
  return 'same';
}
