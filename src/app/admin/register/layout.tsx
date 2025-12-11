/**
 * Admin Register Layout
 * 
 * Separate layout for register page that doesn't require authentication
 */

export default function AdminRegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // No auth required - just render children
  return <>{children}</>;
}

