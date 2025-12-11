/**
 * Admin Login Layout
 * 
 * Separate layout for login/register pages that doesn't require authentication
 * This prevents redirect loops when accessing /admin/login
 */

export default function AdminLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // No auth required - just render children
  return <>{children}</>;
}

