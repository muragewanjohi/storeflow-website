/**
 * Cart Management
 * 
 * In-memory cart storage (can be replaced with Redis/database in production)
 * For now, we'll use a simple in-memory store keyed by session/user ID
 */

interface CartItem {
  product_id: string;
  variant_id?: string | null;
  quantity: number;
  price: number;
  name: string;
  image?: string | null;
  sku?: string | null;
  slug?: string | null;
}

interface Cart {
  items: CartItem[];
  total: number;
  item_count: number;
}

// In-memory cart storage (replace with Redis/database in production)
const carts = new Map<string, Cart>();

/**
 * Get cart for a user/session
 */
export function getCart(cartId: string): Cart {
  const cart = carts.get(cartId);
  if (!cart) {
    return {
      items: [],
      total: 0,
      item_count: 0,
    };
  }
  return cart;
}

/**
 * Add item to cart
 */
export function addToCart(cartId: string, item: CartItem): Cart {
  const cart = getCart(cartId);
  
  // Check if item already exists (same product and variant)
  const existingIndex = cart.items.findIndex(
    (i) => i.product_id === item.product_id && i.variant_id === item.variant_id
  );

  if (existingIndex >= 0) {
    // Update quantity
    cart.items[existingIndex].quantity += item.quantity;
  } else {
    // Add new item
    cart.items.push(item);
  }

  // Recalculate totals
  cart.total = cart.items.reduce((sum: any, i: any) => sum + Number(i.price) * i.quantity, 0);
  cart.item_count = cart.items.reduce((sum: any, i: any) => sum + i.quantity, 0);

  carts.set(cartId, cart);
  return cart;
}

/**
 * Update cart item quantity
 */
export function updateCartItem(cartId: string, productId: string, variantId: string | null, quantity: number): Cart {
  const cart = getCart(cartId);
  
  const itemIndex = cart.items.findIndex(
    (i) => i.product_id === productId && i.variant_id === variantId
  );

  if (itemIndex >= 0) {
    if (quantity <= 0) {
      // Remove item
      cart.items.splice(itemIndex, 1);
    } else {
      // Update quantity
      cart.items[itemIndex].quantity = quantity;
    }
  }

  // Recalculate totals
  cart.total = cart.items.reduce((sum: any, i: any) => sum + Number(i.price) * i.quantity, 0);
  cart.item_count = cart.items.reduce((sum: any, i: any) => sum + i.quantity, 0);

  carts.set(cartId, cart);
  return cart;
}

/**
 * Remove item from cart
 */
export function removeFromCart(cartId: string, productId: string, variantId: string | null): Cart {
  const cart = getCart(cartId);
  
  cart.items = cart.items.filter(
    (i) => !(i.product_id === productId && i.variant_id === variantId)
  );

  // Recalculate totals
  cart.total = cart.items.reduce((sum: any, i: any) => sum + Number(i.price) * i.quantity, 0);
  cart.item_count = cart.items.reduce((sum: any, i: any) => sum + i.quantity, 0);

  carts.set(cartId, cart);
  return cart;
}

/**
 * Clear cart
 */
export function clearCart(cartId: string): void {
  carts.delete(cartId);
}

/**
 * Generate cart ID from user ID or session
 */
export function generateCartId(userId?: string | null): string {
  if (userId) {
    return `user:${userId}`;
  }
  // For guest users, generate a session-based ID
  // In production, this should come from a session cookie or token
  return `session:${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

