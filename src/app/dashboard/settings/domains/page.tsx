/**
 * Domain Settings Page
 * 
 * Allows tenants to manage their custom domains
 */

import { Metadata } from 'next';
import { DomainSettingsClient } from './domain-settings-client';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Domain Settings | StoreFlow',
  description: 'Manage your custom domain',
};

export default function DomainSettingsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Domain Settings</h1>
        <p className="mt-2 text-sm text-gray-600">
          Manage your custom domain and DNS configuration
        </p>
      </div>
      <DomainSettingsClient />
    </div>
  );
}

