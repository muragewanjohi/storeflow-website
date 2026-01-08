# Subscription Management Best Practices

This document outlines industry best practices for handling subscription upgrades, downgrades, and trial periods.

## Table of Contents
1. [Upgrade/Downgrade Timing](#upgradedowngrade-timing)
2. [Trial Periods](#trial-periods)
3. [Billing Cycle Management](#billing-cycle-management)
4. [Implementation Recommendations](#implementation-recommendations)

---

## Upgrade/Downgrade Timing

### Industry Standard: **Immediate Effect with Proration**

Most SaaS platforms (Shopify, Stripe, AWS, etc.) follow this approach:

#### **Upgrades: Immediate Effect**
- ✅ **Recommended**: Upgrades take effect **immediately**
- User gets access to new features right away
- Charge is **prorated** for the remaining billing period
- Example: If user upgrades mid-cycle, they pay the difference prorated

**Why?**
- Better user experience - users want immediate access to features they're paying for
- Reduces friction in the upgrade process
- Industry standard expectation

#### **Downgrades: Next Billing Cycle**
- ✅ **Recommended**: Downgrades take effect at the **next billing cycle**
- User keeps current plan features until current period ends
- No refunds for unused time (unless specified in terms)
- Prevents users from downgrading to avoid charges

**Why?**
- Prevents abuse (users upgrading for one month, then downgrading)
- Fairer billing - user paid for the period, they should get the features
- Reduces support requests about refunds

### Alternative Approach: **Next Billing Cycle for Both**

Some platforms (especially enterprise) use this approach:
- Both upgrades and downgrades take effect at next billing cycle
- Simpler billing logic
- Less user-friendly for upgrades

**When to use:**
- Enterprise/B2B products with annual contracts
- When billing complexity is a concern
- When immediate feature access isn't critical

---

## Trial Periods

### **Upgrades from Basic Plan: Should They Get a Trial?**

#### **Industry Practice: No Trial on Upgrades**

Most platforms **do NOT** offer trial periods when upgrading:

**Reasons:**
1. **User is already a paying customer** - they've committed to the platform
2. **Trial abuse prevention** - prevents users from cycling through plans
3. **Revenue protection** - upgrades are revenue-generating events
4. **Fairness** - existing customers shouldn't get "free" periods that new customers get

#### **Exceptions (When to Offer Trial on Upgrade):**

1. **First-time upgrade from free/trial tier**
   - User was on free plan → upgrading to paid
   - Can offer a short trial (7-14 days) to reduce friction

2. **Annual to higher annual plan**
   - Large commitment, trial can help decision-making

3. **Enterprise/High-value upgrades**
   - For significant plan jumps (e.g., $50 → $500/month)
   - Short trial (3-7 days) can help justify the cost

### **Recommended Approach for StoreFlow:**

```typescript
// Pseudo-code logic
function shouldOfferTrialOnUpgrade(
  currentPlan: Plan,
  newPlan: Plan,
  userHistory: UserHistory
): boolean {
  // No trial if:
  // 1. User has been paying for more than 30 days
  // 2. User has upgraded before
  // 3. User is on any paid plan (not free/trial)
  
  if (userHistory.daysAsPayingCustomer > 30) return false;
  if (userHistory.hasUpgradedBefore) return false;
  if (currentPlan.price > 0) return false;
  
  // Offer trial only for:
  // - First upgrade from free/trial tier
  // - Large plan jumps (e.g., Basic → Enterprise)
  const priceJump = newPlan.price - currentPlan.price;
  if (priceJump > 100) return true; // Large upgrade
  
  return false;
}
```

---

## Billing Cycle Management

### **Proration Calculation**

When upgrades take effect immediately, calculate proration:

```typescript
function calculateProratedCharge(
  currentPlan: Plan,
  newPlan: Plan,
  daysRemaining: number,
  totalDaysInCycle: number
): number {
  const currentPlanDailyRate = currentPlan.price / totalDaysInCycle;
  const newPlanDailyRate = newPlan.price / totalDaysInCycle;
  
  const currentPlanRemainingValue = currentPlanDailyRate * daysRemaining;
  const newPlanRemainingValue = newPlanDailyRate * daysRemaining;
  
  // User pays the difference
  const proratedCharge = newPlanRemainingValue - currentPlanRemainingValue;
  
  return Math.max(0, proratedCharge); // Never negative
}
```

### **Billing Date Management**

- **Upgrades**: Keep same billing date, adjust next renewal
- **Downgrades**: Keep same billing date, apply at next cycle
- **Cancellations**: Access until end of paid period

---

## Implementation Recommendations

### **For StoreFlow Implementation:**

#### **1. Upgrade Flow:**
```typescript
// Recommended approach
async function handleUpgrade(planId: string) {
  // 1. Calculate proration if upgrading mid-cycle
  // 2. Charge prorated amount immediately
  // 3. Update plan immediately
  // 4. Grant access to new features immediately
  // 5. Adjust next billing date/amount
}
```

#### **2. Downgrade Flow:**
```typescript
// Recommended approach
async function handleDowngrade(planId: string) {
  // 1. Schedule downgrade for next billing cycle
  // 2. Keep current plan active until cycle ends
  // 3. Show warning about feature loss
  // 4. Update plan at next billing cycle
  // 5. No refunds (user paid for the period)
}
```

#### **3. Trial Period Logic:**
```typescript
// Recommended approach
function getTrialDays(plan: Plan, user: User): number {
  // No trial for existing paying customers
  if (user.hasActivePaidSubscription) return 0;
  
  // No trial for upgrades from paid plans
  if (user.currentPlan?.price > 0) return 0;
  
  // Offer trial for new signups only
  if (user.isNewSignup) return plan.trial_days || 0;
  
  return 0;
}
```

### **Database Schema Considerations:**

```sql
-- Add fields to track upgrade/downgrade scheduling
ALTER TABLE tenants ADD COLUMN scheduled_plan_id UUID;
ALTER TABLE tenants ADD COLUMN scheduled_plan_change_date TIMESTAMP;
ALTER TABLE tenants ADD COLUMN upgrade_prorated_amount DECIMAL(10,2);

-- Track billing history
CREATE TABLE subscription_changes (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  from_plan_id UUID,
  to_plan_id UUID,
  change_type VARCHAR(20), -- 'upgrade', 'downgrade', 'renewal'
  effective_date TIMESTAMP,
  prorated_amount DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### **User Communication:**

#### **Upgrade Confirmation:**
```
✅ "Your upgrade to [Plan Name] is now active!"
   "You've been charged $X.XX (prorated for the remaining X days)"
   "Your next billing date: [Date]"
```

#### **Downgrade Confirmation:**
```
ℹ️ "Your downgrade to [Plan Name] is scheduled"
   "You'll continue to have access to [Current Plan] features until [Date]"
   "Your plan will change on [Date]"
   "No refunds will be issued for the current billing period"
```

---

## Summary of Recommendations

### ✅ **Recommended for StoreFlow:**

1. **Upgrades**: Immediate effect with prorated billing
2. **Downgrades**: Next billing cycle
3. **Trials on Upgrades**: No (except first-time free → paid)
4. **Proration**: Calculate based on remaining days in cycle
5. **Billing Date**: Keep same date, adjust amounts

### 📋 **Implementation Checklist:**

- [ ] Add proration calculation logic
- [ ] Implement immediate upgrade activation
- [ ] Schedule downgrades for next cycle
- [ ] Add `scheduled_plan_id` to tenants table
- [ ] Create subscription change history table
- [ ] Update billing API to handle proration
- [ ] Add user notifications for plan changes
- [ ] Test upgrade/downgrade flows
- [ ] Document billing policies in terms of service

---

## References

- [Stripe Billing Best Practices](https://stripe.com/docs/billing/subscriptions/upgrading-downgrading)
- [Shopify Subscription Management](https://help.shopify.com/en/manual/your-store/subscriptions)
- [AWS Billing Practices](https://aws.amazon.com/pricing/)

---

**Last Updated**: 2025-01-08
**Author**: StoreFlow Development Team
