/**
 * Tenant Login Page (Legacy - Redirects to /dashboard/login)
 * 
 * This page redirects to /dashboard/login for backward compatibility
 * New tenant admin logins should use /dashboard/login
 */

import { redirect } from 'next/navigation';

export default function TenantLoginPage() {
  // Redirect to the new admin login location
  redirect('/dashboard/login');
}
