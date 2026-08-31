'use client';

/**
 * Shown instead of the product form when a tenant has zero categories
 * (user-requested change: a merchant should set up at least one category
 * before adding their first product — a store with no categories makes
 * for poor customer browsing from day one). A quick inline create (name
 * only, matching POST /api/categories's own minimal requirement) so a
 * merchant isn't forced through a separate page for just this — plus a
 * link to the full Categories form for anyone who wants parent/subcategory
 * structure or an image before continuing.
 *
 * On success, calls router.refresh() rather than tracking the new category
 * in client state — re-runs the parent Server Component
 * (dashboard/products/new/page.tsx), which re-fetches the real category
 * list and swaps this prompt out for the real ProductFormClient, already
 * populated with the category that was just created.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function NoCategoriesPrompt() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error || 'Failed to create category');
        return;
      }
      toast.success(`Created category "${trimmed}"`);
      router.refresh();
    } catch {
      setError('Something went wrong — please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto py-16">
      <Card>
        <CardHeader>
          <CardTitle>Add a category first</CardTitle>
          <CardDescription>
            Every product needs a category so customers can browse your store easily. Add your first one to continue adding products.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category-name">Category name</Label>
              <Input
                id="category-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Electronics, Clothing, Groceries"
                autoFocus
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" disabled={!name.trim() || submitting}>
                {submitting ? 'Creating…' : 'Create category & continue'}
              </Button>
              <Button asChild variant="outline" type="button">
                <Link href="/dashboard/categories/new">Set up categories in detail</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
