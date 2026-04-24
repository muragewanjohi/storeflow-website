import fs from 'node:fs';
import path from 'node:path';

function read(relativePath: string): string {
  const absolutePath = path.join(process.cwd(), relativePath);
  return fs.readFileSync(absolutePath, 'utf8');
}

function assertIncludes(content: string, needle: string, label: string): void {
  if (!content.includes(needle)) {
    throw new Error(`Security regression check failed: ${label}`);
  }
}

function run(): void {
  const adminDomainsRoute = read('src/app/api/admin/domains/route.ts');
  assertIncludes(adminDomainsRoute, 'requireAuth', 'admin domains route must require auth');
  assertIncludes(adminDomainsRoute, 'requireAnyRole', 'admin domains route must enforce RBAC');

  const pesapalIpnRoute = read('src/app/api/pesapal/subscription/ipn/route.ts');
  assertIncludes(
    pesapalIpnRoute,
    'verifyPaymentWebhookRequest',
    'PesaPal IPN route must verify webhook token'
  );

  const pesapalCallbackRoute = read('src/app/api/pesapal/subscription/callback/route.ts');
  assertIncludes(
    pesapalCallbackRoute,
    'verifyPaymentWebhookRequest',
    'PesaPal callback route must verify webhook token'
  );

  const mpesaCallbackRoute = read('src/app/api/mpesa/subscription/callback/route.ts');
  assertIncludes(
    mpesaCallbackRoute,
    'verifyPaymentWebhookRequest',
    'M-Pesa callback route must verify webhook token'
  );

  const storefrontProductDetail = read('src/app/(tenant-storefront)/products/[slug]/product-detail-client.tsx');
  assertIncludes(
    storefrontProductDetail,
    'sanitizeHtmlForDisplay',
    'Storefront product detail must sanitize HTML before rendering'
  );

  console.log('Security regression checks passed.');
}

run();
