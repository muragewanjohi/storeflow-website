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
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, ExclamationTriangleIcon, TruckIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import Image from 'next/image';
import { useCurrency } from '@/lib/currency/currency-context';
import { AddressAutocomplete } from '@/components/address/address-autocomplete';
import { useAnalytics } from '@/lib/analytics/use-analytics';
import { trackMetaPixelEvent } from '@/lib/analytics/meta-pixel';
import { identifyTikTokPixelUser, trackTikTokPixelEvent } from '@/lib/analytics/tiktok-pixel';
import { normalizeKenyaMsisdnForTumizi } from '@/lib/tumizi/phone';

interface CartItem {
  product_id: string;
  variant_id: string | null;
  quantity: number;
  price: number;
  name: string;
  image: string | null;
  sku: string | null;
  slug?: string | null;
  estimated_delivery_days?: number | null;
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
  city?: string;
  state?: string;
  postal_code?: string;
  country: string;
  formatted_address?: string;
  place_id?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

interface SavedAddress {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  address_label?: string | null;
  is_default: boolean;
}

function getSavedAddressTitle(address: SavedAddress): string {
  const primary = address.address_label?.trim() || address.name?.trim() || 'Saved address';
  const location = [address.city, address.state].filter(Boolean).join(', ');
  return location ? `${primary} - ${location}` : primary;
}

function getSavedAddressLine(address: SavedAddress): string {
  return [address.address, address.country].filter(Boolean).join(', ');
}

type PaymentMethod = 'cash' | 'mpesa' | 'tumizi';

type DeliveryMethod = 'delivery' | 'pickup';

type Step = 'shipping' | 'payment' | 'review';

interface CheckoutClientProps {
  isAuthenticated?: boolean;
  canProcessOrders?: boolean;
  accessRestriction?: {
    level: string;
    reason?: string;
    daysRemaining?: number;
  };
  defaultEstimatedDeliveryDays?: number | null;
}

export default function CheckoutClient({ 
  isAuthenticated = false,
  canProcessOrders = true,
  accessRestriction,
  defaultEstimatedDeliveryDays,
}: Readonly<CheckoutClientProps>) {
  const router = useRouter();
  const { formatCurrency, currency } = useCurrency();
  const { track } = useAnalytics();
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
  
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [couponCode, setCouponCode] = useState('');
  const [notes, setNotes] = useState('');
  
  // Payment verification fields (for M-Pesa)
  const [paymentTransactionId, setPaymentTransactionId] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentVerificationNotes, setPaymentVerificationNotes] = useState('');
  
  // Delivery method state
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('delivery');
  const [checkoutSettings, setCheckoutSettings] = useState<{
    pickup_enabled: boolean;
    pickup_location_name?: string | null;
    pickup_instructions?: string | null;
    pickup_hours?: string | null;
    shipping_enabled: boolean;
    shipping_method_type: string | null;
    shipping_method_type_stored?: string | null;
    flat_rate_amount?: number | null;
    shipping_customer_notice?: string | null;
    shipping_fell_back_from_zones?: boolean;
    store_full_address: string | null;
    store_phone: string | null;
    payment_cash_enabled: boolean;
    payment_mpesa_enabled: boolean;
    payment_mpesa_option: string | null;
    payment_mpesa_send_money_number: string | null;
    payment_mpesa_buy_goods_till: string | null;
    payment_mpesa_paybill_number: string | null;
    payment_mpesa_paybill_account: string | null;
    payment_mpesa_pochi_phone: string | null;
    payment_method: string;
    default_payment_method: string; // Keep for backward compatibility
    payment_tumizi_ready?: boolean;
    payment_timing: 'before_delivery' | 'after_delivery' | 'user_choice';
    tax_enabled: boolean;
    default_tax_rate: number | null;
    tax_pricing_type: 'inclusive' | 'exclusive';
  } | null>(null);
  
