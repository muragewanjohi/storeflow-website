/**
 * Account Recovery Layout
 * 
 * Separate layout for account recovery page that doesn't require authentication
 * This prevents redirect loops when accessing /dashboard/account-recovery
 */

export const dynamic = 'force-dynamic';

export default function AccountRecoveryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // No auth required - just render children
  // This layout completely bypasses the parent dashboard layout
  return <>{children}</>;
}
