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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Tenant } from '@/lib/tenant-context';

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
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
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
    dynamic_rate_per_km: initialSettings.dynamic_rate_per_km || '',
    free_shipping_enabled: initialSettings.free_shipping_enabled ?? false,
    free_shipping_threshold: initialSettings.free_shipping_threshold || '',
    
    // Payment Methods
    payment_pesapal_enabled: initialSettings.payment_pesapal_enabled ?? true,
    payment_paypal_enabled: initialSettings.payment_paypal_enabled ?? false,
    payment_cash_on_delivery_enabled: initialSettings.payment_cash_on_delivery_enabled ?? true,
    default_payment_method: initialSettings.default_payment_method || '',
    
    // Tax Settings
    tax_enabled: initialSettings.tax_enabled ?? false,
    default_tax_rate: initialSettings.default_tax_rate || '',
    tax_included_in_price: initialSettings.tax_included_in_price ?? false,
    tax_calculation_based_on: initialSettings.tax_calculation_based_on || 'billing_address',
  });

  // Update currency symbol when currency code changes
  useEffect(() => {
    const currency = CURRENCIES.find(c => c.code === formData.currency_code);
    if (currency) {
      setFormData(prev => ({ ...prev, currency_symbol: currency.symbol }));
    }
  }, [formData.currency_code]);

  const handleContactEmailSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
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

      setSuccess('Contact email updated successfully!');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSettingsSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

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
        flat_rate_amount: formData.flat_rate_amount ? parseFloat(formData.flat_rate_amount) : null,
        dynamic_rate_per_km: formData.dynamic_rate_per_km ? parseFloat(formData.dynamic_rate_per_km) : null,
        free_shipping_enabled: formData.free_shipping_enabled,
        free_shipping_threshold: formData.free_shipping_threshold ? parseFloat(formData.free_shipping_threshold) : null,
        
        // Payment Methods
        payment_pesapal_enabled: formData.payment_pesapal_enabled,
        payment_paypal_enabled: formData.payment_paypal_enabled,
        payment_cash_on_delivery_enabled: formData.payment_cash_on_delivery_enabled,
        default_payment_method: formData.default_payment_method || null,
        
        // Tax Settings
        tax_enabled: formData.tax_enabled,
        default_tax_rate: formData.default_tax_rate ? parseFloat(formData.default_tax_rate) : null,
        tax_included_in_price: formData.tax_included_in_price,
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

      setSuccess('Settings updated successfully!');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
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
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="currency">Currency</TabsTrigger>
          <TabsTrigger value="shipping">Shipping</TabsTrigger>
          <TabsTrigger value="payment">Payment</TabsTrigger>
          <TabsTrigger value="tax">Tax</TabsTrigger>
        </TabsList>

        {/* General Settings Tab */}
        <TabsContent value="general" className="space-y-6">
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
          <div className="px-6 pb-6">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Card>

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
              <div className="flex items-center gap-4">
                {formData.store_logo && (
                  <div className="relative w-24 h-24 border rounded-lg overflow-hidden">
                    <img
                      src={formData.store_logo}
                      alt="Store logo"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <Input
                    id="store_logo"
                    type="url"
                    value={formData.store_logo}
                    onChange={(e) => setFormData({ ...formData, store_logo: e.target.value })}
                    placeholder="https://example.com/logo.png"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter the URL of your store logo image. You can upload images via the Products section.
                  </p>
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
          <div className="px-6 pb-6">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Card>
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
          <div className="px-6 pb-6">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Card>
        </TabsContent>

        {/* Shipping Methods Tab */}
        <TabsContent value="shipping" className="space-y-6">
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
                <div className="space-y-2">
                  <Label htmlFor="shipping_method_type">Shipping Method Type *</Label>
                  <Select
                    value={formData.shipping_method_type}
                    onValueChange={(value) => setFormData({ ...formData, shipping_method_type: value as 'flat_rate' | 'dynamic_rate' })}
                  >
                    <SelectTrigger id="shipping_method_type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flat_rate">Flat Rate</SelectItem>
                      <SelectItem value="dynamic_rate">Dynamic Rate (Charge per km)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
                    />
                    <p className="text-xs text-muted-foreground">
                      Fixed shipping cost for all orders
                    </p>
                  </div>
                )}
                {formData.shipping_method_type === 'dynamic_rate' && (
                  <div className="space-y-2">
                    <Label htmlFor="dynamic_rate_per_km">Rate Per Kilometer *</Label>
                    <Input
                      id="dynamic_rate_per_km"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.dynamic_rate_per_km}
                      onChange={(e) => setFormData({ ...formData, dynamic_rate_per_km: e.target.value })}
                      placeholder="0.00"
                    />
                    <p className="text-xs text-muted-foreground">
                      Shipping cost per kilometer (calculated based on delivery distance)
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
              </>
            )}
          </CardContent>
          <div className="px-6 pb-6">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Card>
        </TabsContent>

        {/* Payment Methods Tab */}
        <TabsContent value="payment" className="space-y-6">
          <Card>
        <form onSubmit={handleSettingsSubmit}>
          <CardHeader>
            <CardTitle>Payment Methods</CardTitle>
            <CardDescription>
              Enable or disable payment gateways for your store.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="payment_pesapal_enabled"
                checked={formData.payment_pesapal_enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, payment_pesapal_enabled: checked === true })}
              />
              <Label htmlFor="payment_pesapal_enabled" className="cursor-pointer">
                Enable Pesapal
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="payment_paypal_enabled"
                checked={formData.payment_paypal_enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, payment_paypal_enabled: checked === true })}
              />
              <Label htmlFor="payment_paypal_enabled" className="cursor-pointer">
                Enable PayPal
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="payment_cash_on_delivery_enabled"
                checked={formData.payment_cash_on_delivery_enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, payment_cash_on_delivery_enabled: checked === true })}
              />
              <Label htmlFor="payment_cash_on_delivery_enabled" className="cursor-pointer">
                Enable Cash on Delivery
              </Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="default_payment_method">Default Payment Method</Label>
              <Input
                id="default_payment_method"
                value={formData.default_payment_method}
                onChange={(e) => setFormData({ ...formData, default_payment_method: e.target.value })}
                placeholder="e.g., pesapal"
              />
            </div>
          </CardContent>
          <div className="px-6 pb-6">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Card>
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
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="tax_included_in_price"
                    checked={formData.tax_included_in_price}
                    onCheckedChange={(checked) => setFormData({ ...formData, tax_included_in_price: checked === true })}
                  />
                  <Label htmlFor="tax_included_in_price" className="cursor-pointer">
                    Prices include tax
                  </Label>
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
          <div className="px-6 pb-6">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
