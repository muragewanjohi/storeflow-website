# Delivery Zones Implementation Guide

## Overview

This document outlines the zone-based delivery system implementation following e-commerce best practices. The system allows store owners to define delivery zones with fixed prices, and handles both covered zones (automatic pricing) and out-of-zone orders (manual quote workflow).

## Best Practices Analysis

Based on research of major e-commerce platforms (Shopify, WooCommerce, local delivery services):

### ✅ Recommended Approach (What We're Implementing)

1. **Auto-detect zone with manual override**
   - System automatically suggests zone based on address
   - Customer can manually select if auto-detection is wrong
   - Better UX than forcing manual selection

2. **Show delivery fee upfront**
   - If zone is covered, show exact delivery fee immediately
   - Customer sees total cost before checkout

3. **Out-of-zone handling**
   - Order can proceed but marked as "pending delivery quote"
   - Store owner calculates and updates delivery fee
   - Customer approves before order is confirmed

4. **Clear communication**
   - Customer sees "Delivery fee to be calculated" message
   - Store owner sees orders needing quotes
   - Customer receives notification when quote is ready

## Database Schema

### Delivery Zones Table
```prisma
model delivery_zones {
  id          String    @id
  tenant_id   String
  name        String    // "ZONE A", "ZONE B", etc.
  price       Decimal   // Delivery fee for this zone
  locations   String[]  // Array of location names
  is_active   Boolean
  sort_order  Int
  created_at  DateTime
  updated_at  DateTime
}
```

### Orders Table Updates
```prisma
model orders {
  // ... existing fields
  delivery_zone_id         String?   // Reference to zone
  delivery_zone_name       String?   // Zone name for display
  delivery_fee             Decimal?  // Final delivery fee
  delivery_fee_status      String?  // pending, quoted, approved, rejected
  delivery_fee_quote       Decimal? // Store owner's calculated fee
  delivery_fee_notes       String?  // Notes from store owner
}
```

## Workflow

### 1. Store Owner Setup
- Go to Settings → Delivery Zones
- Create zones (ZONE A, ZONE B, etc.)
- Add locations to each zone
- Set delivery price for each zone

### 2. Customer Checkout Flow

**Step 1: Select Delivery Method**
- Customer selects "Delivery" (not pickup)

**Step 2: Enter Address**
- Customer enters delivery address
- System auto-detects zone based on city/area
- Shows suggested zone with price
- Customer can manually select different zone if needed

**Step 3: Zone Coverage Check**
- **If zone is covered:**
  - Delivery fee is calculated automatically
  - Total shows: Subtotal + Delivery Fee = Total
  - Customer proceeds to payment

- **If zone is NOT covered:**
  - Shows message: "Your location is outside our standard delivery zones. We'll calculate a custom delivery fee and contact you."
  - Order can proceed but marked as "pending delivery quote"
  - Delivery fee shows as "To be calculated"
  - Customer completes checkout

**Step 4: Order Submission**
- Order is created with delivery_fee_status = "pending" (if out-of-zone)
- Customer receives order confirmation

### 3. Store Owner Workflow (Out-of-Zone Orders)

**Step 1: View Pending Quotes**
- Go to Orders → Filter by "Pending Delivery Quote"
- See list of orders needing delivery fee calculation

**Step 2: Calculate Delivery Fee**
- View customer's delivery address
- Calculate delivery cost based on distance/location
- Enter delivery fee amount
- Add optional notes (e.g., "Special handling required")

**Step 3: Send Quote to Customer**
- Update order with delivery_fee_quote
- Set delivery_fee_status = "quoted"
- System sends notification to customer

### 4. Customer Approval Flow

**Step 1: Receive Notification**
- Customer receives email/notification: "Delivery fee quote ready for Order #12345"

**Step 2: Review Quote**
- Customer logs into account
- Goes to Orders → View Order Details
- Sees delivery fee quote and notes

**Step 3: Approve or Reject**
- **Approve:**
  - Clicks "Approve Delivery Fee"
  - Order total is updated
  - Payment is processed (if not already paid)
  - Order status changes to "confirmed"

- **Reject:**
  - Clicks "Reject Delivery Fee"
  - Can add reason for rejection
  - Order status changes to "delivery_quote_rejected"
  - Store owner is notified

## API Endpoints

### Store Owner (Admin)

**GET /api/admin/delivery-zones**
- List all delivery zones for tenant

**POST /api/admin/delivery-zones**
- Create new delivery zone

**PUT /api/admin/delivery-zones/[id]**
- Update delivery zone

**DELETE /api/admin/delivery-zones/[id]**
- Delete delivery zone

**GET /api/admin/orders/pending-delivery-quotes**
- Get orders needing delivery fee quotes

**PUT /api/admin/orders/[id]/delivery-quote**
- Update order with delivery fee quote

### Customer (Public)

**GET /api/checkout/delivery-zones**
- Get active delivery zones (for zone selection)

**POST /api/checkout/detect-zone**
- Auto-detect zone based on address

**PUT /api/orders/[id]/approve-delivery-fee**
- Customer approves delivery fee quote

**PUT /api/orders/[id]/reject-delivery-fee**
- Customer rejects delivery fee quote

## UI Components

### Checkout Flow

1. **Zone Selector Component**
   - Dropdown/radio buttons showing available zones
   - Auto-selected based on address
   - Shows price for each zone

2. **Delivery Fee Display**
   - Shows calculated fee if zone covered
   - Shows "To be calculated" if out-of-zone
   - Updates total dynamically

3. **Out-of-Zone Notice**
   - Clear message explaining quote process
   - Sets expectations for customer

### Store Owner Dashboard

1. **Delivery Zones Management**
   - List of zones with prices
   - Add/Edit/Delete zones
   - Manage locations per zone

2. **Pending Quotes Dashboard**
   - List of orders needing quotes
   - Quick actions: Calculate, Quote, Update

3. **Order Details (Quote View)**
   - Customer address
   - Map view (if available)
   - Input field for delivery fee
   - Notes field
   - Send quote button

### Customer Dashboard

1. **Order Details (Quote View)**
   - Shows delivery fee quote
   - Store owner's notes
   - Approve/Reject buttons
   - Updated order total

## Implementation Status

- [x] Database schema design
- [ ] API endpoints for zone management
- [ ] Checkout integration with auto-detection
- [ ] Store owner quote interface
- [ ] Customer approval flow
- [ ] Email notifications
- [ ] Order status updates

## Next Steps

1. Create migration for delivery_zones table
2. Implement zone management API
3. Add zone detection to checkout
4. Build store owner quote interface
5. Implement customer approval flow
6. Add email notifications
