/**
 * Order Utilities
 * 
 * Helper functions for order management
 */

/**
 * Generate a unique order number
 * Format: ORD-YYYYMMDD-XXXXXX (e.g., ORD-20241218-123456)
 */
export function generateOrderNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
  
  return `ORD-${year}${month}${day}-${random}`;
}

/**
 * Validate order status transition
 * Returns true if the transition is valid, false otherwise
 */
export function isValidStatusTransition(currentStatus: string, newStatus: string): boolean {
  const validTransitions: Record<string, string[]> = {
    pending: ['processing', 'cancelled'],
    processing: ['shipped', 'cancelled'],
    shipped: ['delivered', 'cancelled'],
    delivered: [], // Final state
    cancelled: ['refunded'], // Can only transition to refunded
    refunded: [], // Final state
  };

  const allowedStatuses = validTransitions[currentStatus] || [];
  return allowedStatuses.includes(newStatus);
}

/**
 * Calculate order total from items
 */
export function calculateOrderTotal(items: Array<{ price: number; quantity: number }>): number {
  return items.reduce((total: any, item: any) => {
    return total + Number(item.price) * item.quantity;
  }, 0);
}

/**
 * Format order status for display
 */
export function formatOrderStatus(status: string): string {
  const statusMap: Record<string, string> = {
    pending: 'Pending',
    processing: 'Processing',
    shipped: 'Shipped',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
    refunded: 'Refunded',
  };

  return statusMap[status] || status;
}

/**
 * Format payment status for display
 */
export function formatPaymentStatus(status: string): string {
  const statusMap: Record<string, string> = {
    pending: 'Pending',
    paid: 'Paid',
    failed: 'Failed',
    refunded: 'Refunded',
  };

  return statusMap[status] || status;
}

