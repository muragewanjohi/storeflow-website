/**
 * Account Settings Page
 * 
 * Customer profile and account settings management
 */

import { requireTenant } from '@/lib/tenant-context/server';
import { getCurrentCustomer } from '@/lib/customers/get-current-customer';
import AccountSettingsClient from './account-settings-client';

export default async function AccountSettingsPage() {
  const tenant = await requireTenant();
  const customer = await getCurrentCustomer();

  if (!customer) {
    return null; // Layout will handle the error
  }

  return <AccountSettingsClient customer={customer} />;
}