  // Delivery zones state
  const [deliveryZones, setDeliveryZones] = useState<any[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [selectedZone, setSelectedZone] = useState<any | null>(null);
  const [zoneDetectionStatus, setZoneDetectionStatus] = useState<'detecting' | 'matched' | 'not_matched' | null>(null);
  const [deliveryFee, setDeliveryFee] = useState<number | null>(null);
  
  // Saved addresses state
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [useNewAddress, setUseNewAddress] = useState(false);
  const [saveNewAddress, setSaveNewAddress] = useState(false);
  const [saveAddressLabel, setSaveAddressLabel] = useState('');
  
  // Address autocomplete state
  const [addressInputValue, setAddressInputValue] = useState<string>('');

  // Calculate maximum estimated delivery days across all cart items
  // Uses product-specific delivery days if set, otherwise falls back to tenant default
  const getMaxEstimatedDeliveryDays = useCallback((): number | null => {
    if (!cart || cart.items.length === 0) return null;
    
    const deliveryDays = cart.items.map((item: CartItem) => 
      item.estimated_delivery_days ?? defaultEstimatedDeliveryDays
    ).filter((days): days is number => days !== null && days !== undefined && days > 0);
    
    if (deliveryDays.length === 0) return null;
    
    return Math.max(...deliveryDays);
  }, [cart, defaultEstimatedDeliveryDays]);

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
          const defaultAddress = data.addresses.find((addr: SavedAddress) => addr.is_default) || data.addresses[0];
          
          if (defaultAddress) {
            // Pre-select default address
            setSelectedAddressId(defaultAddress.id);
            setUseNewAddress(false);
            
            // Extract state and country (they might be stored in address field or returned as strings)
            // Check if state/country is a UUID (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
            const isUuid = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
            const stateValue = typeof defaultAddress.state === 'string' && defaultAddress.state && !isUuid(defaultAddress.state)
              ? defaultAddress.state 
              : '';
            const countryValue = typeof defaultAddress.country === 'string' && defaultAddress.country && !isUuid(defaultAddress.country)
              ? defaultAddress.country
              : '';
            
            const addressValue = defaultAddress.address || '';
            
            // Pre-fill with saved delivery address
            setShippingAddress({
              name: defaultAddress.name || '',
              email: defaultAddress.email || '',
              phone: defaultAddress.phone || '',
              address_line_1: addressValue,
              address_line_2: null,
              city: defaultAddress.city || '',
              state: stateValue,
              postal_code: defaultAddress.postal_code || '',
              country: countryValue,
              formatted_address: addressValue,
            });
            setAddressInputValue(addressValue);
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
  
  // Handle address selection from saved addresses
  const handleAddressSelect = (addressId: string) => {
    if (addressId === 'new') {
      setUseNewAddress(true);
      setSelectedAddressId(null);
      setSaveAddressLabel('');
      // Clear form
      setShippingAddress({
        name: '',
        email: '',
        phone: '',
        address_line_1: '',
        address_line_2: null,
        city: '',
        state: '',
        postal_code: '',
        country: '',
      });
      setAddressInputValue('');
      return;
    }
    
    const selectedAddress = savedAddresses.find((addr) => addr.id === addressId);
    if (selectedAddress) {
      setSelectedAddressId(addressId);
      setUseNewAddress(false);
      setSaveNewAddress(false);
      
      // Extract state and country (they might be stored in address field or returned as strings)
      const isUuid = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
      const stateValue = typeof selectedAddress.state === 'string' && selectedAddress.state && !isUuid(selectedAddress.state)
        ? selectedAddress.state 
        : '';
      const countryValue = typeof selectedAddress.country === 'string' && selectedAddress.country && !isUuid(selectedAddress.country)
        ? selectedAddress.country
        : '';
      
      // Fill form with selected address
      const addressValue = selectedAddress.address || '';
      setShippingAddress({
        name: selectedAddress.name || '',
        email: selectedAddress.email || '',
        phone: selectedAddress.phone || '',
        address_line_1: addressValue,
        address_line_2: null,
        city: selectedAddress.city || '',
        state: stateValue,
        postal_code: selectedAddress.postal_code || '',
        country: countryValue,
        formatted_address: addressValue, // Use saved address as formatted
      });
      setAddressInputValue(addressValue);
    }
  };

  // Handle Google Places address selection
  const handlePlaceSelected = (components: {
    address_line_1: string;
    address_line_2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
    formatted_address: string;
    place_id?: string;
    coordinates?: { lat: number; lng: number };
  }) => {
    setShippingAddress({
      ...shippingAddress,
      address_line_1: components.address_line_1,
      address_line_2: components.address_line_2 || null,
      city: components.city,
      state: components.state,
      postal_code: components.postal_code,
      country: components.country,
      formatted_address: components.formatted_address,
      place_id: components.place_id,
      coordinates: components.coordinates,
    });
    setAddressInputValue(components.formatted_address);
    
    // Auto-detect zone after address is selected
    if (deliveryMethod === 'delivery' && deliveryZones.length > 0) {
      setTimeout(() => detectZone(), 300);
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
          
          // Set default payment method
          const preferred =
            data.settings.payment_method || data.settings.default_payment_method;
          if (preferred === 'tumizi' && data.settings.payment_tumizi_ready) {
            setPaymentMethod('tumizi');
          } else if (preferred === 'tumizi' && !data.settings.payment_tumizi_ready) {
            if (data.settings.payment_mpesa_enabled) setPaymentMethod('mpesa');
            else if (data.settings.payment_cash_enabled) setPaymentMethod('cash');
            else setPaymentMethod('cash');
          } else if (preferred === 'cash' || preferred === 'mpesa') {
            setPaymentMethod(preferred);
          } else if (data.settings.payment_cash_enabled) {
            setPaymentMethod('cash');
          } else if (data.settings.payment_mpesa_enabled) {
            setPaymentMethod('mpesa');
          } else if (data.settings.payment_tumizi_ready) {
            setPaymentMethod('tumizi');
          } else {
            setPaymentMethod('cash');
          }
          
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
        shipping_method_type_stored: 'flat_rate',
        flat_rate_amount: null,
        shipping_customer_notice: null,
        shipping_fell_back_from_zones: false,
        store_full_address: null,
        store_phone: null,
        payment_cash_enabled: true,
        payment_mpesa_enabled: false,
        payment_mpesa_option: null,
        payment_mpesa_send_money_number: null,
        payment_mpesa_buy_goods_till: null,
        payment_mpesa_paybill_number: null,
        payment_mpesa_paybill_account: null,
        payment_mpesa_pochi_phone: null,
        payment_method: 'cash',
        default_payment_method: 'cash',
        payment_tumizi_ready: false,
        payment_timing: 'user_choice',
        tax_enabled: false,
        default_tax_rate: null,
        tax_pricing_type: 'exclusive',
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
    if (deliveryMethod !== 'delivery' || !shippingAddress.formatted_address && !shippingAddress.city && !shippingAddress.state && !shippingAddress.address_line_1) {
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
          formatted_address: shippingAddress.formatted_address,
          city: shippingAddress.city,
          state: shippingAddress.state,
          address_line_1: shippingAddress.address_line_1,
          coordinates: shippingAddress.coordinates,
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
  }, [deliveryMethod, shippingAddress.formatted_address, shippingAddress.city, shippingAddress.state, shippingAddress.address_line_1, shippingAddress.coordinates]);

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

  // Apply store flat-rate delivery fee when checkout uses flat-rate pricing (server-normalized settings).
  useEffect(() => {
    if (deliveryMethod !== 'delivery' || !checkoutSettings) return;
    if (checkoutSettings.shipping_method_type === 'flat_rate' && checkoutSettings.flat_rate_amount != null) {
      setDeliveryFee(checkoutSettings.flat_rate_amount);
      setSelectedZoneId(null);
      setSelectedZone(null);
      setZoneDetectionStatus(null);
    }
  }, [deliveryMethod, checkoutSettings, checkoutSettings?.shipping_method_type, checkoutSettings?.flat_rate_amount]);

  // Auto-detect zone when address changes (debounced)
  useEffect(() => {
    if (deliveryMethod === 'delivery' && deliveryZones.length > 0) {
      const timer = setTimeout(() => {
        if (shippingAddress.formatted_address || shippingAddress.city || shippingAddress.state || shippingAddress.address_line_1) {
          detectZone();
        }
      }, 500); // Debounce for 500ms

      return () => clearTimeout(timer);
    }
  }, [deliveryMethod, shippingAddress.formatted_address, shippingAddress.city, shippingAddress.state, shippingAddress.address_line_1, deliveryZones.length, detectZone]);

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
    if (!shippingAddress.formatted_address && !shippingAddress.city?.trim()) {
      toast.error('City is required');
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

  const handleNext = async () => {
    if (currentStep === 'shipping') {
      if (!validateShipping()) return;
      
      // Save new address if requested (when clicking Next, not just on final submit)
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
              city: shippingAddress.city || null,
              state_id: null, // Will be looked up by API if state name is provided
              country_id: null, // Will be looked up by API if country name is provided
              state: shippingAddress.state || null, // Send state name for lookup
              country: shippingAddress.country || null, // Send country name for lookup
              postal_code: shippingAddress.postal_code || null,
              address_label: saveAddressLabel.trim() || null,
              is_default: savedAddresses.length === 0, // Set as default if it's the first address
            }),
          });
          
          if (addressResponse.ok) {
            const data = await addressResponse.json();
            if (data.success) {
              toast.success('Address saved successfully');
              // Refresh saved addresses
              await fetchSavedAddresses();
              // Update to use the newly saved address
              if (data.address) {
                setSelectedAddressId(data.address.id);
                setUseNewAddress(false);
              }
            }
          } else {
            const errorData = await addressResponse.json();
            console.error('Error saving address:', errorData);
            // Don't block navigation, but show warning
            toast.warning('Address could not be saved, but you can continue');
          }
        } catch (error) {
          console.error('Error saving address:', error);
          // Don't block navigation
          toast.warning('Address could not be saved, but you can continue');
        }
      }
      
