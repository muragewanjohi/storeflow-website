/**
 * Tenant Suspended Page
 * 
 * Shown when tenant account is suspended
 */

export default function TenantSuspended() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900">Account Suspended</h1>
        <p className="mt-4 text-gray-600">
          This store account has been suspended. Please contact support for assistance.
        </p>
      </div>
    </div>
  );
}

