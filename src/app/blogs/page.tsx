/**
 * Blogs Page
 * 
 * Redirects to /blog (singular)
 */

import { redirect } from 'next/navigation';

export default function BlogsPage() {
  redirect('/blog');
}
