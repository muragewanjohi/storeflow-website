/**
 * Checkout Client Component
 * 
 * Multi-step checkout form with shipping, payment, and review
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import Image from 'next/image';

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

interface ShippingAddress {
  name: string;
  email: string;
  phone: string;
  address_line_1: string;
  address_line_2?: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

type PaymentMethod = 'pesapal' | 'paypal' | 'cash_on_delivery';

type Step = 'shipping' | 'payment' | 'review';

interface CheckoutClientProps {
  isAuthenticated?: boolean;
}

export default function CheckoutClient({ isAuthenticated = false }: Readonly<CheckoutClientProps>) {
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState<Step>('shipping');
  
  // Form state
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    name: '',
    email: '',
    phone: '',
    address_line_1: '',
    address_line_2: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
  });
  
  const [useBillingSameAsShipping, setUseBillingSameAsShipping] = useState(true);
  const [billingAddress, setBillingAddress] = useState<ShippingAddress>({
    name: '',
    email: '',
    phone: '',
    address_line_1: '',
    address_line_2: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
  });
  
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pesapal');
  const [couponCode, setCouponCode] = useState('');
  const [notes, setNotes] = useState('');

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
        
        // Pre-fill email if available (from user session)
        // This would come from the authenticated user's profile
      } else if (response.status === 401) {
        router.push('/login?redirect=/checkout');
      } else {
        toast.error('Failed to load cart');
        router.push('/cart');
      }
    } catch (error) {
      console.error('Error fetching cart:', error);
      toast.error('Failed to load cart');
      router.push('/cart');
    } finally {
      setLoading(false);
    }
  };

  const validateShipping = (): boolean => {
    if (!shippingAddress.name.trim()) {
      toast.error('Name is required');
      return false;
    }
    if (!shippingAddress.email.trim() || !shippingAddress.email.includes('@')) {
      toast.error('Valid email is required');
      return false;
    }
    if (!shippingAddress.phone.trim()) {
      toast.error('Phone is required');
      return false;
    }
    if (!shippingAddress.address_line_1.trim()) {
      toast.error('Address is required');
      return false;
    }
    if (!shippingAddress.city.trim()) {
      toast.error('City is required');
      return false;
    }
    if (!shippingAddress.state.trim()) {
      toast.error('State is required');
      return false;
    }
    if (!shippingAddress.postal_code.trim()) {
      toast.error('Postal code is required');
      return false;
    }
    if (!shippingAddress.country.trim()) {
      toast.error('Country is required');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (currentStep === 'shipping') {
      if (!validateShipping()) return;
      setCurrentStep('payment');
    } else if (currentStep === 'payment') {
      setCurrentStep('review');
    }
  };

  const handleBack = () => {
    if (currentStep === 'payment') {
      setCurrentStep('shipping');
    } else if (currentStep === 'review') {
      setCurrentStep('payment');
    }
  };

  const handleSubmit = async () => {
    if (!cart || cart.items.length === 0) {
      toast.error('Your cart is empty');
      router.push('/cart');
      return;
    }

    setSubmitting(true);

    try {
      const checkoutData = {
        items: cart.items.map(item => ({
          product_id: item.product_id,
          variant_id: item.variant_id,
          quantity: item.quantity,
        })),
        shipping_address: shippingAddress,
        billing_address: useBillingSameAsShipping ? undefined : billingAddress,
        payment_method: paymentMethod,
        coupon_code: couponCode || null,
        notes: notes || null,
      };

      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(checkoutData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Dispatch cart updated event to clear cart count in header
        window.dispatchEvent(new CustomEvent('cartUpdated'));
        
        // Show success message
        toast.success('Order placed successfully!');
        
        // Redirect to order confirmation
        // Include email for guest orders so they can track it
        const emailParam = !isAuthenticated && shippingAddress.email 
          ? `&email=${encodeURIComponent(shippingAddress.email)}` 
          : '';
        router.push(`/orders/${data.order.id}?order_number=${data.order.order_number}${emailParam}`);
      } else {
        toast.error(data.error || 'Failed to process order');
      }
    } catch (error: any) {
      console.error('Error during checkout:', error);
      toast.error('Failed to process order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-lg mb-4">Your cart is empty</p>
                <Button onClick={() => router.push('/products')}>
                  Continue Shopping
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentStep === 'shipping' ? 'bg-primary text-primary-foreground' :
                ['payment', 'review'].includes(currentStep) ? 'bg-primary/20 text-primary' :
                'bg-muted text-muted-foreground'
              }`}>
                {['payment', 'review'].includes(currentStep) ? (
                  <CheckIcon className="w-5 h-5" />
                ) : (
                  <span>1</span>
                )}
              </div>
              <span className={currentStep === 'shipping' ? 'font-semibold' : ''}>
                Shipping
              </span>
            </div>
            
            <div className="flex-1 h-0.5 bg-muted mx-4" />
            
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentStep === 'payment' ? 'bg-primary text-primary-foreground' :
                currentStep === 'review' ? 'bg-primary/20 text-primary' :
                'bg-muted text-muted-foreground'
              }`}>
                {currentStep === 'review' ? (
                  <CheckIcon className="w-5 h-5" />
                ) : (
                  <span>2</span>
                )}
              </div>
              <span className={currentStep === 'payment' ? 'font-semibold' : ''}>
                Payment
              </span>
            </div>
            
            <div className="flex-1 h-0.5 bg-muted mx-4" />
            
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentStep === 'review' ? 'bg-primary text-primary-foreground' :
                'bg-muted text-muted-foreground'
              }`}>
                <span>3</span>
              </div>
              <span className={currentStep === 'review' ? 'font-semibold' : ''}>
                Review
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step 1: Shipping Address */}
            {currentStep === 'shipping' && (
              <Card>
                <CardHeader>
                  <CardTitle>Shipping Address</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <Label htmlFor="name">Full Name *</Label>
                      <Input
                        id="name"
                        value={shippingAddress.name}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, name: e.target.value })}
                        placeholder="John Doe"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={shippingAddress.email}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, email: e.target.value })}
                        placeholder="john@example.com"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="phone">Phone *</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={shippingAddress.phone}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, phone: e.target.value })}
                        placeholder="+1 234 567 8900"
                        required
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <Label htmlFor="address_line_1">Address Line 1 *</Label>
                      <Input
                        id="address_line_1"
                        value={shippingAddress.address_line_1}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, address_line_1: e.target.value })}
                        placeholder="123 Main Street"
                        required
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <Label htmlFor="address_line_2">Address Line 2</Label>
                      <Input
                        id="address_line_2"
                        value={shippingAddress.address_line_2 || ''}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, address_line_2: e.target.value })}
                        placeholder="Apartment, suite, etc. (optional)"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="city">City *</Label>
                      <Input
                        id="city"
                        value={shippingAddress.city}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                        placeholder="New York"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="state">State/Province *</Label>
                      <Input
                        id="state"
                        value={shippingAddress.state}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, state: e.target.value })}
                        placeholder="NY"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="postal_code">Postal Code *</Label>
                      <Input
                        id="postal_code"
                        value={shippingAddress.postal_code}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, postal_code: e.target.value })}
                        placeholder="10001"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="country">Country *</Label>
                      <Input
                        id="country"
                        value={shippingAddress.country}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, country: e.target.value })}
                        placeholder="United States"
                        required
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Payment Method */}
            {currentStep === 'payment' && (
              <Card>
                <CardHeader>
                  <CardTitle>Payment Method</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <RadioGroup value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}>
                    <div className="flex items-center space-x-2 p-4 border rounded-lg">
                      <RadioGroupItem value="pesapal" id="pesapal" />
                      <Label htmlFor="pesapal" className="flex-1 cursor-pointer">
                        <div>
                          <div className="font-semibold">Pesapal</div>
                          <div className="text-sm text-muted-foreground">Pay securely with Pesapal</div>
                        </div>
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2 p-4 border rounded-lg">
                      <RadioGroupItem value="paypal" id="paypal" />
                      <Label htmlFor="paypal" className="flex-1 cursor-pointer">
                        <div>
                          <div className="font-semibold">PayPal</div>
                          <div className="text-sm text-muted-foreground">Pay with your PayPal account</div>
                        </div>
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2 p-4 border rounded-lg">
                      <RadioGroupItem value="cash_on_delivery" id="cash_on_delivery" />
                      <Label htmlFor="cash_on_delivery" className="flex-1 cursor-pointer">
                        <div>
                          <div className="font-semibold">Cash on Delivery</div>
                          <div className="text-sm text-muted-foreground">Pay when you receive your order</div>
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>

                  <Separator />

                  <div>
                    <Label htmlFor="coupon_code">Coupon Code (Optional)</Label>
                    <Input
                      id="coupon_code"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      placeholder="Enter coupon code"
                    />
                  </div>

                  <div>
                    <Label htmlFor="notes">Order Notes (Optional)</Label>
                    <textarea
                      id="notes"
                      className="w-full min-h-[100px] px-3 py-2 text-sm border rounded-md"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Special instructions for your order..."
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="billing_same"
                      checked={useBillingSameAsShipping}
                      onCheckedChange={(checked) => setUseBillingSameAsShipping(checked === true)}
                    />
                    <Label htmlFor="billing_same" className="cursor-pointer">
                      Billing address same as shipping address
                    </Label>
                  </div>

                  {!useBillingSameAsShipping && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Billing Address</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="md:col-span-2">
                            <Label htmlFor="billing_name">Full Name *</Label>
                            <Input
                              id="billing_name"
                              value={billingAddress.name}
                              onChange={(e) => setBillingAddress({ ...billingAddress, name: e.target.value })}
                              required
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="billing_email">Email *</Label>
                            <Input
                              id="billing_email"
                              type="email"
                              value={billingAddress.email}
                              onChange={(e) => setBillingAddress({ ...billingAddress, email: e.target.value })}
                              required
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="billing_phone">Phone *</Label>
                            <Input
                              id="billing_phone"
                              type="tel"
                              value={billingAddress.phone}
                              onChange={(e) => setBillingAddress({ ...billingAddress, phone: e.target.value })}
                              required
                            />
                          </div>
                          
                          <div className="md:col-span-2">
                            <Label htmlFor="billing_address_line_1">Address Line 1 *</Label>
                            <Input
                              id="billing_address_line_1"
                              value={billingAddress.address_line_1}
                              onChange={(e) => setBillingAddress({ ...billingAddress, address_line_1: e.target.value })}
                              required
                            />
                          </div>
                          
                          <div className="md:col-span-2">
                            <Label htmlFor="billing_address_line_2">Address Line 2</Label>
                            <Input
                              id="billing_address_line_2"
                              value={billingAddress.address_line_2 || ''}
                              onChange={(e) => setBillingAddress({ ...billingAddress, address_line_2: e.target.value })}
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="billing_city">City *</Label>
                            <Input
                              id="billing_city"
                              value={billingAddress.city}
                              onChange={(e) => setBillingAddress({ ...billingAddress, city: e.target.value })}
                              required
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="billing_state">State/Province *</Label>
                            <Input
                              id="billing_state"
                              value={billingAddress.state}
                              onChange={(e) => setBillingAddress({ ...billingAddress, state: e.target.value })}
                              required
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="billing_postal_code">Postal Code *</Label>
                            <Input
                              id="billing_postal_code"
                              value={billingAddress.postal_code}
                              onChange={(e) => setBillingAddress({ ...billingAddress, postal_code: e.target.value })}
                              required
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="billing_country">Country *</Label>
                            <Input
                              id="billing_country"
                              value={billingAddress.country}
                              onChange={(e) => setBillingAddress({ ...billingAddress, country: e.target.value })}
                              required
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Step 3: Review */}
            {currentStep === 'review' && (
              <Card>
                <CardHeader>
                  <CardTitle>Order Review</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Shipping Address Summary */}
                  <div>
                    <h3 className="font-semibold mb-2">Shipping Address</h3>
                    <div className="text-sm text-muted-foreground">
                      <p>{shippingAddress.name}</p>
                      <p>{shippingAddress.email}</p>
                      <p>{shippingAddress.phone}</p>
                      <p>{shippingAddress.address_line_1}</p>
                      {shippingAddress.address_line_2 && <p>{shippingAddress.address_line_2}</p>}
                      <p>{shippingAddress.city}, {shippingAddress.state} {shippingAddress.postal_code}</p>
                      <p>{shippingAddress.country}</p>
                    </div>
                  </div>

                  <Separator />

                  {/* Payment Method Summary */}
                  <div>
                    <h3 className="font-semibold mb-2">Payment Method</h3>
                    <div className="text-sm text-muted-foreground">
                      {paymentMethod === 'pesapal' && 'Pesapal'}
                      {paymentMethod === 'paypal' && 'PayPal'}
                      {paymentMethod === 'cash_on_delivery' && 'Cash on Delivery'}
                    </div>
                  </div>

                  {notes && (
                    <>
                      <Separator />
                      <div>
                        <h3 className="font-semibold mb-2">Order Notes</h3>
                        <p className="text-sm text-muted-foreground">{notes}</p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 'shipping'}
              >
                <ArrowLeftIcon className="w-4 h-4 mr-2" />
                Back
              </Button>
              
              {currentStep !== 'review' ? (
                <Button onClick={handleNext}>
                  Next
                  <ArrowRightIcon className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={submitting}>
                  {submitting ? 'Processing...' : 'Place Order'}
                </Button>
              )}
            </div>
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Cart Items */}
                <div className="space-y-3">
                  {cart.items.map((item) => (
                    <div key={`${item.product_id}-${item.variant_id || 'base'}`} className="flex gap-3">
                      {item.image && (
                        <div className="relative w-16 h-16 rounded-md overflow-hidden bg-muted flex-shrink-0">
                          <Image
                            src={item.image}
                            alt={item.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Qty: {item.quantity} × {formatPrice(item.price)}
                        </p>
                      </div>
                      <div className="text-sm font-medium">
                        {formatPrice(item.price * item.quantity)}
                      </div>
                    </div>
                  ))}
                </div>

                <Separator />

                {/* Totals */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>{formatPrice(cart.total)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Shipping</span>
                    <span className="text-muted-foreground">Calculated at checkout</span>
                  </div>
                  {couponCode && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount ({couponCode})</span>
                      <span>-</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>{formatPrice(cart.total)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

