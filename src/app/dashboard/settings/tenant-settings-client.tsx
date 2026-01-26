/**
 * Tenant Settings Client Component
 * 
 * Comprehensive settings page for tenant admin including:
 * - Store Details
 * - Contact Email
 * - Currency Settings
 * - Shipping Methods
 * - Payment Methods
 * - Tax Settings
 */

'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { MapPinIcon, AlertCircle } from 'lucide-react';
import type { Tenant } from '@/lib/tenant-context';
import MFASettings from './mfa-settings';
import TrustedDevicesSettings from './trusted-devices-settings';
import { VersionInfo } from '@/components/dashboard/version-info';

// Store Hours Editor Component
interface StoreHoursEditorProps {
  value: string;
  onChange: (value: string) => void;
}

function StoreHoursEditor({ value, onChange }: StoreHoursEditorProps) {
  const daysOfWeek = [
    { key: 'monday', label: 'Monday' },
    { key: 'tuesday', label: 'Tuesday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'thursday', label: 'Thursday' },
    { key: 'friday', label: 'Friday' },
    { key: 'saturday', label: 'Saturday' },
    { key: 'sunday', label: 'Sunday' },
  ];

  // Parse hours from JSON string
  const parseHours = (): Record<string, { open: string; close: string; closed: boolean }> => {
    if (!value) {
      return {};
    }
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  };

  const hours = parseHours();

  const updateDay = (day: string, updates: Partial<{ open: string; close: string; closed: boolean }>) => {
    const newHours = {
      ...hours,
      [day]: {
        ...hours[day],
        ...updates,
      },
    };
    onChange(JSON.stringify(newHours));
  };

  const setAllDays = (open: string, close: string, closed: boolean) => {
    const newHours: Record<string, { open: string; close: string; closed: boolean }> = {};
    daysOfWeek.forEach((day) => {
      newHours[day.key] = { open, close, closed };
    });
    onChange(JSON.stringify(newHours));
  };

  return (
    <div className="space-y-4">
      {/* Quick Actions */}
      <div className="flex gap-2 flex-wrap">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setAllDays('09:00', '17:00', false)}
        >
          Set All: 9 AM - 5 PM
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setAllDays('08:00', '18:00', false)}
        >
          Set All: 8 AM - 6 PM
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setAllDays('', '', true)}
        >
          Close All
        </Button>
      </div>

      {/* Day-by-day editor */}
      <div className="space-y-3">
        {daysOfWeek.map((day) => {
          const dayHours = hours[day.key] || { open: '09:00', close: '17:00', closed: false };
          return (
            <div key={day.key} className="flex items-center gap-4 p-3 border rounded-lg">
              <div className="w-24 font-medium">{day.label}</div>
              <Checkbox
                checked={!dayHours.closed}
                onCheckedChange={(checked) => updateDay(day.key, { closed: !checked })}
              />
              {!dayHours.closed ? (
                <>
                  <Input
                    type="time"
                    value={dayHours.open || '09:00'}
                    onChange={(e) => updateDay(day.key, { open: e.target.value })}
                    className="w-32"
                  />
                  <span className="text-muted-foreground">to</span>
                  <Input
                    type="time"
                    value={dayHours.close || '17:00'}
                    onChange={(e) => updateDay(day.key, { close: e.target.value })}
                    className="w-32"
                  />
                </>
              ) : (
                <span className="text-muted-foreground">Closed</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface TenantSettingsClientProps {
  tenant: Tenant;
  initialSettings: Record<string, any>;
  countries: Array<{ id: string; name: string; code: string | null }>;
}

const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling' },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
  { code: 'GHS', symbol: '₵', name: 'Ghanaian Cedi' },
  { code: 'UGX', symbol: 'USh', name: 'Ugandan Shilling' },
  { code: 'TZS', symbol: 'TSh', name: 'Tanzanian Shilling' },
  { code: 'ETB', symbol: 'Br', name: 'Ethiopian Birr' },
];

export default function TenantSettingsClient({ tenant, initialSettings, countries }: Readonly<TenantSettingsClientProps>) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [contactEmailSuccess, setContactEmailSuccess] = useState<string | null>(null);
  const [contactEmailError, setContactEmailError] = useState<string | null>(null);
  const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    // Contact Email
    contactEmail: tenant.contact_email || '',
    
    // Store Details (store_name and store_domain are read-only from tenants table)
    store_description: initialSettings.store_description || '',
    store_address: initialSettings.store_address || '',
    store_city: initialSettings.store_city || '',
    store_state: initialSettings.store_state || '',
    store_country: initialSettings.store_country || '',
    store_postal_code: initialSettings.store_postal_code || '',
    store_phone: initialSettings.store_phone || '',
    store_logo: initialSettings.store_logo || '',
    
    // Currency Settings
    currency_code: initialSettings.currency_code || 'USD',
    currency_symbol: initialSettings.currency_symbol || '$',
    currency_symbol_position: initialSettings.currency_symbol_position || 'left',
    currency_thousand_separator: initialSettings.currency_thousand_separator || ',',
    currency_decimal_separator: initialSettings.currency_decimal_separator || '.',
    currency_decimal_places: initialSettings.currency_decimal_places || 2,
    
    // Shipping Methods
    shipping_enabled: initialSettings.shipping_enabled ?? true,
    shipping_method_type: initialSettings.shipping_method_type || 'flat_rate',
    flat_rate_amount: initialSettings.flat_rate_amount || '',
    free_shipping_enabled: initialSettings.free_shipping_enabled ?? false,
    free_shipping_threshold: initialSettings.free_shipping_threshold || '',
    default_estimated_delivery_days: initialSettings.default_estimated_delivery_days || '',
    
    // Pickup Options
    pickup_enabled: initialSettings.pickup_enabled ?? false,
    pickup_location_name: initialSettings.pickup_location_name || '',
    pickup_instructions: initialSettings.pickup_instructions || '',
    pickup_hours: initialSettings.pickup_hours || '',
    
    // Payment Methods
    payment_cash_enabled: initialSettings.payment_cash_enabled ?? true,
    payment_mpesa_enabled: initialSettings.payment_mpesa_enabled ?? false,
    payment_mpesa_option: initialSettings.payment_mpesa_option || 'send_money',
    payment_mpesa_send_money_number: initialSettings.payment_mpesa_send_money_number || '',
    payment_mpesa_buy_goods_till: initialSettings.payment_mpesa_buy_goods_till || '',
    payment_mpesa_paybill_number: initialSettings.payment_mpesa_paybill_number || '',
    payment_mpesa_paybill_account: initialSettings.payment_mpesa_paybill_account || '',
    payment_mpesa_pochi_phone: initialSettings.payment_mpesa_pochi_phone || '',
    payment_method: initialSettings.payment_method || initialSettings.default_payment_method || 'cash',
    payment_timing: initialSettings.payment_timing || 'user_choice',
    
    // Tax Settings
    tax_enabled: initialSettings.tax_enabled ?? false,
    default_tax_rate: initialSettings.default_tax_rate || '',
    tax_pricing_type: initialSettings.tax_pricing_type || (initialSettings.tax_included_in_price ? 'inclusive' : 'exclusive'),
    tax_calculation_based_on: initialSettings.tax_calculation_based_on || 'billing_address',
  });

  // Update currency symbol when currency code changes
  useEffect(() => {
    const currency = CURRENCIES.find((c: any) => c.code === formData.currency_code);
    if (currency) {
      setFormData(prev => ({ ...prev, currency_symbol: currency.symbol }));
    }
  }, [formData.currency_code]);

  const handleContactEmailSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setContactEmailError(null);
    setContactEmailSuccess(null);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/dashboard/settings/contact-email', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contactEmail: formData.contactEmail,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update contact email');
      }

      setContactEmailSuccess('Contact email updated successfully!');
      router.refresh();
      
      // Clear success message after 5 seconds
      setTimeout(() => setContactEmailSuccess(null), 5000);
    } catch (err) {
      setContactEmailError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSettingsSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSettingsError(null);
    setSettingsSuccess(null);
    setError(null);
    setSuccess(null);
    
    // Validate that at least one payment method is enabled
    if (!formData.payment_cash_enabled && !formData.payment_mpesa_enabled) {
      setSettingsError('At least one payment method must be enabled');
      return;
    }
    
    // Validate that payment method is one of the enabled methods
    if (formData.payment_method === 'cash' && !formData.payment_cash_enabled) {
      setSettingsError('Payment method must be one of the enabled payment methods');
      return;
    }
    if (formData.payment_method === 'mpesa' && !formData.payment_mpesa_enabled) {
      setSettingsError('Payment method must be one of the enabled payment methods');
      return;
    }
    
    setIsSubmitting(true);

    try {
      const payload: any = {
        // Store Details (store_name is stored in tenants table, not here)
        store_description: formData.store_description || null,
        store_address: formData.store_address || null,
        store_city: formData.store_city || null,
        store_state: formData.store_state || null,
        store_country: formData.store_country || null,
        store_postal_code: formData.store_postal_code || null,
        store_phone: formData.store_phone || null,
        store_logo: formData.store_logo || null,
        
        // Currency Settings
        currency_code: formData.currency_code,
        currency_symbol: formData.currency_symbol || null,
        currency_symbol_position: formData.currency_symbol_position,
        currency_thousand_separator: formData.currency_thousand_separator || null,
        currency_decimal_separator: formData.currency_decimal_separator || null,
        currency_decimal_places: formData.currency_decimal_places,
        
        // Shipping Methods
        shipping_enabled: formData.shipping_enabled,
        shipping_method_type: formData.shipping_method_type,
        flat_rate_amount: formData.shipping_method_type === 'flat_rate' && formData.flat_rate_amount 
          ? parseFloat(formData.flat_rate_amount) 
          : null,
        free_shipping_enabled: formData.free_shipping_enabled,
        free_shipping_threshold: formData.free_shipping_threshold ? parseFloat(formData.free_shipping_threshold) : null,
        default_estimated_delivery_days: formData.default_estimated_delivery_days ? parseInt(formData.default_estimated_delivery_days) : null,
        
        // Pickup Options
        pickup_enabled: formData.pickup_enabled,
        pickup_location_name: formData.pickup_location_name || null,
        pickup_instructions: formData.pickup_instructions || null,
        pickup_hours: formData.pickup_hours || null,
        
        // Payment Methods
        payment_cash_enabled: formData.payment_cash_enabled,
        payment_mpesa_enabled: formData.payment_mpesa_enabled,
        payment_mpesa_option: formData.payment_mpesa_option,
        payment_mpesa_send_money_number: formData.payment_mpesa_send_money_number || null,
        payment_mpesa_buy_goods_till: formData.payment_mpesa_buy_goods_till || null,
        payment_mpesa_paybill_number: formData.payment_mpesa_paybill_number || null,
        payment_mpesa_paybill_account: formData.payment_mpesa_paybill_account || null,
        payment_mpesa_pochi_phone: formData.payment_mpesa_pochi_phone || null,
        payment_method: formData.payment_method || 'cash',
        default_payment_method: formData.payment_method || 'cash', // Keep for backward compatibility
        payment_timing: formData.payment_timing || 'user_choice',
        
        // Tax Settings
        tax_enabled: formData.tax_enabled,
        default_tax_rate: formData.default_tax_rate ? parseFloat(formData.default_tax_rate) : null,
        tax_pricing_type: formData.tax_pricing_type || 'exclusive',
        tax_included_in_price: formData.tax_pricing_type === 'inclusive', // Keep for backward compatibility
        tax_calculation_based_on: formData.tax_calculation_based_on,
      };

      const response = await fetch('/api/dashboard/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update settings');
      }

      setSettingsSuccess('Settings updated successfully!');
      router.refresh();
      
      // Clear success message after 5 seconds
      setTimeout(() => setSettingsSuccess(null), 5000);
    } catch (err) {
      setSettingsError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your store settings and preferences
        </p>
      </div>

      {/* Global error/success messages (for logo upload, etc.) */}
      {error && (
        <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg bg-green-500/10 p-4 text-sm text-green-600 dark:text-green-400">
          {success}
        </div>
      )}

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6 bg-muted/50 border border-border">
          <TabsTrigger 
            value="general"
            className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground/70 hover:text-foreground"
          >
            General
          </TabsTrigger>
          <TabsTrigger 
            value="currency"
            className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground/70 hover:text-foreground"
          >
            Currency
          </TabsTrigger>
          <TabsTrigger 
            value="shipping"
            className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground/70 hover:text-foreground"
          >
            Shipping
          </TabsTrigger>
          <TabsTrigger 
            value="payment"
            className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground/70 hover:text-foreground"
          >
            Payment
          </TabsTrigger>
          <TabsTrigger 
            value="tax"
            className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground/70 hover:text-foreground"
          >
            Tax
          </TabsTrigger>
          <TabsTrigger 
            value="version"
            className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground/70 hover:text-foreground"
          >
            Version
          </TabsTrigger>
        </TabsList>

        {/* General Settings Tab */}
        <TabsContent value="general" className="space-y-6">
          {/* Store Details */}
          <Card>
        <form onSubmit={handleSettingsSubmit}>
          <CardHeader>
            <CardTitle>Store Details</CardTitle>
            <CardDescription>
              Basic information about your store that will be displayed to customers.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="store_name">Store Name</Label>
                <Input
                  id="store_name"
                  value={tenant.name}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Store name is managed in your tenant profile. Contact support to change it.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="store_domain">Store Domain</Label>
                <Input
                  id="store_domain"
                  value={initialSettings.store_domain || `${tenant.subdomain}.dukanest.com`}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Your store domain. Custom domains can be configured through support.
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="store_logo">Store Logo</Label>
              <div className="flex items-start gap-4">
                {formData.store_logo && (
                  <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg border bg-gray-100">
                    <Image
                      src={formData.store_logo}
                      alt="Store logo"
                      fill
                      className="object-cover"
                      sizes="96px"
                      onError={(e) => {
                        // Hide broken images
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Input
                        id="store_logo_file"
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                        onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;

                        // Validate file size (max 5MB)
                        const maxSize = 5 * 1024 * 1024;
                        if (file.size > maxSize) {
                          setError('File size exceeds 5MB limit');
                          return;
                        }

                        // Show uploading state
                        setIsUploadingLogo(true);
                        setError(null);
                        setSuccess(null);

                        try {
                          // Upload file
                          const uploadFormData = new FormData();
                          uploadFormData.append('file', file);

                          const uploadResponse = await fetch('/api/media/upload', {
                            method: 'POST',
                            body: uploadFormData,
                          });

                          const uploadData = await uploadResponse.json();

                          if (!uploadResponse.ok) {
                            throw new Error(uploadData.error || 'Failed to upload logo');
                          }

                          // Update form data with the uploaded URL
                          setFormData({ ...formData, store_logo: uploadData.url });
                          setSuccess('Logo uploaded successfully! Click "Save Changes" to save.');
                        } catch (err) {
                          setError(err instanceof Error ? err.message : 'Failed to upload logo');
                        } finally {
                          setIsUploadingLogo(false);
                          // Reset file input
                          e.target.value = '';
                        }
                      }}
                      className="cursor-pointer"
                      disabled={isSubmitting || isUploadingLogo}
                    />
                    {isUploadingLogo && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      </div>
                    )}
                    </div>
                    {formData.store_logo && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setFormData({ ...formData, store_logo: '' });
                          setSuccess(null);
                        }}
                        disabled={isSubmitting || isUploadingLogo}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Upload a logo image (JPEG, PNG, WebP, or GIF). Maximum file size: 5MB.
                    Recommended size: 200x200px or larger square image.
                  </p>
                  {formData.store_logo && (
                    <Input
                      id="store_logo"
                      type="url"
                      value={formData.store_logo}
                      onChange={(e) => setFormData({ ...formData, store_logo: e.target.value })}
                      placeholder="Or enter logo URL manually"
                      className="text-xs"
                    />
                  )}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="store_phone">Phone Number</Label>
                <Input
                  id="store_phone"
                  value={formData.store_phone}
                  onChange={(e) => setFormData({ ...formData, store_phone: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="store_description">Store Description</Label>
              <Textarea
                id="store_description"
                value={formData.store_description}
                onChange={(e) => setFormData({ ...formData, store_description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="store_address">Address</Label>
              <Input
                id="store_address"
                value={formData.store_address}
                onChange={(e) => setFormData({ ...formData, store_address: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="store_city">City</Label>
                <Input
                  id="store_city"
                  value={formData.store_city}
                  onChange={(e) => setFormData({ ...formData, store_city: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="store_state">State/Province</Label>
                <Input
                  id="store_state"
                  value={formData.store_state}
                  onChange={(e) => setFormData({ ...formData, store_state: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="store_country">Country</Label>
                {countries.length > 0 ? (
                  <Select
                    value={formData.store_country || ''}
                    onValueChange={(value) => setFormData({ ...formData, store_country: value })}
                  >
                    <SelectTrigger id="store_country">
                      <SelectValue placeholder="Select a country" />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((country: any) => (
                        <SelectItem key={country.id} value={country.id}>
                          {country.name} {country.code ? `(${country.code})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="store_country"
                    value={formData.store_country}
                    onChange={(e) => setFormData({ ...formData, store_country: e.target.value })}
                    placeholder="Enter country name"
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="store_postal_code">Postal Code</Label>
                <Input
                  id="store_postal_code"
                  value={formData.store_postal_code}
                  onChange={(e) => setFormData({ ...formData, store_postal_code: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
          <div className="px-6 pb-6 flex items-center gap-4">
            <Button type="submit" variant="default" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
            {settingsSuccess && (
              <div className="rounded-lg bg-green-500/10 px-4 py-2 text-sm text-green-600 dark:text-green-400">
                {settingsSuccess}
              </div>
            )}
            {settingsError && (
              <div className="rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive">
                {settingsError}
              </div>
            )}
          </div>
        </form>
      </Card>

          {/* Contact Email */}
          <Card>
        <form onSubmit={handleContactEmailSubmit}>
          <CardHeader>
            <CardTitle>Contact Email</CardTitle>
            <CardDescription>
              This email will be used for customer inquiries, order notifications, and support.
              Customers will see this email in order confirmations and can contact you directly.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contactEmail">Support/Contact Email *</Label>
              <Input
                id="contactEmail"
                type="email"
                placeholder="support@example.com"
                value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                required
              />
              <p className="text-xs text-muted-foreground">
                This can be different from your admin login email. Use an email address that you 
                regularly check for customer inquiries and order notifications.
              </p>
            </div>
          </CardContent>
          <div className="px-6 pb-6 flex items-center gap-4">
            <Button type="submit" variant="default" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
            {contactEmailSuccess && (
              <div className="rounded-lg bg-green-500/10 px-4 py-2 text-sm text-green-600 dark:text-green-400">
                {contactEmailSuccess}
              </div>
            )}
            {contactEmailError && (
              <div className="rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive">
                {contactEmailError}
              </div>
            )}
          </div>
        </form>
      </Card>

          {/* Trusted Devices */}
          <TrustedDevicesSettings />

          {/* Two-Factor Authentication */}
          <MFASettings />
        </TabsContent>

        {/* Currency Settings Tab */}
        <TabsContent value="currency" className="space-y-6">
          <Card>
        <form onSubmit={handleSettingsSubmit}>
          <CardHeader>
            <CardTitle>Currency Settings</CardTitle>
            <CardDescription>
              Configure how prices and currency are displayed in your store.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currency_code">Currency Code *</Label>
                <Select
                  value={formData.currency_code}
                  onValueChange={(value) => setFormData({ ...formData, currency_code: value })}
                >
                  <SelectTrigger id="currency_code">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((currency: any) => (
                      <SelectItem key={currency.code} value={currency.code}>
                        {currency.code} - {currency.name} ({currency.symbol})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency_symbol">Currency Symbol</Label>
                <Input
                  id="currency_symbol"
                  value={formData.currency_symbol}
                  onChange={(e) => setFormData({ ...formData, currency_symbol: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currency_symbol_position">Symbol Position</Label>
                <Select
                  value={formData.currency_symbol_position}
                  onValueChange={(value) => setFormData({ ...formData, currency_symbol_position: value as 'left' | 'right' })}
                >
                  <SelectTrigger id="currency_symbol_position">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Left ($100)</SelectItem>
                    <SelectItem value="right">Right (100$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency_decimal_places">Decimal Places</Label>
                <Input
                  id="currency_decimal_places"
                  type="number"
                  min="0"
                  max="4"
                  value={formData.currency_decimal_places}
                  onChange={(e) => setFormData({ ...formData, currency_decimal_places: parseInt(e.target.value) || 2 })}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currency_thousand_separator">Thousand Separator</Label>
                <Input
                  id="currency_thousand_separator"
                  maxLength={5}
                  value={formData.currency_thousand_separator}
                  onChange={(e) => setFormData({ ...formData, currency_thousand_separator: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency_decimal_separator">Decimal Separator</Label>
                <Input
                  id="currency_decimal_separator"
                  maxLength={5}
                  value={formData.currency_decimal_separator}
                  onChange={(e) => setFormData({ ...formData, currency_decimal_separator: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
          <div className="px-6 pb-6 flex items-center gap-4">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
            {settingsSuccess && (
              <div className="rounded-lg bg-green-500/10 px-4 py-2 text-sm text-green-600 dark:text-green-400">
                {settingsSuccess}
              </div>
            )}
            {settingsError && (
              <div className="rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive">
                {settingsError}
              </div>
            )}
          </div>
        </form>
      </Card>
        </TabsContent>

        {/* Shipping Methods Tab */}
        <TabsContent value="shipping" className="space-y-6">
          {/* Delivery Zones Link */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Delivery Zones</h3>
                  <p className="text-sm text-muted-foreground">
                    Manage delivery zones and pricing for different locations
                  </p>
                </div>
                <Button variant="outline" asChild>
                  <a href="/dashboard/settings/delivery-zones">
                    <MapPinIcon className="mr-2 h-4 w-4" />
                    Manage Zones
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
        <form onSubmit={handleSettingsSubmit}>
          <CardHeader>
            <CardTitle>Shipping Methods</CardTitle>
            <CardDescription>
              Configure shipping options and settings for your store.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="shipping_enabled"
                checked={formData.shipping_enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, shipping_enabled: checked === true })}
              />
              <Label htmlFor="shipping_enabled" className="cursor-pointer">
                Enable Shipping
              </Label>
            </div>
            {formData.shipping_enabled && (
              <>
                <div className="space-y-4">
                  <Label>Shipping Method Type *</Label>
                  <RadioGroup
                    value={formData.shipping_method_type}
                    onValueChange={(value) => setFormData({ ...formData, shipping_method_type: value as 'flat_rate' | 'delivery_zones' })}
                  >
                    <div className="flex items-center space-x-2 p-4 border rounded-lg">
                      <RadioGroupItem value="flat_rate" id="flat_rate" />
                      <Label htmlFor="flat_rate" className="flex-1 cursor-pointer">
                        <div>
                          <div className="font-semibold">Flat Rate</div>
                          <div className="text-sm text-muted-foreground">
                            Fixed shipping cost for all orders
                          </div>
                        </div>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-4 border rounded-lg">
                      <RadioGroupItem value="delivery_zones" id="delivery_zones" />
                      <Label htmlFor="delivery_zones" className="flex-1 cursor-pointer">
                        <div>
                          <div className="font-semibold">Delivery Zones</div>
                          <div className="text-sm text-muted-foreground">
                            Different prices based on delivery location zones
                          </div>
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
                
                {/* Show delivery zones info when selected */}
                {formData.shipping_method_type === 'delivery_zones' && (
                  <div className="p-4 border rounded-lg bg-primary/5">
                    <p className="text-sm text-muted-foreground">
                      Configure your delivery zones and pricing in the{' '}
                      <a 
                        href="/dashboard/settings/delivery-zones" 
                        className="text-primary underline hover:text-primary/80"
                      >
                        Delivery Zones
                      </a>{' '}
                      section above.
                    </p>
                  </div>
                )}
                {formData.shipping_method_type === 'flat_rate' && (
                  <div className="space-y-2">
                    <Label htmlFor="flat_rate_amount">Flat Rate Amount *</Label>
                    <Input
                      id="flat_rate_amount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.flat_rate_amount}
                      onChange={(e) => setFormData({ ...formData, flat_rate_amount: e.target.value })}
                      placeholder="0.00"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Fixed shipping cost for all orders
                    </p>
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="free_shipping_enabled"
                    checked={formData.free_shipping_enabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, free_shipping_enabled: checked === true })}
                  />
                  <Label htmlFor="free_shipping_enabled" className="cursor-pointer">
                    Enable Free Shipping
                  </Label>
                </div>
                {formData.free_shipping_enabled && (
                  <div className="space-y-2">
                    <Label htmlFor="free_shipping_threshold">Free Shipping Threshold</Label>
                    <Input
                      id="free_shipping_threshold"
                      type="number"
                      step="0.01"
                      value={formData.free_shipping_threshold}
                      onChange={(e) => setFormData({ ...formData, free_shipping_threshold: e.target.value })}
                      placeholder="0.00"
                    />
                    <p className="text-xs text-muted-foreground">
                      Minimum order amount to qualify for free shipping
                    </p>
                  </div>
                )}
                
                {/* Estimated Delivery Time */}
                <div className="pt-4 border-t">
                  <div className="space-y-2">
                    <Label htmlFor="default_estimated_delivery_days">Default Estimated Delivery Time (Days)</Label>
                    <Input
                      id="default_estimated_delivery_days"
                      type="number"
                      min="1"
                      max="365"
                      value={formData.default_estimated_delivery_days}
                      onChange={(e) => setFormData({ ...formData, default_estimated_delivery_days: e.target.value })}
                      placeholder="e.g., 3-5"
                    />
                    <p className="text-xs text-muted-foreground">
                      Default estimated delivery time shown to customers. Individual products can override this value.
                      Leave empty to not display delivery estimates.
                    </p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
          <div className="px-6 pb-6 flex items-center gap-4">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
            {settingsSuccess && (
              <div className="rounded-lg bg-green-500/10 px-4 py-2 text-sm text-green-600 dark:text-green-400">
                {settingsSuccess}
              </div>
            )}
            {settingsError && (
              <div className="rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive">
                {settingsError}
              </div>
            )}
          </div>
        </form>
      </Card>

      {/* Pickup Options */}
      <Card>
        <form onSubmit={handleSettingsSubmit}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Pickup Options</CardTitle>
                <CardDescription>
                  Configure store pickup for brick-and-mortar stores. Customers can choose to pick up their orders at your store location.
                </CardDescription>
              </div>
              <Checkbox
                id="pickup_enabled"
                checked={formData.pickup_enabled}
                onCheckedChange={(checked) => {
                  const newValue = checked === true;
                  // Validate that store address exists
                  if (newValue && !formData.store_address && !formData.store_city && !formData.store_country) {
                    setSettingsError('Store pickup requires a physical address. Please add store address in the General tab first.');
                    return;
                  }
                  setFormData({ ...formData, pickup_enabled: newValue });
                  setSettingsError(null);
                }}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.pickup_enabled ? (
              <>
                {(!formData.store_address || !formData.store_city || !formData.store_country) && (
                  <div className="p-4 border border-yellow-500/50 rounded-lg bg-yellow-500/10">
                    <p className="text-sm text-yellow-700 dark:text-yellow-400">
                      ⚠️ Store pickup requires a physical address. Please add your store address in the <strong>General</strong> tab first.
                    </p>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="pickup_location_name">Pickup Location Name (Optional)</Label>
                  <Input
                    id="pickup_location_name"
                    value={formData.pickup_location_name}
                    onChange={(e) => setFormData({ ...formData, pickup_location_name: e.target.value })}
                    placeholder="e.g., Main Store, Downtown Location"
                  />
                  <p className="text-xs text-muted-foreground">
                    A friendly name for your pickup location. If left empty, your store name will be used.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pickup_instructions">Pickup Instructions (Optional)</Label>
                  <Textarea
                    id="pickup_instructions"
                    value={formData.pickup_instructions}
                    onChange={(e) => setFormData({ ...formData, pickup_instructions: e.target.value })}
                    rows={3}
                    placeholder="e.g., Enter through the main entrance. Orders are ready at the customer service desk. Please bring a valid ID."
                  />
                  <p className="text-xs text-muted-foreground">
                    Instructions for customers on how to pick up their orders. This will be shown during checkout and in order confirmations.
                  </p>
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <div>
                    <Label>Store Hours</Label>
                    <p className="text-xs text-muted-foreground mb-4">
                      Set your store&apos;s opening and closing times for each day of the week. Customers will see these hours when selecting pickup.
                    </p>
                    <StoreHoursEditor
                      value={formData.pickup_hours}
                      onChange={(hours) => setFormData({ ...formData, pickup_hours: hours })}
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">
                Enable store pickup to allow customers to collect their orders at your physical location. This is ideal for brick-and-mortar stores.
              </div>
            )}
          </CardContent>
          <div className="px-6 pb-6 flex items-center gap-4">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
            {settingsSuccess && (
              <div className="rounded-lg bg-green-500/10 px-4 py-2 text-sm text-green-600 dark:text-green-400">
                {settingsSuccess}
              </div>
            )}
            {settingsError && (
              <div className="rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive">
                {settingsError}
              </div>
            )}
          </div>
        </form>
      </Card>
        </TabsContent>

        {/* Payment Methods Tab */}
        <TabsContent value="payment" className="space-y-6">
          <form onSubmit={handleSettingsSubmit}>
            <div className="space-y-6">
              {/* Payment Method - Moved to first position */}
              <Card>
                <CardHeader>
                  <CardTitle>Payment Method</CardTitle>
                  <CardDescription>
                    The default payment method shown to customers during checkout
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Select Payment Method</Label>
                    <Select
                      value={formData.payment_method}
                      onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        {formData.payment_cash_enabled && (
                          <SelectItem value="cash">Cash</SelectItem>
                        )}
                        {formData.payment_mpesa_enabled && (
                          <SelectItem value="mpesa">M-Pesa</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    {!formData.payment_cash_enabled && !formData.payment_mpesa_enabled && (
                      <p className="text-sm text-destructive mt-2">
                        Please enable at least one payment method
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Payment Timing</Label>
                    <RadioGroup
                      value={formData.payment_timing}
                      onValueChange={(value) => setFormData({ ...formData, payment_timing: value })}
                    >
                      <div className="space-y-3">
                        <div className="flex items-start space-x-3 p-4 border rounded-lg">
                          <RadioGroupItem value="before_delivery" id="timing_before" className="mt-1" />
                          <Label htmlFor="timing_before" className="flex-1 cursor-pointer">
                            <div>
                              <div className="font-semibold">Pay Before Delivery</div>
                              <div className="text-sm text-muted-foreground">
                                Customers must pay before the order is delivered
                              </div>
                            </div>
                          </Label>
                        </div>
                        <div className="flex items-start space-x-3 p-4 border rounded-lg">
                          <RadioGroupItem value="after_delivery" id="timing_after" className="mt-1" />
                          <Label htmlFor="timing_after" className="flex-1 cursor-pointer">
                            <div>
                              <div className="font-semibold">Pay After Delivery</div>
                              <div className="text-sm text-muted-foreground">
                                Customers pay when the order is delivered (Cash on Delivery)
                              </div>
                            </div>
                          </Label>
                        </div>
                        <div className="flex items-start space-x-3 p-4 border rounded-lg">
                          <RadioGroupItem value="user_choice" id="timing_choice" className="mt-1" />
                          <Label htmlFor="timing_choice" className="flex-1 cursor-pointer">
                            <div>
                              <div className="font-semibold">User Can Pay Before or After</div>
                              <div className="text-sm text-muted-foreground">
                                Customers can choose to pay before or after delivery
                              </div>
                            </div>
                          </Label>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>
                </CardContent>
              </Card>

              {/* Cash Payment Method */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Cash</CardTitle>
                      <CardDescription>
                        Cash
                      </CardDescription>
                    </div>
                    <Checkbox
                      id="payment_cash_enabled"
                      checked={formData.payment_cash_enabled}
                      onCheckedChange={(checked) => {
                        const newValue = checked === true;
                        // Ensure at least one payment method is enabled
                        if (!newValue && !formData.payment_mpesa_enabled) {
                          setError('At least one payment method must be enabled');
                          return;
                        }
                        setFormData({ 
                          ...formData, 
                          payment_cash_enabled: newValue,
                          // If disabling cash and mpesa is enabled, set default to mpesa
                          payment_method: !newValue && formData.payment_mpesa_enabled ? 'mpesa' : formData.payment_method
                        });
                        setError(null);
                      }}
                    />
                  </div>
                </CardHeader>
              </Card>

              {/* M-Pesa */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>M-Pesa</CardTitle>
                      <CardDescription>
                        Mobile money payment method
                      </CardDescription>
                    </div>
                    <Checkbox
                      id="payment_mpesa_enabled"
                      checked={formData.payment_mpesa_enabled}
                      onCheckedChange={(checked) => {
                        const newValue = checked === true;
                        // Ensure at least one payment method is enabled
                        if (!newValue && !formData.payment_cash_enabled) {
                          setError('At least one payment method must be enabled');
                          return;
                        }
                        setFormData({ 
                          ...formData, 
                          payment_mpesa_enabled: newValue,
                          // If disabling mpesa and cash is enabled, set default to cash
                          payment_method: !newValue && formData.payment_cash_enabled ? 'cash' : formData.payment_method
                        });
                        setError(null);
                      }}
                    />
                  </div>
                </CardHeader>
                {formData.payment_mpesa_enabled && (
                  <CardContent className="space-y-4">
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Manual Verification Required</AlertTitle>
                      <AlertDescription>
                        All M-Pesa payment options require manual verification. The system cannot automatically verify payments. You will need to manually confirm payments before fulfilling orders.
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-4">
                      <Label>M-Pesa Payment Option</Label>
                      <RadioGroup
                        value={formData.payment_mpesa_option}
                        onValueChange={(value) => setFormData({ ...formData, payment_mpesa_option: value })}
                      >
                        <div className="space-y-3">
                          {/* Option 1: Send Money */}
                          <div className="flex items-start space-x-3 p-4 border rounded-lg">
                            <RadioGroupItem value="send_money" id="mpesa_send_money" className="mt-1" />
                            <div className="flex-1 space-y-2">
                              <Label htmlFor="mpesa_send_money" className="cursor-pointer font-medium">
                                Send Money
                              </Label>
                              <p className="text-sm text-muted-foreground">
                                Customers send money directly to your M-Pesa number
                              </p>
                              {formData.payment_mpesa_option === 'send_money' && (
                                <div className="pt-2">
                                  <Input
                                    placeholder="Enter M-Pesa number (e.g., 0712345678)"
                                    value={formData.payment_mpesa_send_money_number}
                                    onChange={(e) => setFormData({ ...formData, payment_mpesa_send_money_number: e.target.value })}
                                  />
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Option 2: Buy Goods */}
                          <div className="flex items-start space-x-3 p-4 border rounded-lg">
                            <RadioGroupItem value="buy_goods" id="mpesa_buy_goods" className="mt-1" />
                            <div className="flex-1 space-y-2">
                              <Label htmlFor="mpesa_buy_goods" className="cursor-pointer font-medium">
                                Buy Goods
                              </Label>
                              <p className="text-sm text-muted-foreground">
                                Customers pay using your Till Number
                              </p>
                              {formData.payment_mpesa_option === 'buy_goods' && (
                                <div className="pt-2">
                                  <Input
                                    placeholder="Enter Till Number (e.g., 123456)"
                                    value={formData.payment_mpesa_buy_goods_till}
                                    onChange={(e) => setFormData({ ...formData, payment_mpesa_buy_goods_till: e.target.value })}
                                  />
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Option 3: Paybill */}
                          <div className="flex items-start space-x-3 p-4 border rounded-lg">
                            <RadioGroupItem value="paybill" id="mpesa_paybill" className="mt-1" />
                            <div className="flex-1 space-y-2">
                              <Label htmlFor="mpesa_paybill" className="cursor-pointer font-medium">
                                Paybill
                              </Label>
                              <p className="text-sm text-muted-foreground">
                                Customers pay using your Paybill number and account number
                              </p>
                              {formData.payment_mpesa_option === 'paybill' && (
                                <div className="pt-2 space-y-2">
                                  <Input
                                    placeholder="Enter Paybill Number (e.g., 123456)"
                                    value={formData.payment_mpesa_paybill_number}
                                    onChange={(e) => setFormData({ ...formData, payment_mpesa_paybill_number: e.target.value })}
                                  />
                                  <Input
                                    placeholder="Enter Account Number"
                                    value={formData.payment_mpesa_paybill_account}
                                    onChange={(e) => setFormData({ ...formData, payment_mpesa_paybill_account: e.target.value })}
                                  />
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Option 4: Pochi la Biashara */}
                          <div className="flex items-start space-x-3 p-4 border rounded-lg">
                            <RadioGroupItem value="pochi" id="mpesa_pochi" className="mt-1" />
                            <div className="flex-1 space-y-2">
                              <Label htmlFor="mpesa_pochi" className="cursor-pointer font-medium">
                                Pochi la Biashara
                              </Label>
                              <p className="text-sm text-muted-foreground">
                                Customers pay using your Pochi la Biashara phone number
                              </p>
                              {formData.payment_mpesa_option === 'pochi' && (
                                <div className="pt-2">
                                  <Input
                                    placeholder="Enter Phone Number (e.g., 0712345678)"
                                    value={formData.payment_mpesa_pochi_phone}
                                    onChange={(e) => setFormData({ ...formData, payment_mpesa_pochi_phone: e.target.value })}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </RadioGroup>
                    </div>
                  </CardContent>
                )}
              </Card>
            </div>

            <div className="mt-6 flex items-center gap-4">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
              {settingsSuccess && (
                <div className="rounded-lg bg-green-500/10 px-4 py-2 text-sm text-green-600 dark:text-green-400">
                  {settingsSuccess}
                </div>
              )}
              {settingsError && (
                <div className="rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive">
                  {settingsError}
                </div>
              )}
            </div>
          </form>
        </TabsContent>

        {/* Tax Settings Tab */}
        <TabsContent value="tax" className="space-y-6">
          <Card>
        <form onSubmit={handleSettingsSubmit}>
          <CardHeader>
            <CardTitle>Tax Settings</CardTitle>
            <CardDescription>
              Configure tax calculation and display settings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="tax_enabled"
                checked={formData.tax_enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, tax_enabled: checked === true })}
              />
              <Label htmlFor="tax_enabled" className="cursor-pointer">
                Enable Tax Calculation
              </Label>
            </div>
            {formData.tax_enabled && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="default_tax_rate">Default Tax Rate (%)</Label>
                  <Input
                    id="default_tax_rate"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.default_tax_rate}
                    onChange={(e) => setFormData({ ...formData, default_tax_rate: e.target.value })}
                    placeholder="0.00"
                  />
                  <p className="text-xs text-muted-foreground">
                    The default tax rate applied to orders. Can be overridden per product or region.
                  </p>
                </div>
                
                <div className="space-y-4">
                  <Label>Tax Pricing Type</Label>
                  <RadioGroup
                    value={formData.tax_pricing_type}
                    onValueChange={(value) => setFormData({ ...formData, tax_pricing_type: value as 'inclusive' | 'exclusive' })}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start space-x-3 p-4 border rounded-lg">
                        <RadioGroupItem value="inclusive" id="tax_inclusive" className="mt-1" />
                        <Label htmlFor="tax_inclusive" className="flex-1 cursor-pointer">
                          <div>
                            <div className="font-semibold">Tax-Inclusive Pricing</div>
                            <div className="text-sm text-muted-foreground">
                              Product prices already include tax. Tax amount is shown separately in cart and checkout for transparency.
                              <br />
                              <span className="text-xs">Example: Product shows $110 (includes $10 tax at 10% rate)</span>
                            </div>
                          </div>
                        </Label>
                      </div>
                      <div className="flex items-start space-x-3 p-4 border rounded-lg">
                        <RadioGroupItem value="exclusive" id="tax_exclusive" className="mt-1" />
                        <Label htmlFor="tax_exclusive" className="flex-1 cursor-pointer">
                          <div>
                            <div className="font-semibold">Tax-Exclusive Pricing</div>
                            <div className="text-sm text-muted-foreground">
                              Product prices do not include tax. Tax is added at checkout.
                              <br />
                              <span className="text-xs">Example: Product shows $100, tax ($10) added at checkout = $110 total</span>
                            </div>
                          </div>
                        </Label>
                      </div>
                    </div>
                  </RadioGroup>
                  <p className="text-xs text-muted-foreground">
                    This follows the same pattern as Shopify and WooCommerce. Tax will always be displayed as a separate line item in cart and checkout for transparency.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="tax_calculation_based_on">Calculate Tax Based On</Label>
                  <Select
                    value={formData.tax_calculation_based_on}
                    onValueChange={(value) => setFormData({ ...formData, tax_calculation_based_on: value as any })}
                  >
                    <SelectTrigger id="tax_calculation_based_on">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="billing_address">Billing Address</SelectItem>
                      <SelectItem value="shipping_address">Shipping Address</SelectItem>
                      <SelectItem value="store_address">Store Address</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </CardContent>
          <div className="px-6 pb-6 flex items-center gap-4">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
            {settingsSuccess && (
              <div className="rounded-lg bg-green-500/10 px-4 py-2 text-sm text-green-600 dark:text-green-400">
                {settingsSuccess}
              </div>
            )}
            {settingsError && (
              <div className="rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive">
                {settingsError}
              </div>
            )}
          </div>
        </form>
      </Card>
        </TabsContent>

        {/* Version Tab */}
        <TabsContent value="version" className="space-y-6">
          <VersionInfo />
        </TabsContent>
      </Tabs>
    </div>
  );
}
