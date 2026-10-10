/** Local supermarket troubleshooting accounts. Production builds drop the passwords. */

export const LOCAL_STORE_EMAIL = 'supermarket@dukanest.test';
export const LOCAL_VENDOR_EMAIL = 'vendor@dukanest.test';

const LOCAL_TEST_PASSWORD = 'DukaNest-local-1';

export function isLocalTestHost(host: string): boolean {
  const name = host.split(':')[0].toLowerCase();
  return name === 'localhost' || name === '127.0.0.1' || name.endsWith('.localhost');
}

export function localStoreLogin(): { email: string; password: string } | null {
  if (process.env.NODE_ENV !== 'development') return null;
  return { email: LOCAL_STORE_EMAIL, password: LOCAL_TEST_PASSWORD };
}

export function localVendorLogin(): { email: string; password: string } | null {
  if (process.env.NODE_ENV !== 'development') return null;
  return { email: LOCAL_VENDOR_EMAIL, password: LOCAL_TEST_PASSWORD };
}

/** The local troubleshooting vendor can review every vendor invoice for this store. */
export function isLocalVendorOverview(host: string, email: string | null | undefined): boolean {
  return (
    process.env.NODE_ENV === 'development' &&
    isLocalTestHost(host) &&
    (email || '').trim().toLowerCase() === LOCAL_VENDOR_EMAIL
  );
}
