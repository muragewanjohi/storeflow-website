# Guest Cart Implementation

## Overview

Guest cart support allows unauthenticated users to add items to their cart and persist them across sessions. When a guest user logs in, their cart is automatically merged with their authenticated cart.

## Architecture

### Session Management

**File:** `storeflow/src/lib/cart/session.ts`

- Generates unique session IDs for guest users
- Stores session ID in HTTP-only cookie (`cart_session_id`)
- Session persists for 30 days
- Session ID is a 64-character hex string (cryptographically secure)

### Database Schema

The `cart_items` table supports both authenticated and guest users:

```prisma
model cart_items {
  id         String     @id
  tenant_id  String
  user_id    String?    // For authenticated users
  session_id String?    // For guest users
  product_id String?
  variant_id String?
  quantity   Int
  // ... other fields
}
```

**Indexes:**
- `idx_cart_items_session_id` - Fast guest cart lookups
- `idx_cart_items_tenant_user` - Fast authenticated cart lookups
- `idx_cart_items_tenant_id` - Tenant isolation

### API Endpoints

#### 1. Cart Operations (GET, POST, PUT, DELETE)
**File:** `storeflow/src/app/api/cart/route.ts`

All cart endpoints now support both authenticated and guest users:

- **Authenticated users:** Uses `user_id` (customer ID)
- **Guest users:** Uses `session_id` from cookie

**Logic:**
```typescript
const user = await getUser(); // Returns null for guests
let customerId: string | null = null;
let sessionId: string | null = null;

if (user) {
  customerId = await getOrCreateCustomer(user, tenant.id);
} else {
  sessionId = await getOrCreateSessionId();
}

// Query uses either user_id or session_id
where: {
  tenant_id: tenant.id,
  ...(customerId ? { user_id: customerId } : { session_id: sessionId }),
}
```

#### 2. Cart Count
**File:** `storeflow/src/app/api/cart/count/route.ts`

- Works for both authenticated and guest users
- Returns 0 if no session ID exists (new guest)
- Uses aggregate query for performance

#### 3. Cart Merge
**File:** `storeflow/src/app/api/cart/merge/route.ts`

**Purpose:** Merges guest cart into user cart when user logs in

**Process:**
1. Fetches guest cart items (by `session_id`)
2. Fetches user cart items (by `user_id`)
3. For each guest item:
   - If item exists in user cart → **Update quantity** (add guest quantity to user quantity)
   - If item doesn't exist → **Transfer** (update `user_id`, clear `session_id`)
4. Clears session ID cookie

**Called automatically on login** via `storeflow/src/app/api/customers/auth/login/route.ts`

## User Experience

### Guest User Flow

1. **Browse products** → No authentication required
2. **Add to cart** → Session ID created automatically
3. **View cart** → Shows guest cart items
4. **Login** → Cart automatically merged
5. **Checkout** → Prompted to login if not authenticated

### Authenticated User Flow

1. **Browse products** → Uses customer ID
2. **Add to cart** → Stored with `user_id`
3. **View cart** → Shows user cart items
4. **Checkout** → Proceeds directly

## Security Considerations

1. **Session ID Generation**
   - Uses `crypto.randomBytes(32)` for cryptographically secure random IDs
   - 64-character hex string (256 bits of entropy)

2. **Cookie Security**
   - `httpOnly: true` - Prevents XSS attacks
   - `secure: true` in production - HTTPS only
   - `sameSite: 'lax'` - CSRF protection

3. **Tenant Isolation**
   - All queries filter by `tenant_id`
   - Guest carts are tenant-specific

4. **Session Expiration**
   - Sessions expire after 30 days of inactivity
   - Old guest carts can be cleaned up via cron job

## Performance Optimizations

1. **Indexes**
   - `idx_cart_items_session_id` for fast guest cart queries
   - `idx_cart_items_tenant_user` for authenticated cart queries

2. **Caching**
   - Cart count cached for 10 seconds
   - Full cart cached for 5 seconds
   - Stale-while-revalidate pattern

3. **Query Optimization**
   - Uses `select` instead of `include` for minimal data
   - Aggregate queries for counts (no joins)

## Testing Checklist

- [ ] Guest can add items to cart
- [ ] Guest cart persists across page refreshes
- [ ] Guest cart persists across browser sessions (30 days)
- [ ] Cart count shows correct number for guests
- [ ] Cart count shows correct number for authenticated users
- [ ] Guest cart merges correctly on login
- [ ] Duplicate items merge quantities on login
- [ ] New items transfer to user cart on login
- [ ] Session ID is cleared after merge
- [ ] Checkout prompts login for guests
- [ ] Authenticated users can checkout directly

## Future Enhancements

1. **Guest Cart Cleanup**
   - Cron job to delete old guest carts (30+ days)
   - Reduce database storage

2. **Cart Abandonment**
   - Email reminders for guest carts
   - Track cart abandonment rate

3. **Multi-Device Support**
   - Allow guests to "claim" cart via email
   - Link guest cart to email before login

4. **Cart Sharing**
   - Share cart via link
   - Save cart for later

## Migration Notes

If you have existing carts in the database:

1. **No migration needed** - Existing carts use `user_id` only
2. **New guest carts** - Will use `session_id` only
3. **After login** - Guest carts merge into user carts

## Related Files

- `storeflow/src/lib/cart/session.ts` - Session management
- `storeflow/src/app/api/cart/route.ts` - Cart CRUD operations
- `storeflow/src/app/api/cart/count/route.ts` - Cart count
- `storeflow/src/app/api/cart/merge/route.ts` - Cart merge
- `storeflow/src/app/api/customers/auth/login/route.ts` - Login with cart merge
- `storeflow/src/app/cart/page.tsx` - Cart page (supports guests)
- `storeflow/src/app/cart/cart-client.tsx` - Cart UI (supports guests)
- `storeflow/src/components/storefront/header.tsx` - Cart count (supports guests)

