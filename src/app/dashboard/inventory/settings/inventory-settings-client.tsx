/**
 * Inventory Settings Client Component
 * 
 * Form for configuring inventory settings
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

interface InventorySettingsClientProps {
  initialThreshold: number;
}

export default function InventorySettingsClient({
  initialThreshold,
}: Readonly<InventorySettingsClientProps>) {
  const router = useRouter();
  const [threshold, setThreshold] = useState(initialThreshold);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (threshold < 0 || threshold > 10000) {
      setError('Threshold must be between 0 and 10,000');
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch('/api/inventory/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ threshold }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update settings');
      }

      setSuccess('Settings saved successfully');
      
      // Refresh the page after 1 second to show updated threshold
      setTimeout(() => {
        router.refresh();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/inventory">
            <ArrowLeftIcon className="mr-2 h-4 w-4" />
            Back to Inventory
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory Settings</h1>
          <p className="text-muted-foreground mt-2">
            Configure inventory management settings
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-md border border-green-500/50 bg-green-500/10 p-4">
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Low Stock Threshold</CardTitle>
            <CardDescription>
              Set the stock level below which products and variants will be flagged as low stock
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="threshold">Stock Threshold</Label>
              <Input
                id="threshold"
                type="number"
                min="0"
                max="10000"
                value={threshold}
                onChange={(e) => setThreshold(parseInt(e.target.value) || 0)}
                placeholder="10"
                required
              />
              <p className="text-xs text-muted-foreground">
                Products and variants with stock at or below this level will be shown in low stock alerts.
                Current value: {initialThreshold} units
              </p>
            </div>

            <div className="flex justify-end gap-4 pt-4">
              <Button type="button" variant="outline" asChild>
                <Link href="/dashboard/inventory">Cancel</Link>
              </Button>
              <Button type="submit" disabled={isSaving || threshold === initialThreshold}>
                {isSaving ? (
                  <>
                    <svg
                      className="mr-2 h-4 w-4 animate-spin"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  'Save Settings'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

