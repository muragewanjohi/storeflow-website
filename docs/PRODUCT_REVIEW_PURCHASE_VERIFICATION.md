# Product Review Purchase Verification

## Overview

Implemented purchase verification for product reviews, following e-commerce best practices (Amazon, Shopify patterns). Users can only review products they have purchased.

## Implementation Details

### ✅ What Was Implemented

1. **Purchase Verification in Review API**
   - Both `/api/products/reviews` and `/api/products/[id]/reviews` now verify purchases
   - Checks `order_products` table for user's purchase history
   - Verifies order `payment_status = 'paid'` (payment completed)
   - Verifies order `status` is not 'cancelled' or 'refunded'

2. **Review Eligibility API**
   - New endpoint: `GET /api/products/[id]/can-review`
   - Returns eligibility status before user attempts to review
   - Provides clear reason if user cannot review

3. **Enhanced RatingInput Component**
   - Checks eligibility before showing review form
   - Shows helpful messages for different scenarios:
     - Login required
     - Purchase required
     - Already reviewed
   - Prevents form submission if user cannot review

4. **Enhanced ProductReviewsSection**
   - Checks eligibility before showing "Write a Review" button
   - Only shows button if user can review
   - Shows status message if user cannot review

5. **Rating Display on Grocery ProductCard**
   - Added `RatingDisplay` component
   - Shows ratings when `averageRating > 0`
   - Matches Default ProductCard implementation

## Purchase Verification Logic

### Database Query

```typescript
// Find order_products for this user and product
const orderProduct = await prisma.order_products.findFirst({
  where: {
    tenant_id: tenant.id,
    user_id: userId,
    product_id: productId,
  },
  include: {
    orders: {
      select: {
        id: true,
        status: true,
        payment_status: true,
      },
    },
  },
});

// Check if the order is paid and not cancelled/refunded
const hasPurchased = orderProduct && 
  orderProduct.orders?.payment_status === 'paid' &&
  orderProduct.orders?.status &&
  !['cancelled', 'refunded'].includes(orderProduct.orders.status);
```

### Verification Criteria

A user can review a product if:
1. ✅ User is logged in (authentication required)
2. ✅ User has purchased the product (exists in `order_products`)
3. ✅ Order payment status is `'paid'` (payment completed)
4. ✅ Order status is NOT `'cancelled'` or `'refunded'`
5. ✅ User has not already reviewed this product

## User Experience Flow

### Scenario 1: User Hasn't Purchased
1. User clicks "Write a Review"
2. System checks eligibility
3. Shows message: "You can only review products you have purchased"
4. Review form is disabled/hidden

### Scenario 2: User Hasn't Logged In
1. User clicks "Write a Review"
2. System checks authentication
3. Shows message: "You must be logged in to review products"
4. Provides login link

### Scenario 3: User Has Purchased
1. User clicks "Write a Review"
2. System checks eligibility
3. Shows review form
4. User can submit rating and comment
5. Review is created with `status: 'pending'` (requires approval)

### Scenario 4: User Already Reviewed
1. User clicks "Write a Review"
2. System checks for existing review
3. Shows message: "You have already reviewed this product"
4. Review form is disabled

## API Endpoints

### 1. Check Review Eligibility
```
GET /api/products/[id]/can-review
```

**Response**:
```json
{
  "canReview": true,
  "hasPurchased": true,
  "hasReviewed": false
}
```

**Error Response**:
```json
{
  "canReview": false,
  "hasPurchased": false,
  "hasReviewed": false,
  "reason": "You can only review products you have purchased",
  "code": "PURCHASE_REQUIRED"
}
```

### 2. Submit Review
```
POST /api/products/reviews
POST /api/products/[id]/reviews
```

**Request**:
```json
{
  "product_id": "uuid",
  "rating": 5,
  "comment": "Great product!"
}
```

**Success Response**:
```json
{
  "success": true,
  "review": {
    "id": "uuid",
    "rating": 5,
    "comment": "Great product!",
    "status": "pending",
    "created_at": "2026-01-15T..."
  },
  "message": "Review submitted successfully. It will be visible after approval."
}
```

**Error Response** (Purchase Required):
```json
{
  "error": "You can only review products you have purchased",
  "code": "PURCHASE_REQUIRED"
}
```

## Error Codes

- `LOGIN_REQUIRED`: User must be logged in to review
- `PURCHASE_REQUIRED`: User has not purchased this product
- `ALREADY_REVIEWED`: User has already reviewed this product

## Best Practices Followed

### ✅ E-commerce Standards
- **Purchase Verification**: Only verified purchasers can review (like Amazon, Shopify)
- **Login Required**: Ensures accountability and prevents spam
- **Clear Messaging**: Users understand why they can't review
- **Pre-submission Check**: Eligibility checked before showing form

### ✅ Security
- **Server-side Verification**: Purchase check happens on server (can't be bypassed)
- **Authentication Required**: Must be logged in to review
- **Duplicate Prevention**: Can't review same product twice

### ✅ User Experience
- **Proactive Checking**: Eligibility checked before user fills form
- **Helpful Messages**: Clear explanation of requirements
- **Actionable Errors**: Login links provided when needed

## Files Modified

1. **`src/components/themes/grocery/ProductCard.tsx`**
   - Added `RatingDisplay` component
   - Added `averageRating` and `totalReviews` to Product interface

2. **`src/app/api/products/reviews/route.ts`**
   - Added purchase verification logic
   - Removed guest review support (login required)
   - Added purchase check before creating review

3. **`src/app/api/products/[id]/reviews/route.ts`**
   - Added purchase verification logic
   - Removed guest review support (login required)
   - Added purchase check before creating review

4. **`src/app/api/products/[id]/can-review/route.ts`** (NEW)
   - New endpoint to check review eligibility
   - Returns detailed eligibility status

5. **`src/components/storefront/rating-input.tsx`**
   - Added eligibility checking on mount
   - Shows helpful messages for different scenarios
   - Prevents submission if user cannot review

6. **`src/components/storefront/product-reviews-section.tsx`**
   - Added eligibility checking
   - Conditionally shows "Write a Review" button
   - Shows status messages when user cannot review

## Testing Checklist

- [x] User without purchase cannot review
- [x] User with purchase can review
- [x] User who already reviewed cannot review again
- [x] Guest user (not logged in) cannot review
- [x] Clear error messages shown
- [x] Rating display works on Grocery ProductCard
- [x] TypeScript compilation passes
- [x] No linter errors

## Future Enhancements (Optional)

1. **Order Status Options**
   - Currently allows reviews after `payment_status = 'paid'`
   - Could require `order status = 'delivered'` for physical products
   - Could allow reviews after `order status = 'shipped'` for faster feedback

2. **Review Timing**
   - Could add delay (e.g., 7 days after delivery) before allowing review
   - Could send email reminder to review after delivery

3. **Verified Purchase Badge**
   - Show "Verified Purchase" badge on reviews from purchasers
   - Helps users trust reviews more

---

**Status**: ✅ Complete  
**Last Updated**: January 15, 2026
