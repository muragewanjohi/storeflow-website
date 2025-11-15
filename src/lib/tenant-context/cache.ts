/**
 * Tenant Lookup Caching
 * 
 * Provides caching layer for tenant resolution to improve performance
 * Uses in-memory cache for development, Vercel KV for production
 */

// In-memory cache (development)
const memoryCache = new Map<string, { tenant: any; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes

/**
 * Get tenant from cache
 */
export async function getCachedTenant(hostname: string): Promise<any | null> {
  // Try memory cache first
  const cached = memoryCache.get(hostname);
  const now = Date.now();

  if (cached && (now - cached.timestamp) < CACHE_TTL) {
    return cached.tenant;
  }

  // Try Vercel KV cache (if available and properly configured)
  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;
  
  // Skip KV if using placeholder values or not configured
  if (
    kvUrl && 
    kvToken && 
    !kvUrl.includes('your-kv-instance') && 
    !kvToken.includes('your-kv-token')
  ) {
    try {
      const kvResponse = await fetch(
        `${kvUrl}/get/tenant:${hostname}`,
        {
          headers: {
            Authorization: `Bearer ${kvToken}`,
          },
        }
      );

      if (kvResponse.ok) {
        const data = await kvResponse.json();
        if (data.result) {
          const tenant = JSON.parse(data.result);
          // Also update memory cache
          memoryCache.set(hostname, { tenant, timestamp: now });
          return tenant;
        }
      }
    } catch (error) {
      console.error('KV cache error:', error);
      // Fall through to database lookup
    }
  }

  return null;
}

/**
 * Set tenant in cache
 */
export async function setCachedTenant(hostname: string, tenant: any): Promise<void> {
  const now = Date.now();

  // Update memory cache
  memoryCache.set(hostname, { tenant, timestamp: now });

  // Update Vercel KV cache (if available and properly configured)
  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;
  
  if (
    kvUrl && 
    kvToken && 
    !kvUrl.includes('your-kv-instance') && 
    !kvToken.includes('your-kv-token')
  ) {
    try {
      await fetch(`${kvUrl}/set/tenant:${hostname}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${kvToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          value: JSON.stringify(tenant),
          ex: 300, // 5 minutes TTL
        }),
      });
    } catch (error) {
      console.error('KV cache set error:', error);
      // Non-critical, continue
    }
  }
}

/**
 * Clear tenant from cache
 */
export async function clearCachedTenant(hostname: string): Promise<void> {
  memoryCache.delete(hostname);

  // Clear from Vercel KV (if available and properly configured)
  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;
  
  if (
    kvUrl && 
    kvToken && 
    !kvUrl.includes('your-kv-instance') && 
    !kvToken.includes('your-kv-token')
  ) {
    try {
      await fetch(`${kvUrl}/del/tenant:${hostname}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${kvToken}`,
        },
      });
    } catch (error) {
      console.error('KV cache delete error:', error);
    }
  }
}

/**
 * Clear all cached tenants (use with caution)
 */
export function clearAllCachedTenants(): void {
  memoryCache.clear();
}

