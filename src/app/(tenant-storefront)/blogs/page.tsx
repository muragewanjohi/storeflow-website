/**
 * Blogs Page
 * 
 * Redirects to /blog (singular) - instant client-side redirect
 */

import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function BlogsPage() {
  redirect('/blog');
}
