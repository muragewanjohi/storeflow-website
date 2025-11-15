/**
 * Domain Settings Page
 * 
 * Allows tenants to manage their custom domains
 */

import { Metadata } from 'next';
import { DomainSettingsClient } from './domain-settings-client';

export const metadata: Metadata = {
  title: 'Domain Settings | StoreFlow',
  description: 'Manage your custom domain',
};

export default function DomainSettingsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Domain Settings</h1>
        <DomainSettingsClient />
      </div>
    </div>
  );
}

