/**
 * Dashboard Login Layout
 * 
 * Separate layout for login page that doesn't require authentication
 * This prevents redirect loops when accessing /dashboard/login
 */

export const dynamic = 'force-dynamic';

export default function DashboardLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // No auth required - just render children
  // This layout completely bypasses the parent dashboard layout
  return <>{children}</>;
}

