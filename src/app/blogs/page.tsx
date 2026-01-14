/**
 * Blogs Page
 * 
 * Redirects to /blog (singular)
 */

import { redirect } from 'next/navigation';

// Force dynamic rendering for redirects
export const dynamic = 'force-dynamic';

export default function BlogsPage() {
  redirect('/blog');
}
