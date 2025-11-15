/**
 * Vercel Domain Management Utilities
 * 
 * Functions for managing tenant domains via Vercel REST API
 * Handles domain addition, removal, and verification
 * 
 * Note: Using REST API directly as @vercel/sdk doesn't expose domain methods
 */

const VERCEL_API_BASE = 'https://api.vercel.com';

/**
 * Make authenticated request to Vercel API
 */
async function vercelRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = process.env.VERCEL_TOKEN;
  
  if (!token) {
    throw new Error('VERCEL_TOKEN environment variable is not set');
  }

  return fetch(`${VERCEL_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}

export interface DomainInfo {
  name: string;
  apexName: string;
  projectId: string;
  redirect?: string | null;
  redirectStatusCode?: number | null;
  gitBranch?: string | null;
  updatedAt?: number;
  createdAt?: number;
  verified: boolean;
  verification?: {
    type: string;
    domain: string;
    value: string;
    reason: string;
  }[];
  nameservers?: string[];
  intendedNameservers?: string[];
  cnames?: string[];
  cnameTarget?: string;
  configurationIssue?: {
    code: string;
    message: string;
  }[];
}

export interface DomainVerificationStatus {
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

/**
 * Add a domain to Vercel project
 * 
 * @param domain - Domain name to add (e.g., "example.com" or "tenant1.dukanest.com")
 * @param projectId - Vercel project ID
 * @returns Domain information
 * 
 * @throws Error if domain addition fails
 */
export async function addTenantDomain(
  domain: string,
  projectId: string
): Promise<DomainInfo> {
  try {
    if (!process.env.VERCEL_TOKEN) {
      throw new Error('VERCEL_TOKEN environment variable is not set');
    }

    if (!projectId) {
      throw new Error('Project ID is required');
    }

    // Add domain to Vercel project using REST API
    const response = await vercelRequest(`/v10/projects/${projectId}/domains`, {
      method: 'POST',
      body: JSON.stringify({ name: domain }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    // Vercel automatically:
    // - Issues SSL certificate
    // - Configures DNS routing
    // - Sets up CDN caching

    return result as DomainInfo;
  } catch (error: any) {
    // Handle domain already exists error
    if (
      error.message?.includes('already exists') ||
      error.message?.includes('Domain already exists') ||
      error.code === 'domain_already_exists'
    ) {
      // Domain already exists, fetch existing domain info
      const existingDomain = await getDomainInfo(domain, projectId);
      if (existingDomain) {
        return existingDomain;
      }
      throw new Error(`Domain ${domain} already exists but could not be retrieved`);
    }

    console.error('Failed to add domain to Vercel:', error);
    throw new Error(`Failed to add domain: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Remove a domain from Vercel project
 * 
 * @param domain - Domain name to remove
 * @param projectId - Vercel project ID (required for proper authorization)
 * @returns True if successful
 * 
 * @throws Error if domain removal fails
 */
export async function removeTenantDomain(domain: string, projectId: string): Promise<boolean> {
  try {
    if (!projectId) {
      throw new Error('Project ID is required for domain removal');
    }

    // Use project-scoped endpoint for proper authorization
    const response = await vercelRequest(`/v10/projects/${projectId}/domains/${domain}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`;
      
      // Handle domain not found error
      if (response.status === 404 || errorData.error?.code === 'domain_not_found') {
        // Domain doesn't exist, consider it already removed
        return true;
      }
      
      // Provide helpful error message for authorization issues
      if (response.status === 403 || errorMessage.includes('Not authorized') || errorMessage.includes('scope')) {
        throw new Error(
          `Vercel API authorization failed. Ensure your VERCEL_TOKEN has access to project "${projectId}". ` +
          `Error: ${errorMessage}`
        );
      }
      
      throw new Error(errorMessage);
    }

    return true;
  } catch (error: any) {
    // Handle domain not found error
    if (
      error.message?.includes('not found') ||
      error.message?.includes('does not exist') ||
      error.code === 'domain_not_found'
    ) {
      // Domain doesn't exist, consider it already removed
      return true;
    }

    console.error('Failed to remove domain from Vercel:', error);
    throw new Error(`Failed to remove domain: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Get domain information from Vercel
 * 
 * @param domain - Domain name
 * @param projectId - Vercel project ID (optional)
 * @returns Domain information or null if not found
 */
export async function getDomainInfo(
  domain: string,
  projectId?: string
): Promise<DomainInfo | null> {
  try {
    // If projectId is provided, get domain from project
    // Otherwise, get domain directly
    const endpoint = projectId 
      ? `/v10/projects/${projectId}/domains/${domain}`
      : `/v9/domains/${domain}`;

    const response = await vercelRequest(endpoint, {
      method: 'GET',
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`;
      
      // Provide helpful error message for authorization issues
      if (response.status === 403 || errorMessage.includes('Not authorized') || errorMessage.includes('scope')) {
        throw new Error(
          `Vercel API authorization failed. Ensure your VERCEL_TOKEN has access to project "${projectId}". ` +
          `Error: ${errorMessage}`
        );
      }
      
      throw new Error(errorMessage);
    }

    const domainInfo = await response.json();
    return domainInfo as DomainInfo;
  } catch (error: any) {
    if (
      error.message?.includes('not found') ||
      error.message?.includes('does not exist') ||
      error.code === 'domain_not_found'
    ) {
      return null;
    }

    console.error('Failed to get domain info:', error);
    throw error;
  }
}

/**
 * Verify domain configuration
 * 
 * Checks if domain is properly configured and verified in Vercel
 * 
 * @param domain - Domain name to verify
 * @param projectId - Vercel project ID (required for proper authorization)
 * @returns Verification status
 */
export async function verifyDomain(
  domain: string,
  projectId: string
): Promise<DomainVerificationStatus> {
  try {
    if (!projectId) {
      throw new Error('Project ID is required for domain verification');
    }

    const domainInfo = await getDomainInfo(domain, projectId);

    if (!domainInfo) {
      return {
        verified: false,
        verification: [
          {
            type: 'error',
            domain,
            value: '',
            reason: 'Domain not found in Vercel',
          },
        ],
      };
    }

    return {
      verified: domainInfo.verified,
      verification: domainInfo.verification,
      configurationIssue: domainInfo.configurationIssue,
    };
  } catch (error: any) {
    console.error('Failed to verify domain:', error);
    return {
      verified: false,
      verification: [
        {
          type: 'error',
          domain,
          value: '',
          reason: error.message || 'Failed to verify domain',
        },
      ],
    };
  }
}

/**
 * Get DNS configuration instructions for a domain
 * 
 * @param domain - Domain name
 * @param projectId - Vercel project ID (required for proper authorization)
 * @returns DNS configuration instructions
 */
export async function getDNSConfiguration(
  domain: string,
  projectId: string
): Promise<{
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
}> {
  try {
    if (!projectId) {
      throw new Error('Project ID is required for DNS configuration');
    }

    const domainInfo = await getDomainInfo(domain, projectId);

    if (!domainInfo) {
      throw new Error('Domain not found');
    }

    return {
      nameservers: domainInfo.nameservers,
      intendedNameservers: domainInfo.intendedNameservers,
      cnames: domainInfo.cnames,
      cnameTarget: domainInfo.cnameTarget,
      verification: domainInfo.verification,
    };
  } catch (error: any) {
    console.error('Failed to get DNS configuration:', error);
    throw error;
  }
}

/**
 * List all domains for a project
 * 
 * @param projectId - Vercel project ID
 * @returns Array of domain information
 */
export async function listProjectDomains(projectId: string): Promise<DomainInfo[]> {
  try {
    const response = await vercelRequest(`/v10/projects/${projectId}/domains`, {
      method: 'GET',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    // Vercel API returns { domains: [...] } or just array
    return (data.domains || data) as DomainInfo[];
  } catch (error: any) {
    console.error('Failed to list project domains:', error);
    throw error;
  }
}

