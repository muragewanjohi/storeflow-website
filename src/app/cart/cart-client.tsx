/**
 * Shopping Cart Client Component
 * 
 * Client-side cart management with add, remove, update quantity, and checkout
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ShoppingCartIcon, TrashIcon, PlusIcon, MinusIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { useCurrency } from '@/lib/currency/currency-context';

interface CartItem {
  product_id: string;
  variant_id: string | null;
  quantity: number;
  price: number;
  name: string;
  image: string | null;
  sku: string | null;
  slug?: string | null;
}

interface Cart {
  items: CartItem[];
  total: number;
  item_count: number;
}

interface CartClientProps {
  isAuthenticated?: boolean;
}

export default function CartClient({ isAuthenticated = false }: Readonly<CartClientProps>) {
  const router = useRouter();
  const { formatCurrency } = useCurrency();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [discount, setDiscount] = useState(0);

  // Fetch cart on mount
  useEffect(() => {
    fetchCart();
  }, []);

  const fetchCart = async () => {
    try {
      const response = await fetch('/api/cart');
      if (response.ok) {
        const data = await response.json();
        setCart(data.cart);
      } else if (response.status === 401 && isAuthenticated) {
        // Only redirect if we expected to be authenticated
        router.push('/login?redirect=/cart');
      }
    } catch (error) {
      console.error('Error fetching cart:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (productId: string, variantId: string | null, newQuantity: number) => {
    if (newQuantity < 1) {
      removeItem(productId, variantId);
      return;
    }

    if (!cart) return;

    const itemKey = `${productId}-${variantId || 'base'}`;
    const item = cart.items.find(i => `${i.product_id}-${i.variant_id || 'base'}` === itemKey);
    
    if (!item) return;

    // Optimistic update - update UI immediately
    const oldQuantity = item.quantity;
    const updatedItems = cart.items.map((i: any) => {
      if (`${i.product_id}-${i.variant_id || 'base'}` === itemKey) {
        return { ...i, quantity: newQuantity };
      }
      return i;
    });
    
    const newSubtotal = updatedItems.reduce((sum: any, i: any) => sum + i.price * i.quantity, 0);
    const optimisticCart: Cart = {
      ...cart,
      items: updatedItems,
      total: newSubtotal,
      item_count: updatedItems.reduce((sum: any, i: any) => sum + i.quantity, 0),
    };
    
    setCart(optimisticCart);
    setUpdating(itemKey);
    
    try {
      const response = await fetch('/api/cart', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: productId,
          variant_id: variantId,
          quantity: newQuantity,
        }),
      });

      if (response.ok) {
        // Server returns minimal response - no need to refetch
        // Optimistic update is already applied, just confirm success
        // Optionally: Only refetch if server indicates inconsistency
        const data = await response.json();
        if (data.cart) {
          // If server returns full cart (backward compatibility), use it
          setCart(data.cart);
        }
        // Otherwise, keep optimistic update
        
        // Notify header to update cart count
        window.dispatchEvent(new Event('cartUpdated'));
      } else {
        // Revert on error
        setCart(cart);
        const error = await response.json();
        toast.error('Failed to update quantity', {
          description: error.error || 'Please try again',
        });
      }
    } catch (error) {
      // Revert on error
      setCart(cart);
      console.error('Error updating cart:', error);
      toast.error('Failed to update quantity', {
        description: 'Please try again',
      });
    } finally {
      setUpdating(null);
    }
  };

  const removeItem = async (productId: string, variantId: string | null) => {
    if (!cart) return;

    const itemKey = `${productId}-${variantId || 'base'}`;
    const item = cart.items.find(i => `${i.product_id}-${i.variant_id || 'base'}` === itemKey);
    
    if (!item) return;

    // Optimistic update - remove from UI immediately
    const updatedItems = cart.items.filter(
      (i) => `${i.product_id}-${i.variant_id || 'base'}` !== itemKey
    );
    
    const newSubtotal = updatedItems.reduce((sum: any, i: any) => sum + i.price * i.quantity, 0);
    const optimisticCart: Cart = {
      ...cart,
      items: updatedItems,
      total: newSubtotal,
      item_count: updatedItems.reduce((sum: any, i: any) => sum + i.quantity, 0),
    };
    
    setCart(optimisticCart);
    setUpdating(itemKey);
    
    try {
      const response = await fetch(`/api/cart?product_id=${productId}${variantId ? `&variant_id=${variantId}` : ''}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Server returns minimal response - optimistic update already applied
        // Show toast notification
        toast.success('Item removed', {
          description: `${item.name} has been removed from your cart`,
          duration: 2000,
        });
        
        // Notify header to update cart count
        window.dispatchEvent(new Event('cartUpdated'));
      } else {
        // Revert on error
        setCart(cart);
        const error = await response.json();
        toast.error('Failed to remove item', {
          description: error.error || 'Please try again',
        });
      }
    } catch (error) {
      // Revert on error
      setCart(cart);
      console.error('Error removing item:', error);
      toast.error('Failed to remove item', {
        description: 'Please try again',
      });
    } finally {
      setUpdating(null);
    }
  };

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;

    setApplyingCoupon(true);
    try {
      // TODO: Implement coupon API (Day 31 - optional enhancement)
      // For now, just show a placeholder
      alert('Coupon functionality will be implemented in the checkout flow');
      // const response = await fetch('/api/coupons/apply', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ code: couponCode }),
      // });
    } catch (error) {
      console.error('Error applying coupon:', error);
    } finally {
      setApplyingCoupon(false);
    }
  };

  // Using formatCurrency from useCurrency hook

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="h-8 bg-muted rounded animate-pulse w-1/4 mb-6" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-4 p-4 border rounded-lg">
              <div className="w-20 h-20 bg-muted rounded animate-pulse flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
                <div className="h-4 bg-muted rounded animate-pulse w-1/4" />
              </div>
              <div className="w-20 h-8 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <ShoppingCartIcon className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Your cart is empty</h1>
          <p className="text-muted-foreground mb-6">
            Looks like you haven&apos;t added anything to your cart yet.
          </p>
          <Link href="/products">
            <Button>Continue Shopping</Button>
          </Link>
        </div>
      </div>
    );
  }

  const subtotal = cart.total || cart.items.reduce((sum: any, item: any) => sum + item.price * item.quantity, 0);
  const total = subtotal - discount;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {cart.items.map((item: any) => {
            const itemKey = `${item.product_id}-${item.variant_id || 'base'}`;
            const isUpdating = updating === itemKey;

            return (
              <Card key={itemKey}>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    {/* Product Image */}
                    <Link href={item.slug ? `/products/${item.slug}` : `/products/${item.product_id}`} className="flex-shrink-0">
                      <div className="relative w-24 h-24 bg-muted rounded-md overflow-hidden">
                        {item.image ? (
                          <Image
                            src={item.image}
                            alt={item.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                            No Image
                          </div>
                        )}
                      </div>
                    </Link>

                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      <Link href={item.slug ? `/products/${item.slug}` : `/products/${item.product_id}`}>
                        <h3 className="font-semibold mb-1 hover:text-primary transition-colors">
                          {item.name}
                        </h3>
                      </Link>
                      {item.sku && (
                        <p className="text-sm text-muted-foreground mb-2">SKU: {item.sku}</p>
                      )}
                      <div className="flex items-baseline gap-2 mb-3">
                        <p className="text-lg font-bold">{formatCurrency(item.price)}</p>
                        <span className="text-sm text-muted-foreground">each</span>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 border rounded-md">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(item.product_id, item.variant_id, item.quantity - 1)}
                            disabled={isUpdating}
                          >
                            <MinusIcon className="h-4 w-4" />
                          </Button>
                          <span className="w-12 text-center">{item.quantity}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(item.product_id, item.variant_id, item.quantity + 1)}
                            disabled={isUpdating}
                          >
                            <PlusIcon className="h-4 w-4" />
                          </Button>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(item.product_id, item.variant_id)}
                          disabled={isUpdating}
                          className="text-destructive hover:text-destructive"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>

                    {/* Item Total */}
                    <div className="text-right flex-shrink-0 min-w-[120px]">
                      <p className="text-sm text-muted-foreground mb-1">Item Total</p>
                      <p className={`text-2xl font-bold transition-colors ${isUpdating ? 'text-muted-foreground' : ''}`}>
                        {formatCurrency(item.price * item.quantity)}
                      </p>
                      {item.quantity > 1 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {item.quantity} × {formatCurrency(item.price)}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Cart Summary */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Coupon Code */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Coupon Code</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter code"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    disabled={applyingCoupon}
                  />
                  <Button
                    onClick={applyCoupon}
                    disabled={applyingCoupon || !couponCode.trim()}
                    variant="outline"
                  >
                    Apply
                  </Button>
                </div>
              </div>

              {/* Totals */}
              <div className="space-y-2 pt-4 border-t">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount</span>
                    <span>-{formatCurrency(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>

              {/* Checkout Button */}
              <Button
                onClick={() => {
                  if (!isAuthenticated) {
                    router.push('/login?redirect=/cart');
                  } else {
                    router.push('/checkout');
                  }
                }}
                className="w-full"
                size="lg"
              >
                {isAuthenticated ? 'Proceed to Checkout' : 'Login to Checkout'}
              </Button>

              <Link href="/products">
                <Button variant="outline" className="w-full">
                  Continue Shopping
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

