/**
 * Domain Settings Client Component
 * 
 * Handles domain management UI and interactions
 */

'use client';

import { useState, useEffect } from 'react';
import { useTenant } from '@/lib/tenant-context';

interface DomainInfo {
  name: string;
  verified: boolean;
  verification?: {
    type: string;
    domain: string;
    value: string;
    reason: string;
  }[];
  configurationIssue?: {
    code: string;
    message: string;
  }[];
}

interface DNSConfig {
  nameservers?: string[];
  intendedNameservers?: string[];
  cnames?: string[];
  cnameTarget?: string;
  verification?: {
    type: string;
    domain: string;
    value: string;
    reason: string;
  }[];
}

export function DomainSettingsClient() {
  const { tenant } = useTenant();
  const [domain, setDomain] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [domainInfo, setDomainInfo] = useState<DomainInfo | null>(null);
  const [dnsConfig, setDnsConfig] = useState<DNSConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load existing domain info on mount
  useEffect(() => {
    if (tenant?.custom_domain) {
      loadDomainInfo(tenant.custom_domain);
    }
  }, [tenant?.custom_domain]);

  const loadDomainInfo = async (domainName: string) => {
    try {
      setIsVerifying(true);
      const response = await fetch(`/api/admin/domains?domain=${domainName}`);
      const data = await response.json();

      if (response.ok) {
        setDomainInfo(data.domain);
        setDnsConfig(data.dnsConfig);
      } else {
        setError(data.error || 'Failed to load domain info');
      }
    } catch (err) {
      setError('Failed to load domain information');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/admin/domains', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ domain }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Domain added successfully! Please configure DNS settings.');
        // Reload domain info
        await loadDomainInfo(domain);
      } else {
        setError(data.error || 'Failed to add domain');
      }
    } catch (err) {
      setError('Failed to add domain. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveDomain = async () => {
    if (!confirm('Are you sure you want to remove this domain?')) {
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(
        `/api/admin/domains?domain=${tenant?.custom_domain}`,
        {
          method: 'DELETE',
        }
      );

      const data = await response.json();

      if (response.ok) {
        setSuccess('Domain removed successfully');
        setDomainInfo(null);
        setDnsConfig(null);
        setDomain('');
      } else {
        setError(data.error || 'Failed to remove domain');
      }
    } catch (err) {
      setError('Failed to remove domain. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyDomain = async () => {
    if (!tenant?.custom_domain) return;
    await loadDomainInfo(tenant.custom_domain);
  };

  return (
    <div className="space-y-6">
      {/* Current Domain Status */}
      {tenant?.custom_domain && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Current Domain</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Domain</p>
              <p className="text-lg font-mono">{tenant.custom_domain}</p>
            </div>

            {domainInfo && (
              <div>
                <p className="text-sm text-gray-600 mb-1">Status</p>
                <div className="flex items-center gap-2">
                  {domainInfo.verified ? (
                    <>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        ✓ Verified
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        ⚠ Pending Verification
                      </span>
                      <button
                        onClick={handleVerifyDomain}
                        disabled={isVerifying}
                        className="ml-2 text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
                      >
                        {isVerifying ? 'Verifying...' : 'Verify Now'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {domainInfo?.configurationIssue && (
              <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
                <p className="text-sm font-medium text-yellow-800 mb-2">
                  Configuration Issue
                </p>
                {domainInfo.configurationIssue.map((issue: any, idx: any) => (
                  <p key={idx} className="text-sm text-yellow-700">
                    {issue.message}
                  </p>
                ))}
              </div>
            )}

            {/* DNS Configuration Instructions */}
            {dnsConfig && !domainInfo?.verified && (
              <div className="bg-blue-50 border border-blue-200 rounded p-4">
                <p className="text-sm font-medium text-blue-800 mb-2">
                  DNS Configuration Required
                </p>
                <div className="space-y-2 text-sm text-blue-700">
                  {dnsConfig.verification && (
                    <div>
                      <p className="font-medium mb-1">Verification Record:</p>
                      <p className="font-mono text-xs bg-white p-2 rounded">
                        Type: TXT
                        <br />
                        Name: {dnsConfig.verification[0]?.domain || tenant.custom_domain}
                        <br />
                        Value: {dnsConfig.verification[0]?.value}
                      </p>
                    </div>
                  )}
                  {dnsConfig.cnameTarget && (
                    <div>
                      <p className="font-medium mb-1">CNAME Record:</p>
                      <p className="font-mono text-xs bg-white p-2 rounded">
                        Type: CNAME
                        <br />
                        Name: {tenant.custom_domain}
                        <br />
                        Value: {dnsConfig.cnameTarget}
                      </p>
                    </div>
                  )}
                  {dnsConfig.intendedNameservers && (
                    <div>
                      <p className="font-medium mb-1">Nameservers:</p>
                      <ul className="list-disc list-inside font-mono text-xs">
                        {dnsConfig.intendedNameservers.map((ns: any, idx: any) => (
                          <li key={idx}>{ns}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <p className="text-xs text-blue-600 mt-3">
                  Add these DNS records in your domain registrar. Changes may take
                  24-48 hours to propagate.
                </p>
              </div>
            )}

            <button
              onClick={handleRemoveDomain}
              disabled={isLoading}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
            >
              {isLoading ? 'Removing...' : 'Remove Domain'}
            </button>
          </div>
        </div>
      )}

      {/* Add Domain Form */}
      {!tenant?.custom_domain && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Add Custom Domain</h2>
          <form onSubmit={handleAddDomain} className="space-y-4">
            <div>
              <label htmlFor="domain" className="block text-sm font-medium text-gray-700 mb-1">
                Domain Name
              </label>
              <input
                type="text"
                id="domain"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="example.com"
                required
                pattern="^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-sm text-gray-500">
                Enter your custom domain (e.g., example.com)
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 rounded p-3">
                <p className="text-sm text-green-800">{success}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !domain}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Adding Domain...' : 'Add Domain'}
            </button>
          </form>
        </div>
      )}

      {/* Subdomain Info */}
      {tenant?.subdomain && (
        <div className="bg-gray-50 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-2">Your Subdomain</h2>
          <p className="text-gray-600">
            Your store is also accessible at:{' '}
            <span className="font-mono font-medium">
              {tenant.subdomain}.dukanest.com
            </span>
          </p>
        </div>
      )}
    </div>
  );
}

