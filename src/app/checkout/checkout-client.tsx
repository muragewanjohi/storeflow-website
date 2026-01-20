/**
 * Checkout Client Component
 * 
 * Multi-step checkout form with shipping, payment, and review
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import Image from 'next/image';
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

type DeliveryMethod = 'delivery' | 'pickup';

type Step = 'shipping' | 'payment' | 'review';

interface CheckoutClientProps {
  isAuthenticated?: boolean;
}

export default function CheckoutClient({ isAuthenticated = false }: Readonly<CheckoutClientProps>) {
  const router = useRouter();
  const { formatCurrency } = useCurrency();
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
  
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash_on_delivery');
  const [couponCode, setCouponCode] = useState('');
  const [notes, setNotes] = useState('');
  
  // Delivery method state
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('delivery');
  const [checkoutSettings, setCheckoutSettings] = useState<{
    pickup_enabled: boolean;
    shipping_enabled: boolean;
    shipping_method_type: string | null;
    store_full_address: string | null;
    store_phone: string | null;
  } | null>(null);
  
  // Delivery zones state
  const [deliveryZones, setDeliveryZones] = useState<any[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [selectedZone, setSelectedZone] = useState<any | null>(null);
  const [zoneDetectionStatus, setZoneDetectionStatus] = useState<'detecting' | 'matched' | 'not_matched' | null>(null);
  const [deliveryFee, setDeliveryFee] = useState<number | null>(null);
  
  // Saved addresses state
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [useNewAddress, setUseNewAddress] = useState(false);
  const [saveNewAddress, setSaveNewAddress] = useState(false);

  const fetchCart = useCallback(async () => {
    try {
      const response = await fetch('/api/cart');
      if (response.ok) {
        const data = await response.json();
        setCart(data.cart);
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
  }, [router]);

  // Fetch customer profile and pre-fill address if authenticated
  const fetchCustomerProfile = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const response = await fetch('/api/customers/profile');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.customer) {
          const customer = data.customer;
          
          // Pre-fill shipping address from customer profile
          setShippingAddress({
            name: customer.name || '',
            email: customer.email || '',
            phone: customer.mobile || '',
            address_line_1: customer.address || '',
            address_line_2: null,
            city: customer.city || '',
            state: customer.state || '',
            postal_code: customer.postal_code || '',
            country: customer.country || '',
          });
        }
      }
    } catch (error) {
      console.error('Error fetching customer profile:', error);
      // Don't show error to user - just continue without pre-filling
    }
  }, [isAuthenticated]);

  // Check for saved delivery addresses
  const fetchSavedAddresses = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const response = await fetch('/api/customers/profile/addresses');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.addresses && data.addresses.length > 0) {
          setSavedAddresses(data.addresses);
          
          // Find default address or use first one
          const defaultAddress = data.addresses.find((addr: any) => addr.is_default) || data.addresses[0];
          
          if (defaultAddress) {
            // Pre-select default address
            setSelectedAddressId(defaultAddress.id);
            setUseNewAddress(false);
            
            // Pre-fill with saved delivery address
            setShippingAddress({
              name: defaultAddress.name || '',
              email: defaultAddress.email || '',
              phone: defaultAddress.phone || '',
              address_line_1: defaultAddress.address || '',
              address_line_2: null,
              city: defaultAddress.city || '',
              state: defaultAddress.state || '',
              postal_code: defaultAddress.postal_code || '',
              country: defaultAddress.country || '',
            });
          } else {
            // No default, but addresses exist - use profile address and let user select
            fetchCustomerProfile();
            setUseNewAddress(true);
          }
        } else {
          // No saved addresses, use profile address
          setSavedAddresses([]);
          fetchCustomerProfile();
          setUseNewAddress(true);
        }
      } else {
        // API call failed, fall back to profile address
        setSavedAddresses([]);
        fetchCustomerProfile();
        setUseNewAddress(true);
      }
    } catch (error) {
      console.error('Error fetching saved addresses:', error);
      // Fall back to profile address if saved addresses fail
      setSavedAddresses([]);
      fetchCustomerProfile();
      setUseNewAddress(true);
    }
  }, [isAuthenticated, fetchCustomerProfile]);
  
  // Handle address selection
  const handleAddressSelect = (addressId: string) => {
    if (addressId === 'new') {
      setUseNewAddress(true);
      setSelectedAddressId(null);
      // Clear form or keep current values
      return;
    }
    
    const selectedAddress = savedAddresses.find((addr: any) => addr.id === addressId);
    if (selectedAddress) {
      setSelectedAddressId(addressId);
      setUseNewAddress(false);
      
      // Fill form with selected address
      setShippingAddress({
        name: selectedAddress.name || '',
        email: selectedAddress.email || '',
        phone: selectedAddress.phone || '',
        address_line_1: selectedAddress.address || '',
        address_line_2: null,
        city: selectedAddress.city || '',
        state: selectedAddress.state || '',
        postal_code: selectedAddress.postal_code || '',
        country: selectedAddress.country || '',
      });
    }
  };

  // Fetch checkout settings (pickup enabled, store address, etc.)
  const fetchCheckoutSettings = useCallback(async () => {
    try {
      const response = await fetch('/api/checkout/settings');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.settings) {
          setCheckoutSettings(data.settings);
          
          // Set default delivery method based on available options
          if (data.settings.pickup_enabled && !data.settings.shipping_enabled) {
            // Only pickup available
            setDeliveryMethod('pickup');
          } else if (!data.settings.pickup_enabled && data.settings.shipping_enabled) {
            // Only delivery available
            setDeliveryMethod('delivery');
          } else {
            // Both available, default to delivery
            setDeliveryMethod('delivery');
          }
        }
      }
    } catch (error) {
      console.error('Error fetching checkout settings:', error);
      // Default to delivery if settings fetch fails
      setCheckoutSettings({
        pickup_enabled: false,
        shipping_enabled: true,
        shipping_method_type: 'flat_rate',
        store_full_address: null,
        store_phone: null,
      });
    }
  }, []);

  // Fetch delivery zones (only if shipping method is delivery_zones)
  const fetchDeliveryZones = useCallback(async () => {
    if (deliveryMethod !== 'delivery') return;
    if (checkoutSettings?.shipping_method_type !== 'delivery_zones') return;

    try {
      const response = await fetch('/api/checkout/delivery-zones');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.zones) {
          setDeliveryZones(data.zones);
        }
      }
    } catch (error) {
      console.error('Error fetching delivery zones:', error);
    }
  }, [deliveryMethod, checkoutSettings?.shipping_method_type]);

  // Auto-detect zone based on address
  const detectZone = useCallback(async () => {
    if (deliveryMethod !== 'delivery' || !shippingAddress.city && !shippingAddress.state && !shippingAddress.address_line_1) {
      return;
    }

    setZoneDetectionStatus('detecting');

    try {
      const response = await fetch('/api/checkout/delivery-zones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          city: shippingAddress.city,
          state: shippingAddress.state,
          address_line_1: shippingAddress.address_line_1,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          if (data.matched && data.zone) {
            setSelectedZoneId(data.zone.id);
            setSelectedZone(data.zone);
            setDeliveryFee(Number(data.zone.price));
            setZoneDetectionStatus('matched');
          } else {
            setSelectedZoneId(null);
            setSelectedZone(null);
            setDeliveryFee(null);
            setZoneDetectionStatus('not_matched');
          }
        }
      }
    } catch (error) {
      console.error('Error detecting zone:', error);
      setZoneDetectionStatus(null);
    }
  }, [deliveryMethod, shippingAddress.city, shippingAddress.state, shippingAddress.address_line_1]);

  // Handle zone selection
  const handleZoneSelect = (zoneId: string) => {
    if (zoneId === 'out_of_zone') {
      setSelectedZoneId(null);
      setSelectedZone(null);
      setDeliveryFee(null);
      setZoneDetectionStatus('not_matched');
      return;
    }
    
    const zone = deliveryZones.find((z: any) => z.id === zoneId);
    if (zone) {
      setSelectedZoneId(zoneId);
      setSelectedZone(zone);
      setDeliveryFee(Number(zone.price));
      setZoneDetectionStatus('matched');
    }
  };

  // Fetch cart on mount
  useEffect(() => {
    fetchCart();
    fetchCheckoutSettings();
  }, [fetchCart, fetchCheckoutSettings]);

  // Fetch delivery zones when delivery method is selected
  useEffect(() => {
    if (deliveryMethod === 'delivery') {
      fetchDeliveryZones();
    } else {
      setDeliveryZones([]);
      setSelectedZoneId(null);
      setSelectedZone(null);
      setDeliveryFee(null);
      setZoneDetectionStatus(null);
    }
  }, [deliveryMethod, fetchDeliveryZones]);

  // Auto-detect zone when address changes (debounced)
  useEffect(() => {
    if (deliveryMethod === 'delivery' && deliveryZones.length > 0) {
      const timer = setTimeout(() => {
        if (shippingAddress.city || shippingAddress.state || shippingAddress.address_line_1) {
          detectZone();
        }
      }, 500); // Debounce for 500ms

      return () => clearTimeout(timer);
    }
  }, [deliveryMethod, shippingAddress.city, shippingAddress.state, shippingAddress.address_line_1, deliveryZones.length, detectZone]);

  // Fetch customer data when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      // First try to get saved delivery addresses (preferred)
      fetchSavedAddresses();
    }
  }, [isAuthenticated, fetchSavedAddresses]);

  const validateShipping = (): boolean => {
    // For pickup, only require name, email, and phone
    if (deliveryMethod === 'pickup') {
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
      return true;
    }
    
    // For delivery, require full address (even for out-of-zone orders, we need the address)
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
      toast.error('State/Province is required');
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
    
    // Zone validation (optional - can proceed without zone if out-of-zone)
    // We allow orders to proceed even if zone is not selected (out-of-zone orders)
    // The address is still required for delivery, even if out of zone
    
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
      // Save new address if requested
      if (isAuthenticated && useNewAddress && saveNewAddress) {
        try {
          const addressResponse = await fetch('/api/customers/profile/addresses', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: shippingAddress.name,
              email: shippingAddress.email,
              phone: shippingAddress.phone,
              address: shippingAddress.address_line_1,
              city: shippingAddress.city,
              state: shippingAddress.state,
              postal_code: shippingAddress.postal_code,
              country: shippingAddress.country,
              is_default: savedAddresses.length === 0, // Set as default if it's the first address
            }),
          });
          
          if (addressResponse.ok) {
            toast.success('Address saved successfully');
            // Refresh saved addresses
            fetchSavedAddresses();
          }
        } catch (error) {
          console.error('Error saving address:', error);
          // Don't block checkout if address save fails
        }
      }

      const checkoutData = {
        items: cart.items.map(item => ({
          product_id: item.product_id,
          variant_id: item.variant_id,
          quantity: item.quantity,
        })),
        delivery_method: deliveryMethod,
        shipping_address: deliveryMethod === 'delivery' ? shippingAddress : null,
        pickup_address: deliveryMethod === 'pickup' && checkoutSettings?.store_full_address 
          ? {
              name: shippingAddress.name,
              email: shippingAddress.email,
              phone: shippingAddress.phone,
              address: checkoutSettings.store_full_address,
            }
          : null,
        delivery_zone_id: deliveryMethod === 'delivery' ? (selectedZoneId || null) : null,
        delivery_zone_name: deliveryMethod === 'delivery' ? (selectedZone?.name || null) : null,
        delivery_fee: deliveryMethod === 'delivery' ? (deliveryFee || null) : null,
        delivery_fee_status: deliveryMethod === 'delivery' && !selectedZoneId 
          ? 'pending' 
          : deliveryMethod === 'delivery' && selectedZoneId 
            ? 'approved' 
            : null,
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

  // Using formatCurrency from useCurrency hook
  const formatPrice = (price: number) => formatCurrency(price);

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
        {/* Guest Checkout Notice */}
        {!isAuthenticated && (
          <Card className="mb-6 border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <p className="text-sm font-medium mb-1">Guest Checkout</p>
                  <p className="text-sm text-muted-foreground">
                    You&apos;re checking out as a guest. You can create an account during checkout or continue without one.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
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
                  <CardTitle>Delivery Method</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Delivery Method Selection (if both options available) */}
                  {checkoutSettings && checkoutSettings.pickup_enabled && checkoutSettings.shipping_enabled && (
                    <div className="space-y-2">
                      <Label>Choose how you want to receive your order</Label>
                      <RadioGroup
                        value={deliveryMethod}
                        onValueChange={(value) => setDeliveryMethod(value as DeliveryMethod)}
                      >
                        <div className="flex items-center space-x-2 p-4 border rounded-lg">
                          <RadioGroupItem value="delivery" id="delivery" />
                          <Label htmlFor="delivery" className="flex-1 cursor-pointer">
                            <div>
                              <div className="font-semibold">Delivery</div>
                              <div className="text-sm text-muted-foreground">We&apos;ll deliver to your address</div>
                            </div>
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2 p-4 border rounded-lg">
                          <RadioGroupItem value="pickup" id="pickup" />
                          <Label htmlFor="pickup" className="flex-1 cursor-pointer">
                            <div>
                              <div className="font-semibold">Store Pickup</div>
                              <div className="text-sm text-muted-foreground">Pick up from our store location</div>
                            </div>
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>
                  )}
                  
                  {/* Show pickup location info when pickup is selected */}
                  {deliveryMethod === 'pickup' && checkoutSettings?.store_full_address && (
                    <div className="p-4 border rounded-lg bg-primary/5">
                      <div className="space-y-2">
                        <h3 className="font-semibold">Pickup Location</h3>
                        <p className="text-sm text-muted-foreground">{checkoutSettings.store_full_address}</p>
                        {checkoutSettings.store_phone && (
                          <p className="text-sm text-muted-foreground">Phone: {checkoutSettings.store_phone}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          You&apos;ll receive a notification when your order is ready for pickup.
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <Separator />
                  
                  {/* Contact Information Form (shown for pickup) */}
                  {deliveryMethod === 'pickup' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <Label htmlFor="pickup_name">Full Name *</Label>
                          <Input
                            id="pickup_name"
                            value={shippingAddress.name}
                            onChange={(e) => setShippingAddress({ ...shippingAddress, name: e.target.value })}
                            placeholder="John Doe"
                            required
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="pickup_email">Email *</Label>
                          <Input
                            id="pickup_email"
                            type="email"
                            value={shippingAddress.email}
                            onChange={(e) => setShippingAddress({ ...shippingAddress, email: e.target.value })}
                            placeholder="john@example.com"
                            required
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="pickup_phone">Phone *</Label>
                          <Input
                            id="pickup_phone"
                            type="tel"
                            value={shippingAddress.phone}
                            onChange={(e) => setShippingAddress({ ...shippingAddress, phone: e.target.value })}
                            placeholder="+1 234 567 8900"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Shipping Address Form (only shown for delivery) */}
                  {deliveryMethod === 'delivery' && (
                    <>
                      {/* Saved Addresses Selector (only for authenticated users) */}
                      {isAuthenticated && savedAddresses.length > 0 && (
                    <div className="space-y-2">
                      <Label>Select Delivery Address</Label>
                      <Select
                        value={useNewAddress ? 'new' : (selectedAddressId || '')}
                        onValueChange={handleAddressSelect}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose an address" />
                        </SelectTrigger>
                        <SelectContent>
                          {savedAddresses.map((address: any) => (
                            <SelectItem key={address.id} value={address.id}>
                              <div className="flex items-center gap-2">
                                <span>{address.name}</span>
                                {address.is_default && (
                                  <Badge variant="secondary" className="text-xs">Default</Badge>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                          <SelectItem value="new">Add New Address</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      {/* Display selected saved address info (informational only - form fields are always visible below) */}
                      {!useNewAddress && selectedAddressId && (
                        <div className="p-3 border rounded-lg bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                          <p className="text-xs font-medium text-blue-900 dark:text-blue-100 mb-1">
                            Using saved address:
                          </p>
                          {(() => {
                            const selected = savedAddresses.find((a: any) => a.id === selectedAddressId);
                            if (!selected) return null;
                            return (
                              <div className="text-xs space-y-0.5 text-blue-700 dark:text-blue-300">
                                <p>{selected.name}</p>
                                <p>{selected.address || selected.address_line_1}</p>
                                <p>
                                  {selected.city}{selected.state ? `, ${selected.state}` : ''} {selected.postal_code || ''}
                                </p>
                                {selected.country && <p>{selected.country}</p>}
                              </div>
                            );
                          })()}
                          <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                            You can edit any field below if needed.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Delivery Zone Selection (only shown if shipping method is delivery_zones) */}
                  {checkoutSettings?.shipping_method_type === 'delivery_zones' && deliveryZones.length > 0 && (
                    <div className="space-y-2">
                      <Label>Delivery Zone *</Label>
                      {zoneDetectionStatus === 'detecting' && (
                        <p className="text-sm text-muted-foreground">Detecting zone...</p>
                      )}
                      {zoneDetectionStatus === 'matched' && selectedZone && (
                        <div className="p-3 border rounded-lg bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                          <p className="text-sm font-medium text-green-900 dark:text-green-100">
                            Zone detected: {selectedZone.name}
                          </p>
                          <p className="text-sm text-green-700 dark:text-green-300">
                            Delivery fee: {formatPrice(selectedZone.price)}
                          </p>
                        </div>
                      )}
                      {zoneDetectionStatus === 'not_matched' && (
                        <div className="p-3 border rounded-lg bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800">
                          <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                            ⚠️ Location not in standard delivery zones
                          </p>
                          <p className="text-sm text-yellow-700 dark:text-yellow-300">
                            We&apos;ll calculate a custom delivery fee and contact you with the quote.
                          </p>
                        </div>
                      )}
                      <Select
                        value={selectedZoneId || (zoneDetectionStatus === 'not_matched' ? 'out_of_zone' : '')}
                        onValueChange={handleZoneSelect}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select delivery zone or let us detect it" />
                        </SelectTrigger>
                        <SelectContent>
                          {deliveryZones.map((zone: any) => (
                            <SelectItem key={zone.id} value={zone.id}>
                              <div>
                                <span className="font-medium">{zone.name}</span>
                                <span className="text-muted-foreground ml-2">
                                  - {formatPrice(zone.price)}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                          <SelectItem value="out_of_zone">
                            <div>
                              <span className="font-medium">Out of Zone</span>
                              <span className="text-muted-foreground ml-2">
                                - Custom quote
                              </span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      {selectedZone && (
                        <p className="text-xs text-muted-foreground">
                          Locations covered: {selectedZone.locations.join(', ')}
                        </p>
                      )}
                      <Separator />
                    </div>
                  )}
                  
                  {/* Address Form (always shown for delivery to allow editing all fields) */}
                  {deliveryMethod === 'delivery' && (
                    <>
                      <Separator />
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
                  
                  {/* Option to save new address (only for authenticated users) */}
                  {isAuthenticated && useNewAddress && (
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="save_address"
                        checked={saveNewAddress}
                        onCheckedChange={(checked) => setSaveNewAddress(checked === true)}
                      />
                      <Label htmlFor="save_address" className="cursor-pointer text-sm">
                        Save this address for future orders
                      </Label>
                    </div>
                  )}
                    </>
                  )}
                    </>
                  )}
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
                  <div className="flex items-center space-x-2 p-4 border rounded-lg bg-primary/5">
                    <div className="w-4 h-4 rounded-full border-2 border-primary bg-primary flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                    </div>
                    <Label htmlFor="cash_on_delivery" className="flex-1 cursor-pointer">
                      <div>
                        <div className="font-semibold">Cash on Delivery</div>
                        <div className="text-sm text-muted-foreground">Pay when you receive your order</div>
                      </div>
                    </Label>
                  </div>

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
                  {/* Delivery Method Summary */}
                  <div>
                    <h3 className="font-semibold mb-2">
                      {deliveryMethod === 'pickup' ? 'Pickup Information' : 'Shipping Address'}
                    </h3>
                    <div className="text-sm text-muted-foreground">
                      {deliveryMethod === 'pickup' ? (
                        <>
                          <p className="font-medium">{shippingAddress.name}</p>
                          <p>{shippingAddress.email}</p>
                          <p>{shippingAddress.phone}</p>
                          <Separator className="my-2" />
                          <p className="font-medium mt-2">Pickup Location:</p>
                          <p>{checkoutSettings?.store_full_address || 'Store location'}</p>
                          {checkoutSettings?.store_phone && (
                            <p>Phone: {checkoutSettings.store_phone}</p>
                          )}
                        </>
                      ) : (
                        <>
                          <p>{shippingAddress.name}</p>
                          <p>{shippingAddress.email}</p>
                          <p>{shippingAddress.phone}</p>
                          <p>{shippingAddress.address_line_1}</p>
                          {shippingAddress.address_line_2 && <p>{shippingAddress.address_line_2}</p>}
                          <p>{shippingAddress.city}, {shippingAddress.state} {shippingAddress.postal_code}</p>
                          <p>{shippingAddress.country}</p>
                        </>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Payment Method Summary */}
                  <div>
                    <h3 className="font-semibold mb-2">Payment Method</h3>
                    <div className="text-sm text-muted-foreground">
                      Cash on Delivery
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
                  {cart.items.map((item: any) => (
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
                    <span className={
                      deliveryMethod === 'delivery' && 
                      checkoutSettings?.shipping_method_type === 'delivery_zones' && 
                      !selectedZoneId && 
                      zoneDetectionStatus === 'not_matched'
                        ? 'text-yellow-600 font-medium' 
                        : 'text-muted-foreground'
                    }>
                      {deliveryMethod === 'pickup' 
                        ? 'Free (Store Pickup)' 
                        : checkoutSettings?.shipping_method_type === 'delivery_zones'
                          ? (deliveryFee 
                              ? formatPrice(deliveryFee) 
                              : !selectedZoneId && zoneDetectionStatus === 'not_matched'
                                ? 'Excluded'
                                : 'Calculated at checkout')
                          : checkoutSettings?.shipping_method_type === 'flat_rate'
                            ? 'Flat rate'
                            : 'Calculated at checkout'}
                    </span>
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
                    <span>
                      {formatPrice(
                        cart.total + (deliveryMethod === 'delivery' && deliveryFee ? deliveryFee : 0)
                      )}
                    </span>
                  </div>
                  {deliveryMethod === 'delivery' && deliveryFee && (
                    <p className="text-xs text-muted-foreground text-right">
                      Includes delivery fee: {formatPrice(deliveryFee)}
                    </p>
                  )}
                  {deliveryMethod === 'delivery' && !deliveryFee && selectedZoneId === null && (
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 text-right">
                      ⚠️ Delivery fee will be calculated and quoted
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