      setCurrentStep('payment');
      identifyTikTokPixelUser({
        email: shippingAddress.email,
        phoneNumber: shippingAddress.phone,
        externalId: shippingAddress.email || shippingAddress.phone || undefined,
      });
      trackMetaPixelEvent('InitiateCheckout', {
        contents: (cart?.items || []).map((item) => ({
          content_id: item.product_id,
          content_type: 'product',
          content_name: item.name,
        })),
        value: cart?.total || 0,
        currency: currency.code,
      });
      // Track checkout start
      await track('checkout_start', {
        eventCategory: 'checkout',
        eventLabel: 'Checkout Started',
        metadata: { step: 'payment' },
      });
    } else if (currentStep === 'payment') {
      // Validate M-Pesa payment verification only when immediate payment is required.
      if (requiresMpesaVerification && !paymentTransactionId.trim()) {
        toast.error('Please provide your M-Pesa Transaction ID / Receipt Number before proceeding');
        return;
      }
      if (paymentMethod === 'tumizi') {
        if (!checkoutSettings?.payment_tumizi_ready) {
          toast.error('Automatic M-Pesa checkout is not available for this store yet.');
          return;
        }
        const msisdn = normalizeKenyaMsisdnForTumizi(shippingAddress.phone);
        if (!msisdn) {
          toast.error('Enter a valid Kenya M-Pesa mobile number on your shipping details.');
          return;
        }
      }

      setCurrentStep('review');
      identifyTikTokPixelUser({
        email: shippingAddress.email,
        phoneNumber: shippingAddress.phone,
        externalId: shippingAddress.email || shippingAddress.phone || undefined,
      });
      trackMetaPixelEvent('AddPaymentInfo', {
        contents: (cart?.items || []).map((item) => ({
          content_id: item.product_id,
          content_type: 'product',
          content_name: item.name,
        })),
        value: cart?.total || 0,
        currency: currency.code,
      });
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

    // Validate M-Pesa payment verification details when immediate payment is required.
    if (requiresMpesaVerification && !paymentTransactionId.trim()) {
      toast.error('Please provide your M-Pesa Transaction ID / Receipt Number');
      return;
    }
    if (paymentMethod === 'tumizi') {
      if (!checkoutSettings?.payment_tumizi_ready) {
        toast.error('Automatic M-Pesa checkout is not available for this store yet.');
        return;
      }
      if (!normalizeKenyaMsisdnForTumizi(shippingAddress.phone)) {
        toast.error('Enter a valid Kenya M-Pesa mobile number for payment.');
        return;
      }
    }

    setSubmitting(true);

    try {
      // Save new address if requested (only if not already saved in handleNext)
      if (isAuthenticated && useNewAddress && saveNewAddress && !selectedAddressId) {
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
              city: shippingAddress.city || null,
              state_id: null, // Will be looked up by API if state name is provided
              country_id: null, // Will be looked up by API if country name is provided
              state: shippingAddress.state || null, // Send state name for lookup
              country: shippingAddress.country || null, // Send country name for lookup
              postal_code: shippingAddress.postal_code || null,
              address_label: saveAddressLabel.trim() || null,
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
        delivery_zone_id: deliveryMethod === 'delivery' && checkoutSettings?.shipping_method_type === 'delivery_zones' ? (selectedZoneId || null) : null,
        delivery_zone_name: deliveryMethod === 'delivery' && checkoutSettings?.shipping_method_type === 'delivery_zones' ? (selectedZone?.name || null) : null,
        delivery_fee: deliveryMethod === 'delivery' ? (deliveryFee || null) : null,
        delivery_fee_status:
          deliveryMethod !== 'delivery'
            ? null
            : checkoutSettings?.shipping_method_type === 'flat_rate' && deliveryFee != null
              ? 'approved'
              : checkoutSettings?.shipping_method_type === 'delivery_zones' && selectedZoneId
                ? 'approved'
                : 'pending',
        billing_address: useBillingSameAsShipping ? undefined : billingAddress,
        payment_method: paymentMethod,
        payment_verification: requiresMpesaVerification ? {
          transaction_id: paymentTransactionId.trim(),
          reference: paymentReference.trim() || null,
          notes: paymentVerificationNotes.trim() || null,
        } : null,
        coupon_code: couponCode || null,
        notes: notes || null,
      };

      // Track checkout attempt
      await track('checkout_attempt', {
        eventCategory: 'checkout',
        eventLabel: 'Order Submission',
        eventValue: cart.total,
        metadata: {
          itemCount: cart.items.length,
          paymentMethod,
          deliveryMethod,
        },
      });

      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(checkoutData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        identifyTikTokPixelUser({
          email: shippingAddress.email,
          phoneNumber: shippingAddress.phone,
          externalId: shippingAddress.email || shippingAddress.phone || undefined,
        });
        trackTikTokPixelEvent('PlaceAnOrder', {
          contents: cart.items.map((item) => ({
            content_id: item.product_id,
            content_type: 'product',
            content_name: item.name,
          })),
          value: data.order.total_amount ?? cart.total,
          currency: currency.code,
        });
        if (data.order.payment_status === 'paid') {
          trackMetaPixelEvent('Purchase', {
            contents: cart.items.map((item) => ({
              content_id: item.product_id,
              content_type: 'product',
              content_name: item.name,
            })),
            value: data.order.total_amount ?? cart.total,
            currency: currency.code,
          });
        }

        // Track checkout completion
        await track('checkout_complete', {
          eventCategory: 'checkout',
          eventLabel: 'Order Completed',
          eventValue: cart.total,
          orderId: data.order.id,
          metadata: {
            orderNumber: data.order.order_number,
            itemCount: cart.items.length,
            paymentMethod,
            deliveryMethod,
          },
        });

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
        // Track checkout failure
        await track('checkout_failed', {
          eventCategory: 'checkout',
          eventLabel: 'Order Failed',
          metadata: {
            error: data.error || 'Unknown error',
            paymentMethod,
          },
        });
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

  // For out-of-zone delivery orders, payment can happen later after quote review.
  const isOutOfZoneQuotePending =
    deliveryMethod === 'delivery' &&
    checkoutSettings?.shipping_method_type === 'delivery_zones' &&
    !selectedZoneId &&
    zoneDetectionStatus === 'not_matched';

  const isInZoneDelivery =
    deliveryMethod === 'delivery' &&
    checkoutSettings?.shipping_method_type === 'delivery_zones' &&
    zoneDetectionStatus === 'matched' &&
    !!selectedZoneId;

  const requiresMpesaVerification =
    paymentMethod === 'mpesa' &&
    ((checkoutSettings?.payment_timing === 'before_delivery' || isInZoneDelivery) && !isOutOfZoneQuotePending);

  if (loading) {
    return (
      <div className="container mx-auto max-w-full overflow-x-hidden px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="container mx-auto max-w-full overflow-x-hidden px-4 py-8">
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
    <div className="container mx-auto max-w-full overflow-x-hidden px-3 py-6 sm:px-4 sm:py-8">
      <div className="max-w-4xl mx-auto">
        {/* Store Unavailable Notice (Expired/Suspended) */}
        {!canProcessOrders && accessRestriction && (
          <Card className="mb-6 border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium mb-1 text-yellow-800 dark:text-yellow-200">
                    Store Temporarily Unavailable
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    {accessRestriction.reason || 'This store is currently unable to process orders. Please check back later or contact the store owner.'}
                    {accessRestriction.daysRemaining !== undefined && accessRestriction.daysRemaining > 0 && (
                      <> Grace period ends in {accessRestriction.daysRemaining} day{accessRestriction.daysRemaining !== 1 ? 's' : ''}.</>
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Guest Checkout Notice */}
        {!isAuthenticated && canProcessOrders && (
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
        <div className="mb-6">
          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
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
              <span className={`text-xs sm:text-sm ${currentStep === 'shipping' ? 'font-semibold' : ''}`}>
                Shipping
              </span>
            </div>

            <div className="flex flex-col items-center gap-2 text-center">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
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
              <span className={`text-xs sm:text-sm ${currentStep === 'payment' ? 'font-semibold' : ''}`}>
                Payment
              </span>
            </div>

            <div className="flex flex-col items-center gap-2 text-center">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                currentStep === 'review' ? 'bg-primary text-primary-foreground' :
                'bg-muted text-muted-foreground'
              }`}>
                <span>3</span>
              </div>
              <span className={`text-xs sm:text-sm ${currentStep === 'review' ? 'font-semibold' : ''}`}>
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
                  {deliveryMethod === 'delivery' && checkoutSettings?.shipping_customer_notice && (
                    <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                      <div className="flex gap-2">
                        <ExclamationTriangleIcon className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                        <p>{checkoutSettings.shipping_customer_notice}</p>
                      </div>
                    </div>
                  )}
                  {/* Delivery Method Selection (if both options available) */}
                  {checkoutSettings && checkoutSettings.pickup_enabled && checkoutSettings.shipping_enabled && (
                    <div className="space-y-2">
                      <Label>Choose how you want to receive your order</Label>
                      <RadioGroup
                        value={deliveryMethod}
                        onValueChange={(value) => setDeliveryMethod(value as DeliveryMethod)}
                      >
                        <div className="flex items-center space-x-2 rounded-lg border p-4">
                          <RadioGroupItem value="delivery" id="delivery" />
                          <Label htmlFor="delivery" className="flex-1 cursor-pointer">
                            <div>
                              <div className="font-semibold">Delivery</div>
                              <div className="text-sm text-muted-foreground">We&apos;ll deliver to your address</div>
                            </div>
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2 rounded-lg border p-4">
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
                    <div className="p-4 border rounded-lg bg-primary/5 space-y-3">
                      <div>
                        <h3 className="font-semibold">
                          {checkoutSettings.pickup_location_name || 'Pickup Location'}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-2">
                          {checkoutSettings.store_full_address}
                        </p>
                        {checkoutSettings.store_phone && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Phone: {checkoutSettings.store_phone}
                          </p>
                        )}
                      </div>
                      
                      {checkoutSettings.pickup_instructions && (
                        <div className="pt-2 border-t">
                          <p className="text-xs font-medium mb-1">Pickup Instructions:</p>
                          <p className="text-xs text-muted-foreground whitespace-pre-line">
                            {checkoutSettings.pickup_instructions}
                          </p>
                        </div>
                      )}
                      
                      {checkoutSettings.pickup_hours && (() => {
                        try {
                          const hours = JSON.parse(checkoutSettings.pickup_hours);
                          const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
                          const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                          const today = new Date().getDay();
                          const currentDay = daysOfWeek[today === 0 ? 6 : today - 1];
                          
                          return (
                            <div className="pt-2 border-t">
                              <p className="text-xs font-medium mb-2">Store Hours:</p>
                              <div className="text-xs space-y-1">
                                {daysOfWeek.map((day, idx) => {
                                  const dayHours = hours[day];
                                  const isToday = day === currentDay;
                                  return (
                                    <div key={day} className={`flex justify-between ${isToday ? 'font-semibold' : ''}`}>
                                      <span>{dayLabels[idx]}:</span>
                                      <span>
                                        {dayHours?.closed 
                                          ? 'Closed' 
                                          : `${dayHours?.open || '09:00'} - ${dayHours?.close || '17:00'}`}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        } catch {
                          return null;
                        }
                      })()}
                      
                      <p className="text-xs text-muted-foreground pt-2 border-t">
                        You&apos;ll receive a notification when your order is ready for pickup.
                      </p>
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
                          {savedAddresses.map((address) => (
                            <SelectItem key={address.id} value={address.id}>
                              <div className="flex flex-col">
                                <span className="text-sm font-medium">{getSavedAddressTitle(address)}</span>
                                <span className="text-xs text-muted-foreground">{getSavedAddressLine(address)}</span>
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
                            const selected = savedAddresses.find((a) => a.id === selectedAddressId);
                            if (!selected) return null;
                            return (
                              <div className="text-xs space-y-0.5 text-blue-700 dark:text-blue-300">
                                {selected.address_label && (
                                  <p className="font-medium">{selected.address_label}</p>
                                )}
                                <p>{selected.name}</p>
                                <p>{selected.address}</p>
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
                    
                    {/* Google Places Autocomplete Address Field */}
                    <div className="md:col-span-2">
                      <AddressAutocomplete
                        value={addressInputValue}
                        onChange={(value, components) => {
                          setAddressInputValue(value);
                          if (components) {
                            handlePlaceSelected(components);
                          } else {
                            // Manual input - update address_line_1 only
                            setShippingAddress({ ...shippingAddress, address_line_1: value });
                          }
                        }}
                        onPlaceSelected={handlePlaceSelected}
                        label="Address"
                        placeholder="Start typing your address..."
                        required
                      />
                    </div>
                    
                    {/* Address Line 2 (Apartment, suite, etc.) - Optional */}
                    <div className="md:col-span-2">
                      <Label htmlFor="address_line_2">Apartment, suite, etc. (optional)</Label>
                      <Input
                        id="address_line_2"
                        value={shippingAddress.address_line_2 || ''}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, address_line_2: e.target.value })}
                        placeholder="Apartment, suite, etc."
                      />
                    </div>
                    
                    {/* Address Summary (when filled by Google Places) - Following Shopify pattern */}
                    {shippingAddress.formatted_address && (
                      <div className="md:col-span-2">
                        <div className="p-3 border rounded-lg bg-muted/50">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="text-xs font-medium text-muted-foreground mb-1">Selected Address:</p>
                              <p className="text-sm">{shippingAddress.formatted_address}</p>
                              {shippingAddress.city && shippingAddress.state && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {shippingAddress.city}, {shippingAddress.state} {shippingAddress.postal_code}
                                  {shippingAddress.country && `, ${shippingAddress.country}`}
                                </p>
                              )}
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-xs h-auto py-1"
                              onClick={() => {
                                // Clear formatted address to show individual fields for editing
                                setShippingAddress({ ...shippingAddress, formatted_address: undefined });
                                setAddressInputValue('');
                              }}
                            >
                              Edit
                            </Button>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Address verified by Google Places. Fields below are auto-filled for delivery zone detection.
                        </p>
                      </div>
                    )}
                    
                    {/* Individual address components - Hidden when Google Places fills them, shown for manual entry or editing */}
                    {(!shippingAddress.formatted_address || !shippingAddress.city || !shippingAddress.state) && (
                      <>
                        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <Label htmlFor="city">City</Label>
                            <Input
                              id="city"
                              value={shippingAddress.city}
                              onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                              placeholder="City"
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="state">State/Province</Label>
                            <Input
                              id="state"
                              value={shippingAddress.state}
                              onChange={(e) => setShippingAddress({ ...shippingAddress, state: e.target.value })}
                              placeholder="State/Province"
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="postal_code">Postal Code</Label>
                            <Input
                              id="postal_code"
                              value={shippingAddress.postal_code}
                              onChange={(e) => setShippingAddress({ ...shippingAddress, postal_code: e.target.value })}
                              placeholder="Postal Code"
                            />
                          </div>
                        </div>
                        
                        <div className="md:col-span-2">
                          <Label htmlFor="country">Country *</Label>
                          <Input
                            id="country"
                            value={shippingAddress.country}
                            onChange={(e) => setShippingAddress({ ...shippingAddress, country: e.target.value })}
                            placeholder="Country"
                            required
                          />
                        </div>
                      </>
                    )}
                    
                    {/* Hidden fields for data storage (when Google Places fills them) */}
                    {shippingAddress.formatted_address && shippingAddress.city && shippingAddress.state && (
                      <>
                        <input type="hidden" value={shippingAddress.city} readOnly />
                        <input type="hidden" value={shippingAddress.state} readOnly />
                        <input type="hidden" value={shippingAddress.postal_code || ''} readOnly />
                        <input type="hidden" value={shippingAddress.country} readOnly />
                      </>
                    )}
                  </div>
                  
                  {/* Option to save new address (only for authenticated users) */}
                  {isAuthenticated && useNewAddress && (
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="save_address"
                          checked={saveNewAddress}
                          onCheckedChange={(checked) => {
                            const shouldSave = checked === true;
                            setSaveNewAddress(shouldSave);
                            if (!shouldSave) {
                              setSaveAddressLabel('');
                            }
                          }}
                        />
                        <Label htmlFor="save_address" className="cursor-pointer text-sm">
                          Save this address for future orders
                        </Label>
                      </div>
                      {saveNewAddress && (
                        <div className="max-w-sm">
                          <Label htmlFor="address_label">Address name (optional)</Label>
                          <Input
                            id="address_label"
                            value={saveAddressLabel}
                            onChange={(e) => setSaveAddressLabel(e.target.value)}
                            placeholder="e.g. Home, Work"
                            maxLength={50}
                          />
                        </div>
                      )}
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
                  {(!checkoutSettings?.payment_cash_enabled &&
                    !checkoutSettings?.payment_mpesa_enabled &&
                    !checkoutSettings?.payment_tumizi_ready) ? (
                    <div className="p-4 border border-destructive rounded-lg bg-destructive/10">
                      <p className="text-sm text-destructive">
                        No payment methods are currently enabled. Please contact the store administrator.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Payment Timing Information */}
                      {checkoutSettings?.payment_timing && checkoutSettings.payment_timing !== 'user_choice' && (
                        <div className={`p-4 border rounded-lg ${
                          checkoutSettings.payment_timing === 'before_delivery' && !isOutOfZoneQuotePending
                            ? 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800'
                            : 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800'
                        }`}>
                          <p className={`text-sm font-medium ${
                            checkoutSettings.payment_timing === 'before_delivery' && !isOutOfZoneQuotePending
                              ? 'text-blue-900 dark:text-blue-100'
                              : 'text-amber-900 dark:text-amber-100'
                          }`}>
                            {checkoutSettings.payment_timing === 'before_delivery' && !isOutOfZoneQuotePending && '⚠️ Payment Required Before Delivery'}
                            {checkoutSettings.payment_timing === 'before_delivery' && isOutOfZoneQuotePending && '📝 Delivery Quote Required First'}
                            {checkoutSettings.payment_timing === 'after_delivery' && '💳 Cash on Delivery Available'}
                          </p>
                          <p className={`text-sm mt-1 ${
                            checkoutSettings.payment_timing === 'before_delivery' && !isOutOfZoneQuotePending
                              ? 'text-blue-700 dark:text-blue-300'
                              : 'text-amber-700 dark:text-amber-300'
                          }`}>
                            {checkoutSettings.payment_timing === 'before_delivery' && !isOutOfZoneQuotePending && 'You must complete payment before your order can be delivered.'}
                            {checkoutSettings.payment_timing === 'before_delivery' && isOutOfZoneQuotePending && 'Because this address needs a custom delivery quote, you can place the order now and decide to pay after you approve the quote.'}
                            {checkoutSettings.payment_timing === 'after_delivery' && 'You can pay when your order is delivered.'}
                          </p>
                        </div>
                      )}
                      
                      <RadioGroup
                        value={paymentMethod}
                        onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
                      >
                        <div className="space-y-3">
                        {/* Cash Payment Method */}
                        {checkoutSettings?.payment_cash_enabled && (
                          <div className="flex min-h-11 items-start space-x-3 rounded-lg border p-4 transition-colors hover:bg-accent/50">
                            <RadioGroupItem value="cash" id="payment_cash" className="mt-1" />
                            <Label htmlFor="payment_cash" className="flex-1 cursor-pointer">
                              <div>
                                <div className="font-semibold">Cash</div>
                                <div className="text-sm text-muted-foreground">
                                  {checkoutSettings.payment_timing === 'before_delivery' && 'Pay before delivery'}
                                  {checkoutSettings.payment_timing === 'after_delivery' && 'Pay after delivery (Cash on Delivery)'}
                                  {checkoutSettings.payment_timing === 'user_choice' && 'Cash payment'}
                                </div>
                              </div>
                            </Label>
                          </div>
                        )}

                        {/* M-Pesa Payment Method */}
                        {checkoutSettings?.payment_mpesa_enabled && (
                          <div className="flex min-h-11 items-start space-x-3 rounded-lg border p-4 transition-colors hover:bg-accent/50">
                            <RadioGroupItem value="mpesa" id="payment_mpesa" className="mt-1" />
                            <Label htmlFor="payment_mpesa" className="flex-1 cursor-pointer">
                              <div>
                                <div className="font-semibold">M-Pesa (manual)</div>
                                <div className="text-sm text-muted-foreground">
                                  {checkoutSettings.payment_mpesa_option === 'send_money' && checkoutSettings.payment_mpesa_send_money_number && (
                                    <>Send money to {checkoutSettings.payment_mpesa_send_money_number}</>
                                  )}
                                  {checkoutSettings.payment_mpesa_option === 'buy_goods' && checkoutSettings.payment_mpesa_buy_goods_till && (
                                    <>Pay using Till Number {checkoutSettings.payment_mpesa_buy_goods_till}</>
                                  )}
                                  {checkoutSettings.payment_mpesa_option === 'paybill' && checkoutSettings.payment_mpesa_paybill_number && (
                                    <>Paybill {checkoutSettings.payment_mpesa_paybill_number} Account {checkoutSettings.payment_mpesa_paybill_account}</>
                                  )}
                                  {checkoutSettings.payment_mpesa_option === 'pochi' && checkoutSettings.payment_mpesa_pochi_phone && (
                                    <>Pochi la Biashara: {checkoutSettings.payment_mpesa_pochi_phone}</>
                                  )}
                                  {!checkoutSettings.payment_mpesa_option && 'Mobile money payment'}
                                </div>
                                {checkoutSettings.payment_timing && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {checkoutSettings.payment_timing === 'before_delivery' && !isOutOfZoneQuotePending && 'Payment required before delivery'}
                                    {checkoutSettings.payment_timing === 'before_delivery' && isOutOfZoneQuotePending && 'Payment after quote approval'}
                                    {checkoutSettings.payment_timing === 'after_delivery' && 'Payment can be made after delivery'}
                                    {checkoutSettings.payment_timing === 'user_choice' && 'You can pay before or after delivery'}
                                  </div>
                                )}
                              </div>
                            </Label>
                          </div>
                        )}

                        {checkoutSettings?.payment_tumizi_ready && (
                          <div className="flex min-h-11 items-start space-x-3 rounded-lg border p-4 transition-colors hover:bg-accent/50">
                            <RadioGroupItem value="tumizi" id="payment_tumizi" className="mt-1" />
                            <Label htmlFor="payment_tumizi" className="flex-1 cursor-pointer">
                              <div>
                                <div className="font-semibold">M-Pesa (automatic)</div>
                                <div className="text-sm text-muted-foreground">
                                  Pay with an STK push to the phone number on your order. Confirmation is automatic.
                                </div>
                              </div>
                            </Label>
                          </div>
                        )}
                      </div>
                    </RadioGroup>
                    </>
                  )}

                  {paymentMethod === 'tumizi' && checkoutSettings?.payment_tumizi_ready && (
                    <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
                      <p className="font-medium">M-Pesa STK push</p>
                      <p className="mt-1 text-emerald-900/90 dark:text-emerald-100/90">
                        After you place the order, Safaricom will prompt{' '}
                        <span className="font-medium">{shippingAddress.phone || 'your phone'}</span>. Approve the payment on your handset; this store receives confirmation automatically.
                      </p>
                    </div>
                  )}

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

                  {/* Payment Verification Form (for M-Pesa when immediate payment is required) */}
                  {requiresMpesaVerification && (
                    <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                      <CardHeader>
                        <CardTitle className="text-sm">Payment Verification</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="rounded-md border border-blue-200 bg-white/70 p-3 text-xs text-blue-900 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-100">
                          <p className="font-medium">M-Pesa payment guide</p>
                          <ul className="mt-1 space-y-1">
                            <li>1. Complete the payment on your phone using the details above.</li>
                            <li>2. Copy the M-Pesa receipt code from SMS (for example: QKP7H8L9M1).</li>
                            <li>3. Paste it below to let the store verify your payment quickly.</li>
                          </ul>
                        </div>
                        <div>
                          <Label htmlFor="payment_transaction_id">
                            M-Pesa Transaction ID / Receipt Number *
                          </Label>
                          <Input
                            id="payment_transaction_id"
                            className="h-11"
                            value={paymentTransactionId}
                            onChange={(e) => setPaymentTransactionId(e.target.value)}
                            placeholder="Enter your M-Pesa transaction ID"
                            required
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Payment is required before delivery. Please make your M-Pesa payment and enter the transaction ID from your confirmation message.
                          </p>
                        </div>
                        <div>
                          <Label htmlFor="payment_reference">Reference (Optional)</Label>
                          <Input
                            id="payment_reference"
                            className="h-11"
                            value={paymentReference}
                            onChange={(e) => setPaymentReference(e.target.value)}
                            placeholder="Enter reference if any"
                          />
                        </div>
                        <div>
                          <Label htmlFor="payment_verification_notes">Notes (Optional)</Label>
                          <Textarea
                            id="payment_verification_notes"
                            value={paymentVerificationNotes}
                            onChange={(e) => setPaymentVerificationNotes(e.target.value)}
                            placeholder="Any additional payment notes..."
                            rows={3}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  )}

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
                          {(shippingAddress.city || shippingAddress.state || shippingAddress.postal_code) && (
                            <p>
                              {[shippingAddress.city, shippingAddress.state].filter(Boolean).join(', ')}
                              {shippingAddress.postal_code ? ` ${shippingAddress.postal_code}` : ''}
                            </p>
                          )}
                          <p>{shippingAddress.country}</p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Estimated Delivery Time - Only show for delivery method */}
                  {deliveryMethod === 'delivery' && getMaxEstimatedDeliveryDays() && (
                    <>
                      <Separator />
                      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <TruckIcon className="h-5 w-5 text-primary flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium">Estimated Delivery Time</p>
                          <p className="text-sm text-muted-foreground">
                            {getMaxEstimatedDeliveryDays() === 1 
                              ? 'Approximately 1 day after order confirmation' 
                              : `Approximately ${getMaxEstimatedDeliveryDays()} days after order confirmation`}
                          </p>
                        </div>
                      </div>
                    </>
                  )}

                  <Separator />

                  {/* Payment Method Summary */}
                  <div>
                    <h3 className="font-semibold mb-2">Payment Method</h3>
                    <div className="text-sm text-muted-foreground">
                      {paymentMethod === 'cash'
                        ? 'Cash'
                        : paymentMethod === 'tumizi'
                          ? 'M-Pesa (Tumizi — STK push, auto-verified)'
                          : 'M-Pesa'}
                      {paymentMethod === 'mpesa' && checkoutSettings?.payment_mpesa_option && (
                        <div className="text-xs mt-1">
                          {checkoutSettings.payment_mpesa_option === 'send_money' && checkoutSettings.payment_mpesa_send_money_number && (
                            <>Send to {checkoutSettings.payment_mpesa_send_money_number}</>
                          )}
                          {checkoutSettings.payment_mpesa_option === 'buy_goods' && checkoutSettings.payment_mpesa_buy_goods_till && (
                            <>Till: {checkoutSettings.payment_mpesa_buy_goods_till}</>
                          )}
                          {checkoutSettings.payment_mpesa_option === 'paybill' && checkoutSettings.payment_mpesa_paybill_number && (
                            <>Paybill: {checkoutSettings.payment_mpesa_paybill_number} (Account: {checkoutSettings.payment_mpesa_paybill_account})</>
                          )}
                          {checkoutSettings.payment_mpesa_option === 'pochi' && checkoutSettings.payment_mpesa_pochi_phone && (
                            <>Pochi: {checkoutSettings.payment_mpesa_pochi_phone}</>
                          )}
                        </div>
                      )}
                      {checkoutSettings?.payment_timing && (
                        <div className="text-xs mt-1">
                          {checkoutSettings.payment_timing === 'before_delivery' && !isOutOfZoneQuotePending && 'Payment required before delivery'}
                          {checkoutSettings.payment_timing === 'before_delivery' && isOutOfZoneQuotePending && 'Payment after quote approval'}
                          {checkoutSettings.payment_timing === 'after_delivery' && 'Payment after delivery (Cash on Delivery)'}
                          {checkoutSettings.payment_timing === 'user_choice' && 'You can pay before or after delivery'}
                        </div>
                      )}
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
            <div className="flex justify-between gap-2">
              <Button
                variant="outline"
                className="min-h-11"
                onClick={handleBack}
                disabled={currentStep === 'shipping'}
              >
                <ArrowLeftIcon className="w-4 h-4 mr-2" />
                Back
              </Button>
              
              {currentStep !== 'review' ? (
                <Button 
                  className="min-h-11"
                  onClick={handleNext}
                  disabled={
                    !canProcessOrders ||
                    (currentStep === 'payment' && requiresMpesaVerification && !paymentTransactionId.trim())
                  }
                >
                  Next
                  <ArrowRightIcon className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button className="min-h-11" onClick={handleSubmit} disabled={submitting || !canProcessOrders}>
                  {submitting ? 'Processing...' : !canProcessOrders ? 'Store Unavailable' : 'Place Order'}
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
                  {cart.items.map((item: any) => {
                    const itemDeliveryDays = item.estimated_delivery_days ?? defaultEstimatedDeliveryDays;
                    return (
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
                          {deliveryMethod === 'delivery' && itemDeliveryDays && itemDeliveryDays > 0 && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <TruckIcon className="h-3 w-3" />
                              {itemDeliveryDays === 1 ? '1 day' : `${itemDeliveryDays} days`}
                            </p>
                          )}
                        </div>
                        <div className="text-sm font-medium">
                          {formatPrice(item.price * item.quantity)}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Estimated Delivery Summary */}
                {deliveryMethod === 'delivery' && getMaxEstimatedDeliveryDays() && (
                  <div className="flex items-center gap-2 p-2 bg-primary/5 rounded-md text-xs">
                    <TruckIcon className="h-4 w-4 text-primary" />
                    <span>
                      Est. delivery: <span className="font-medium">
                        {getMaxEstimatedDeliveryDays() === 1 ? '1 day' : `${getMaxEstimatedDeliveryDays()} days`}
                      </span>
                    </span>
                  </div>
                )}

                <Separator />

                {/* Totals */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>{formatPrice(cart.total)}</span>
                  </div>
                  
                  {/* Tax Display */}
                  {checkoutSettings?.tax_enabled && checkoutSettings.default_tax_rate && (
                    <div className="flex justify-between text-sm">
                      <span>
                        Tax ({checkoutSettings.default_tax_rate}%)
                        {checkoutSettings.tax_pricing_type === 'inclusive' && (
                          <span className="text-xs text-muted-foreground ml-1">(included)</span>
                        )}
                      </span>
                      <span>
                        {(() => {
                          const taxRate = checkoutSettings.default_tax_rate / 100;
                          let taxAmount = 0;
                          if (checkoutSettings.tax_pricing_type === 'inclusive') {
                            // Tax is included in price, calculate what portion is tax
                            taxAmount = cart.total - (cart.total / (1 + taxRate));
                          } else {
                            // Tax is added on top
                            taxAmount = cart.total * taxRate;
                          }
                          return formatPrice(taxAmount);
                        })()}
                      </span>
                    </div>
                  )}
                  
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
                                ? 'Quoted after order'
                                : 'Select or detect zone')
                          : checkoutSettings?.shipping_method_type === 'flat_rate'
                            ? (deliveryFee != null
                                ? formatPrice(deliveryFee)
                                : 'To be confirmed')
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
                        (() => {
                          let total = cart.total;
                          const deliveryFeeAmount = deliveryMethod === 'delivery' && deliveryFee ? deliveryFee : 0;
                          
                          // Add tax if enabled and tax-exclusive
                          if (checkoutSettings?.tax_enabled && checkoutSettings.default_tax_rate) {
                            const taxRate = checkoutSettings.default_tax_rate / 100;
                            if (checkoutSettings.tax_pricing_type === 'exclusive') {
                              total += cart.total * taxRate;
                            }
                            // If inclusive, tax is already in cart.total
                          }
                          
                          return total + deliveryFeeAmount;
                        })()
                      )}
                    </span>
                  </div>
                  {deliveryMethod === 'delivery' && deliveryFee && (
                    <p className="text-xs text-muted-foreground text-right">
                      Includes delivery fee: {formatPrice(deliveryFee)}
                    </p>
                  )}
                  {deliveryMethod === 'delivery' &&
                    !deliveryFee &&
                    checkoutSettings?.shipping_method_type === 'delivery_zones' &&
                    zoneDetectionStatus === 'not_matched' && (
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 text-right">
                      Delivery fee will be quoted and confirmed by the store after you order.
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

